// cloudfunctions/recognizeTiles/index.js
// 国标麻将牌面识别云函数 — 使用阿里云百炼 qwen3-vl 视觉模型 (OpenAI 兼容接口)

const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ===== 配置 =====
// 在阿里云百炼控制台申请 API Key: https://bailian.console.aliyun.com/
// 部署时通过云函数环境变量注入，避免硬编码
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';

// OpenAI 兼容 endpoint (北京地域)
// 弗吉尼亚: https://dashscope-us.aliyuncs.com/compatible-mode/v1
// 新加坡:  https://dashscope-intl.aliyuncs.com/compatible-mode/v1
const BAILIAN_API = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
// 主模型：qwen-vl-max (识别准确率最高)
const MODEL_NAME = 'qwen-vl-max';
// 失败兜底：更快的视觉 flash 模型
const FALLBACK_MODEL = 'qwen3-vl-flash';

// 牌面名称 → tileId 映射 (与 utils/constants.js 保持一致)
const NAME_TO_ID = {
  '一万': 0, '二万': 1, '三万': 2, '四万': 3, '五万': 4,
  '六万': 5, '七万': 6, '八万': 7, '九万': 8,
  '一条': 9, '二条': 10, '三条': 11, '四条': 12, '五条': 13,
  '六条': 14, '七条': 15, '八条': 16, '九条': 17,
  '一饼': 18, '二饼': 19, '三饼': 20, '四饼': 21, '五饼': 22,
  '六饼': 23, '七饼': 24, '八饼': 25, '九饼': 26,
  '东': 27, '南': 28, '西': 29, '北': 30,
  '中': 31, '发': 32, '白': 33,
  // 别名兜底
  '东风': 27, '南风': 28, '西风': 29, '北风': 30,
  '红中': 31, '发财': 32, '白板': 33,
};

const PROMPT = `你是一个专业的麻将牌视觉识别助手。你的任务是识别输入图片中的所有麻将牌，并将其转换为指定的数字ID。

请严格遵循以下【ID映射字典】：
- 万子: 0(一万), 1(二万), 2(三万), 3(四万), 4(五万), 5(六万), 6(七万), 7(八万), 8(九万)
- 条子: 9(一条), 10(二条), 11(三条), 12(四条), 13(五条), 14(六条), 15(七条), 16(八条), 17(九条)
- 饼子: 18(一饼), 19(二饼), 20(三饼), 21(四饼), 22(五饼), 23(六饼), 24(七饼), 25(八饼), 26(九饼)
- 字牌: 27(东), 28(南), 29(西), 30(北), 31(中), 32(发), 33(白)

【执行步骤】
1. 仔细观察图片，定位每一张麻将牌。
2. 识别每张牌的花色和点数。
3. 根据上述字典找到对应的 ID。
4. 将所有 ID 组成一个 JSON 数组。

【特别注意以下易混淆牌】
- "一条"通常是鸟类图案（孔雀/麻雀），"七条"是7根斜向竖条线组合
- "白板"是空白边框，"发财"是绿色"發"字
- "一饼"是单个大圆圈，"九饼"是 3×3 排列的九个小圆圈
- 数饼/数条按圆点或竖条数量数清楚，不要看错

【输出要求】
1. 必须且只能返回标准的 JSON 数组，例如: [0, 9, 18, 27, 31]
2. 严禁输出任何 Markdown 格式（如 \`\`\`json ... \`\`\`）
3. 严禁输出任何自然语言解释、前言或后缀文字
4. 数组长度通常为 14，如果有杠则可能为 15-18
5. 保持数组顺序与图片中牌的视觉顺序一致（从左到右）

现在，请处理提供的图片并返回结果。`;

exports.main = async (event) => {
  const { fileID, imageUrl: directUrl } = event;
  if (!fileID && !directUrl) {
    return { error: '缺少 fileID 或 imageUrl 参数', tiles: [] };
  }

  if (!DASHSCOPE_API_KEY) {
    console.warn('未配置 DASHSCOPE_API_KEY，使用 mock 数据');
    return { tiles: mockRecognize(), mock: true };
  }

  try {
    let imageUrl = directUrl;

    // 若传入 fileID，从云存储取临时 URL；否则直接用 imageUrl
    if (!imageUrl) {
      const tempRes = await cloud.getTempFileURL({ fileList: [fileID] });
      const fileItem = tempRes.fileList && tempRes.fileList[0];
      if (!fileItem || !fileItem.tempFileURL) {
        return { error: '获取临时URL失败', tiles: [] };
      }
      imageUrl = fileItem.tempFileURL;
    }

    // 调用视觉模型识别（主模型超时则自动 fallback 到 flash）
    let tiles;
    try {
      tiles = await recognizeViaBailian(imageUrl, MODEL_NAME, 25000);
    } catch (e) {
      console.warn(`主模型 ${MODEL_NAME} 失败 (${e.message})，降级到 ${FALLBACK_MODEL}`);
      tiles = await recognizeViaBailian(imageUrl, FALLBACK_MODEL, 25000);
    }
    // 识别到 6 张以上就返回，让用户在手动输入页校对/补全
    // 完整手牌应为 14-18 张，不足/多余时附带 partial 标记和说明
    if (tiles.length < 6) {
      return {
        error: `仅识别到 ${tiles.length} 张牌（最少需 6 张），请重拍清晰一些。`,
        tiles,
      };
    }
    if (tiles.length > 18) {
      // 多识别了，截到 18 张返回
      tiles = tiles.slice(0, 18);
    }
    const partial = tiles.length < 14 || tiles.length > 18;
    return {
      tiles,
      partial,
      message: partial
        ? `识别到 ${tiles.length} 张牌（不足 14 张），请到手动输入页补齐。`
        : undefined,
    };

  } catch (err) {
    console.error('识别失败:', err.response ? err.response.data : err.message);
    return { error: err.message || '识别异常', tiles: [] };
  }
};

/**
 * 通过百炼 OpenAI 兼容接口调用视觉模型识别麻将牌
 * @param {string} imageUrl - 图片 URL
 * @param {string} model - 模型名称
 * @param {number} timeoutMs - 请求超时时间(毫秒)
 */
async function recognizeViaBailian(imageUrl, model, timeoutMs) {
  const body = {
    model: model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: imageUrl } },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
    // 让输出更稳定
    temperature: 0.01,
    top_p: 0.1,
  };

  const res = await axios.post(BAILIAN_API, body, {
    headers: {
      'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    timeout: timeoutMs,
  });

  // OpenAI 兼容格式: { choices: [{ message: { content: '...' } }] }
  const choice = res.data && res.data.choices && res.data.choices[0];
  if (!choice) throw new Error('模型未返回结果');
  const text = choice.message && choice.message.content;
  if (!text) throw new Error('模型返回为空');

  // 输出原始响应到云函数日志，方便排查识别质量
  console.log(`[${model}] 原始响应:`, text);
  const tiles = parseTiles(text);
  console.log(`[${model}] 解析结果:`, JSON.stringify(tiles), '共', tiles.length, '张');

  return tiles;
}

/**
 * 解析模型返回的文本，转成 tileId 数组
 * 优先识别纯 JSON 数组 [0,1,2,...]，回退到对象 {"tiles": ["一万",...]} 格式
 */
function parseTiles(text) {
  // 模型有时会用 ```json ... ``` 包裹，先剥离
  const cleaned = String(text).replace(/```(?:json)?/g, '').trim();

  // 优先抓 JSON 数组 [...]
  const arrayMatch = cleaned.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const arr = JSON.parse(arrayMatch[0]);
      if (Array.isArray(arr) && arr.length > 0) {
        // 数字数组 → 直接用
        if (typeof arr[0] === 'number') {
          return arr.filter(v => Number.isInteger(v) && v >= 0 && v <= 33);
        }
        // 字符串数组 → 走名称映射
        if (typeof arr[0] === 'string') {
          return arr.map(name => NAME_TO_ID[String(name).trim()])
                    .filter(id => id !== undefined);
        }
      }
    } catch (e) {
      console.warn('JSON 数组解析失败，尝试对象格式:', e.message);
    }
  }

  // 兼容老格式: {"tiles": ["一万",...]}
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]);
      const names = obj.tiles || [];
      const tiles = [];
      for (const name of names) {
        const id = NAME_TO_ID[String(name).trim()];
        if (id !== undefined) tiles.push(id);
        else console.warn('未识别的牌名:', name);
      }
      return tiles;
    } catch (e) {
      console.warn('JSON 对象解析失败:', e.message);
    }
  }

  throw new Error('未在响应中找到合法 JSON');
}

/**
 * Mock 识别（未配置 API Key 时使用）
 */
function mockRecognize() {
  return [0,0,0, 6,6,6, 31,31,31, 28,28,28, 1,1];
}
