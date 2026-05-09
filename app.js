// 国标麻将算番小程序
App({
  onLaunch: function () {
    // 初始化云开发（如需使用云函数识别）
    // 使用 try-catch 防止云环境未配置时崩溃
    try {
      if (wx.cloud) {
        wx.cloud.init({
          env: 'sando-mini-d9g53jlm6c70b6f25',
          traceUser: true,
        });
      }
    } catch (e) {
      console.warn('云开发初始化失败（可忽略，不影响手动输入功能）:', e.message);
    }
  },

  globalData: {
    handTiles: [],       // 当前手牌 [{tileId}] tileId: 0-33
    recognizedTiles: [], // 识别结果
    fanResult: null,     // 算番结果 { totalFan, details[] }
  }
});
