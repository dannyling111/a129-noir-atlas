/* 城市模式 · 真手机 + 真 touch 验收
   判据只有一条真正重要:【手指点一张决策卡,人物真的去做,数字真的变】。
   跑:node tests/city_play.mjs [URL] */
import fs from 'node:fs';
import { createRequire } from 'node:module';
let chromium; try { ({ chromium } = await import('playwright-core')); }
catch { ({ chromium } = createRequire('/opt/node22/lib/node_modules/')('playwright')); }
const exe = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome'].find(p => fs.existsSync(p));
const URL_ = process.argv[2] || 'http://127.0.0.1:8766/';

let pass = 0, fail = 0;
const T = (n, ok) => { if (ok === true) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} —— ${ok}`); } };

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });

/** 真 touch 点击 + 命中判定:滚进屏幕后,中心点按下去命中的必须是它自己 */
async function tap(h, label) {
  if (!h) { T(`${label} 存在`, '这个元素根本不在页面上'); return false; }
  await h.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(120);
  const b = await h.boundingBox();
  if (!b) { T(`${label} 有位置`, '这个东西没有盒子'); return false; }
  if (b.height < 44) { T(`${label} 触摸目标 ≥44px`, `只有 ${Math.round(b.height)}px`); return false; }
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
  const mine = await h.evaluate((n, p) => { const e = document.elementFromPoint(p[0], p[1]); return !!e && (n === e || n.contains(e)); }, [cx, cy]);
  if (!mine) { T(`${label} 中心点命中自己`, '被别的东西盖住了'); return false; }
  await page.touchscreen.tap(cx, cy); await page.waitForTimeout(200); return true;
}
const snap = () => page.evaluate(() => {
  const app = window.noirApp, s = app.sim.attach(app.actor.id);
  return { step: app.sim.step, clock: app.sim.clock(), cash: s.res.cash, needs: { ...s.needs }, skill: { ...s.skill }, stress: s.mood.stress,
    label: app.actor.brain?.label || '', pending: app.actor.simPending || null };
});

console.log(`\n══ 390×844 真手机 + 真 touch:${URL_} ══`);
await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
T('C1 页面跑起来了(不是黑屏/报错屏)', await page.evaluate(() => window.__NOIR__?.ready === true) || await page.evaluate(() => window.__NOIR__?.error || '未知'));

const pill = await page.$('#city-toggle');
T('C2 顶上有「城市」入口', !!pill || '找不到 #city-toggle');
await tap(pill, 'C2 城市入口');
T('C3 点开之后进了城市模式', await page.evaluate(() => document.body.classList.contains('city-mode')) || '没进城市模式');

const bars = await page.$$('#sim-bars .sim-bar');
T('C4 状态条在(精力/饱腹/社交/安全/心情 五条)', bars.length === 5 || `只有 ${bars.length} 条`);
const cards = await page.$$('.sim-card[data-act]');
T('C5 有决策卡可点', cards.length >= 5 || `只有 ${cards.length} 张`);
T('C6 每张卡点之前就写着后果或不能做的原因', await page.evaluate(() =>
  [...document.querySelectorAll('.sim-card')].every(c => (c.querySelector('.fx')?.textContent || '').trim().length > 2)) || '有卡片没写后果');
T('C7 不能做的卡是禁用的,而且原因是人话', await page.evaluate(() => {
  const dis = [...document.querySelectorAll('.sim-card[disabled]')];
  return dis.length === 0 || dis.every(c => /不够|没有|已经|先/.test(c.querySelector('.fx').textContent));
}) || '禁用卡没写清为什么');

/* ── 最要紧的一条:点一张卡,数字真的变 ── */
const before = await snap();
const pickable = await page.$$('.sim-card[data-act]:not([disabled])');
T('C8 至少有一张卡现在能点', pickable.length >= 1 || '一张能点的都没有');
await tap(pickable[0], 'C8 第一张能点的卡');
T('C9 点完之后人物真的接到了任务(不是只弹个字)', await page.evaluate(() => {
  const a = window.noirApp.actor; return !!a.simPending || !!a.life?.task || a.route?.length > 0;
}) || '点了卡,人物没有任何动作');

/* 等它走到并结算(最多 12 秒) */
let after = before;
for (let i = 0; i < 110; i++) { await page.waitForTimeout(200); after = await snap(); if (after.step > before.step) break; }
T('C10 🔴 时间真的推进了(不是点着好看)', after.step > before.step || `第 ${before.step} 步 → 第 ${after.step} 步,一步没动`);
T('C11 🔴 身上的数值真的变了', JSON.stringify(after.needs) !== JSON.stringify(before.needs) || '需求一格没动');

/* ── 提升个人数据:连做几次学习/上班,能力条要往上走 ── */
const s0 = (await snap()).skill;
for (let r = 0; r < 6; r++) {
  const cs = await page.$$('.sim-card[data-act]:not([disabled])');
  let target = null;
  for (const c of cs) { const t = await c.textContent(); if (/学习|上班|读闲书/.test(t)) { target = c; break; } }
  if (!target) target = cs[0]; if (!target) break;
  const st = (await snap()).step;
  await tap(target, `R${r} 决策卡`);
  for (let i = 0; i < 90; i++) { await page.waitForTimeout(180); if ((await snap()).step > st) break; }
}
const s1 = (await snap()).skill;
T('C12 🔴 反复做能提升个人数据(专业/认知/社交力至少一项涨了)',
  (s1.skill > s0.skill || s1.cognition > s0.cognition || s1.social > s0.social) || `${JSON.stringify(s0)} → ${JSON.stringify(s1)}`);
T('C13 时间累积推进(多轮决策之后天数/时刻确实往前走)', (await snap()).step > after.step || '连做六轮时间还是没动');

/* ── NPC 也用同一套决策核 ── */
T('C14 NPC 的行为标签来自决策核(不是固定轮流的地点名)', await page.evaluate(() => {
  const app = window.noirApp;
  return app.actors.some(a => a !== app.actor && /💼|📖|📚|🌿|☕|🏃|💬|🛏|🍚|📮|📈|🩺/.test(a.brain?.label || ''));
}) || '所有 NPC 的标签还是老样子(说明决策核没接上 NPC)');

/* ── 手机基本盘 ── */
T('C15 没有横向溢出', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1) || '页面能左右拉');
T('C16 界面上没有键鼠话术', await page.evaluate(() => {
  const t = document.body.innerText; return !['鼠标', '右键', 'WASD', '滚轮', '双击鼠标'].some(w => t.includes(w));
}) || '出现了键鼠话术');
T('C17 状态条与能力条不吃触摸', await page.evaluate(() =>
  ['#sim-bars', '#sim-skills', '#sim-head'].every(q => getComputedStyle(document.querySelector(q)).pointerEvents === 'none')) || '只读面板在吃触摸');
T('C18 全程零 JS 报错', errs.length === 0 || errs.slice(0, 2).join(' | '));

await browser.close();
console.log(`\n═══ 城市模式结果:${pass} 过 / ${fail} 挂 ═══`);
if (fail) { console.log('🔴 有判据没过'); process.exit(2); }
console.log('✅ 全绿');
