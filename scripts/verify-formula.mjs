/**
 * Dependency-free verification of the Champions L50 stat formula.
 *
 * Mirrors packages/calc-core/src/stats.ts so the math can be checked in any
 * Node environment without installing vitest. Run: `node scripts/verify-formula.mjs`
 *
 * The canonical test suite (packages/calc-core/test/stats.test.ts) covers the
 * same cases via vitest once dependencies are installed.
 */
const IV = 31;
const LEVEL = 50;

const core = (base) => Math.floor(((2 * base + IV) * LEVEL) / 100);

function computeStat(stat, base, sp, mult /* 1.1 | 0.9 | 1 */) {
  if (stat === "hp") return core(base) + LEVEL + 10 + sp;
  return Math.floor((core(base) + 5 + sp) * mult);
}

const GARCHOMP = { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 };

// Jolly = Speed+ / Sp.Atk- ; spread 32 Atk / 32 Spe / 2 HP
const expected = { hp: 185, atk: 182, def: 115, spa: 90, spd: 105, spe: 169 };
const got = {
  hp: computeStat("hp", GARCHOMP.hp, 2, 1),
  atk: computeStat("atk", GARCHOMP.atk, 32, 1),
  def: computeStat("def", GARCHOMP.def, 0, 1),
  spa: computeStat("spa", GARCHOMP.spa, 0, 0.9),
  spd: computeStat("spd", GARCHOMP.spd, 0, 1),
  spe: computeStat("spe", GARCHOMP.spe, 32, 1.1),
};

let failures = 0;
for (const k of Object.keys(expected)) {
  const ok = got[k] === expected[k];
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${k.toUpperCase().padEnd(3)}  got=${got[k]}  expected=${expected[k]}`);
}

console.log("---");
console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
