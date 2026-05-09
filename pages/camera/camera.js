// pages/camera/camera.js
const app = getApp();

Page({
  data: {
    photoPath: '',       // 拍照后的临时路径
    hasPhoto: false,
    recognizing: false,
    recognizingSeconds: 0,
  },

  onReady() {
    this.cameraCtx = wx.createCameraContext();
  },

  onUnload() {
    this.stopRecognizingTimer();
  },

  startRecognizingTimer() {
    this.setData({ recognizing: true, recognizingSeconds: 0 });
    this._timer = setInterval(() => {
      this.setData({ recognizingSeconds: this.data.recognizingSeconds + 1 });
    }, 1000);
  },

  stopRecognizingTimer() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.setData({ recognizing: false });
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
    this.startRecognizingTimer();

    // 尝试云函数识别
    this.recognizeViaCloud(this.data.photoPath);
  },

  // 通过云函数识别
  recognizeViaCloud(tempPath) {
    const cloudPath = `mahjong-photos/${Date.now()}.jpg`;

    wx.cloud.uploadFile({
      cloudPath,
      filePath: tempPath,
      success: (uploadRes) => {
        console.log('[识别] 上传成功 fileID=', uploadRes.fileID);
        wx.cloud.callFunction({
          name: 'recognizeTiles',
          data: { fileID: uploadRes.fileID },
          success: (callRes) => {
            this.stopRecognizingTimer();
            console.log('[识别] 云函数返回:', callRes.result);
            const result = callRes.result || {};
            const tiles = result.tiles || [];

            // 1. 后端明确返回错误
            if (result.error) {
              this.showErrorModal('识别失败', result.error, tiles);
              return;
            }

            // 2. 后端返回 mock 标记 (说明云函数没配 API Key)
            if (result.mock) {
              this.showErrorModal('云函数未配置 API Key', '请在云开发控制台为 recognizeTiles 函数配置 DASHSCOPE_API_KEY 环境变量后重新部署。', tiles);
              return;
            }

            // 3. 识别到 6 张以上就跳转输入页让用户校对/补全
            if (tiles.length >= 6 && tiles.length <= 18) {
              app.globalData.recognizedTiles = tiles;
              app.globalData.handTiles = tiles;
              if (result.partial || tiles.length < 14) {
                wx.showToast({
                  title: `识别到 ${tiles.length} 张，请补齐到 14 张`,
                  icon: 'none',
                  duration: 2500,
                });
              }
              wx.redirectTo({ url: '/pages/input/input?prefill=1' });
              return;
            }

            // 4. 张数太少或太多，无法用
            this.showErrorModal('识别异常', `云函数返回 ${tiles.length} 张牌，无法识别有效手牌，请重拍。`, tiles);
          },
          fail: (err) => {
            this.stopRecognizingTimer();
            console.error('[识别] 云函数调用失败:', err);
            this.showErrorModal('云函数调用失败', err.errMsg || JSON.stringify(err), []);
          }
        });
      },
      fail: (err) => {
        this.stopRecognizingTimer();
        console.error('[识别] 上传到云存储失败:', err);
        this.showErrorModal('上传失败', err.errMsg || '云存储上传失败，请检查云开发是否开通', []);
      }
    });
  },

  // 显示错误并允许使用示例数据
  showErrorModal(title, content, tiles) {
    wx.showModal({
      title,
      content: content + '\n\n点击「使用示例」用模拟数据继续，或重新拍照',
      confirmText: '使用示例',
      cancelText: '重新拍照',
      success: (r) => {
        if (r.confirm) {
          // 如果模型至少返回了一些牌，用它们而不是 hardcoded mock
          if (tiles && tiles.length > 0) {
            // 补足或截断到合法范围（最少 14 张）
            const padded = tiles.slice(0, 18);
            while (padded.length < 14) padded.push(0);
            app.globalData.recognizedTiles = padded;
            app.globalData.handTiles = padded;
            wx.redirectTo({ url: '/pages/input/input?prefill=1' });
          } else {
            this.useMockResult();
          }
        }
      },
    });
  },

  // Mock 识别结果（云函数未部署或失败时使用）
  useMockResult() {
    wx.showModal({
      title: '提示',
      content: '图像识别不可用，将填入示例手牌供演示，请到手动输入页确认或修改。',
      confirmText: '继续',
      cancelText: '返回',
      success: (res) => {
        if (res.confirm) {
          const mockTiles = [
            0,0,0,
            6,6,6,
            31,31,31,
            28,28,28,
            1,1
          ];
          app.globalData.recognizedTiles = mockTiles;
          app.globalData.handTiles = mockTiles;
          wx.redirectTo({ url: '/pages/input/input?prefill=1' });
        }
      }
    });
  },

  // 错误处理
  onCameraError() {
    wx.showToast({ title: '相机不可用', icon: 'none' });
  }
});
