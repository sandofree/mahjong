# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WeChat Mini Program (微信小程序) for Chinese Official Mahjong (国标麻将) fan calculation under the 1998 rules. Users take a photo or manually input a winning hand of 14 tiles; the app calculates the total fan value.

## Development

This is a WeChat Mini Program — open the project root in WeChat DevTools (微信开发者工具). No local dev server or build step.

**Run the core engine tests** (pure Node.js, no WeChat DevTools needed):
```bash
node test_engine.js
```

**Deploy the cloud function**: In WeChat DevTools, right-click `cloudfunctions/recognizeTiles` → "Upload and Deploy: Install Dependencies in Cloud".

## Architecture

### Tile encoding

Each of the 34 tile types is identified by an integer tileId (0–33):

| Range | Suit |
|-------|------|
| 0–8   | 万 (Characters) rank 1–9 |
| 9–17  | 条 (Bamboo) rank 1–9 |
| 18–26 | 饼 (Dots) rank 1–9 |
| 27–30 | 风 (Winds): 东南西北 |
| 31–33 | 箭 (Dragons): 中发白 |

A hand is an array of 14–18 tileIds (extra tiles for kongs).

### Core engine data flow

```
tiles[] → countTiles() → findAllDecompositions() → fan checks → resolveExclusions() → best result
```

1. **`utils/constants.js`** — Tile definitions, 81 fan type definitions (with ids, fan values, descriptions), and the `FAN_EXCLUSIONS` map (higher fan id → list of lower fan ids it subsumes, per the non-duplicate scoring principle).

2. **`utils/mahjong.js`** — The calculation engine:
   - `findAllDecompositions(tiles)` — Recursive backtracking to find all valid (pair + 4 melds) breakdowns. Supports 14–18 tiles (kongs are reduced from 4→3 for decomposition, then counted separately).
   - Fan check functions registered in `CHECK_REGISTRY` (maps fan type id → `fn(count, decomp, ctx)`). Some checks (七对, 十三幺) work on raw counts without a decomposition.
   - `calculateFan(tiles, ctx)` — Main entry point. Tries all decompositions, runs all checks, resolves exclusions, returns the highest-scoring result.
   - Context object (`ctx`) carries `isSelfDraw`, `prevalentWind`, `seatWind` — required for situational fan types like 圈风刻, 门风刻, 自摸.

3. **Pages**: `index` (entry) → `camera` (photo + cloud upload) or `input` (manual tile picker with wind/self-draw options) → `result` (fan breakdown display). Global state flows through `app.globalData`.

4. **`cloudfunctions/recognizeTiles/`** — Cloud function for AI tile recognition. Currently returns mock data. Has scaffolding for Baidu AI EasyDL and Tencent Cloud integration.

### Adding a new fan type check

1. Add the fan type definition to `FAN_TYPES` in `utils/constants.js` (if not already present).
2. Write a check function in `utils/mahjong.js` with signature `(count, decomp, ctx) => boolean`.
3. Register it in `CHECK_REGISTRY` with the matching fan type id.
4. If it subsumes other fan types, add entries to `FAN_EXCLUSIONS`.
5. Add a test case in `test_engine.js`.

### Fan check patterns

- **Global checks** (no decomp needed): 清一色, 混一色, 断幺, 七对, 十三幺 — these inspect raw tile counts directly. They work even when `decomp` is null.
- **Decomposition checks**: Most fan types require a valid decomposition. The engine iterates all valid decompositions and runs checks on each.
- **Context-dependent**: 不求人, 自摸, 圈风刻, 门风刻 need `ctx` fields.

### Key constraints

- Several fan types are disabled (fan=0 in constants) because they require in-game process knowledge (明/暗 distinction, 门前清, etc.) that can't be determined from a static photo.
- The exclusion resolver also deduplicates by fan name, since some fan types appear at multiple point values (e.g., 混一色 at 8番 and 6番) — only the highest-valued variant is kept.
- The decomposition engine breaks early at the first tile with non-zero count to avoid generating duplicate combinations.
