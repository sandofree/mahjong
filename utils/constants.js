/**
 * 国标麻将常量定义
 * 34 种牌面 + 81 种番种（1998 国标规则）
 */

// ---- 牌的定义 ----
// tileId 0-33，每类牌在整副牌中有4张

const TILE_SUITS = {
  WAN: 'wan',     // 万
  TIAO: 'tiao',   // 条
  BING: 'bing',   // 饼
  FENG: 'feng',   // 风
  JIAN: 'jian',   // 箭
};

// 34 种牌面
const TILES = [
  // 万 (0-8)
  { id: 0,  suit: 'wan',  rank: 1, name: '一万', display: '一万', short: '1万' },
  { id: 1,  suit: 'wan',  rank: 2, name: '二万', display: '二万', short: '2万' },
  { id: 2,  suit: 'wan',  rank: 3, name: '三万', display: '三万', short: '3万' },
  { id: 3,  suit: 'wan',  rank: 4, name: '四万', display: '四万', short: '4万' },
  { id: 4,  suit: 'wan',  rank: 5, name: '五万', display: '五万', short: '5万' },
  { id: 5,  suit: 'wan',  rank: 6, name: '六万', display: '六万', short: '6万' },
  { id: 6,  suit: 'wan',  rank: 7, name: '七万', display: '七万', short: '7万' },
  { id: 7,  suit: 'wan',  rank: 8, name: '八万', display: '八万', short: '8万' },
  { id: 8,  suit: 'wan',  rank: 9, name: '九万', display: '九万', short: '9万' },
  // 条 (9-17)
  { id: 9,  suit: 'tiao', rank: 1, name: '一条', display: '一条', short: '1条' },
  { id: 10, suit: 'tiao', rank: 2, name: '二条', display: '二条', short: '2条' },
  { id: 11, suit: 'tiao', rank: 3, name: '三条', display: '三条', short: '3条' },
  { id: 12, suit: 'tiao', rank: 4, name: '四条', display: '四条', short: '4条' },
  { id: 13, suit: 'tiao', rank: 5, name: '五条', display: '五条', short: '5条' },
  { id: 14, suit: 'tiao', rank: 6, name: '六条', display: '六条', short: '6条' },
  { id: 15, suit: 'tiao', rank: 7, name: '七条', display: '七条', short: '7条' },
  { id: 16, suit: 'tiao', rank: 8, name: '八条', display: '八条', short: '8条' },
  { id: 17, suit: 'tiao', rank: 9, name: '九条', display: '九条', short: '9条' },
  // 饼 (18-26)
  { id: 18, suit: 'bing', rank: 1, name: '一饼', display: '一饼', short: '1饼' },
  { id: 19, suit: 'bing', rank: 2, name: '二饼', display: '二饼', short: '2饼' },
  { id: 20, suit: 'bing', rank: 3, name: '三饼', display: '三饼', short: '3饼' },
  { id: 21, suit: 'bing', rank: 4, name: '四饼', display: '四饼', short: '4饼' },
  { id: 22, suit: 'bing', rank: 5, name: '五饼', display: '五饼', short: '5饼' },
  { id: 23, suit: 'bing', rank: 6, name: '六饼', display: '六饼', short: '6饼' },
  { id: 24, suit: 'bing', rank: 7, name: '七饼', display: '七饼', short: '7饼' },
  { id: 25, suit: 'bing', rank: 8, name: '八饼', display: '八饼', short: '8饼' },
  { id: 26, suit: 'bing', rank: 9, name: '九饼', display: '九饼', short: '9饼' },
  // 风 (27-30)
  { id: 27, suit: 'feng', rank: 1, name: '东',   display: '东风', short: '东' },
  { id: 28, suit: 'feng', rank: 2, name: '南',   display: '南风', short: '南' },
  { id: 29, suit: 'feng', rank: 3, name: '西',   display: '西风', short: '西' },
  { id: 30, suit: 'feng', rank: 4, name: '北',   display: '北风', short: '北' },
  // 箭 (31-33)
  { id: 31, suit: 'jian', rank: 1, name: '中',   display: '红中', short: '中' },
  { id: 32, suit: 'jian', rank: 2, name: '发',   display: '发财', short: '发' },
  { id: 33, suit: 'jian', rank: 3, name: '白',   display: '白板', short: '白' },
];

// 便利查询
const TILE_MAP = {};
TILES.forEach(t => { TILE_MAP[t.id] = t; });

// 风位映射: rank -> 名称
const WIND_NAMES = { 1: '东', 2: '南', 3: '西', 4: '北' };
// 箭映射: rank -> 名称
const DRAGON_NAMES = { 1: '中', 2: '发', 3: '白' };

// ---- 番种定义（81种，按番数降序） ----

const FAN_TYPES = [
  // ===================== 88 番 (7种) =====================
  { id: 1,  name: '大四喜',       fan: 88, desc: '东、南、西、北各三张，加任意一对将牌' },
  { id: 2,  name: '大三元',       fan: 88, desc: '中、发、白各三张，加任意面子与将牌' },
  { id: 3,  name: '绿一色',       fan: 88, desc: '仅由23468条和发财组成的和牌' },
  { id: 4,  name: '九莲宝灯',     fan: 88, desc: '同花色1112345678999加任意一张' },
  { id: 5,  name: '四杠',         fan: 88, desc: '和牌中包含4个杠（每杠4张相同牌）' },
  { id: 6,  name: '连七对',       fan: 88, desc: '同花色连续7个对子' },
  { id: 7,  name: '十三幺',       fan: 88, desc: '幺九牌各一张，任一张做将' },

  // ===================== 64 番 (6种) =====================
  { id: 8,  name: '小四喜',       fan: 64, desc: '其中三副风刻加一对风牌做将，另一副为面子' },
  { id: 9,  name: '小三元',       fan: 64, desc: '其中两副箭刻加一对箭牌做将，另一副为面子' },
  { id: 10, name: '字一色',       fan: 64, desc: '全部由风牌和箭牌组成' },
  { id: 11, name: '四暗刻(停用)', fan: 0,  desc: '需游戏过程记录，拍照无法判断明暗' },
  { id: 12, name: '一色双龙会',   fan: 64, desc: '同花色123123 789789 + 5做将' },
  { id: 13, name: '一色四同顺',   fan: 64, desc: '同一花色四副相同的顺子' },

  // ===================== 48 番 (4种) =====================
  { id: 14, name: '一色四节高',   fan: 48, desc: '同一花色四副递增的刻子' },
  { id: 15, name: '一色四步高',   fan: 48, desc: '同一花色四副递增一位或两位的顺子' },
  { id: 16, name: '三杠',         fan: 48, desc: '和牌中包含3个杠（每杠4张相同牌）' },
  { id: 17, name: '混幺九',       fan: 32, desc: '全部由幺九牌（1、9、字牌）组成' },

  // ===================== 32 番 (4种) =====================
  { id: 18, name: '三风刻',       fan: 32, desc: '三副风刻，另一副面子加一对将牌' },
  { id: 19, name: '五门齐',       fan: 32, desc: '万、条、饼、风、箭五门，每门至少有一副面子或一对将' },
  { id: 20, name: '一色三步高',   fan: 32, desc: '同一花色三副递增一位或两位的顺子' },
  { id: 21, name: '全带五',       fan: 32, desc: '每副面子及将牌均带五（5万/5条/5饼）' },

  // ===================== 24 番 (9种) =====================
  { id: 22, name: '全大',         fan: 24, desc: '全部由789组成' },
  { id: 23, name: '全中',         fan: 24, desc: '全部由456组成' },
  { id: 24, name: '全小',         fan: 24, desc: '全部由123组成' },
  { id: 25, name: '一色三同顺',   fan: 24, desc: '同一花色三副相同的顺子' },
  { id: 26, name: '一色三节高',   fan: 24, desc: '同一花色三副递增一位的刻子' },
  { id: 27, name: '全双刻',       fan: 24, desc: '全部由2、4、6、8的刻子组成' },
  { id: 28, name: '清一色',       fan: 24, desc: '全部由一种花色的数牌组成，无字牌' },
  { id: 29, name: '三色双龙会',   fan: 24, desc: '两种花色123、789，第三种花色5做将' },
  { id: 30, name: '七对',         fan: 24, desc: '七个对子' },
  { id: 31, name: '七星不靠',     fan: 24, desc: '七种字牌各一张 + 万条饼的147、258、369不靠' },

  // ===================== 16 番 (10种) =====================
  { id: 32, name: '三色三同顺',   fan: 16, desc: '三种花色同一序数的顺子' },
  { id: 33, name: '三色三节高',   fan: 16, desc: '三种花色递增一位的刻子' },
  { id: 34, name: '三同刻',       fan: 16, desc: '三种花色同一序数的刻子' },
  { id: 35, name: '三暗刻(停用)', fan: 0,  desc: '需游戏过程记录，拍照无法判断明暗' },
  { id: 36, name: '三色三步高',   fan: 16, desc: '三种花色递增一位的顺子' },
  { id: 37, name: '花龙',         fan: 16, desc: '三种花色依次组成123、456、789' },
  { id: 38, name: '组合龙',       fan: 16, desc: '万条饼各取不同的九张组成123456789' },
  { id: 39, name: '全不靠',       fan: 16, desc: '万条饼147、258、369互不靠，加五种字牌' },
  { id: 40, name: '全带幺',       fan: 16, desc: '每副面子及将牌均带幺九' },
  { id: 41, name: '清龙',         fan: 16, desc: '同花色123、456、789三副顺子' },

  // ===================== 12 番 (8种) =====================
  { id: 42, name: '大于五',       fan: 12, desc: '全部由大于5的数牌（6789）组成' },
  { id: 43, name: '小于五',       fan: 12, desc: '全部由小于5的数牌（1234）组成' },
  { id: 44, name: '三色三同刻',   fan: 12, desc: '三种花色同一序数的刻子' }, // 与三同刻可能有重叠
  { id: 45, name: '三风刻',       fan: 12, desc: '三副风刻' },
  { id: 46, name: '全求人',       fan: 12, desc: '全部靠吃碰别人打出的牌，最后单钓将和牌' },
  { id: 47, name: '三色三节高',   fan: 12, desc: '三种花色递增一位的刻子' }, // 冗余? 和三色三节高(16)可能重复
  { id: 48, name: '花龙',         fan: 12, desc: '三种花色依次组成123、456、789' },
  { id: 49, name: '推不倒',       fan: 12, desc: '仅由牌面图形无上下之分的牌组成（1234589饼、245689条、白板）' },

  // ===================== 8 番 (10种) =====================
  { id: 50, name: '妙手回春',     fan: 8,  desc: '摸最后一张牌自摸和牌' },
  { id: 51, name: '海底捞月',     fan: 8,  desc: '别人打出最后一张牌时和牌' },
  { id: 52, name: '杠上开花',     fan: 8,  desc: '杠后补牌自摸和牌' },
  { id: 53, name: '抢杠和',       fan: 8,  desc: '别人补杠时抢杠和牌' },
  { id: 54, name: '双暗杠(停用)', fan: 0,  desc: '需游戏过程记录，拍照无法判断明暗' },
  { id: 55, name: '混一色',       fan: 8,  desc: '由一种花色的数牌和字牌组成' },
  { id: 56, name: '全带幺',       fan: 8,  desc: '每副面子及将牌均带有幺九牌' },
  { id: 57, name: '三色三同顺',   fan: 8,  desc: '三种花色同一序数的顺子' },
  { id: 58, name: '三色三节高',   fan: 8,  desc: '三种花色递增一位的刻子' },
  { id: 59, name: '无番和',       fan: 8,  desc: '和牌后无任何番种（不计番的和牌），计8番起和' },

  // ===================== 6 番 (12种) =====================
  { id: 60, name: '碰碰胡',       fan: 6,  desc: '由四副刻子（或杠）和一对将牌组成' },
  { id: 61, name: '混一色',       fan: 6,  desc: '由一种花色的数牌和字牌组成' },
  { id: 62, name: '三色三步高',   fan: 6,  desc: '三种花色递增一位的顺子' },
  { id: 63, name: '五门齐',       fan: 6,  desc: '五门牌皆有一副或一对' },
  { id: 64, name: '全求人',       fan: 6,  desc: '全部靠吃碰别人打出的牌，最后单钓将和牌' },
  { id: 65, name: '双箭刻',       fan: 6,  desc: '两副箭刻（或杠）' },
  { id: 66, name: '双暗刻(停用)', fan: 0,  desc: '需游戏过程记录，拍照无法判断明暗' },
  { id: 67, name: '全带幺',       fan: 6,  desc: '每副面子及将牌均带有幺九牌' },
  { id: 68, name: '不求人',       fan: 6,  desc: '门前清且自摸和牌（无吃碰杠）' },
  { id: 69, name: '双明杠',       fan: 6,  desc: '两个明杠' },
  { id: 70, name: '和绝张',       fan: 6,  desc: '某张牌已出现三张，和第四张' },
  { id: 71, name: '双同刻',       fan: 6,  desc: '两种花色同一序数的刻子' },

  // ===================== 4 番 (10种) =====================
  { id: 72, name: '全带幺',       fan: 4,  desc: '每副面子及将牌均带有幺九牌' },
  { id: 73, name: '不求人',       fan: 4,  desc: '门前清且自摸和牌' },
  { id: 74, name: '双明杠',       fan: 4,  desc: '两个明杠' },
  { id: 75, name: '和绝张',       fan: 4,  desc: '某张牌已出现三张，和第四张' },
  { id: 76, name: '箭刻',         fan: 4,  desc: '一副箭刻（或杠）' },
  { id: 77, name: '圈风刻',       fan: 4,  desc: '圈风刻子' },
  { id: 78, name: '门风刻',       fan: 4,  desc: '门风刻子' },
  { id: 79, name: '门前清(停用)', fan: 0,  desc: '需游戏过程记录，拍照无法判断是否吃碰杠' },
  { id: 80, name: '四归一',       fan: 4,  desc: '四张相同的牌分在顺子和刻子中' },
  { id: 81, name: '双同刻',       fan: 4,  desc: '两种花色同一序数的刻子' },

  // ===================== 2 番 (10种) =====================
  { id: 82, name: '平和',         fan: 2,  desc: '由四副顺子和非字牌做将组成（门前清）' },
  { id: 83, name: '断幺',         fan: 2,  desc: '和牌中无幺九牌（1、9、字牌）' },
  { id: 84, name: '箭刻',         fan: 2,  desc: '一副箭刻（或杠）' },
  { id: 85, name: '圈风刻',       fan: 2,  desc: '圈风刻子' },
  { id: 86, name: '门风刻',       fan: 2,  desc: '门风刻子' },
  { id: 87, name: '门前清(停用)', fan: 0,  desc: '需游戏过程记录，拍照无法判断是否吃碰杠' },
  { id: 88, name: '四归一',       fan: 2,  desc: '四张相同的牌分在顺子和刻子（或杠）中' },
  { id: 89, name: '双同刻',       fan: 2,  desc: '两种花色同一序数的刻子' },
  { id: 90, name: '双暗刻(停用)', fan: 0,  desc: '拍照无法判断明暗' },
  { id: 91, name: '暗杠(停用)',   fan: 0,  desc: '需游戏过程记录，拍照无法判断明暗' },

  // ===================== 1 番 (13种) =====================
  { id: 92,  name: '一般高',       fan: 1, desc: '同一花色两副相同的顺子' },
  { id: 93,  name: '喜相逢',       fan: 1, desc: '两种花色相同序数的顺子' },
  { id: 94,  name: '连六',         fan: 1, desc: '同一花色六连顺（如123456）' },
  { id: 95,  name: '老少副',       fan: 1, desc: '同一花色123和789两副顺子' },
  { id: 96,  name: '幺九刻',       fan: 1, desc: '幺九牌的刻子（或杠）' },
  { id: 97,  name: '明杠',         fan: 1, desc: '一个明杠' },
  { id: 98,  name: '缺一门',       fan: 1, desc: '缺少万、条、饼中的一种花色' },
  { id: 99,  name: '无字',         fan: 1, desc: '没有字牌' },
  { id: 100, name: '边张',         fan: 1, desc: '听边张（3听12或7听89）' },
  { id: 101, name: '坎张',         fan: 1, desc: '听坎张（如4、6听5）' },
  { id: 102, name: '单钓将',       fan: 1, desc: '单钓将牌和牌' },
  { id: 103, name: '自摸',         fan: 1, desc: '自己摸牌和牌' },
  { id: 104, name: '花牌',         fan: 1, desc: '每张花牌计1番' },
];

// 按番数分组
const FAN_BY_VALUE = {};
FAN_TYPES.forEach(f => {
  if (!FAN_BY_VALUE[f.fan]) FAN_BY_VALUE[f.fan] = [];
  FAN_BY_VALUE[f.fan].push(f);
});

// 番种互斥关系（不重复计原则）— 若 A 必然蕴含 B，则只计 A
// 格式: { higherFanId: [lowerFanIds] }
const FAN_EXCLUSIONS = {
  // 大四喜 → 排除小四喜、三风刻
  1: [8, 18],
  // 大三元 → 排除小三元、双箭刻、箭刻
  2: [9, 65, 76, 84],
  // 绿一色 → 排除混一色、缺一门等
  3: [55, 61, 98, 99],
  // 九莲宝灯 → 排除清一色
  4: [55, 61],
  // 连七对 → 排除七对、清一色
  6: [30, 55, 61],
  // 十三幺
  7: [],
  // 小四喜 → 排除三风刻
  8: [18],
  // 小三元 → 排除双箭刻、箭刻
  9: [65, 76, 84],
  // 字一色 → 排除碰碰胡、混幺九
  10: [17, 60, 83, 98, 99],
  // 一色四同顺 → 排除一色三同顺、一般高
  13: [25, 92],
  // 一色四节高 → 排除一色三节高
  14: [26],
  // 一色四步高 → 排除一色三步高、连六
  15: [20, 94],
  // 四杠 → 排除三杠、碰碰胡、明杠
  5: [16, 60, 97],
  // 三杠 → 排除碰碰胡、明杠
  16: [60, 97],
  // 混幺九 → 排除碰碰胡、全带幺
  17: [40, 56, 60, 67, 72, 83],
  // 七对 → 排除碰碰胡、不求人
  30: [60, 68, 73],
  // 清一色 → 排除混一色、缺一门、无字（不断幺，清一色可含1/9）
  28: [55, 61, 98, 99],
  // 碰碰胡 → 排除平和
  60: [82],
  // 混一色 → 排除缺一门
  55: [98],
  61: [98],
  // 断幺 → 排除无字（断幺必然无字）
  83: [99],
  // 双箭刻 → 排除箭刻
  65: [76, 84],
  // 不求人 → 排除自摸
  68: [103],
  73: [103],
  // 四归一 → 排除单钓将（通常）
  // 全大/全中/全小 → 排除断幺、缺一门
  22: [83, 98, 99],
  23: [83, 98, 99],
  24: [83, 98, 99],
};

module.exports = {
  TILE_SUITS,
  TILES,
  TILE_MAP,
  WIND_NAMES,
  DRAGON_NAMES,
  FAN_TYPES,
  FAN_BY_VALUE,
  FAN_EXCLUSIONS,
};
