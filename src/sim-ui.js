/* CITY SIM · 界面层 —— 主席要的是「在游戏界面里直接操作、做决策、把自己的数据练上去」
 *
 * 所以这一层只做三件事,别的一律不做:
 *   ① 状态条:精力/饱腹/心情/社交/安全 五条 + 现金 + 时钟,一眼看完
 *   ② 决策卡:每张卡【点之前就写着后果】(💰+210 ⚡−34 😖−24 专业+1.6),
 *      不可做的卡直接写出原因("你现在没有雇主,先去求职"),而不是让人点了才知道
 *   ③ 能力条:专业/认知/社交力/健康 —— 这四条是长期成长,一天一天往上顶
 *
 * 🔴 没有文字剧情、没有对话框、没有旁白。点一张卡 = 人物真的走过去做那件事,
 *    数字当场跳变。这条是主席明确要求的:少文字,多直接操作。
 */

const ACTION_NOTE = { invest: '把三成现金转成投资(不是花掉)', rest: '什么也不干,让心情缓一缓' };
const SIM_SPOT_KIND = { work: ['work'], read: ['read'], tea: ['tea', 'seat'], meet: ['meet', 'view'], view: ['view'], seat: ['seat', 'tea'] };

function setupCitySim(app) {
  const sim = new CitySim(20260910);
  app.sim = sim;

  const style = document.createElement('style');
  style.textContent = `
  body.city-mode .scene-dock{display:none}
  #sim-panel{display:none;flex-direction:column;gap:9px;padding-top:11px;border-top:1px solid var(--line)}
  body.city-mode #sim-panel{display:flex}
  .immersive #sim-panel{opacity:0;pointer-events:none}
  #sim-panel .sim-head{display:flex;align-items:center;gap:12px;font-size:11px;letter-spacing:1px;color:#dcdcd8;pointer-events:none;flex-wrap:wrap}
  #sim-panel .sim-head b{font-weight:500;font-variant-numeric:tabular-nums}
  #sim-panel .sim-head .warn{color:#ffb4a0}
  .sim-bars{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;pointer-events:none}
  .sim-bar .bl{display:flex;justify-content:space-between;font-size:8.5px;letter-spacing:.5px;color:#a8a8a4;margin-bottom:4px}
  .sim-bar .bt{height:4px;border-radius:3px;background:#ffffff1c;overflow:hidden}
  .sim-bar .bt i{display:block;height:100%;background:#dedad2;transition:width .35s}
  .sim-bar.low .bt i{background:#ff7c68}.sim-bar.mid .bt i{background:#e8c073}
  .sim-cards{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}
  .sim-cards::-webkit-scrollbar{display:none}
  .sim-card{flex:0 0 auto;min-width:118px;min-height:74px;border:1px solid #ffffff28;border-radius:6px;
    background:#16161695;backdrop-filter:blur(10px);padding:8px 10px;display:flex;flex-direction:column;
    gap:3px;align-items:flex-start;text-align:left}
  .sim-card:active{background:#eae9e4;color:#111}
  .sim-card .r1{display:flex;align-items:center;gap:6px;font-size:12px;letter-spacing:1px}
  .sim-card .dur{font-size:8.5px;color:#9d9d99;letter-spacing:0}
  .sim-card .fx{font-size:9px;letter-spacing:0;color:#c6c6c1;line-height:1.5;font-variant-numeric:tabular-nums}
  .sim-card .fx .up{color:#8fd6a8}.sim-card .fx .dn{color:#ff9a8a}
  .sim-card[disabled]{opacity:.42}
  .sim-card[disabled] .fx{color:#ffb4a0}
  .sim-skills{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;pointer-events:none}
  .sim-skills .sk{font-size:8.5px;letter-spacing:.5px;color:#a8a8a4}
  .sim-skills .sk b{display:block;color:#e7e6e1;font-size:12px;font-weight:500;margin-top:2px;font-variant-numeric:tabular-nums}
  .sim-skills .sk .up{color:#8fd6a8}
  @media(max-width:600px){
    .sim-bars{grid-template-columns:repeat(5,1fr);gap:5px}
    .sim-card{min-width:106px;min-height:72px}
    #sim-panel .sim-head{font-size:10px;gap:8px}
  }
  body.light-scene #sim-panel .sim-head{color:#2a2a28}
  body.light-scene .sim-bar .bl,body.light-scene .sim-skills .sk{color:#4a4a47}
  body.light-scene .sim-skills .sk b{color:#1c1c1a}
  body.light-scene .sim-card{background:#ffffffc4;border-color:#00000024;color:#1c1c1a}
  body.light-scene .sim-card .fx{color:#45453f}
  body.light-scene .sim-bar .bt{background:#00000018}
  /* 🔴 入口按钮不跟站里其它 pill 共用尺寸:那些在手机上只有 29px 高,
     手指按下去命中的常常是隔壁那个(实测 390×844 下命中失败)。
     城市模式是主入口,必须自己守住 44px 这条底线(Rule-MOBILE-001)。 */
  #city-toggle{min-height:44px;height:44px;padding:0 15px;font-size:11px;letter-spacing:1px;
    border-color:#ffffff55;background:#1a1a1aa8}
  #city-toggle[aria-pressed=true]{background:#ededeb;color:#111;border-color:#ededeb;font-weight:600}
  @media(max-width:600px){#city-toggle{min-height:44px;height:44px;padding:0 13px;font-size:10.5px}}
  body.light-scene .sim-bar .bt i{background:#3a3a36}
  `;
  document.head.appendChild(style);
  /* 浏览器会自己去要 /favicon.ico,没有就报一条 404 到控制台。
     它不影响功能,但会让"全程零报错"这条判据变成永远不可能过 —— 于是那条判据就废了。 */
  if (!document.querySelector('link[rel~="icon"]')) {
    const ico = document.createElement('link'); ico.rel = 'icon';
    ico.href = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='6' fill='%23111'/%3E%3Ccircle cx='16' cy='13' r='5' fill='%23eee'/%3E%3Crect x='9' y='20' width='14' height='7' rx='3' fill='%23eee'/%3E%3C/svg%3E";
    document.head.appendChild(ico);
  }

  const panel = document.createElement('div');
  panel.id = 'sim-panel';
  panel.innerHTML = `<div class="sim-head" id="sim-head"></div>
    <div class="sim-bars" id="sim-bars"></div>
    <div class="sim-cards" id="sim-cards"></div>
    <div class="sim-skills" id="sim-skills"></div>`;
  document.querySelector('.bottom').appendChild(panel);

  const pill = document.createElement('button');
  pill.className = 'tool-pill'; pill.id = 'city-toggle'; pill.type = 'button';
  pill.textContent = '城市'; pill.setAttribute('aria-pressed', 'false');
  document.querySelector('.workspace')?.prepend(pill);

  const BAR_KEYS = ['energy', 'fed', 'social', 'security'];
  let lastSkill = null;

  function me() { return app.actor; }
  function meSim() { return sim.attach(me().id); }

  function bar(label, v, invert = false) {
    const shown = invert ? 100 - v : v;
    const cls = shown < 25 ? 'low' : shown < 50 ? 'mid' : '';
    return `<div class="sim-bar ${cls}"><div class="bl"><span>${label}</span><span>${Math.round(shown)}</span></div><div class="bt"><i style="width:${Math.round(shown)}%"></i></div></div>`;
  }


  /* 🔴 分成两半是有原因的(手机上实测出来的):
     第一版每 5.2 秒把整个面板 innerHTML 重写一遍,包括决策卡。
     后果是【手指正按在某张卡上时,那张卡被换成了另一张】——
     在桌面上你几乎碰不到这个窗口,在手机上一次滑动加一次点按就足够撞上。
     现在:状态条与时钟随时更新(它们不接受触摸,换掉没关系),
     决策卡只在【能做的动作集合真的变了】时才重建,否则一个字节都不动。 */
  function render(force = false) {
    if (!document.body.classList.contains('city-mode')) return;
    const s = meSim();
    const job = s.res.employer ? s.res.employer : '<span class="warn">没有工作</span>';
    const debt = s.res.debt > 0 ? ` · <span class="warn">欠 ${Math.round(s.res.debt)}</span>` : '';
    document.getElementById('sim-head').innerHTML =
      `<b>${sim.clock()}</b><span>💰 <b>${Math.round(s.res.cash)}</b></span><span>📈 ${Math.round(s.res.invest)}</span><span>${job}</span>${debt}`;

    document.getElementById('sim-bars').innerHTML =
      BAR_KEYS.map(k => bar(NEED_CN[k], s.needs[k])).join('') + bar('心情', s.mood.stress, true);

    const world = { peers: app.actors.length - 1, rng: sim.rng, hour: sim.hour };
    const rows = candidates(s, world);
    /* 🔴 每个动作【一个固定的 DOM 节点,永不重建】,只就地改字与禁用状态。
       为什么不是"集合变了才重建"(第一版的做法):只要还会重建,
       就存在"手指按下去的那一刻它正好被换掉"的窗口 —— 实测 R4 就挂在这个窗口上。
       固定节点之后这一类窗口整个消失:卡还是那张卡,变的只是它上面的字。
       排序也不在定时刷新里做 —— 用 flex 的 order,而且只在【玩家刚看完一次结算】
       这种他不会正在点的时刻才重排,免得卡在手指底下自己挪位置。 */
    const host = document.getElementById('sim-cards');
    for (const r of rows) {
      let el = host.querySelector(`[data-act="${r.act.id}"]`);
      if (!el) {
        el = document.createElement('button');
        el.className = 'sim-card'; el.type = 'button'; el.dataset.act = r.act.id;
        const hrs = r.act.steps * 15 / 60;
        const dur = hrs >= 1 ? `${hrs % 1 ? hrs.toFixed(1) : hrs} 小时` : `${r.act.steps * 15} 分钟`;
        el.innerHTML = `<span class="r1">${r.act.icon} ${r.act.name}<span class="dur">${dur}</span></span><span class="fx"></span>`;
        el.onclick = () => go(r.act.id);
        host.appendChild(el);
      }
      const list = r.ok === true ? forecast(r.act, s) : [];
      const fx = r.ok !== true ? r.why
        : list.length ? list.map(f => `<span class="${f.v > 0 ? 'up' : 'dn'}">${f.k}${f.v > 0 ? '+' : ''}${f.v}</span>`).join(' ')
        : (ACTION_NOTE[r.act.id] || '影响很小');
      const fxEl = el.querySelector('.fx');
      if (fxEl.innerHTML !== fx) fxEl.innerHTML = fx;
      if (el.disabled !== (r.ok !== true)) el.disabled = (r.ok !== true);
      if (force) el.style.order = String(rows.indexOf(r));
    }
    renderSkills(s);
  }
  function renderSkills(s) {
    const sk = [['专业', s.skill.skill], ['认知', s.skill.cognition], ['社交力', s.skill.social], ['健康', s.body.health]];
    document.getElementById('sim-skills').innerHTML = sk.map(([n, v], i) => {
      const rose = lastSkill && v - lastSkill[i] > .05;
      return `<div class="sk">${n}<b class="${rose ? 'up' : ''}">${Math.round(v * 10) / 10}</b></div>`;
    }).join('');
    lastSkill = sk.map(x => x[1]);
  }

  /** 找一个能做这件事的地点。找不到就原地做 —— 绝不因为地图上没这张椅子就让玩家卡住。 */
  function spotFor(act) {
    const kinds = SIM_SPOT_KIND[act.spot] || ['view'];
    const free = (app.scene.spots || []).filter(sp => kinds.includes(sp.kind) && !app.living.reserved.has(sp.id));
    if (free.length) return free[(me().id + sim.step) % free.length];
    return (app.scene.spots || []).find(sp => kinds.includes(sp.kind)) || null;
  }

  function go(actId) {
    const a = me(), act = ACTION_BY_ID[actId], s = meSim();
    const ok = feasible(act, s, { peers: app.actors.length - 1, rng: sim.rng, hour: sim.hour });
    if (ok !== true) { app.toast(ok); return; }
    const sp = spotFor(act);
    a.simPending = actId;
    a.simSince = performance.now();
    if (sp && app.living.visit(a, sp.id, true)) { app.toast(`${act.icon} ${act.name} · 走去「${sp.name}」`); }
    else { settle(); }                       // 走不过去就原地做,不卡住玩家
  }

  function settle() {
    const a = me(), actId = a.simPending; if (!actId) return;
    a.simPending = null;
    const r = sim.perform(a.id, actId);
    if (!r.ok) { app.toast(r.why); render(); return; }
    const bits = Object.entries(r.delta).map(([k, v]) => `${k}${v > 0 ? '+' : ''}${v}`).join(' ');
    app.toast(`${r.act.icon} ${r.act.name}完了 · ${bits}${r.extra ? ' · ' + r.extra : ''}`, 3600);
    if (sim.events.length && sim.events[0].step >= sim.step - r.act.steps) setTimeout(() => app.toast('⚡ ' + sim.events[0].text, 3400), 3700);
    render(true);
  }

  /** 走到了、坐下了,才算真的开始做 —— 所以结算挂在到达上,不是挂在点击上。 */
  function poll() {
    const a = app.actor;
    /* 走到了才算开始做 —— 但绝不许无限等:路被占、被别人先坐了、寻路失败,
       都会让玩家点了卡之后【什么也不发生】,而他不知道是自己点错了还是游戏坏了。
       所以设一个 9 秒的兜底,到点就原地开始做,并如实说一句。 */
    if (a?.simPending && a.life?.task?.stage === 'using') settle();
    else if (a?.simPending && performance.now() - (a.simSince || 0) > 9000) {
      app.toast('那边过不去,就地做了。'); app.living.cancel(a); settle();
    }
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);

  pill.onclick = () => {
    const on = !document.body.classList.contains('city-mode');
    document.body.classList.toggle('city-mode', on);
    pill.setAttribute('aria-pressed', String(on));
    if (on) { for (const a of app.actors) sim.attach(a.id); sim.seal(); render(true); app.setPaused(false); app.toast('城市模式:点下面的卡做决定,数字会当场变。', 3600); }
  };

  setInterval(() => { if (document.body.classList.contains('city-mode')) { sim.decay(1); render(); } }, 5200);
  app.refreshSim = () => render(true);
  /* 只读导出:给回归闸摸到内核的纯函数。不导出的话测试就得另抄一份内核,
     那就有两个真源了(Rule-MODULE-001)。这里只暴露函数引用,不改任何行为。 */
  window.__SIM__ = { utilityOf, candidates, chooseAction, feasible, forecast, ACTIONS, ACTION_BY_ID, NEEDS, NEED_CN };
  return sim;
}
