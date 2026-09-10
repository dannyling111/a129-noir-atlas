/* CITY SIM · 城市模拟内核
 *
 * 它替换的是 living.js 里那句 `preferred[(i+cycle)%preferred.length]` ——
 * 原来 NPC 是【按固定顺序轮流去下一个点】,所以同一个人换个处境还是走同一条路线,
 * 那正是研究附件里被判为不足的那一档(固定日程/有限状态机:相同状态下人格差异弱)。
 * 本文件把它换成附件选定的那一档:【连续效用 + 硬执行约束 + 概率选择】。
 *
 * 三层分开,这条是附件第 1 节的纪律,照抄不放松:
 *   第一层 有文献支持的构念:大五人格、基本心理需求、价值优先级
 *   第二层 为可计算性选用的形式:连续效用、softmax 概率选择、有向关系
 *   第三层 具体数值:每步消耗多少、工作赚多少 —— 🔴 这一层是【显式游戏设定】,
 *          没有用真人纵向数据校准过,任何地方都不许把它说成"有研究支持"。
 *
 * 守恒(附件第 5 节):净资产 = 现金 + 投资 − 债务。
 * 人际转账是内部转移,付款减少量必须等于收款增加量;买入资产只是现金转投资,不记为消费。
 * 每次结算后 audit() 会真算一遍账差,超过 1e-6 就报错 —— 不是注释里写写。
 */

const SIM_STEP_MIN = 15;                 // 一步 15 分钟,与附件一致
const NEEDS = ['fed', 'energy', 'social', 'fun', 'autonomy', 'competence', 'security'];
const NEED_CN = { fed: '饱腹', energy: '精力', social: '社交', fun: '娱乐', autonomy: '自主', competence: '胜任', security: '安全' };
/* 每步自然消耗。饱腹与精力取自附件参数表(1.2 / 0.85),其余为本作设定。 */
const DECAY = { fed: 1.2, energy: .85, social: .55, fun: .5, autonomy: .18, competence: .22, security: .12 };

const VALUE_AXES = ['求知', '刺激', '享受', '成就', '影响力', '安全感', '传统', '规则', '关怀', '普遍关切'];

/* 危险率(每小时),取自附件参数表。单步概率 p = 1 − exp(−λΔt),所以调快页面不会提高每个模拟日的事故率。 */
const HAZARD = { layoff: .0006, closure: .0015, market: .002, health: .0007 };

const DAILY_COST = 72, MEAL_COST = 18;

function simRng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function clamp100(v) { return v < 0 ? 0 : v > 100 ? 100 : v; }
function round2(v) { return Math.round(v * 100) / 100; }

/**
 * 一个行动。effect 里的量是【每步】的,不是一次性的 —— 所以长动作自然更累也更值钱。
 * pre 是硬执行约束:不满足就【连候选都进不去】,概率为零(附件第 4 节),不是打个低分了事。
 */
const ACTIONS = [
  { id: 'sleep', name: '睡觉', icon: '🛏', steps: 24, spot: 'seat', effect: { energy: 4.2, fed: -1.2, security: .2 }, stress: -.9, tag: '恢复' },
  { id: 'eat', name: '吃饭', icon: '🍚', steps: 2, spot: 'tea', cost: MEAL_COST, effect: { fed: 26, fun: 2 }, stress: -.6, tag: '恢复',
    pre: s => s.res.cash >= MEAL_COST || '现金不够,先去挣或者先扛着' },
  { id: 'work', name: '上班', icon: '💼', steps: 16, spot: 'work', effect: { energy: -2.1, competence: 1.5, security: .9, social: .3 }, stress: 1.5, tag: '收入',
    income: a => a.res.wage / 16, skill: { skill: .10 },
    pre: s => !!s.res.employer || '你现在没有雇主,先去求职' },
  { id: 'hunt', name: '求职', icon: '📮', steps: 8, spot: 'work', effect: { energy: -1.1, autonomy: .5, competence: -.2 }, stress: 1.1, tag: '转机',
    pre: s => !s.res.employer || '你已经有工作了',
    onDone: (s, w) => {
      const p = Math.min(.85, .18 + s.skill.skill / 260 + s.skill.social / 320 + s.big5.C / 500);
      if (w.rng() < p) { s.res.employer = '城西事务所'; s.res.wage = Math.round(210 + s.skill.skill * 2.4); s.needs.security = clamp100(s.needs.security + 18); return `拿到了 · 日薪 ${s.res.wage}`; }
      s.mood.stress = clamp100(s.mood.stress + 6); return '这次没成。再试。';
    } },
  { id: 'study', name: '学习', icon: '📖', steps: 8, spot: 'read', effect: { energy: -1.1, competence: 2.0, fun: -.3 }, stress: .4, tag: '成长',
    skill: a => ({ skill: .16 + a.skill.cognition / 900, cognition: .07 }) },
  { id: 'read', name: '读闲书', icon: '📚', steps: 6, spot: 'read', effect: { energy: -.4, fun: 2.0, competence: .3 }, stress: -.8, tag: '恢复', skill: { cognition: .04 } },
  { id: 'train', name: '运动', icon: '🏃', steps: 6, spot: 'view', effect: { energy: -1.9, fed: -1.4, fun: 1.1, competence: .5 }, stress: -1.2, health: .23, tag: '身体' },
  { id: 'talk', name: '找人聊聊', icon: '💬', steps: 4, spot: 'meet', effect: { social: 6.5, fun: 1.4, energy: -.5 }, stress: -1.0, tag: '关系',
    skill: { social: .09 }, social: true },
  { id: 'walk', name: '出去走走', icon: '🌿', steps: 4, spot: 'view', effect: { fun: 2.2, autonomy: 1.6, energy: -.5 }, stress: -1.1, tag: '恢复' },
  { id: 'rest', name: '发呆', icon: '☕', steps: 2, spot: 'seat', effect: { energy: 1.1, fun: .5 }, stress: -1.5, tag: '恢复' },
  { id: 'invest', name: '买入投资', icon: '📈', steps: 1, spot: 'work', effect: { security: -1.2, competence: .4 }, stress: .5, tag: '钱',
    pre: s => s.res.cash >= 200 || '现金不足 200,买不了',
    onDone: (s, w) => { const amt = Math.min(400, Math.floor(s.res.cash * .35)); s.res.cash -= amt; s.res.invest += amt; /* 现金转投资:净资产不变,所以【不记】外部收支 */ return `把 ${amt} 从现金转成投资(不是消费)`; } },
  { id: 'clinic', name: '去看病', icon: '🩺', steps: 4, spot: 'seat', cost: 120, effect: { energy: .6, security: .8 }, stress: -1.4, health: 1.6, tag: '身体',
    pre: s => s.res.cash >= 120 || '看病要 120,现金不够' },
];
const ACTION_BY_ID = Object.fromEntries(ACTIONS.map(a => [a.id, a]));

/** 一个人的模拟状态。0–100 是设计坐标,不是任何量表的实际得分。 */
function makeSimState(id, rng) {
  const big5 = {}; for (const k of ['O', 'C', 'E', 'A', 'N']) big5[k] = Math.round(28 + rng() * 56);
  const raw = VALUE_AXES.map(() => .35 + rng()); const sum = raw.reduce((a, b) => a + b, 0);
  const values = {}; VALUE_AXES.forEach((k, i) => values[k] = round2(raw[i] / sum * 100));
  const needs = {}; for (const k of NEEDS) needs[k] = Math.round(52 + rng() * 30);
  const hasJob = rng() < .7;
  return {
    id, big5, values, needs,
    mood: { stress: Math.round(12 + rng() * 22) },
    body: { health: Math.round(70 + rng() * 25), age: Math.round(24 + rng() * 22) },
    skill: { skill: Math.round(18 + rng() * 45), cognition: Math.round(30 + rng() * 45), social: Math.round(25 + rng() * 50) },
    res: { cash: Math.round(300 + rng() * 900), invest: Math.round(rng() * 700), debt: 0, wage: 0, employer: null },
    doing: null, log: [],
  };
}

/** 缺口非线性放大:快饿坏时吃饭的价值远高于刚吃饱时(附件第 4 节)。 */
function gap(v) { const d = (100 - v) / 100; return Math.pow(d, 1.6); }

/** 动机匹配:这个动作蹭到了他哪几条价值。表是显式游戏设定。 */
const ACTION_VALUES = {
  work: { 成就: .9, 安全感: .7, 规则: .4 }, hunt: { 安全感: 1.1, 成就: .4 },
  study: { 求知: 1.0, 成就: .6 }, read: { 求知: .8, 享受: .5 },
  train: { 成就: .4, 享受: .5 }, talk: { 关怀: .9, 享受: .4 },
  walk: { 刺激: .7, 享受: .6 }, rest: { 享受: .8 }, sleep: { 安全感: .3 },
  eat: { 享受: .6 }, invest: { 影响力: .7, 安全感: .5 }, clinic: { 安全感: .8 },
};
/** 人格对动作的偏置。也是显式设定 —— 附件明写「人格分值到某次行为没有确定映射」。 */
const ACTION_BIG5 = {
  work: { C: .020, N: -.004 }, study: { C: .016, O: .010 }, read: { O: .018 },
  talk: { E: .022, A: .012 }, walk: { O: .012, E: .008 }, train: { C: .010 },
  rest: { N: .010 }, hunt: { C: .012 }, invest: { O: .008, C: .006 },
};

/**
 * 一个动作此刻对这个人的效用。分项返回,好让界面能摊开【为什么是它】。
 */
function utilityOf(act, s, ctx = {}) {
  const parts = { 需求: 0, 动机: 0, 情境: 0, 花钱: 0, 健康: 0 };
  const eff = act.effect || {};
  for (const k of NEEDS) if (eff[k]) parts.需求 += eff[k] * act.steps * gap(s.needs[k]) * .5;
  if (act.stress) parts.需求 += -act.stress * act.steps * gap(100 - s.mood.stress) * .6;

  const av = ACTION_VALUES[act.id] || {};
  for (const k of Object.keys(av)) parts.动机 += av[k] * (s.values[k] || 0) * .06;
  const ab = ACTION_BIG5[act.id] || {};
  for (const k of Object.keys(ab)) parts.动机 += ab[k] * s.big5[k];

  if (act.id === 'work' && ctx.hour >= 9 && ctx.hour < 18) parts.情境 += 3.2;
  if (act.id === 'work' && (ctx.hour < 8 || ctx.hour >= 19)) parts.情境 -= 4.5;
  if (act.id === 'sleep' && (ctx.hour >= 22 || ctx.hour < 6)) parts.情境 += 5.0;
  if (act.id === 'sleep' && ctx.hour >= 9 && ctx.hour < 20) parts.情境 -= 4.0;
  if (act.id === 'hunt' && !s.res.employer) parts.情境 += 2.6;

  const cost = (act.cost || 0);
  if (cost) { const days = s.res.cash / DAILY_COST; parts.花钱 = -cost * .02 * (days < 4 ? 3.2 : days < 10 ? 1.3 : .6); }
  if (act.income) parts.情境 += 1.6;
  if (act.health && act.health < 0) parts.健康 = act.health * act.steps * (100 - s.body.health) / 40;

  const total = parts.需求 + parts.动机 + parts.情境 + parts.花钱 + parts.健康;
  return { total: round2(total), parts };
}

/** 硬执行约束:返回 true 可做,返回字符串 = 不可做的原因(界面直接显示这句话)。 */
function feasible(act, s, world) {
  if (act.pre) { const r = act.pre(s, world); if (r !== true) return typeof r === 'string' ? r : '现在不能做'; }
  if (act.cost && s.res.cash < act.cost) return `要 ${act.cost},现金不够`;
  if (act.social && (world?.peers ?? 1) < 1) return '附近没有人可以说话';
  return true;
}

/** 生理自保:饿坏/累垮/病危时覆盖一般的概率选择(附件第 4 节)。 */
function survivalOverride(s) {
  if (s.body.health < 15) return 'clinic';
  if (s.needs.fed < 12) return 'eat';
  if (s.needs.energy < 10) return 'sleep';
  return null;
}

/** 有限理性:softmax。τ 越高越分散;它是游戏决策噪声,不是"这个人有多理性"。 */
function chooseAction(s, world) {
  const forced = survivalOverride(s);
  const pool = [];
  for (const act of ACTIONS) {
    const ok = feasible(act, s, world);
    if (ok !== true) continue;
    pool.push({ act, u: utilityOf(act, s, world).total });
  }
  if (!pool.length) return { act: ACTION_BY_ID.rest, p: 1, forced: false };
  if (forced && pool.some(x => x.act.id === forced)) return { act: ACTION_BY_ID[forced], p: 1, forced: true };
  const tau = 5.5 + 2 * s.mood.stress / 100;
  const max = Math.max(...pool.map(x => x.u));
  let sum = 0; for (const x of pool) { x.w = Math.exp((x.u - max) / tau); sum += x.w; }
  let r = world.rng() * sum;
  for (const x of pool) { r -= x.w; if (r <= 0) return { act: x.act, p: round2(x.w / sum), forced: false }; }
  const last = pool[pool.length - 1];
  return { act: last.act, p: round2(last.w / sum), forced: false };
}

/** 给界面用的候选表:每条带效用、概率、可不可做、预计后果。 */
function candidates(s, world) {
  const rows = ACTIONS.map(act => {
    const ok = feasible(act, s, world);
    const u = utilityOf(act, s, world);
    return { act, ok, why: ok === true ? '' : ok, u: u.total, parts: u.parts, p: 0 };
  });
  const live = rows.filter(r => r.ok === true);
  if (live.length) {
    const tau = 5.5 + 2 * s.mood.stress / 100, max = Math.max(...live.map(r => r.u));
    let sum = 0; for (const r of live) { r.w = Math.exp((r.u - max) / tau); sum += r.w; }
    for (const r of live) r.p = round2(r.w / sum);
  }
  return rows.sort((a, b) => (b.ok === true) - (a.ok === true) || b.u - a.u);
}

/** 预计后果:点之前就看得到。只列会明显变的那几项,不刷屏。 */
function forecast(act, s) {
  const out = [];
  const eff = act.effect || {};
  for (const k of NEEDS) { const v = (eff[k] || 0) * act.steps; if (Math.abs(v) >= 3) out.push({ k: NEED_CN[k], v: Math.round(v) }); }
  const st = -(act.stress || 0) * act.steps; if (Math.abs(st) >= 3) out.push({ k: '心情', v: Math.round(st) });
  if (act.health) out.push({ k: '健康', v: round2(act.health * act.steps) });
  const inc = act.income ? Math.round(act.income(s) * act.steps) : 0; if (inc) out.push({ k: '💰', v: inc });
  if (act.cost) out.push({ k: '💰', v: -act.cost });
  const sk = typeof act.skill === 'function' ? act.skill(s) : act.skill;
  if (sk) for (const k of Object.keys(sk)) out.push({ k: ({ skill: '专业', cognition: '认知', social: '社交力' })[k], v: round2(sk[k] * act.steps) });
  return out;
}

/** 世界:时钟、账本、事件、所有人的模拟状态。 */
class CitySim {
  constructor(seed = 20260910) {
    this.rng = simRng(seed);
    this.seed = seed;
    this.step = 0;                     // 从第 1 天 08:00 起算
    this.people = new Map();
    this.market = 1;
    this.ledger = { externalIn: 0, externalOut: 0, valuation: 0, start: 0, adjust: 0 };
    this.events = [];
    this.eventsOn = true;
  }
  attach(id) { if (!this.people.has(id)) { const s = makeSimState(id, this.rng); if (this.rng() < .7) { s.res.employer = '城西事务所'; s.res.wage = Math.round(210 + s.skill.skill * 2.4); } this.people.set(id, s); } return this.people.get(id); }
  get(id) { return this.people.get(id); }
  seal() { this.ledger.start = this.netWorth(); }
  netWorth() { let n = 0; for (const s of this.people.values()) n += s.res.cash + s.res.invest - s.res.debt; return n; }
  /** 资金恒等式真算一遍;账差超过阈值就报错,不靠注释保证(附件第 5 节)。 */
  audit() {
    const expect = this.ledger.start + this.ledger.externalIn - this.ledger.externalOut + this.ledger.valuation + this.ledger.adjust;
    const diff = this.netWorth() - expect;
    return { ok: Math.abs(diff) < 1e-6, diff, expect, actual: this.netWorth() };
  }
  get minutes() { return 8 * 60 + this.step * SIM_STEP_MIN; }
  get day() { return Math.floor(this.minutes / 1440) + 1; }
  get hour() { return Math.floor((this.minutes % 1440) / 60); }
  clock() { const m = this.minutes % 1440; return `第 ${this.day} 天 ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
  note(text) { this.events.unshift({ step: this.step, text }); if (this.events.length > 30) this.events.pop(); }

  /** 自然流逝:一步 15 分钟,每个人的需求都掉,不管他在做什么。 */
  decay(steps = 1) {
    for (const s of this.people.values()) {
      for (const k of NEEDS) s.needs[k] = clamp100(s.needs[k] - DECAY[k] * steps);
      const load = (100 - s.needs.energy) * .004 + (100 - s.needs.fed) * .005 + (100 - s.needs.security) * .004;
      s.mood.stress = clamp100(s.mood.stress + load * steps * (1 + s.big5.N / 200));
      if (s.mood.stress > 72) s.body.health = clamp100(s.body.health - .02 * steps);
    }
  }

  /** 执行一个动作的全部步长,一次结算完。返回给界面看的变化明细。 */
  perform(id, actId) {
    const s = this.people.get(id); const act = ACTION_BY_ID[actId];
    if (!s || !act) return { ok: false, why: '没有这个动作' };
    const ok = feasible(act, s, { peers: 1, rng: this.rng, hour: this.hour });
    if (ok !== true) return { ok: false, why: ok };

    const before = { ...s.needs, stress: s.mood.stress, health: s.body.health, cash: s.res.cash, ...s.skill };
    this.decay(act.steps);                            // 时间照样流逝
    const eff = act.effect || {};
    for (const k of NEEDS) if (eff[k]) s.needs[k] = clamp100(s.needs[k] + eff[k] * act.steps);
    if (act.stress) s.mood.stress = clamp100(s.mood.stress + act.stress * act.steps);
    if (act.health) s.body.health = clamp100(s.body.health + act.health * act.steps);
    const sk = typeof act.skill === 'function' ? act.skill(s) : act.skill;
    if (sk) for (const k of Object.keys(sk)) s.skill[k] = clamp100(round2(s.skill[k] + sk[k] * act.steps));
    if (act.cost) { s.res.cash -= act.cost; this.ledger.externalOut += act.cost; }
    if (act.income) { const got = Math.round(act.income(s) * act.steps); s.res.cash += got; this.ledger.externalIn += got; }
    let extra = act.onDone ? act.onDone(s, this) : '';

    const stepsBefore = this.step; this.step += act.steps;
    for (let d = Math.floor((8 * 60 + stepsBefore * SIM_STEP_MIN) / 1440); d < Math.floor(this.minutes / 1440); d++) this.settleDay();
    this.rollEvents(act.steps);

    const delta = {};
    for (const k of NEEDS) if (Math.abs(s.needs[k] - before[k]) >= 1) delta[NEED_CN[k]] = Math.round(s.needs[k] - before[k]);
    if (Math.abs(s.mood.stress - before.stress) >= 1) delta['心情'] = -Math.round(s.mood.stress - before.stress);
    if (Math.abs(s.body.health - before.health) >= .5) delta['健康'] = round2(s.body.health - before.health);
    if (s.res.cash !== before.cash) delta['💰'] = s.res.cash - before.cash;
    for (const k of ['skill', 'cognition', 'social']) if (Math.abs(s.skill[k] - before[k]) >= .1) delta[({ skill: '专业', cognition: '认知', social: '社交力' })[k]] = round2(s.skill[k] - before[k]);
    return { ok: true, delta, extra, act };
  }

  /** 日结:固定支出;现金不够转成债务,不许让负现金藏起来。 */
  settleDay() {
    for (const s of this.people.values()) {
      /* 净资产 = 现金 + 投资 − 债务。付得起就扣现金,付不起就把差额转成债务 ——
         两种情形对净资产的影响【都是 −DAILY_COST】,所以外部支出都记同一笔,不能记两次。
         (第一版这里把 cash 和 short 各记一次又减回去,绕了一圈还容易错,已改直。) */
      if (s.res.cash >= DAILY_COST) s.res.cash = round2(s.res.cash - DAILY_COST);
      else { const short = DAILY_COST - s.res.cash; s.res.cash = 0; s.res.debt = round2(s.res.debt + short); }
      this.ledger.externalOut += DAILY_COST;
      if (s.res.cash === 0 && s.res.debt > 0) s.needs.security = clamp100(s.needs.security - 4);
    }
    /* 市场每日波动:全体共享,不给谁凭空加稳定超额收益(附件第 4 节)。 */
    const shock = Math.max(-.25, Math.min(.25, (this.rng() - .5) * .06));
    for (const s of this.people.values()) { const was = s.res.invest; s.res.invest = round2(s.res.invest * (1 + shock)); this.ledger.valuation += s.res.invest - was; }
  }

  /** 随机事件:p = 1 − exp(−λΔt),所以页面调快不会提高每个模拟日的事故率。 */
  rollEvents(steps) {
    if (!this.eventsOn) return;
    const hours = steps * SIM_STEP_MIN / 60;
    const p = l => 1 - Math.exp(-l * hours);
    for (const s of this.people.values()) {
      if (s.res.employer && this.rng() < p(HAZARD.layoff)) { s.res.employer = null; s.res.wage = 0; s.mood.stress = clamp100(s.mood.stress + 14); s.needs.security = clamp100(s.needs.security - 20); this.note(`人物 ${s.id} 被裁员了`); }
      if (this.rng() < p(HAZARD.health)) { s.body.health = clamp100(s.body.health - 10); s.mood.stress = clamp100(s.mood.stress + 8); this.note(`人物 ${s.id} 身体出了点状况`); }
    }
    if (this.rng() < p(HAZARD.closure)) {
      const victims = [...this.people.values()].filter(s => s.res.employer === '城西事务所');
      if (victims.length) { for (const s of victims) { s.res.employer = null; s.res.wage = 0; s.mood.stress = clamp100(s.mood.stress + 16); s.needs.security = clamp100(s.needs.security - 24); } this.note(`城西事务所倒闭 —— ${victims.length} 个人同时失业`); }
    }
    if (this.rng() < p(HAZARD.market)) {
      let moved = 0; for (const s of this.people.values()) { const was = s.res.invest; s.res.invest = round2(s.res.invest * .82); moved += s.res.invest - was; }
      this.ledger.valuation += moved; if (moved < -1) this.note(`市场大跌 —— 持仓的人一起缩水`);
    }
  }
}
