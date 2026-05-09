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
    // 当前允许的最大张数 (14 + 杠数)
    maxTiles: 14,
    // 选中的牌面列表（按顺序）
    selectedTiles: [],
    // 牌面分组数据
    tileGroups: [],
    // 上下文选项
    isSelfDraw: false,
    isConcealed: false,     // 门前清
    prevalentWindIndex: 0,  // 0=东,1=南,2=西,3=北
    seatWindIndex: 0,
    prevalentWinds: ['东', '南', '西', '北'],
    seatWinds: ['东', '南', '西', '北'],
    // 花牌选择 (8个: 春夏秋冬梅兰菊竹)
    flowers: [
      { name: '春', emoji: '🌸', selected: false },
      { name: '夏', emoji: '☀️', selected: false },
      { name: '秋', emoji: '🍂', selected: false },
      { name: '冬', emoji: '❄️', selected: false },
      { name: '梅', emoji: '🌺', selected: false },
      { name: '兰', emoji: '🪷', selected: false },
      { name: '菊', emoji: '🌼', selected: false },
      { name: '竹', emoji: '🎍', selected: false },
    ],
    flowerCount: 0,
    // 计算结果
    resultReady: false,
  },

  onLoad(options) {
    this.buildTileGroups();

    // 拍照识别后跳转过来的，预填手牌（识别 6-18 张都允许，不足 14 张时用户在页面里继续补齐）
    if (options && options.prefill === '1') {
      const recognized = app.globalData.recognizedTiles || [];
      if (recognized.length >= 6 && recognized.length <= 18) {
        const counts = new Array(34).fill(0);
        for (const id of recognized) {
          if (id >= 0 && id < 34) counts[id]++;
        }
        // 万一某些牌单类被识别成超过 4 张（模型偶发错误），截断到 4
        for (let i = 0; i < 34; i++) {
          if (counts[i] > 4) counts[i] = 4;
        }
        let totalCount = 0;
        let kongCount = 0;
        for (let i = 0; i < 34; i++) {
          totalCount += counts[i];
          if (counts[i] === 4) kongCount++;
        }
        const C2 = require('../../utils/constants');
        const selectedTiles = [];
        for (let i = 0; i < 34; i++) {
          for (let j = 0; j < counts[i]; j++) selectedTiles.push(C2.TILES[i]);
        }
        const tileGroups = this.data.tileGroups.map(g => ({
          ...g,
          tiles: g.tiles.map(t => ({ ...t, count: counts[t.id] })),
        }));
        this.setData({
          tileCounts: counts,
          totalCount,
          maxTiles: Math.max(14, 14 + kongCount),
          selectedTiles,
          tileGroups,
        });
        const tip = totalCount < 14
          ? `识别到 ${totalCount} 张，请补足到 14 张`
          : '已填入识别结果，请核对';
        wx.showToast({ title: tip, icon: 'none', duration: 2200 });
      }
    }
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
          emoji: tile.emoji,
          count: 0,
          colorClass: 'tile-suit-' + tile.suit
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
      // 计算当前杠数和允许的最大张数
      const nextCount = currentCount + 1;
      const tempCounts = [...counts];
      tempCounts[tileId] = nextCount;
      let kongCount = 0;
      for (let i = 0; i < 34; i++) {
        if (tempCounts[i] === 4) kongCount++;
      }
      const maxTiles = 14 + kongCount;
      let tempTotal = 0;
      for (const c of tempCounts) tempTotal += c;

      if (tempTotal > maxTiles) {
        wx.showToast({ title: `最多${maxTiles}张牌`, icon: 'none', duration: 1000 });
        return;
      }
      currentCount = nextCount;
    }

    counts[tileId] = currentCount;

    // 重新计算总张数、杠数和选中列表
    let totalCount = 0;
    let kongCount = 0;
    for (let i = 0; i < 34; i++) {
      totalCount += counts[i];
      if (counts[i] === 4) kongCount++;
    }

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
      maxTiles: 14 + kongCount,
      selectedTiles,
      tileGroups,
    });
  },

  // 长按选牌器减少计数
  onLongPressTile(e) {
    const tileId = e.currentTarget.dataset.tileId;
    this.decrementTile(tileId);
  },

  // 点击已选牌右上角的删除按钮
  onDeleteSelected(e) {
    const tileId = e.currentTarget.dataset.tileId;
    this.decrementTile(tileId);
  },

  // 减一张某种牌
  decrementTile(tileId) {
    const counts = [...this.data.tileCounts];
    if (counts[tileId] > 0) {
      counts[tileId]--;
    }

    let totalCount = 0;
    let kongCount = 0;
    for (let i = 0; i < 34; i++) {
      totalCount += counts[i];
      if (counts[i] === 4) kongCount++;
    }

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
      maxTiles: 14 + kongCount,
      selectedTiles,
      tileGroups,
    });
  },

  // 清空所有选择
  onClear() {
    this.setData({
      tileCounts: new Array(34).fill(0),
      totalCount: 0,
      maxTiles: 14,
      selectedTiles: [],
      flowers: this.data.flowers.map(f => ({ ...f, selected: false })),
      flowerCount: 0,
    });
    this.buildTileGroups();
  },

  // 切换自摸
  onToggleSelfDraw() {
    this.setData({ isSelfDraw: !this.data.isSelfDraw });
  },

  // 切换门前清
  onToggleConcealed() {
    this.setData({ isConcealed: !this.data.isConcealed });
  },

  // 切换花牌
  onToggleFlower(e) {
    const idx = e.currentTarget.dataset.idx;
    const flowers = this.data.flowers.map((f, i) =>
      i === idx ? { ...f, selected: !f.selected } : f
    );
    const flowerCount = flowers.filter(f => f.selected).length;
    this.setData({ flowers, flowerCount });
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
    if (this.data.totalCount < 14 || this.data.totalCount > 18) {
      wx.showToast({
        title: '请选择14-18张牌',
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
      isConcealed: this.data.isConcealed,
      flowerCount: this.data.flowerCount,
      flowers: this.data.flowers.filter(f => f.selected).map(f => ({ name: f.name, emoji: f.emoji })),
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
