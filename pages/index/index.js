// pages/index/index.js
const app = getApp();

Page({
  data: {},

  onTapCamera() {
    wx.navigateTo({ url: '/pages/camera/camera' });
  },

  onTapManual() {
    wx.navigateTo({ url: '/pages/input/input' });
  },

  onShareAppMessage() {
    return {
      title: '国标麻将算番 - 拍照识别算番数',
      path: '/pages/index/index',
    };
  }
});
