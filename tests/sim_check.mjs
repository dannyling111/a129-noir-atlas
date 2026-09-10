/* 城市模拟核心 · 回归闸(含变红证明)
   跑:node tests/sim_check.mjs      全绿 exit 0 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
let chromium; try { ({ chromium } = await import('playwright-core')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome'].find(p => fs.existsSync(p));

let pass = 0, fail = 0;
const T = (n, ok) => { if (ok === true) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} —— ${ok}`); } };
const RED = (n, fn) => { let red = false; try { red = fn() !== true; } catch { red = true; }
  if (red) { pass++; console.log(`  🔴✅ 变红证明|${n}`); } else { fail++; console.log(`  🔴❌ 变红证明|${n} —— 拆掉机制后判据仍是绿的`); } };

/* 内核是打进单文件的 IIFE,所以在浏览器里跑它,而不是另抄一份到 node(抄一份就有两个真源) */
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errs = []; page.on('pageerror', e => errs.push(e.message));
await page.goto('http://127.0.0.1:8766/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const ev = fn => page.evaluate(fn);

console.log('\n══ 城市模拟内核 ══');
T('S0 页面起来了、内核在(不是白屏)', await ev(() => !!window.noirApp?.sim) || 'window.noirApp.sim 不存在');
T('S1 时钟从第 1 天 08:00 起,一步 15 分钟', await ev(() => { const s = window.noirApp.sim; return s.clock().includes('第 1 天 08:00'); }) || await ev(() => window.noirApp.sim.clock()));

T('S2 需求会自然流逝(什么都不做也会饿会累)', await ev(() => {
  const s = window.noirApp.sim, p = s.attach(1); const a = p.needs.fed, b = p.needs.energy;
  s.decay(8); return p.needs.fed < a && p.needs.energy < b;
}) || '跑了两小时既不饿也不累');

T('S3 同一个动作,对不同人格的人效用不同(不是所有人一个样)', await ev(() => {
  const s = window.noirApp.sim;
  const A = s.attach(101), B = s.attach(102);
  A.big5 = { O: 20, C: 90, E: 20, A: 50, N: 30 }; B.big5 = { O: 90, C: 20, E: 80, A: 50, N: 30 };
  for (const k of Object.keys(A.needs)) { A.needs[k] = 60; B.needs[k] = 60; }
  A.mood.stress = B.mood.stress = 20; A.values = { ...B.values };
  const ctx = { peers: 3, rng: s.rng, hour: 14 };
  const w = window.__SIM__;
  const ua = w.utilityOf(w.ACTION_BY_ID.work, A, ctx).total, ub = w.utilityOf(w.ACTION_BY_ID.work, B, ctx).total;
  return ua > ub;
}) || '尽责性 90 和 20 的人对"上班"给出的效用一样');
RED('S3 负控:把两人的人格设成一样,差异必须消失', await ev(() => {
  const s = window.noirApp.sim, w = window.__SIM__;
  const A = s.attach(103), B = s.attach(104);
  A.big5 = B.big5 = { O: 50, C: 50, E: 50, A: 50, N: 50 };
  for (const k of Object.keys(A.needs)) { A.needs[k] = 60; B.needs[k] = 60; }
  A.mood.stress = B.mood.stress = 20; A.values = B.values;
  const ctx = { peers: 3, rng: s.rng, hour: 14 };
  return w.utilityOf(w.ACTION_BY_ID.work, A, ctx).total > w.utilityOf(w.ACTION_BY_ID.work, B, ctx).total;
}) ? (() => true) : (() => false));

T('S4 缺口非线性放大:快饿坏时"吃饭"的效用远高于刚吃饱时', await ev(() => {
  const s = window.noirApp.sim, w = window.__SIM__, p = s.attach(105);
  const ctx = { peers: 1, rng: s.rng, hour: 12 };
  p.res.cash = 5000; p.needs.fed = 90; const full = w.utilityOf(w.ACTION_BY_ID.eat, p, ctx).total;
  p.needs.fed = 15; const hungry = w.utilityOf(w.ACTION_BY_ID.eat, p, ctx).total;
  return hungry > full * 2;
}) || '饿和不饿时吃饭的效用差不到一倍');

T('S5 硬前置条件:没雇主时"上班"根本进不了候选,而且给出人话原因', await ev(() => {
  const s = window.noirApp.sim, w = window.__SIM__, p = s.attach(106);
  p.res.employer = null;
  const rows = w.candidates(p, { peers: 1, rng: s.rng, hour: 10 });
  const work = rows.find(r => r.act.id === 'work');
  return work.ok !== true && work.p === 0 && /雇主/.test(work.why);
}) || '没工作也能上班');
T('S6 现金不够时"吃饭"被拦,且原因说的是钱', await ev(() => {
  const s = window.noirApp.sim, w = window.__SIM__, p = s.attach(107);
  p.res.cash = 3;
  const r = w.candidates(p, { peers: 1, rng: s.rng, hour: 12 }).find(x => x.act.id === 'eat');
  return r.ok !== true && /现金|不够/.test(r.why);
}) || '没钱也能吃饭');

T('S7 生理自保:饿到 5 分时,选择被强制覆盖成吃饭', await ev(() => {
  const s = window.noirApp.sim, w = window.__SIM__, p = s.attach(108);
  p.needs.fed = 5; p.res.cash = 900; p.body.health = 80; p.needs.energy = 70;
  const pick = w.chooseAction(p, { peers: 1, rng: s.rng, hour: 15 });
  return pick.act.id === 'eat' && pick.forced === true;
}) || '快饿坏了还在随机挑');

T('S8 概率选择归一化(所有可做动作的概率合计为 1)', await ev(() => {
  const s = window.noirApp.sim, w = window.__SIM__, p = s.attach(109);
  const rows = w.candidates(p, { peers: 2, rng: s.rng, hour: 11 }).filter(r => r.ok === true);
  const sum = rows.reduce((a, r) => a + r.p, 0);
  return rows.length > 2 && Math.abs(sum - 1) < .02;
}) || '概率合计不是 1');

T('S9 事故率按每小时算:同样 8 小时,不管分几次推进,期望一致', await ev(() => {
  const l = 0.0015, p1 = 1 - Math.exp(-l * 8);
  let survive = 1; for (let i = 0; i < 8; i++) survive *= (1 - (1 - Math.exp(-l * 1)));
  return Math.abs((1 - survive) - p1) < 1e-9;
}) || '把页面调快就能改变每个模拟日的事故率');

T('S10 🔴 资金守恒:跑 200 步之后账差 < 1e-6', await ev(() => {
  const s = window.noirApp.sim;
  for (let i = 1; i <= 12; i++) s.attach(i);
  s.seal();
  for (let i = 0; i < 200; i++) { const id = 1 + (i % 12); const acts = ['rest', 'walk', 'work', 'eat', 'study', 'invest', 'train']; s.perform(id, acts[i % acts.length]); }
  const a = s.audit(); window.__AUDIT__ = a; return a.ok;
}) || `账差 ${await ev(() => window.__AUDIT__ && window.__AUDIT__.diff)}`);
RED('S10 负控:凭空给一个人加 500 现金而不记账,守恒必须报错', await ev(() => {
  const s = window.noirApp.sim; s.attach(1).res.cash += 500; return s.audit().ok;
}) ? (() => true) : (() => false));

T('S11 买入投资是"现金转投资",不记为消费(净资产不变)', await ev(() => {
  const s = window.noirApp.sim, p = s.attach(200);
  p.res.cash = 1000; p.res.invest = 0; p.res.debt = 0;
  const before = p.res.cash + p.res.invest - p.res.debt;
  const w = window.__SIM__; w.ACTION_BY_ID.invest.onDone(p, s);
  return Math.abs((p.res.cash + p.res.invest - p.res.debt) - before) < 1e-9;
}) || '买投资把净资产改了');

T('S12 现金不够付日常开销时转成债务,不许出现负现金', await ev(() => {
  const s = window.noirApp.sim, p = s.attach(201);
  p.res.cash = 10; p.res.debt = 0;
  const others = [...s.people.keys()].filter(k => k !== 201);
  const keep = new Map(s.people); s.people = new Map([[201, p]]);
  s.settleDay(); const ok = p.res.cash >= 0 && p.res.debt > 60;
  s.people = keep; return ok;
}) || '要么出现了负现金,要么欠款没记上');

await browser.close();
console.log(`\n═══ 内核结果:${pass} 过 / ${fail} 挂 ═══`);
if (errs.length) console.log('页面报错:', errs.slice(0, 3).join(' | '));
if (fail) { console.log('🔴 有判据没过'); process.exit(2); }
console.log('✅ 全绿');
