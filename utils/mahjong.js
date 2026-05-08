/**
 * 国标麻将算番引擎
 * 手牌拆解 + 番种检查 + 不重复计分
 */

const C = require('./constants');

// ---- 牌面辅助函数 ----

/** 统计每种牌的数量，返回长度为34的数组 */
function countTiles(tiles) {
  const cnt = new Array(34).fill(0);
  for (const t of tiles) cnt[t]++;
  return cnt;
}

/** 是否为幺九牌（1、9、风、箭） */
function isTerminalOrHonor(id) {
  if (id >= 27) return true;               // 风/箭
  const rank = id % 9 + 1;
  return rank === 1 || rank === 9;          // 1或9
}

/** 是否为字牌（风、箭） */
function isHonor(id) {
  return id >= 27;
}

/** 是否为数牌 */
function isNumbered(id) {
  return id < 27;
}

/** 是否可构成绿一色的牌（2,3,4,6,8条 + 发） */
function isGreenTile(id) {
  const GREEN = new Set([10, 11, 12, 14, 16, 32]); // 2,3,4,6,8条 + 发
  return GREEN.has(id);
}

/** 获取牌的 suit */
function suitOf(id) {
  return C.TILES[id].suit;
}

/** 获取牌的 rank (1-9 for numbered, 1-4 for winds, 1-3 for dragons) */
function rankOf(id) {
  return C.TILES[id].rank;
}

// ---- 手牌拆解引擎 ----

/**
 * 找到所有有效的拆解方式
 * 支持 14-18 张牌（超出14张的部分来自杠的补牌）
 * 返回 [{pair: tileId, melds: [{type:'pung'|'chow', tile}|{type:'chow',start}]}]
 */
function findAllDecompositions(tiles) {
  const totalTiles = tiles.length;
  if (totalTiles < 14 || totalTiles > 18) return [];

  const rawCount = countTiles(tiles);

  // 识别杠：统计有四张的牌种类数
  let kongCount = 0;
  for (let i = 0; i < 34; i++) {
    if (rawCount[i] === 4) kongCount++;
  }

  // 牌数必须与杠数匹配：总牌数 = 14 + kongCount
  if (totalTiles !== 14 + kongCount) return [];

  // 将杠还原为刻子（4张→3张），使剩余牌可正常拆解为14张
  const count = [...rawCount];
  for (let i = 0; i < 34; i++) {
    if (count[i] === 4) count[i] = 3;
  }

  const results = [];

  // 尝试每种可能的将牌（基于还原后的14张）
  for (let i = 0; i < 34; i++) {
    if (count[i] >= 2) {
      count[i] -= 2;
      const meldCombos = decomposeIntoMelds(count, 4);
      for (const melds of meldCombos) {
        results.push({ pair: i, melds });
      }
      count[i] += 2;
    }
  }

  return results;
}

/** 递归拆解：从 count 中拆除 remaining 个面子，返回所有可能的面子组合列表 */
function decomposeIntoMelds(count, remaining) {
  if (remaining === 0) {
    // 检查是否全部拆完
    for (let i = 0; i < 34; i++) {
      if (count[i] !== 0) return [];
    }
    return [[]];
  }
  
  const results = [];
  
  for (let i = 0; i < 34; i++) {
    if (count[i] === 0) continue;
    
    // 尝试刻子 (pung: 3张相同)
    if (count[i] >= 3) {
      count[i] -= 3;
      const sub = decomposeIntoMelds(count, remaining - 1);
      for (const s of sub) {
        results.push([{ type: 'pung', tile: i }, ...s]);
      }
      count[i] += 3;
    }
    
    // 尝试顺子 (chow: 同花色连续3张) — 仅数牌且 rank 1-7
    if (i < 27 && i % 9 <= 6) {
      if (count[i] >= 1 && count[i + 1] >= 1 && count[i + 2] >= 1) {
        count[i]--; count[i + 1]--; count[i + 2]--;
        const sub = decomposeIntoMelds(count, remaining - 1);
        for (const s of sub) {
          results.push([{ type: 'chow', start: i }, ...s]);
        }
        count[i]++; count[i + 1]++; count[i + 2]++;
      }
    }
    
    // 一旦从前面的牌开始拆，就不再从后面的牌开始（避免重复拆解）
    // 这确保每个牌组合只被一种方式尝试
    break;
  }
  
  return results;
}

/**
 * 判断是否所有牌都是相同的花色（仅数牌）
 * @returns {string|null} 统一的花色，或 null
 */
function uniformSuit(count) {
  let suit = null;
  for (let i = 0; i < 27; i++) {
    if (count[i] > 0) {
      const s = suitOf(i);
      if (suit === null) suit = s;
      else if (suit !== s) return null;
    }
  }
  return suit;
}

/** 判断是否包含特定花色的数牌 */
function hasNumberedSuit(count, suit) {
  for (let i = 0; i < 27; i++) {
    if (count[i] > 0 && suitOf(i) === suit) return true;
  }
  return false;
}

/** 统计花色分布 */
function suitDistribution(count) {
  const dist = {};
  for (let i = 0; i < 34; i++) {
    if (count[i] > 0) {
      const s = suitOf(i);
      dist[s] = (dist[s] || 0) + count[i];
    }
  }
  return dist;
}

// ---- 番种检查函数 ----
// 每个函数签名: (count: 各牌数量数组, decomp: 拆解对象, ctx: 上下文) => boolean
// 有些检查不依赖拆解（如清一色），此时 decomp 可能为 null

function checkDaSiXi(count, decomp) {
  // 东南西北各三张(刻子)，加任意一对将
  if (!decomp) return false;
  const pungTiles = new Set();
  for (const m of decomp.melds) {
    if (m.type === 'pung') pungTiles.add(m.tile);
  }
  return [27, 28, 29, 30].every(id => pungTiles.has(id));
}

function checkDaSanYuan(count, decomp) {
  // 中发白各三张
  if (!decomp) return false;
  const pungTiles = new Set();
  for (const m of decomp.melds) {
    if (m.type === 'pung') pungTiles.add(m.tile);
  }
  return [31, 32, 33].every(id => pungTiles.has(id));
}

function checkLvYiSe(count, decomp) {
  // 仅由23468条和发财组成
  for (let i = 0; i < 34; i++) {
    if (count[i] > 0 && !isGreenTile(i)) return false;
  }
  return true;
}

function checkJiuLianBaoDeng(count, decomp) {
  // 同花色 1112345678999 + 任意一张
  const suit = uniformSuit(count);
  if (!suit) return false;
  
  const base = { wan: 0, tiao: 9, bing: 18 }[suit];
  const expected = [1,1,1,1,1,1,1,1,1,1,1,1,1,1]; // 待匹配，实际: 3,1,1,1,1,1,1,1,1,3
  
  // 构建实际 count for this suit
  const pattern = [];
  for (let i = 0; i < 9; i++) {
    pattern.push(count[base + i]);
  }
  
  // 九莲宝灯模式：至少3张1和3张9，其余各至少1张，总数14
  for (let i = 0; i < 9; i++) {
    const required = [3, 1, 1, 1, 1, 1, 1, 1, 3];
    if (pattern[i] < required[i]) return false;
  }
  
  // 检查是否正好多出一张（1112345678999 共13张 + 任1 = 14张）
  let extra = 0;
  for (let i = 0; i < 9; i++) {
    extra += pattern[i] - [3, 1, 1, 1, 1, 1, 1, 1, 3][i];
  }
  return extra === 1;
}

function checkSiGang(count, decomp) {
  // 四杠：4个杠，每个杠由4张相同牌组成
  // 直接从牌面计数：统计出现4张的牌种类数
  let kongCount = 0;
  for (let i = 0; i < 34; i++) {
    if (count[i] === 4) kongCount++;
  }
  return kongCount >= 4;
}

function checkLianQiDui(count, decomp) {
  // 同花色连续7个对子: aabbccddeeffgg (同花色连续)
  // 每张牌恰好2张，且同花色，排序后形成连续序列
  const pairs = [];
  for (let i = 0; i < 34; i++) {
    if (count[i] > 0) {
      if (count[i] !== 2) return false;  // 每张必须恰好2张
      pairs.push(i);
    }
  }
  if (pairs.length !== 7) return false;
  
  // 检查同花色且连续
  const sorted = pairs.sort((a, b) => a - b);
  const baseSuit = suitOf(sorted[0]);
  if (baseSuit === 'feng' || baseSuit === 'jian') return false;
  if (baseSuit === 'wan' && sorted[0] > 8) return false;
  if (baseSuit === 'tiao' && sorted[0] < 9) return false;
  if (baseSuit === 'bing' && sorted[0] < 18) return false;
  
  for (let i = 1; i < 7; i++) {
    if (suitOf(sorted[i]) !== baseSuit) return false;
    if (sorted[i] !== sorted[i-1] + 1) return false;
  }
  return true;
}

function checkShiSanYao(count, decomp) {
  // 19万、19条、19饼、东南西北中发白各一张 + 任意一张做将
  const yaojiu = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33]; // 13种幺九
  for (const id of yaojiu) {
    if (count[id] < 1) return false;
  }
  // 检查将牌：其中一张幺九牌需有2张
  let pairCount = 0;
  let total = 0;
  for (const id of yaojiu) {
    total += count[id];
    if (count[id] >= 2) pairCount++;
  }
  // 允许将牌是幺九中的一种（恰好2张），其余各1张，非幺九不能出现
  // 总数应为14
  if (total !== 14) return false;
  // 13种幺九牌中，一种为将(2张)，其余12种各1张
  return pairCount === 1;
}

function checkXiaoSiXi(count, decomp) {
  // 风牌中三副刻子 + 一对风牌做将 + 另一副面子
  if (!decomp) return false;
  const fengPungs = decomp.melds.filter(m => m.type === 'pung' && suitOf(m.tile) === 'feng');
  return fengPungs.length === 3 && suitOf(decomp.pair) === 'feng';
}

function checkXiaoSanYuan(count, decomp) {
  // 箭牌中两副刻子 + 一对箭牌做将 + 另一副面子
  if (!decomp) return false;
  const jianPungs = decomp.melds.filter(m => m.type === 'pung' && suitOf(m.tile) === 'jian');
  return jianPungs.length === 2 && suitOf(decomp.pair) === 'jian';
}

function checkZiYiSe(count, decomp) {
  // 全部由风牌和箭牌组成
  for (let i = 0; i < 27; i++) {
    if (count[i] > 0) return false;
  }
  return true;
}

function checkSiAnKe(count, decomp) {
  // 四个暗刻 — 四个刻子且没有吃/碰/明杠
  // 在手牌层面：4个刻子 + 1对将，所有刻子都是暗的
  // 这需要 context 来确认，这里简化为检查结构
  if (!decomp) return false;
  return decomp.melds.every(m => m.type === 'pung') && decomp.melds.length === 4;
}

function checkYiSeShuangLongHui(count, decomp) {
  // 同花色 123 123 789 789 + 5做将
  if (!decomp) return false;
  const suit = uniformSuit(count);
  if (!suit) return false;
  if (rankOf(decomp.pair) !== 5 || suitOf(decomp.pair) !== suit) return false;
  
  // 检查四个顺子
  const base = { wan: 0, tiao: 9, bing: 18 }[suit];
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length !== 4) return false;
  
  const chowStarts = chows.map(c => c.start);
  const expected = [base, base, base+6, base+6];
  chowStarts.sort((a, b) => a - b);
  expected.sort((a, b) => a - b);
  return chowStarts.every((v, i) => v === expected[i]);
}

function checkYiSeSiTongShun(count, decomp) {
  // 同一花色四副相同的顺子
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length !== 4) return false;
  const starts = chows.map(c => c.start);
  return starts.every(s => s === starts[0]);
}

function checkYiSeSiJieGao(count, decomp) {
  // 同花色四副递增的刻子 (如 111 222 333 444条 + 一对将)
  if (!decomp) return false;
  const pungs = decomp.melds.filter(m => m.type === 'pung' && isNumbered(m.tile));
  if (pungs.length !== 4) return false;
  const suit = suitOf(pungs[0].tile);
  if (pungs.some(p => suitOf(p.tile) !== suit)) return false;
  
  const sorted = pungs.map(p => rankOf(p.tile)).sort((a, b) => a - b);
  for (let i = 1; i < 4; i++) {
    if (sorted[i] !== sorted[i-1] + 1) return false;
  }
  return true;
}

function checkYiSeSiBuGao(count, decomp) {
  // 同花色四副递增1或2的顺子
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length !== 4) return false;
  const suit = suitOf(chows[0].start);
  if (chows.some(c => suitOf(c.start) !== suit)) return false;
  
  const starts = chows.map(c => rankOf(c.start)).sort((a, b) => a - b);
  for (let i = 1; i < 4; i++) {
    const step = starts[i] - starts[i-1];
    if (step !== 1 && step !== 2) return false;
  }
  return true;
}

function checkSanGang(count, decomp) {
  // 三杠：3个杠，每个杠由4张相同牌组成
  let kongCount = 0;
  for (let i = 0; i < 34; i++) {
    if (count[i] === 4) kongCount++;
  }
  return kongCount >= 3;
}

function checkHunYaoJiu(count, decomp) {
  // 全部由幺九牌组成
  for (let i = 0; i < 34; i++) {
    if (count[i] > 0 && !isTerminalOrHonor(i)) return false;
  }
  return true;
}

function checkSanFengKe(count, decomp) {
  // 三副风刻
  if (!decomp) return false;
  const fengPungs = decomp.melds.filter(m => m.type === 'pung' && suitOf(m.tile) === 'feng');
  return fengPungs.length >= 3;
}

function checkWuMenQi(count, decomp) {
  // 五种花色(万、条、饼、风、箭)至少各有一副面子或一对将
  if (!decomp) return false;
  const suits = { wan: false, tiao: false, bing: false, feng: false, jian: false };
  
  for (const m of decomp.melds) {
    suits[suitOf(m.type === 'pung' ? m.tile : m.start)] = true;
  }
  suits[suitOf(decomp.pair)] = true;
  
  return Object.values(suits).every(v => v);
}

function checkYiSeSanBuGao(count, decomp) {
  // 同花色三副递增1或2的顺子
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 3) return false;
  
  // 找到同花色的顺子
  for (const suit of ['wan', 'tiao', 'bing']) {
    const base = { wan: 0, tiao: 9, bing: 18 }[suit];
    const suitChows = chows.filter(c => c.start >= base && c.start < base + 7);
    if (suitChows.length >= 3) {
      const starts = suitChows.map(c => rankOf(c.start)).sort((a, b) => a - b);
      // 检查是否有三个顺子递增1或2
      for (let i = 0; i <= starts.length - 3; i++) {
        const a = starts[i], b = starts[i+1], c = starts[i+2];
        if ((b-a === 1 || b-a === 2) && (c-b === 1 || c-b === 2)) return true;
      }
    }
  }
  return false;
}

function checkQuanDaiWu(count, decomp) {
  // 每副面子和将牌都带5 (5万/5条/5饼)
  if (!decomp) return false;
  for (const m of decomp.melds) {
    if (m.type === 'pung') {
      if (rankOf(m.tile) !== 5 || suitOf(m.tile) === 'feng' || suitOf(m.tile) === 'jian') return false;
    } else {
      // chow: start, start+1, start+2, 其中一个必须是5
      const r = rankOf(m.start);
      if (r !== 3 && r !== 4 && r !== 5) return false; // 3-4-5, 4-5-6, or 5-6-7
    }
  }
  // 将牌也是5
  return rankOf(decomp.pair) === 5 && isNumbered(decomp.pair);
}

function checkQuanDa(count, decomp) {
  // 全部由789组成 (数牌rank 7/8/9)
  for (let i = 0; i < 27; i++) {
    if (count[i] > 0) {
      const r = i % 9 + 1;
      if (r < 7) return false;
    }
  }
  for (let i = 27; i < 34; i++) {
    if (count[i] > 0) return false;  // 无字牌
  }
  return true;
}

function checkQuanZhong(count, decomp) {
  // 全部由456组成
  for (let i = 0; i < 27; i++) {
    if (count[i] > 0) {
      const r = i % 9 + 1;
      if (r < 4 || r > 6) return false;
    }
  }
  for (let i = 27; i < 34; i++) {
    if (count[i] > 0) return false;
  }
  return true;
}

function checkQuanXiao(count, decomp) {
  // 全部由123组成
  for (let i = 0; i < 27; i++) {
    if (count[i] > 0) {
      const r = i % 9 + 1;
      if (r > 3) return false;
    }
  }
  for (let i = 27; i < 34; i++) {
    if (count[i] > 0) return false;
  }
  return true;
}

function checkYiSeSanTongShun(count, decomp) {
  // 同一花色三副相同的顺子
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 3) return false;
  
  // 按起始index分组
  const groups = {};
  for (const c of chows) {
    const key = c.start;
    groups[key] = (groups[key] || 0) + 1;
  }
  return Object.values(groups).some(v => v >= 3);
}

function checkYiSeSanJieGao(count, decomp) {
  // 同花色三副递增的刻子
  if (!decomp) return false;
  const pungs = decomp.melds.filter(m => m.type === 'pung' && isNumbered(m.tile));
  if (pungs.length < 3) return false;
  
  for (const suit of ['wan', 'tiao', 'bing']) {
    const base = { wan: 0, tiao: 9, bing: 18 }[suit];
    const suitPungs = pungs.filter(p => p.tile >= base && p.tile < base + 9);
    if (suitPungs.length >= 3) {
      const ranks = suitPungs.map(p => rankOf(p.tile)).sort((a, b) => a - b);
      for (let i = 0; i <= ranks.length - 3; i++) {
        if (ranks[i+1] === ranks[i] + 1 && ranks[i+2] === ranks[i] + 2) return true;
      }
    }
  }
  return false;
}

function checkQuanShuangKe(count, decomp) {
  // 全部由2,4,6,8的刻子组成
  if (!decomp) return false;
  for (const m of decomp.melds) {
    if (m.type !== 'pung') return false;
    const r = rankOf(m.tile);
    if (r !== 2 && r !== 4 && r !== 6 && r !== 8) return false;
  }
  const r = rankOf(decomp.pair);
  return r === 2 || r === 4 || r === 6 || r === 8;
}

function checkQingLong(count, decomp) {
  // 同花色123、456、789三副顺子
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 3) return false;
  
  for (const suit of ['wan', 'tiao', 'bing']) {
    const base = { wan: 0, tiao: 9, bing: 18 }[suit];
    const suitChows = chows.filter(c => c.start >= base && c.start < base + 7);
    if (suitChows.length >= 3) {
      const starts = new Set(suitChows.map(c => c.start));
      if (starts.has(base) && starts.has(base + 3) && starts.has(base + 6)) return true;
    }
  }
  return false;
}

function checkSanSeShuangLongHui(count, decomp) {
  // 两种花色123、789，第三种花色5做将
  if (!decomp) return false;
  if (rankOf(decomp.pair) !== 5 || !isNumbered(decomp.pair)) return false;
  
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length !== 4) return false;
  
  // 将牌的花色
  const pairSuit = suitOf(decomp.pair);
  
  // 另外两种花色，每种有123和789
  const otherSuits = ['wan', 'tiao', 'bing'].filter(s => s !== pairSuit);
  for (const s of otherSuits) {
    const base = { wan: 0, tiao: 9, bing: 18 }[s];
    const sChows = chows.filter(c => suitOf(c.start) === s);
    if (sChows.length !== 2) return false;
    const starts = sChows.map(c => c.start);
    if (!starts.includes(base) || !starts.includes(base + 6)) return false;
  }
  return true;
}

function checkQiDui(count, decomp) {
  // 七个对子
  let pairCount = 0;
  let tileCount = 0;
  for (let i = 0; i < 34; i++) {
    tileCount += count[i];
    if (count[i] % 2 !== 0) return false;  // 每张牌必须是偶数
    pairCount += count[i] / 2;
  }
  return tileCount === 14 && pairCount === 7;
}

// ---- 中档番种 ----
function checkSanSeSanTongShun(count, decomp) {
  // 三种花色同一序数的顺子
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 3) return false;
  
  const byRank = {};
  for (const c of chows) {
    const key = `${suitOf(c.start)}-${rankOf(c.start)}`;
    byRank[key] = (byRank[key] || 0) + 1;
  }
  
  // 检查万/条/饼各有同一序数的顺子
  for (let r = 1; r <= 7; r++) {
    if (
      (byRank[`wan-${r}`] || 0) >= 1 &&
      (byRank[`tiao-${r}`] || 0) >= 1 &&
      (byRank[`bing-${r}`] || 0) >= 1
    ) return true;
  }
  return false;
}

function checkSanSeSanJieGao(count, decomp) {
  // 三种花色递增一位的刻子
  if (!decomp) return false;
  const pungs = decomp.melds.filter(m => m.type === 'pung' && isNumbered(m.tile));
  if (pungs.length < 3) return false;
  
  const suits = ['wan', 'tiao', 'bing'];
  for (let startRank = 1; startRank <= 7; startRank++) {
    const bases = { wan: 0, tiao: 9, bing: 18 };
    const needed = suits.map(s => bases[s] + startRank - 1);
    if (needed.every(t => pungs.some(p => p.tile === t))) return true;
  }
  return false;
}

function checkSanTongKe(count, decomp) {
  // 三种花色同一序数的刻子
  if (!decomp) return false;
  const pungs = decomp.melds.filter(m => m.type === 'pung' && isNumbered(m.tile));
  if (pungs.length < 3) return false;
  
  const suits = ['wan', 'tiao', 'bing'];
  for (let r = 1; r <= 9; r++) {
    const tiles = suits.map(s => ({ wan: 0, tiao: 9, bing: 18 }[s] + r - 1));
    if (tiles.every(t => pungs.some(p => p.tile === t))) return true;
  }
  return false;
}

function checkSanAnKe(count, decomp) {
  // 三个暗刻 — 近似为3个刻子
  if (!decomp) return false;
  return decomp.melds.filter(m => m.type === 'pung').length >= 3;
}

function checkSanSeSanBuGao(count, decomp) {
  // 三种花色递增一位的顺子（如1万2条3饼，2万3条4饼...）
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 3) return false;
  
  const suits = ['wan', 'tiao', 'bing'];
  for (let startRank = 1; startRank <= 7; startRank++) {
    const bases = { wan: 0, tiao: 9, bing: 18 };
    let found = true;
    for (let i = 0; i < 3; i++) {
      const tileId = bases[suits[i]] + startRank - 1 + i;
      if (!chows.some(c => c.start === tileId)) {
        found = false;
        break;
      }
    }
    if (found) return true;
  }
  return false;
}

function checkHuaLong(count, decomp) {
  // 三种花色依次组成123、456、789
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 3) return false;
  
  const bases = { wan: 0, tiao: 9, bing: 18 };
  const patterns = [
    [0, bases.wan], [3, bases.wan], [6, bases.wan], // 123,456,789 in wan
    // ... many combinations, try all
  ];
  
  // 尝试所有花色-顺序的排列
  const suitPerms = [
    ['wan', 'tiao', 'bing'],
    ['wan', 'bing', 'tiao'],
    ['tiao', 'wan', 'bing'],
    ['tiao', 'bing', 'wan'],
    ['bing', 'wan', 'tiao'],
    ['bing', 'tiao', 'wan'],
  ];
  
  for (const perm of suitPerms) {
    const needed = [
      bases[perm[0]],      // 123
      bases[perm[1]] + 3,  // 456
      bases[perm[2]] + 6,  // 789
    ];
    if (needed.every(t => chows.some(c => c.start === t))) return true;
  }
  return false;
}

function checkQingYiSe(count, decomp) {
  // 全部由一种花色的数牌组成，无字牌
  for (let i = 27; i < 34; i++) {
    if (count[i] > 0) return false;
  }
  return uniformSuit(count) !== null;
}

function checkHunYiSe(count, decomp) {
  // 一种数牌花色 + 字牌
  let numberedSuit = null;
  for (let i = 0; i < 27; i++) {
    if (count[i] > 0) {
      const s = suitOf(i);
      if (numberedSuit === null) numberedSuit = s;
      else if (numberedSuit !== s) return false;
    }
  }
  return numberedSuit !== null; // 至少有一种数牌
}

function checkQuanDaiYao(count, decomp) {
  // 每副面子和将牌均带幺九
  if (!decomp) {
    // 无拆解时，用全局逻辑
    for (let i = 0; i < 34; i++) {
      if (count[i] > 0 && !isTerminalOrHonor(i)) return false;
      if (!isTerminalOrHonor(i)) {
        // 有非幺九的中张牌则不行
        // 但全幺九被混幺九覆盖了
      }
    }
    // 纯看牌面：如果全是幺九，pass；否则需要拆解确认每副组均带幺九
    return false; // 带幺九需要拆解
  }
  
  for (const m of decomp.melds) {
    if (m.type === 'pung') {
      if (!isTerminalOrHonor(m.tile)) return false;
    } else {
      // chow: start, start+1, start+2 至少一个带幺九
      const r = rankOf(m.start);
      if (r !== 1 && r !== 7) return false; // 只有 1-2-3(带1) 或 7-8-9(带9)
    }
  }
  return isTerminalOrHonor(decomp.pair);
}

function checkPengPengHu(count, decomp) {
  // 四个刻子 + 一对将
  if (!decomp) return false;
  return decomp.melds.every(m => m.type === 'pung');
}

function checkPingHe(count, decomp) {
  // 四个顺子，非字牌做将
  if (!decomp) return false;
  if (!decomp.melds.every(m => m.type === 'chow')) return false;
  return !isHonor(decomp.pair);
}

function checkShuangJianKe(count, decomp) {
  // 两副箭刻
  if (!decomp) return false;
  const jianPungs = decomp.melds.filter(m => m.type === 'pung' && suitOf(m.tile) === 'jian');
  return jianPungs.length >= 2;
}

function checkShuangAnKe(count, decomp) {
  // 两个暗刻 — 近似为2个刻子
  if (!decomp) return false;
  return decomp.melds.filter(m => m.type === 'pung').length >= 2;
}

function checkBuQiuRen(count, decomp, ctx) {
  // 门前清且自摸 — 在仅看手牌时无法判断，需要 context
  // 这里假设手牌无吃碰明杠即满足
  return (ctx && ctx.isSelfDraw) || false;
}

function checkShuangTongKe(count, decomp) {
  // 两种花色同一序数的刻子
  if (!decomp) return false;
  const pungs = decomp.melds.filter(m => m.type === 'pung' && isNumbered(m.tile));
  if (pungs.length < 2) return false;
  
  const byRank = {};
  for (const p of pungs) {
    const r = rankOf(p.tile);
    const s = suitOf(p.tile);
    if (!byRank[`${r}-${s}`]) {
      byRank[`${r}-${s}`] = true;
      const sameRank = pungs.filter(pp => rankOf(pp.tile) === r);
      const suits = new Set(sameRank.map(pp => suitOf(pp.tile)));
      if (suits.size >= 2) return true;
    }
  }
  return false;
}

function checkJianKe(count, decomp) {
  // 一副箭刻
  if (!decomp) return false;
  return decomp.melds.some(m => m.type === 'pung' && suitOf(m.tile) === 'jian');
}

function checkQuanFengKe(count, decomp, ctx) {
  // 圈风刻 — 需要知道圈风是什么
  if (!decomp || !ctx || !ctx.prevalentWind) return false;
  const windMap = { 东: 27, 南: 28, 西: 29, 北: 30 };
  const targetTile = windMap[ctx.prevalentWind];
  return decomp.melds.some(m => m.type === 'pung' && m.tile === targetTile);
}

function checkMenFengKe(count, decomp, ctx) {
  // 门风刻 — 需要知道门风
  if (!decomp || !ctx || !ctx.seatWind) return false;
  const windMap = { 东: 27, 南: 28, 西: 29, 北: 30 };
  const targetTile = windMap[ctx.seatWind];
  return decomp.melds.some(m => m.type === 'pung' && m.tile === targetTile);
}

function checkMingGang(count, decomp) {
  // 明杠：有杠（4张相同牌），拍照可见，从数量推断
  let kongCount = 0;
  for (let i = 0; i < 34; i++) {
    if (count[i] === 4) kongCount++;
  }
  return kongCount >= 1;
}

function checkMenQianQing(count, decomp, ctx) {
  // 门前清 — 没有吃碰明杠
  // 在手牌层面无法判断，需要 context
  return (ctx && ctx.isConcealed) || true; // 默认假设满足
}

function checkSiGuiYi(count, decomp) {
  // 四张相同的牌分在顺子和刻子中
  // 检查是否有牌在手中出现恰好4张
  // 且它们分布在不同的面子中
  if (!decomp) return false;
  for (let i = 0; i < 34; i++) {
    if (count[i] === 4) {
      // 检查这四张是否分散在不同面子中
      let inPung = false, inChow = false;
      for (const m of decomp.melds) {
        if (m.type === 'pung' && m.tile === i) inPung = true;
        if (m.type === 'chow' && i >= m.start && i <= m.start + 2) inChow = true;
      }
      if (inPung && inChow) return true;
    }
  }
  return false;
}

function checkDuanYao(count, decomp) {
  // 无幺九牌（1、9和字牌都没有）
  for (let i = 0; i < 34; i++) {
    if (count[i] > 0 && isTerminalOrHonor(i)) return false;
  }
  return true;
}

function checkYiBanGao(count, decomp) {
  // 同一花色两副相同的顺子
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 2) return false;
  
  const groups = {};
  for (const c of chows) {
    const key = `${c.start}`;
    groups[key] = (groups[key] || 0) + 1;
  }
  return Object.values(groups).some(v => v >= 2);
}

function checkXiXiangFeng(count, decomp) {
  // 两种花色相同序数的顺子 (如1-2-3万 和 1-2-3条)
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 2) return false;
  
  const byRankSuit = {};
  for (const c of chows) {
    const r = rankOf(c.start);
    const s = suitOf(c.start);
    const key = r;
    if (!byRankSuit[key]) byRankSuit[key] = new Set();
    byRankSuit[key].add(s);
  }
  return Object.values(byRankSuit).some(set => set.size >= 2);
}

function checkLianLiu(count, decomp) {
  // 同一花色六连顺 (如123456)
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 2) return false;
  
  for (const suit of ['wan', 'tiao', 'bing']) {
    const base = { wan: 0, tiao: 9, bing: 18 }[suit];
    const suitChows = chows.filter(c => c.start >= base && c.start < base + 4);
    if (suitChows.length >= 2) {
      const starts = suitChows.map(c => c.start).sort((a, b) => a - b);
      if (starts.includes(base) && starts.includes(base + 3)) return true;
    }
  }
  return false;
}

function checkLaoShaoFu(count, decomp) {
  // 同一花色123和789两副顺子
  if (!decomp) return false;
  const chows = decomp.melds.filter(m => m.type === 'chow');
  if (chows.length < 2) return false;
  
  for (const suit of ['wan', 'tiao', 'bing']) {
    const base = { wan: 0, tiao: 9, bing: 18 }[suit];
    const suitChows = chows.filter(c => c.start >= base && c.start < base + 7);
    const starts = suitChows.map(c => c.start);
    if (starts.includes(base) && starts.includes(base + 6)) return true;
  }
  return false;
}

function checkYaoJiuKe(count, decomp) {
  // 幺九刻 — 幺九牌的刻子
  if (!decomp) return false;
  return decomp.melds.some(m => m.type === 'pung' && isTerminalOrHonor(m.tile));
}

function checkQueYiMen(count, decomp) {
  // 缺少万、条、饼中的一种
  const suits = suitDistribution(count);
  const numberedSuits = ['wan', 'tiao', 'bing'].filter(s => suits[s]);
  return numberedSuits.length <= 2;
}

function checkWuZi(count, decomp) {
  // 没有字牌
  for (let i = 27; i < 34; i++) {
    if (count[i] > 0) return false;
  }
  return true;
}

function checkZiMo(count, decomp, ctx) {
  return (ctx && ctx.isSelfDraw) || false;
}

// ---- 番种检查注册表 ----
// 将 check 函数映射到 FAN_TYPES 中的 id
const CHECK_REGISTRY = {
  1:  checkDaSiXi,
  2:  checkDaSanYuan,
  3:  checkLvYiSe,
  4:  checkJiuLianBaoDeng,
  5:  checkSiGang,
  6:  checkLianQiDui,
  7:  checkShiSanYao,
  8:  checkXiaoSiXi,
  9:  checkXiaoSanYuan,
  10: checkZiYiSe,
  // 11: checkSiAnKe,  // 四暗刻 — 拍照无法判断明暗，已移除
  12: checkYiSeShuangLongHui,
  13: checkYiSeSiTongShun,
  14: checkYiSeSiJieGao,
  15: checkYiSeSiBuGao,
  16: checkSanGang,
  17: checkHunYaoJiu,
  18: checkSanFengKe,
  19: checkWuMenQi,
  20: checkYiSeSanBuGao,
  21: checkQuanDaiWu,
  22: checkQuanDa,
  23: checkQuanZhong,
  24: checkQuanXiao,
  25: checkYiSeSanTongShun,
  26: checkYiSeSanJieGao,
  27: checkQuanShuangKe,
  28: checkQingYiSe,
  29: checkSanSeShuangLongHui,
  30: checkQiDui,
  32: checkSanSeSanTongShun,
  33: checkSanSeSanJieGao,
  34: checkSanTongKe,
  // 35: checkSanAnKe,  // 三暗刻 — 拍照无法判断明暗，已移除
  36: checkSanSeSanBuGao,
  37: checkHuaLong,
  41: checkQingLong,
  55: checkHunYiSe,
  56: checkQuanDaiYao,
  60: checkPengPengHu,
  61: checkHunYiSe,
  62: checkSanSeSanBuGao,
  63: checkWuMenQi,
  65: checkShuangJianKe,
  // 66: checkShuangAnKe,  // 双暗刻 — 拍照无法判断明暗，已移除
  // 90: 双暗刻(2番) — 同上，已移除
  67: checkQuanDaiYao,
  68: checkBuQiuRen,
  71: checkShuangTongKe,
  72: checkQuanDaiYao,
  73: checkBuQiuRen,
  76: checkJianKe,
  77: checkQuanFengKe,
  78: checkMenFengKe,
  // 79: checkMenQianQing,  // 门前清(停用) — 拍照无法判断是否吃碰杠
  80: checkSiGuiYi,
  82: checkPingHe,
  83: checkDuanYao,
  84: checkJianKe,
  85: checkQuanFengKe,
  86: checkMenFengKe,
  // 87: checkMenQianQing,  // 门前清(停用)
  88: checkSiGuiYi,
  92: checkYiBanGao,
  93: checkXiXiangFeng,
  94: checkLianLiu,
  95: checkLaoShaoFu,
  96: checkYaoJiuKe,
  97: checkMingGang,
  98: checkQueYiMen,
  99: checkWuZi,
  103: checkZiMo,
};

// ---- 计分引擎 ----

/** 应用番种互斥规则，过滤被蕴含的低番种 */
function resolveExclusions(fanIds) {
  const toRemove = new Set();
  for (const higherId of fanIds) {
    const lowerIds = C.FAN_EXCLUSIONS[higherId] || [];
    for (const lowerId of lowerIds) {
      if (fanIds.includes(lowerId)) {
        toRemove.add(lowerId);
      }
    }
  }
  return fanIds.filter(id => !toRemove.has(id));
}

/**
 * 主入口：计算手牌的番数
 * @param {number[]} tiles - 14张牌的 tileId 数组
 * @param {object} ctx - 上下文: { isSelfDraw, prevalentWind, seatWind, isConcealed, isLastTile, isKongBloom, isRobbingKong }
 * @returns {{ totalFan: number, details: Array<{name, fan}> }} 算番结果
 */
function calculateFan(tiles, ctx = {}) {
  if (!tiles || tiles.length < 14 || tiles.length > 18) {
    return { totalFan: 0, details: [], error: '手牌必须为14-18张' };
  }

  const count = countTiles(tiles);
  const decomps = findAllDecompositions(tiles);

  // 七对和十三幺之类的特殊牌型不需要拆解
  // 先检查这些特殊牌型

  // 对所有拆解方案尝试计算，取最高番
  let bestResult = { totalFan: 0, details: [] };

  // 如果无拆解，尝试全局检查（七对、十三幺等）
  const allDecomps = decomps.length > 0 ? decomps : [null];

  for (const decomp of allDecomps) {
    const applicableIds = [];

    for (const fanType of C.FAN_TYPES) {
      const checkFn = CHECK_REGISTRY[fanType.id];
      if (!checkFn) continue; // 未实现的番种跳过
      
      try {
        if (checkFn(count, decomp, ctx)) {
          applicableIds.push(fanType.id);
        }
      } catch (e) {
        // 跳过检查失败的番种
      }
    }

    const resolvedIds = resolveExclusions(applicableIds);

    // 按番数降序，然后按名称去重（避免混一色8+6等重复番种双计）
    const resolvedWithFan = resolvedIds
      .map(id => C.FAN_TYPES.find(f => f.id === id))
      .filter(Boolean)
      .sort((a, b) => b.fan - a.fan);
    
    const seenNames = new Set();
    let totalFan = 0;
    const details = [];
    for (const fanType of resolvedWithFan) {
      if (!seenNames.has(fanType.name)) {
        seenNames.add(fanType.name);
        totalFan += fanType.fan;
        details.push({ name: fanType.name, fan: fanType.fan, desc: fanType.desc });
      }
    }

    if (totalFan > bestResult.totalFan) {
      bestResult = { totalFan, details, decomp };
    }
  }

  // 特殊检查：如果普通拆解不行，尝试纯七对
  if (bestResult.totalFan === 0 && checkQiDui(count, null)) {
    const qiduiFan = C.FAN_TYPES.find(f => f.id === 30);
    bestResult = {
      totalFan: qiduiFan ? qiduiFan.fan : 24,
      details: [{ name: '七对', fan: qiduiFan ? qiduiFan.fan : 24, desc: '七个对子' }]
    };
  }

  return bestResult;
}

module.exports = {
  countTiles,
  findAllDecompositions,
  calculateFan,
  // 导出供测试
  _check: CHECK_REGISTRY,
};
