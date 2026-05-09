# 拍照识别接入说明

## 当前实现

云函数 `cloudfunctions/recognizeTiles/index.js` 使用阿里云**百炼 qwen3.6-plus** 多模态模型识别麻将牌（OpenAI 兼容接口）。该模型支持文本/图像/视频输入，1M 上下文窗口。

## 接入步骤（约 30 分钟）

### 1. 申请阿里云百炼 API Key

访问 https://bailian.console.aliyun.com/ → 开通服务 → API Key 管理 → 创建 API Key，复制（形如 `sk-xxxxxxxx`）。

新用户有免费 tokens 额度。`qwen3.6-plus` 当前限时半价：输入 ¥2/百万 tokens，输出 ¥6/百万 tokens，单次调用约几千 tokens。

### 2. 在云函数中配置环境变量

微信开发者工具 → 云开发控制台 → 云函数 → 找到 `recognizeTiles` → 设置 → 环境变量：

```
DASHSCOPE_API_KEY = sk-xxxxxxxxxxxxxxxx
```

### 3. 部署云函数

右键 `cloudfunctions/recognizeTiles` → 上传并部署：云端安装依赖。

### 4. 测试

进入小程序 → 拍照识别 → 拍一张包含 14 张麻将牌的图片 → 跳转到手动输入页核对。

## 工作流程

```
小程序拍照 → 上传到云存储 → 调用云函数 (传 fileID)
  → 云函数获取临时URL → 调用 qwen3.6-plus (OpenAI 兼容接口)
  → 模型返回 JSON {"tiles": ["一万", ...]}
  → 解析为 tileId 数组 → 跳转到手动输入页(prefill)
```

## API 配置说明

- **Endpoint**: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- **Model**: `qwen3.6-plus`
- **格式**: 标准 OpenAI Chat Completions
- **图片传入**: `{ type: 'image_url', image_url: { url: '...' } }`

不同地域的 endpoint：
- 北京：`https://dashscope.aliyuncs.com/compatible-mode/v1`
- 弗吉尼亚：`https://dashscope-us.aliyuncs.com/compatible-mode/v1`
- 新加坡：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

注意：各地域 API Key 不通用。

## 替换为其他大模型

只需改 `cloudfunctions/recognizeTiles/index.js` 中：
- `BAILIAN_API` 常量改成新 endpoint
- `MODEL_NAME` 改成新 model id
- 由于绝大多数主流模型都支持 OpenAI 兼容格式，request body 一般无需调整

可选模型：
- `qwen3.6-plus` — 当前默认（多模态推理与编码增强）
- `qwen3-vl-plus` / `qwen3-vl-flash` — 专用视觉模型，flash 更快更便宜
- 豆包 vision、智谱 GLM-4V 等同样可平替

## 提升识别准确率

1. 拍照要求：手牌正对镜头、横向排列、光线充足、避免反光
2. Prompt 已要求严格 JSON 输出且 `temperature=0.01`
3. 识别后会跳转手动输入页，**用户可以核对/修正**，避免错误一路传到结算页
4. 若错误率高，可改用更强的模型或在 prompt 中加 few-shot 示例

## 参考文档

- [如何使用 Qwen3.6 模型实现视觉理解](https://help.aliyun.com/zh/model-studio/vision)
- [通过 OpenAI 接口调用通义千问 VL 模型](https://help.aliyun.com/zh/model-studio/qwen-vl-compatible-with-openai)
- [千问 API 参考](https://help.aliyun.com/zh/model-studio/qwen-api-reference/)
