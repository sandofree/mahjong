// pages/camera/camera.js
const app = getApp();

Page({
  data: {
    photoPath: '',       // 拍照后的临时路径
    hasPhoto: false,
    recognizing: false,
  },

  onReady() {
    this.cameraCtx = wx.createCameraContext();
  },

  // 拍照
  onTakePhoto() {
    this.cameraCtx.takePhoto({
      quality: 'high',
      success: (res) => {
        this.setData({
          photoPath: res.tempImagePath,
          hasPhoto: true,
        });
      },
      fail: (err) => {
        wx.showToast({ title: '拍照失败', icon: 'none' });
      }
    });
  },

  // 重新拍照
  onRetake() {
    this.setData({
      photoPath: '',
      hasPhoto: false,
    });
  },

  // 确认上传识别
  onConfirm() {
    this.setData({ recognizing: true });

    // 尝试云函数识别
    this.recognizeViaCloud(this.data.photoPath);
  },

  // 通过云函数识别
  recognizeViaCloud(tempPath) {
    // 先尝试上传到云存储
    const cloudPath = `mahjong-photos/${Date.now()}.jpg`;

    wx.cloud.uploadFile({
      cloudPath,
      filePath: tempPath,
      success: (uploadRes) => {
        // 调用云函数识别
        wx.cloud.callFunction({
          name: 'recognizeTiles',
          data: { fileID: uploadRes.fileID },
          success: (callRes) => {
            this.setData({ recognizing: false });
            if (callRes.result && callRes.result.tiles && callRes.result.tiles.length === 14) {
              app.globalData.recognizedTiles = callRes.result.tiles;
              wx.redirectTo({ url: '/pages/result/result?source=camera' });
            } else {
              // 云函数返回无效，使用 mock
              this.useMockResult();
            }
          },
          fail: () => {
            // 云函数调用失败，使用 mock
            this.useMockResult();
          }
        });
      },
      fail: () => {
        // 云存储不可用，使用 mock
        this.useMockResult();
      }
    });
  },

  // Mock 识别结果（用于调试或云函数未部署时）
  useMockResult() {
    this.setData({ recognizing: false });

    wx.showModal({
      title: '提示',
      content: '图像识别需要配置云函数。当前将使用模拟数据进行演示。',
      confirmText: '继续',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          // 模拟一手牌：清一色混一色风格的牌
          // 示例：1-2-3万, 4-5-6万, 7-8-9万, 3-3-3万, 5-5万 → 清龙+碰碰胡 like
          // 实际用个简单例子：碰碰胡 + 箭刻
          const mockTiles = [
            0,0,0,   // 一万刻
            6,6,6,   // 七万刻
            31,31,31, // 红中刻
            28,28,28, // 南风刻
            1,1      // 二万做将
          ];
          app.globalData.recognizedTiles = mockTiles;
          app.globalData.handTiles = mockTiles;
          wx.redirectTo({ url: '/pages/result/result?source=camera' });
        }
      }
    });
  },

  // 错误处理
  onCameraError() {
    wx.showToast({ title: '相机不可用', icon: 'none' });
  }
});
