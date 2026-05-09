// pages/result/result.js
const M = require('../../utils/mahjong');
const C = require('../../utils/constants');
const app = getApp();

Page({
  data: {
    tiles: [],           // 展示用的牌面数据
    handTileIds: [],     // 原始 tileId 数组
    flowers: [],         // 选中的花牌
    totalFan: 0,
    details: [],         // [{name, fan, desc}]
    source: '',          // 'camera' | 'input'
    loading: true,
    error: '',
  },

  onLoad(options) {
    const source = options.source || 'camera';
    const tiles = app.globalData.recognizedTiles || app.globalData.handTiles || [];
    const ctx = app.globalData.fanContext || {};

    if (tiles.length < 14 || tiles.length > 18) {
      this.setData({
        loading: false,
        error: '未找到有效手牌数据，请重新拍照或手动输入。',
      });
      return;
    }

    // 构建展示数据
    const displayTiles = tiles.map(tileId => {
      const tile = C.TILES[tileId];
      return {
        id: tileId,
        display: tile ? tile.short : '?',
        emoji: tile ? tile.emoji : '?',
        suit: tile ? tile.suit : '',
      };
    });

    this.setData({
      tiles: displayTiles,
      handTileIds: tiles,
      flowers: ctx.flowers || [],
      source,
    });

    // 计算番数
    this.calcFan(tiles, ctx);
  },

  // 计算番数
  calcFan(tileIds, ctx) {
    try {
      const result = M.calculateFan(tileIds, ctx);

      if (result.error) {
        this.setData({
          loading: false,
          error: result.error,
        });
        return;
      }

      // 按番数降序排列
      const sortedDetails = (result.details || []).sort((a, b) => b.fan - a.fan);

      this.setData({
        totalFan: result.totalFan || 0,
        details: sortedDetails,
        loading: false,
      });

    } catch (e) {
      console.error('算番异常:', e);
      this.setData({
        loading: false,
        error: '算番时出现异常：' + (e.message || '未知错误'),
      });
    }
  },

  // 重新拍照
  onRetakePhoto() {
    wx.redirectTo({ url: '/pages/camera/camera' });
  },

  // 手动修改
  onModify() {
    wx.redirectTo({ url: '/pages/input/input' });
  },

  // 返回首页
  onGoHome() {
    wx.redirectTo({ url: '/pages/index/index' });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `我这手牌${this.data.totalFan}番！`,
      path: '/pages/index/index',
    };
  }
});
