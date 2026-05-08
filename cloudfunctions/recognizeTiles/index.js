// cloudfunctions/recognizeTiles/index.js
// 国标麻将牌面识别云函数
// 接收云存储中的图片 fileID，调用外部 AI 服务识别14张手牌

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 主入口
 * @param {object} event - { fileID: string }
 * @returns {{ tiles: number[] }} 识别出的 tileId 数组
 */
exports.main = async (event, context) => {
  const { fileID } = event;

  if (!fileID) {
    return { error: '缺少 fileID 参数', tiles: [] };
  }

  try {
    // 1. 从云存储下载图片
    const downloadResult = await cloud.downloadFile({ fileID });
    const imageBuffer = downloadResult.fileContent;

    // 2. 调用外部 AI 服务进行牌面识别
    // 
    // === 集成方案 ===
    // 方案A: 百度 AI 自定义模型 (EasyDL)
    //   训练一个麻将牌分类模型，部署后通过 REST API 调用
    //   https://ai.baidu.com/easydl/
    //
    // 方案B: 腾讯云图像识别
    //   使用腾讯云的对象检测 + 自定义识别
    //   https://cloud.tencent.com/product/tiia
    //
    // 方案C: 自建模型服务
    //   使用 TensorFlow/PyTorch 训练模型，部署到云服务器
    //   通过 HTTP 接口调用
    //
    // 方案D: 小程序端模板匹配 (wx.createOffscreenCanvas)
    //   在小程序端使用 canvas 进行简单的模板匹配
    //
    // 下方为调用示例（以百度 AI 为例）:
    //
    // const tiles = await callBaiduAI(imageBuffer);
    // return { tiles };

    // 当前：返回模拟数据用于调试
    const tiles = mockRecognize(imageBuffer);
    return { tiles };

  } catch (err) {
    console.error('识别失败:', err);
    return { error: err.message, tiles: [] };
  }
};

/**
 * 调用百度 AI EasyDL 自定义模型识别牌面
 * 需要先在百度 AI 平台训练麻将牌识别模型
 */
async function callBaiduAI(imageBuffer) {
  // 示例代码（需要替换为实际的 API Key 和模型 URL）
  const axios = require('axios');
  const FormData = require('form-data');

  const BAIDU_API_KEY = 'your-api-key';
  const BAIDU_SECRET_KEY = 'your-secret-key';
  const MODEL_API_URL = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/detection/your-model';

  // 1. 获取 access_token
  const tokenRes = await axios.get(
    `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`
  );
  const accessToken = tokenRes.data.access_token;

  // 2. 调用模型
  const form = new FormData();
  form.append('image', imageBuffer.toString('base64'));

  const result = await axios.post(
    `${MODEL_API_URL}?access_token=${accessToken}`,
    form,
    { headers: form.getHeaders() }
  );

  // 3. 解析结果，映射为 tileId
  const tiles = parseDetectionResult(result.data);
  return tiles;
}

/**
 * 解析检测结果 → tileId 数组
 * 假设 API 返回格式: { results: [{ name: '一万', location: {...} }, ...] }
 */
function parseDetectionResult(data) {
  if (!data.results || !Array.isArray(data.results)) return [];

  // 牌面名称到 tileId 的映射
  const nameToId = {
    '一万': 0, '二万': 1, '三万': 2, '四万': 3, '五万': 4,
    '六万': 5, '七万': 6, '八万': 7, '九万': 8,
    '一条': 9, '二条': 10, '三条': 11, '四条': 12, '五条': 13,
    '六条': 14, '七条': 15, '八条': 16, '九条': 17,
    '一饼': 18, '二饼': 19, '三饼': 20, '四饼': 21, '五饼': 22,
    '六饼': 23, '七饼': 24, '八饼': 25, '九饼': 26,
    '东': 27, '南': 28, '西': 29, '北': 30,
    '中': 31, '发': 32, '白': 33,
  };

  const tiles = [];
  for (const item of data.results) {
    const id = nameToId[item.name];
    if (id !== undefined) tiles.push(id);
  }

  return tiles.slice(0, 14); // 最多14张
}

/**
 * 模拟识别（用于开发调试）
 * 返回一手示例牌：混一色 + 碰碰胡
 */
function mockRecognize(imageBuffer) {
  // 示例手牌：一万刻 + 七万刻 + 红中刻 + 南风刻 + 二万对
  // 这手牌符合：碰碰胡(6) + 混一色(6) + 幺九刻(1) = 至少13番
  return [
    0,0,0,   // 一万刻 (3张)
    6,6,6,   // 七万刻 (3张)
    31,31,31, // 红中刻 (3张)
    28,28,28, // 南风刻 (3张)
    1,1      // 二万做将 (2张)
  ];
}
