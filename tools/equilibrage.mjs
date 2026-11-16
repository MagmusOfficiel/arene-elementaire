// Simulation d'équilibrage : duels de bots entre toutes les fusions.
// Usage : node tools/equilibrage.mjs [duelsParPaire=4] [niveaux des bots=0.5,0.85] [itérations d'ajustement=0]
import { ArenaLogic } from '../shared/game/ArenaLogic.js';
import { FUSIONS, generateKit } from '../shared/data.js';
import { EQUILIBRAGE } from '../shared/equilibrage.js';
import { writeFileSync } from 'node:fs';

const N = +(process.argv[2] || 2), SKILLS = String(process.argv[3] || '0.5,0.85').split(',').map(Number), MAXT = 75;
const ITER = +(process.argv[4] || 0);
const keys = Object.keys(FUSIONS);
let res;

function duel(k1, k2, flip, SKILL) {
  const r = Object.create(ArenaLogic.prototype);
  Object.assign(r, { setState(s) { this.state = s; }, setPatchRate() {}, setSimulationInterval() {}, onMessage() {}, clients: [], broadcast() {}, clock: { setTimeout() {} } });
  r.onCreate({ mode: 'melee' });
  r.updateZombies = () => {}; r.updateEvents = () => {};
  r.state.players.clear(); r.ent.clear(); r.state.zombies.clear(); r.state.orbs.clear();
  const ids = [];
  [k1, k2].forEach((k, i) => {
    r.addBot(); const id = `bot_${r.botSeq - 1}`; ids.push(id);
    const p = r.state.players.get(id), e = r.ent.get(id);
    const [a, b] = k.split('+'); e.kit = generateKit(a, b);
    Object.assign(e.ai, { skill: SKILL, react: 0.4 });
    Object.assign(p, { a, b, fusion: e.kit.fusion, maxHp: e.kit.pv, hp: e.kit.pv, locked: 0, x: 2800 + ((i === 0) !== flip ? -260 : 260), y: 2100 });
  });
  let t = 0;
  while (t < MAXT) {
    r.update(0.05); t += 0.05;
    for (const p of r.state.players.values()) { p.lvl = 1; }
    const alive = ids.map((id) => r.state.players.get(id).alive);
    if (!alive[0] || !alive[1]) break;
  }
  const [p1, p2] = ids.map((id) => r.state.players.get(id));
  let w = 0;
  if (p1.alive && !p2.alive) w = 1; else if (p2.alive && !p1.alive) w = 2;
  else { const a = p1.hp / p1.maxHp, b = p2.hp / p2.maxHp; w = Math.abs(a - b) < 0.05 ? 0 : a > b ? 1 : 2; }
  return { w, t };
}

function tour() {
  res = Object.fromEntries(keys.map((k) => [k, { w: 0, l: 0, d: 0, t: 0 }]));
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) for (let n = 0; n < N; n++) {
    const { w, t } = duel(keys[i], keys[j], n % 2 === 1, SKILLS[Math.floor(n / 2) % SKILLS.length]);
    const A = res[keys[i]], B = res[keys[j]];
    A.t += t; B.t += t;
    if (w === 1) { A.w++; B.l++; } else if (w === 2) { B.w++; A.l++; } else { A.d++; B.d++; }
  }
  return keys.map((k) => { const r = res[k], g = r.w + r.l + r.d; return { k, nom: FUSIONS[k].nom, wr: (r.w + r.d / 2) / g, tm: r.t / g }; }).sort((a, b) => b.wr - a.wr);
}
const t0 = Date.now();
let rows = tour();
for (let it = 0; it < ITER; it++) {
  const spread = rows[0].wr - rows[rows.length - 1].wr;
  console.log(`itération ${it}: écart ${(spread * 100).toFixed(0)} pts (min ${(rows.at(-1).wr * 100).toFixed(0)}%, max ${(rows[0].wr * 100).toFixed(0)}%)`);
  const pas = +(process.env.PAS || 1.1) / (1 + it * 0.35);
  for (const r of rows) EQUILIBRAGE[r.k] = Math.min(1.8, Math.max(0.55, +((EQUILIBRAGE[r.k] ?? 1) * Math.exp(-pas * (r.wr - 0.5))).toFixed(3)));
  rows = tour();
}
for (const r of rows) console.log(`${(r.wr * 100).toFixed(0).padStart(3)}%  ${r.k.padEnd(16)} ${String(r.nom).padEnd(22)} x${(EQUILIBRAGE[r.k] ?? 1).toFixed(2)}  durée moy ${r.tm.toFixed(1)}s`);
if (ITER) {
  const lignes = keys.map((k) => `  '${k}': ${EQUILIBRAGE[k] ?? 1},`).join('\n');
  writeFileSync(new URL('../shared/equilibrage.js', import.meta.url), `// Coefficients de puissance par champion (1 = neutre), calculés par tools/equilibrage.mjs\n// (dégâts et PV multipliés chacun par la racine du coefficient)\nexport const EQUILIBRAGE = {\n${lignes}\n};\n`);
}
console.log('temps', ((Date.now() - t0) / 1000).toFixed(0) + 's');
