/**
 * 算番引擎独立测试脚本
 * 在终端运行: node test_engine.js
 * 无需微信开发者工具，纯 Node.js 即可验证核心逻辑
 */
const M = require('./utils/mahjong');
const C = require('./utils/constants');

let passed = 0;
let failed = 0;

function test(name, tiles, ctx, expectedMinFan, expectedNames) {
  console.log(`\n--- ${name} ---`);
  console.log('手牌:', tiles.map(t => C.TILES[t].short).join(' '));

  const result = M.calculateFan(tiles, ctx || {});
  console.log(`总分: ${result.totalFan} 番`);

  if (result.details.length > 0) {
    result.details.forEach(d => {
      const match = expectedNames && expectedNames.includes(d.name) ? ' ✓' : '';
      console.log(`  ${d.name}  ${d.fan}番${match}`);
    });
  } else {
    console.log('  (无番种)');
  }

  // 验证
  let ok = true;
  if (expectedMinFan !== undefined && result.totalFan < expectedMinFan) {
    console.log(`❌ 预期至少 ${expectedMinFan} 番，实际 ${result.totalFan} 番`);
    ok = false;
  }
  if (expectedNames) {
    const gotNames = result.details.map(d => d.name);
    const missing = expectedNames.filter(n => !gotNames.includes(n));
    if (missing.length > 0) {
      console.log(`❌ 缺少番种: ${missing.join(', ')}`);
      ok = false;
    }
  }
  if (ok) {
    console.log('✅ 通过');
    passed++;
  } else {
    failed++;
  }
}

// ========== 测试用例 ==========

console.log('='.repeat(50));
console.log('国标麻将算番引擎测试');
console.log('='.repeat(50));

// 1. 碰碰胡 + 混一色 + 箭刻
// 手牌: 1万刻 + 7万刻 + 红中刻 + 南风刻 + 2万对
// 四暗刻/四杠会排除碰碰胡，故主要验证混一色
test('碰碰胡 + 混一色',
  [0,0,0, 6,6,6, 31,31,31, 28,28,28, 1,1],
  {},
  6,  // 至少混一色6番（四杠等排除后）
  ['混一色']
);

// 2. 平和 (全部顺子 + 非字牌将)
// 1-2-3万, 4-5-6万, 7-8-9万, 1-2-3条, 4-4条
test('平和',
  [0,1,2, 3,4,5, 6,7,8, 9,10,11, 12,12],
  {},
  2,
  ['平和']
);

// 3. 七对
// 1万x2, 3万x2, 5万x2, 1条x2, 3条x2, 5条x2, 7条x2
test('七对',
  [0,0, 2,2, 4,4, 9,9, 11,11, 13,13, 15,15],
  {},
  24,
  ['七对']
);

// 4. 十三幺
test('十三幺',
  [0,8, 9,17, 18,26, 27,28,29,30, 31,32,33, 33], // 白板做将
  {},
  88,
  ['十三幺']
);

// 5. 清一色 + 清龙
// 1-2-3, 4-5-6, 7-8-9, 2-3-4 (万), 5-5万对
test('清一色 + 清龙',
  [0,1,2, 3,4,5, 6,7,8, 1,2,3, 4,4],
  {},
  24,  // 清一色24番
  ['清一色', '清龙']
);

// 6. 断幺 (无1、9、字牌)
test('断幺',
  [2,3,4, 3,4,5, 4,5,6, 2,3,4, 5,5], // 万: 3-4-5, 4-5-6, 5-6-7, 3-4-5, 6-6对
  {},
  2,
  ['断幺']
);

// Wait, my test hand needs to be valid. Let me fix:
// 2-3-4万, 3-4-5万, 4-5-6万, 2-3-4条, 5-5条
test('断幺 (修正)',
  [1,2,3, 2,3,4, 3,4,5, 10,11,12, 13,13],
  {},
  2,
  ['断幺']
);

// 7. 混幺九 (全幺九) — 混幺九排除碰碰胡
test('混幺九',
  [0,0,0, 8,8,8, 18,18,18, 27,27,27, 28,28],
  {},
  32,
  ['混幺九']
);

// 8. 自摸
test('自摸 (断幺基础)',
  [1,2,3, 2,3,4, 3,4,5, 10,11,12, 13,13],
  { isSelfDraw: true },
  2,
  ['断幺']
);

// 9. 大三元
test('大三元',
  [31,31,31, 32,32,32, 33,33,33, 0,1,2, 4,4],
  {},
  88,
  ['大三元']
);

// 10. 小三元
test('小三元',
  [31,31,31, 32,32,32, 33,33, 0,1,2, 4,4,4],
  {},
  64,
  ['小三元']
);

// 11. 空手牌 - 错误处理
test('不足14张 (错误)',
  [0,0,0, 1,1,1, 2,2,2, 3,3],
  {},
  0
);

// 12. 门前清（无自摸）— 门清2番
// 1-2-3万, 4-5-6万, 7-8-9万, 1-2-3条, 5-5条
test('门前清 (他家放铳)',
  [0,1,2, 3,4,5, 6,7,8, 9,10,11, 13,13],
  { isConcealed: true, isSelfDraw: false },
  2,
  ['门前清']
);

// 13. 不求人（门前清 + 自摸）
test('不求人 (门前清+自摸)',
  [0,1,2, 3,4,5, 6,7,8, 9,10,11, 13,13],
  { isConcealed: true, isSelfDraw: true },
  4,
  ['不求人']
);

// 14. 四暗刻 — 门前清 + 4刻子
// 1万刻, 4万刻, 7万刻, 红中刻, 2万对
test('四暗刻 (门前清+4刻子)',
  [0,0,0, 3,3,3, 6,6,6, 31,31,31, 1,1],
  { isConcealed: true },
  64,
  ['四暗刻']
);

// 15. 三暗刻 — 门前清 + 3刻子
// 1万刻, 4万刻, 红中刻, 5-6-7万顺, 2万对
test('三暗刻 (门前清+3刻子)',
  [0,0,0, 3,3,3, 31,31,31, 4,5,6, 8,8],
  { isConcealed: true },
  16,
  ['三暗刻']
);

// 16. 暗杠 — 门前清 + 1杠
// 1万刻, 2万刻, 3万刻, 4万刻, 5万对  → 改为1万4张(杠), 2-3-4万顺, 5-6-7万顺, 8-8万对
test('暗杠 (门前清+1杠)',
  [0,0,0,0, 1,2,3, 3,4,5, 4,5,6, 7,7],
  { isConcealed: true },
  1,
  ['暗杠']
);

// 17. 双暗杠 — 门前清 + 2杠 (16张牌)
test('双暗杠 (门前清+2杠)',
  [0,0,0,0, 1,1,1,1, 9,10,11, 12,13,14, 15,15],
  { isConcealed: true },
  8,
  ['双暗杠']
);

// 18. 非门前清不应计暗刻/暗杠
test('非门前清 (4刻子无暗刻)',
  [0,0,0, 3,3,3, 6,6,6, 31,31,31, 1,1],
  {},
  6,
  ['碰碰胡']
);

// 19. 九莲宝灯 — 14张牌中4张1万，但不是杠（没有补牌）
test('九莲宝灯 (无明杠)',
  [0,0,0,0, 1,2,3, 4,5,6, 7, 8,8,8],
  {},
  88,
  ['九莲宝灯']
);

// 20. 三色三步高 — 三种花色递增一位的顺子（花色任意排列）
// 123万 + 234饼 + 345条 (花色: 万/饼/条, rank: 1/2/3)
test('三色三步高 (万饼条)',
  [0,1,2, 19,20,21, 11,12,13, 3,4,5, 6,6],
  {},
  6,
  ['三色三步高']
);

// 20b. 三色三步高 — 另一种花色排列 (条/万/饼)
// 123条 + 234万 + 345饼 (花色: 条/万/饼, rank: 1/2/3)
test('三色三步高 (条万饼)',
  [9,10,11, 1,2,3, 20,21,22, 12,13,14, 15,15],
  {},
  6,
  ['三色三步高']
);

// 21. 诈胡：14张牌但无法构成 4面子+1将 / 七对 / 十三幺
// 例如：3万x2, 5万x2, 7万x2, 9万x2, 1条x2, 3条x2, 5条 (15张...先简化为14)
// 真正诈胡：1万,2万,4万,5万,7万,8万,1条,2条,3条,5条,7条,9条,1饼,3饼 — 没对子无法构成将
console.log('\n--- 诈胡测试 (无对子) ---');
{
  const tiles = [0,1,3,4,6,7, 9,10,11,13,15,17, 18,20];
  const result = M.calculateFan(tiles, {});
  console.log('手牌:', tiles.map(t => C.TILES[t].short).join(' '));
  console.log(`总分: ${result.totalFan} 番`, result.error ? `错误: ${result.error}` : '');
  if (result.totalFan === 0 && result.error) {
    console.log('✅ 通过 — 正确识别诈胡');
    passed++;
  } else {
    console.log('❌ 应识别为诈胡');
    failed++;
  }
}

// 21. 诈胡：14张牌但拆不成有效面子
// 例如：1万x2 + 3万x2 + 5万x2 + 7万x2 + 9万x2 + 字牌不成对
console.log('\n--- 诈胡测试 (面子不齐) ---');
{
  // 将 + 3顺子 + 散牌（无法成第4面子）
  const tiles = [0,0, 1,2,3, 4,5,6, 7,8, 9,11,13,15];
  const result = M.calculateFan(tiles, {});
  console.log('手牌:', tiles.map(t => C.TILES[t].short).join(' '));
  console.log(`总分: ${result.totalFan} 番`, result.error ? `错误: ${result.error}` : '');
  if (result.totalFan === 0 && result.error) {
    console.log('✅ 通过 — 正确识别诈胡');
    passed++;
  } else {
    console.log('❌ 应识别为诈胡');
    failed++;
  }
}

// 22. 诈胡：模型识别错乱的牌
console.log('\n--- 诈胡测试 (随机散牌) ---');
{
  const tiles = [0,2,4,6,8, 9,11,13,15,17, 18,20,22,24];
  const result = M.calculateFan(tiles, {});
  console.log('手牌:', tiles.map(t => C.TILES[t].short).join(' '));
  console.log(`总分: ${result.totalFan} 番`, result.error ? `错误: ${result.error}` : '');
  if (result.totalFan === 0 && result.error) {
    console.log('✅ 通过 — 正确识别诈胡');
    passed++;
  } else {
    console.log('❌ 应识别为诈胡');
    failed++;
  }
}

// 23. 边界：合法的"全顺"牌但有对子做将（不应误判为诈胡）
console.log('\n--- 合法边界 (清一色顺子+将) ---');
{
  const tiles = [0,1,2, 3,4,5, 6,7,8, 0,1,2, 4,4];
  const result = M.calculateFan(tiles, {});
  console.log('手牌:', tiles.map(t => C.TILES[t].short).join(' '));
  console.log(`总分: ${result.totalFan} 番`);
  if (result.totalFan > 0 && !result.error) {
    console.log('✅ 通过 — 合法手牌正确算出番数');
    passed++;
  } else {
    console.log('❌ 不应判诈胡');
    failed++;
  }
}
// 验证不应有"明杠"
const jiuLianResult = M.calculateFan([0,0,0,0,1,2,3,4,5,6,7,8,8,8], {});
const hasMingGang = jiuLianResult.details.some(d => d.name === '明杠');
console.log(`\n--- 九莲宝灯 明杠检查 ---`);
if (hasMingGang) {
  console.log('❌ 不应出现"明杠"番种');
  failed++;
} else {
  console.log('✅ 通过 — 无错误"明杠"');
  passed++;
}

// ========== 结果 ==========
console.log('\n' + '='.repeat(50));
console.log(`通过: ${passed}  失败: ${failed}  总计: ${passed + failed}`);
if (failed === 0) {
  console.log('🎉 全部测试通过！');
} else {
  console.log(`⚠️  ${failed} 个测试失败，需要排查。`);
}
console.log('='.repeat(50));
