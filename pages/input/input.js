// pages/input/input.js
const C = require('../../utils/constants');
const M = require('../../utils/mahjong');
const app = getApp();

Page({
  data: {
    // 每种牌的选中数量 (0-4)
    tileCounts: new Array(34).fill(0),
    // 总选中张数
    totalCount: 0,
    // 选中的牌面列表（按顺序）
    selectedTiles: [],
    // 牌面分组数据
    tileGroups: [],
    // 上下文选项
    isSelfDraw: false,
    prevalentWindIndex: 0,  // 0=东,1=南,2=西,3=北
    seatWindIndex: 0,
    prevalentWinds: ['东', '南', '西', '北'],
    seatWinds: ['东', '南', '西', '北'],
    // 计算结果
    resultReady: false,
  },

  onLoad() {
    this.buildTileGroups();
  },

  // 构建牌面分组数据
  buildTileGroups() {
    const groups = [
      { name: '万', suit: 'wan', tiles: [] },
      { name: '条', suit: 'tiao', tiles: [] },
      { name: '饼', suit: 'bing', tiles: [] },
      { name: '风', suit: 'feng', tiles: [] },
      { name: '箭', suit: 'jian', tiles: [] },
    ];

    for (const tile of C.TILES) {
      const g = groups.find(g => g.suit === tile.suit);
      if (g) {
        g.tiles.push({
          id: tile.id,
          display: tile.display,
          short: tile.short,
          count: 0,
          colorClass: tile.suit === 'jian' || tile.suit === 'feng' ? 'tile-item-green' : ''
        });
      }
    }

    this.setData({ tileGroups: groups });
  },

  // 点击牌面：增加/减少计数
  onTapTile(e) {
    const tileId = e.currentTarget.dataset.tileId;
    const counts = [...this.data.tileCounts];
    let currentCount = counts[tileId];

    // 循环: 0→1→2→3→4→0
    if ((currentCount + 1) > 4) {
      currentCount = 0;
    } else {
      // 检查总张数不能超过14
      if (this.data.totalCount >= 14 && currentCount < 4) {
        // 但如果是从0开始且已达14，不允许
        if (counts[tileId] < 4 && this.data.totalCount >= 14) {
          wx.showToast({ title: '最多14张牌', icon: 'none', duration: 1000 });
          return;
        }
      }
      currentCount++;
    }

    counts[tileId] = currentCount;

    // 重新计算总张数和选中列表
    let totalCount = 0;
    for (const c of counts) totalCount += c;

    // 构建选中牌列表
    const selectedTiles = [];
    for (let i = 0; i < 34; i++) {
      for (let j = 0; j < counts[i]; j++) {
        selectedTiles.push(C.TILES[i]);
      }
    }

    // 更新 tileGroups 中的 count
    const tileGroups = this.data.tileGroups.map(g => ({
      ...g,
      tiles: g.tiles.map(t => ({ ...t, count: counts[t.id] }))
    }));

    this.setData({
      tileCounts: counts,
      totalCount,
      selectedTiles,
      tileGroups,
    });
  },

  // 长按减少计数
  onLongPressTile(e) {
    const tileId = e.currentTarget.dataset.tileId;
    const counts = [...this.data.tileCounts];
    if (counts[tileId] > 0) {
      counts[tileId]--;
    }

    let totalCount = 0;
    for (const c of counts) totalCount += c;

    const selectedTiles = [];
    for (let i = 0; i < 34; i++) {
      for (let j = 0; j < counts[i]; j++) {
        selectedTiles.push(C.TILES[i]);
      }
    }

    const tileGroups = this.data.tileGroups.map(g => ({
      ...g,
      tiles: g.tiles.map(t => ({ ...t, count: counts[t.id] }))
    }));

    this.setData({
      tileCounts: counts,
      totalCount,
      selectedTiles,
      tileGroups,
    });
  },

  // 清空所有选择
  onClear() {
    this.setData({
      tileCounts: new Array(34).fill(0),
      totalCount: 0,
      selectedTiles: [],
    });
    this.buildTileGroups();
  },

  // 切换自摸
  onToggleSelfDraw() {
    this.setData({ isSelfDraw: !this.data.isSelfDraw });
  },

  // 选择圈风
  onPrevalentWindChange(e) {
    this.setData({ prevalentWindIndex: parseInt(e.detail.value) });
  },

  // 选择门风
  onSeatWindChange(e) {
    this.setData({ seatWindIndex: parseInt(e.detail.value) });
  },

  // 计算番数
  onCalculate() {
    if (this.data.totalCount !== 14) {
      wx.showToast({
        title: `还剩 ${14 - this.data.totalCount} 张牌需要选择`,
        icon: 'none',
        duration: 2000,
      });
      return;
    }

    // 构建 tileId 数组
    const tileIds = [];
    for (let i = 0; i < 34; i++) {
      for (let j = 0; j < this.data.tileCounts[i]; j++) {
        tileIds.push(i);
      }
    }

    // 构建上下文
    const ctx = {
      isSelfDraw: this.data.isSelfDraw,
      prevalentWind: this.data.prevalentWinds[this.data.prevalentWindIndex],
      seatWind: this.data.seatWinds[this.data.seatWindIndex],
    };

    // 保存到全局
    app.globalData.handTiles = tileIds;
    app.globalData.recognizedTiles = tileIds;
    app.globalData.fanContext = ctx;

    // 跳转结果页
    wx.navigateTo({ url: '/pages/result/result?source=input' });
  }
});
