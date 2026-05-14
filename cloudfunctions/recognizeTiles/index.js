// cloudfunctions/recognizeTiles/index.js
// 国标麻将牌面识别云函数 — ONNX YOLOv8 WASM 本地推理
// 图片处理: jimp（纯 JS），推理: onnxruntime-web（WASM，零 native 依赖）

const cloud = require('wx-server-sdk');
const axios = require('axios');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ===== 模型配置 =====
const MODEL_PATH = path.join(__dirname, 'model', 'weights.onnx');
const CLASS_NAMES_PATH = path.join(__dirname, 'model', 'class_names.txt');

// onnxruntime-web WASM 推理（延迟加载）
let ort = null;
let MODEL_SESSION = null;
let INPUT_SHAPE = null;

async function loadORT() {
  if (ort) return ort;
  try {
    ort = require('onnxruntime-web');
  } catch (e) {
    throw new Error(
      'onnxruntime-web 加载失败: ' + String(e.message).slice(0, 200)
    );
  }

  // 配置 WASM 后端
  // require.resolve('onnxruntime-web') → .../dist/ort-commonjs.js
  try {
    const distPath = path.dirname(require.resolve('onnxruntime-web')) + '/';
    ort.env.wasm.wasmPaths = distPath;
    ort.env.wasm.numThreads = 1;      // 单线程
    ort.env.wasm.simd = false;        // 禁用 SIMD，用基础 WASM
    console.log('WASM 路径:', distPath);
  } catch (e) {
    console.warn('WASM 配置失败:', e.message);
  }

  return ort;
}

// ===== 类别映射 =====
let CLASS_MAP = null;

function buildClassMap() {
  const text = fs.readFileSync(CLASS_NAMES_PATH, 'utf-8');
  const names = text.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  const map = {};

  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    let tileId = -1;

    const cM = n.match(/^(\d)C$/);
    if (cM) { tileId = parseInt(cM[1]) - 1; }

    const bM = n.match(/^(\d)B$/);
    if (bM) { tileId = parseInt(bM[1]) - 1 + 9; }

    const dM = n.match(/^(\d)D$/);
    if (dM) { tileId = parseInt(dM[1]) - 1 + 18; }

    const fM = n.match(/^(\d)F$/);
    if (fM) { tileId = 26 + parseInt(fM[1]); }

    const sM = n.match(/^(\d)S$/);
    if (sM) {
      const s = parseInt(sM[1]);
      if (s <= 3) tileId = 30 + s;
    }

    const wind = { 'EW': 27, 'SW': 28, 'WD': 29, 'NW': 30 };
    if (wind[n] !== undefined) tileId = wind[n];

    const dragon = { 'RD': 31, 'GD': 32, 'WW': 33 };
    if (dragon[n] !== undefined) tileId = dragon[n];

    map[i] = { tileId, name: n };
  }
  return map;
}

// ===== 模型加载 =====
async function loadModel() {
  if (MODEL_SESSION) return MODEL_SESSION;
  await loadORT();

  console.log('创建 ONNX session...');
  MODEL_SESSION = await ort.InferenceSession.create(MODEL_PATH);

  // onnxruntime-web 没有 inputMetadata API，使用默认 640x640
  INPUT_SHAPE = [640, 640];
  console.log('输入尺寸:', INPUT_SHAPE, '输入名:', MODEL_SESSION.inputNames[0]);

  return MODEL_SESSION;
}

// ===== 下载图片 =====
async function getImageBuffer(fileID, directUrl) {
  let imageUrl = directUrl;
  if (!imageUrl && fileID) {
    const tempRes = await cloud.getTempFileURL({ fileList: [fileID] });
    const item = tempRes.fileList && tempRes.fileList[0];
    if (!item || !item.tempFileURL) throw new Error('获取临时URL失败');
    imageUrl = item.tempFileURL;
  }
  if (!imageUrl) throw new Error('缺少 fileID 或 imageUrl 参数');

  console.log('下载图片...');
  const res = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 15000,
  });
  return Buffer.from(res.data);
}

// ===== 图片预处理（jimp）=====
async function preprocessImage(imageBuffer) {
  const [height, width] = INPUT_SHAPE || [640, 640];

  const img = await Jimp.read(imageBuffer);
  img.resize(width, height, Jimp.RESIZE_BILINEAR);

  const floatData = new Float32Array(height * width * 3);

  for (let h = 0; h < height; h++) {
    for (let w = 0; w < width; w++) {
      const rgba = Jimp.intToRGBA(img.getPixelColor(w, h));
      const offset = h * width + w;
      floatData[0 * height * width + offset] = rgba.r / 255.0;
      floatData[1 * height * width + offset] = rgba.g / 255.0;
      floatData[2 * height * width + offset] = rgba.b / 255.0;
    }
  }

  return new ort.Tensor('float32', floatData, [1, 3, height, width]);
}

// ===== 后处理 =====
function sigmoid(x) {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  return Math.exp(x) / (1 + Math.exp(x));
}

function postprocess(outputTensor, confThresh, iouThresh) {
  confThresh = confThresh || 0.5;
  iouThresh = iouThresh || 0.45;

  const [inputH, inputW] = INPUT_SHAPE || [640, 640];
  const data = outputTensor.data;
  const dims = outputTensor.dims;
  const numClasses = dims[1] - 4;
  const N = dims[2];

  let needSigmoid = false;
  for (let c = 0; c < numClasses && !needSigmoid; c++) {
    const v = data[(4 + c) * N];
    if (v < -0.5 || v > 1.5) needSigmoid = true;
  }
  if (needSigmoid) console.log('对 class scores 应用 sigmoid');

  const detections = [];

  for (let i = 0; i < N; i++) {
    const cx = data[i];
    const cy = data[1 * N + i];
    const bw = data[2 * N + i];
    const bh = data[3 * N + i];

    let maxScore = 0, maxClass = -1;
    for (let c = 0; c < numClasses; c++) {
      let score = data[(4 + c) * N + i];
      if (needSigmoid) score = sigmoid(score);
      if (score > maxScore) { maxScore = score; maxClass = c; }
    }

    if (maxScore < confThresh) continue;

    const isPixel = cx > 1.5 || cy > 1.5;
    const sx = isPixel ? 1.0 : inputW;
    const sy = isPixel ? 1.0 : inputH;

    const x1 = (cx - bw / 2) * sx;
    const y1 = (cy - bh / 2) * sy;
    const x2 = (cx + bw / 2) * sx;
    const y2 = (cy + bh / 2) * sy;

    detections.push({
      x1, y1, x2, y2,
      score: maxScore, classId: maxClass,
      area: (x2 - x1) * (y2 - y1),
    });
  }

  detections.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const det of detections) {
    let suppressed = false;
    for (const k of kept) {
      if (k.classId !== det.classId) continue;
      const ix1 = Math.max(det.x1, k.x1);
      const iy1 = Math.max(det.y1, k.y1);
      const ix2 = Math.min(det.x2, k.x2);
      const iy2 = Math.min(det.y2, k.y2);
      if (ix1 >= ix2 || iy1 >= iy2) continue;
      const inter = (ix2 - ix1) * (iy2 - iy1);
      const iou = inter / (det.area + k.area - inter);
      if (iou > iouThresh) { suppressed = true; break; }
    }
    if (!suppressed) kept.push(det);
  }

  kept.sort((a, b) => a.x1 - b.x1);
  return kept;
}

// ===== 主入口 =====
exports.main = async (event) => {
  const { fileID, imageUrl: directUrl } = event;
  if (!fileID && !directUrl) {
    return { error: '缺少 fileID 或 imageUrl 参数', tiles: [] };
  }

  try {
    if (!CLASS_MAP) CLASS_MAP = buildClassMap();

    const imageBuffer = await getImageBuffer(fileID, directUrl);
    await loadModel();

    const inputTensor = await preprocessImage(imageBuffer);

    const feeds = {};
    feeds[MODEL_SESSION.inputNames[0]] = inputTensor;
    const results = await MODEL_SESSION.run(feeds);
    const outputTensor = results[MODEL_SESSION.outputNames[0]];

    console.log('推理完成, 输出:', outputTensor.dims);

    const detections = postprocess(outputTensor);
    console.log('检测到', detections.length, '张牌');

    const tileIds = detections
      .map(d => {
        const m = CLASS_MAP[d.classId];
        if (m && m.tileId >= 0) {
          console.log('  ' + m.name + ' → ' + m.tileId + ' (' + d.score.toFixed(3) + ')');
          return m.tileId;
        }
        return -1;
      })
      .filter(id => id >= 0);

    if (tileIds.length < 6) {
      return {
        error: '仅识别到 ' + tileIds.length + ' 张牌（最少需 6 张）',
        tiles: tileIds,
      };
    }

    return {
      tiles: tileIds.slice(0, 18),
      partial: tileIds.length < 14,
      message: tileIds.length < 14
        ? '识别到 ' + tileIds.length + ' 张牌（不足 14 张），请到手动输入页补齐。'
        : undefined,
    };
  } catch (err) {
    console.error('识别失败:', err.message);
    return { error: err.message || '识别异常', tiles: [] };
  }
};
