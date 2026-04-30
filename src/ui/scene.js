/**
 * scene.js — 病棚夜诊 场景化 UI
 *
 * Direction Lock 场景交互:
 *   - 药物/处理动作可拖到病人卡（HTML5 Drag + 触摸回退）
 *   - 病势/感染可视化条
 *   - 资源短缺即时可见
 *   - 操作后病势变化动画
 */

// ── 样式注入 ──────────────────────────────────────────────

const SCENE_CSS = `
/* 压力条 */
.scene-status{display:flex;flex-direction:column;gap:.4rem;padding:.8rem;background:var(--card);border:1px solid var(--border);border-radius:6px;margin-bottom:.8rem}
.pressure-row{display:flex;align-items:center;gap:.6rem;font-size:.85rem}
.pressure-bar{flex:1;height:8px;background:#111;border-radius:4px;overflow:hidden}
.pressure-fill{height:100%;border-radius:4px;transition:width .4s,background .4s}
.pressure-fill.time{background:var(--accent)}.pressure-fill.medicine{background:#5a9a5a}
.pressure-fill.low{background:var(--danger);animation:pulse 1s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.pressure-label{min-width:2.5em;text-align:right;color:var(--accent);font-size:.85rem}
.status-meta{display:flex;gap:1rem;font-size:.8rem;opacity:.8}
.status-meta .danger{color:var(--danger);font-weight:bold}

/* 病人场景 */
.patient-scene{display:flex;flex-direction:column;gap:0;margin-bottom:.8rem}
.patient-card{background:var(--card);border:2px solid var(--border);border-radius:6px;padding:.8rem 1rem;display:flex;align-items:center;gap:.8rem;position:relative;transition:border-color .2s,box-shadow .2s}
.patient-card.dead{opacity:.3;pointer-events:none}
.patient-card.drag-over{border-color:var(--accent);box-shadow:0 0 12px rgba(201,162,39,.4);background:rgba(201,162,39,.05)}
.patient-card.drop-target::after{content:"↑ 拖到此处";position:absolute;right:1rem;color:var(--accent);opacity:.5;font-size:.8rem;pointer-events:none}
.patient-info{flex:1}
.patient-name{font-weight:bold;margin-bottom:.15rem}
.patient-symptom{font-size:.85rem;opacity:.8;margin-bottom:.25rem}
.illness-meter{display:flex;align-items:center;gap:.4rem}
.illness-bar{width:80px;height:6px;background:#111;border-radius:3px;overflow:hidden}
.illness-fill{height:100%;border-radius:3px;transition:width .4s,background .4s}
.illness-fill.s0{background:var(--success)}.illness-fill.s1{background:var(--success)}.illness-fill.s2{background:var(--warn)}.illness-fill.s3{background:var(--danger)}.illness-fill.s4{background:#8b0000}
.illness-num{font-size:.8rem;min-width:3em}
.badge{display:inline-block;font-size:.7rem;padding:.1rem .35rem;border-radius:3px;margin-left:.3rem;vertical-align:middle}
.badge.inf{background:rgba(179,58,58,.3);color:var(--danger)}
.badge.stb{background:rgba(58,138,58,.3);color:var(--success)}
.badge.don{background:rgba(201,162,39,.2);color:var(--accent)}

/* 感染扩散线 */
.inf-line{display:flex;align-items:center;height:14px;padding:0 1.2rem}
.inf-line.active{opacity:1}.inf-line:not(.active){opacity:0;height:0;margin:0;padding:0}
.inf-dash{flex:1;height:1px;background:repeating-linear-gradient(90deg,var(--danger) 0 4px,transparent 4px 8px);animation:infPulse 2s infinite}
@keyframes infPulse{0%,100%{opacity:.3}50%{opacity:1}}

/* 药箱 */
.medicine-box{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:.8rem;margin-bottom:.8rem}
.med-title{color:var(--accent);font-size:.85rem;margin-bottom:.5rem;text-align:center}
.med-items{display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center}
.act-item{display:flex;flex-direction:column;align-items:center;padding:.5rem .7rem;background:rgba(255,255,255,.03);border:2px solid var(--border);border-radius:6px;cursor:grab;user-select:none;transition:border-color .2s,opacity .2s,transform .15s;min-width:72px}
.act-item:hover:not(.disabled){border-color:var(--accent);transform:translateY(-2px)}
.act-item.dragging{opacity:.4;transform:scale(.95)}
.act-item.disabled{opacity:.25;cursor:not-allowed}
.act-item.selected{border-color:var(--accent);box-shadow:0 0 8px rgba(201,162,39,.3);background:rgba(201,162,39,.08)}
.act-icon{font-size:1.4rem;margin-bottom:.15rem}.act-label{font-size:.78rem}.act-cost{font-size:.7rem;color:var(--accent);opacity:.7;margin-top:.1rem}

/* 反馈动画 */
.patient-card.flash-ok{animation:flashOk .5s ease}
@keyframes flashOk{0%{box-shadow:0 0 0 rgba(201,162,39,0)}30%{box-shadow:0 0 20px rgba(201,162,39,.6)}100%{box-shadow:none}}
.patient-card.flash-bad{animation:flashBad .5s ease}
@keyframes flashBad{0%{box-shadow:0 0 0 rgba(179,58,58,0)}30%{box-shadow:0 0 20px rgba(179,58,58,.6)}100%{box-shadow:none}}
.ill-delta{position:absolute;right:1rem;top:.4rem;font-size:.9rem;font-weight:bold;animation:deltaUp 1s ease forwards;pointer-events:none}
.ill-delta.good{color:var(--success)}.ill-delta.bad{color:var(--danger)}
@keyframes deltaUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-18px)}}

.phase-btn{display:block;margin:.5rem auto;background:var(--accent);color:var(--bg);border:none;padding:.6rem 2rem;border-radius:4px;cursor:pointer;font:inherit;font-weight:bold;font-size:1rem;letter-spacing:.1em;transition:transform .15s}
.phase-btn:hover{transform:scale(1.05)}
.resolve-box{background:var(--card);border:1px solid var(--border);border-radius:6px;padding:1rem;margin-bottom:.8rem;text-align:center}
.resolve-title{color:var(--accent);font-size:.95rem;margin-bottom:.6rem;font-weight:bold}
.resolve-item{font-size:.85rem;line-height:1.7}
.resolve-item.death{color:var(--danger)}
.resolve-item.infection{color:var(--warn)}
.resolve-ok{font-size:.85rem;opacity:.6}
.end-round-btn{display:block;margin:.6rem auto 0;background:transparent;border:1px solid var(--border);color:var(--fg);padding:.4rem 1.5rem;border-radius:4px;cursor:pointer;font:inherit;font-size:.85rem;transition:border-color .2s}
.end-round-btn:hover{border-color:var(--accent);color:var(--accent)}
`;

const VIS = {
  medicine: { icon: "\u{1F48A}", label: "用药治疗" },
  bandage:  { icon: "\u{1FA79}", label: "简单包扎" },
  observe:  { icon: "\u{1F441}", label: "继续观察" },
  isolate:  { icon: "\u{1F6B7}", label: "隔离安置" },
};

// ── SceneRenderer ──────────────────────────────────────────

export class SceneRenderer {
  constructor(dom) {
    this.dom = dom;
    this.selectedAction = null;
    this._onDrop = null;
    this._onPhase = null;
    this._onEndRound = null;
    this._onContinue = null;
    this._injected = false;
  }

  // ── 样式注入 ──────────────────────────────────────────────

  _injectCSS() {
    if (this._injected) return;
    const s = document.createElement("style");
    s.textContent = SCENE_CSS;
    document.head.appendChild(s);
    this._injected = true;
  }

  // ── 主渲染入口 ────────────────────────────────────────────

  render(g, actions) {
    this._injectCSS();
    const d = this.dom;
    d.statusBar.innerHTML = "";
    d.phaseLabel.textContent = "";
    d.narrative.textContent = "";
    d.patientsEl.innerHTML = "";
    d.patientsEl.className = "patient-scene";
    d.actionsEl.innerHTML = "";
    d.feedback.style.display = "none";

    if (g.ended) return this._ending(g);

    this._status(g);
    this._patients(g);

    if (g.phase === "view") {
      this._viewBtn();
    } else if (g.phase === "treat") {
      this._medBox(g, actions);
    } else if (g.phase === "resolve") {
      this._resolveBox(g);
    }

    this._narrative(g);
  }

  // ── 压力状态条 ────────────────────────────────────────────

  _status(g) {
    const tp = Math.min(g.time / 12 * 100, 100);
    const mp = Math.min(g.medicine / 10 * 100, 100);
    const tLow = g.time <= 3 ? " low" : "";
    const mLow = g.medicine <= 2 ? " low" : "";
    const ac = g.patients.filter((p) => p.alive).length;
    const iD = g.infection.risk >= 2 ? ' class="danger"' : "";

    this.dom.statusBar.innerHTML = `
      <div class="pressure-row"><span>\u{1F525} 灯芯</span>
        <div class="pressure-bar"><div class="pressure-fill time${tLow}" style="width:${tp}%"></div></div>
        <span class="pressure-label">${g.time}</span></div>
      <div class="pressure-row"><span>\u{1F48A} 药箱</span>
        <div class="pressure-bar"><div class="pressure-fill medicine${mLow}" style="width:${mp}%"></div></div>
        <span class="pressure-label">${g.medicine}</span></div>
      <div class="status-meta">
        <span${iD}>\u2623\uFE0F 感染 ${g.infection.risk.toFixed(1)}</span>
        <span>\u{1F464} 稳定 ${g.patients_stable}/${ac}</span>
        <span>\u{1F4C5} ${g.round}/${g.maxRounds}轮</span>
      </div>`;

    this.dom.phaseLabel.textContent =
      g.phase === "view" ? "\u2014\u2014 \u67E5\u770B\u75C5\u4EBA \u2014\u2014"
                          : "\u2014\u2014 \u5206\u8BCA \u2014\u2014";
  }

  // ── 病人卡 (拖放目标) ─────────────────────────────────────

  _patients(g) {
    const c = this.dom.patientsEl;

    for (let i = 0; i < g.patients.length; i++) {
      const p = g.patients[i];

      // 感染扩散线
      if (i > 0) {
        const prev = g.patients[i - 1];
        const line = document.createElement("div");
        const hasInf = (prev.alive && prev.infected) || (p.alive && p.infected);
        line.className = "inf-line" + (hasInf ? " active" : "");
        line.innerHTML = '<div class="inf-dash"></div>';
        c.appendChild(line);
      }

      const card = document.createElement("div");
      card.className = "patient-card" + (p.alive ? "" : " dead");
      card.dataset.pid = p.id;

      const canDrop = p.alive && !p.treated && g.phase === "treat";
      if (canDrop) card.classList.add("drop-target");

      // 病势条
      const pct = Math.min(p.illness / 4 * 100, 100);
      let body;
      if (p.alive) {
        let badges = "";
        if (p.infected) badges += '<span class="badge inf">\u611F\u67D3</span>';
        if (p.stable)   badges += '<span class="badge stb">\u7A33\u5B9A</span>';
        if (p.treated)  badges += '<span class="badge don">\u5DF2\u5904\u7406</span>';
        body = `<div class="patient-info">
          <div class="patient-name">${p.name}${badges}</div>
          <div class="patient-symptom">${p.symptom}</div>
          <div class="illness-meter">
            <div class="illness-bar"><div class="illness-fill s${p.illness}" style="width:${pct}%"></div></div>
            <span class="illness-num">\u75C5\u52BF ${p.illness}/4</span>
          </div></div>`;
      } else {
        body = '<div class="patient-info"><div class="patient-name">' + p.name + '</div>'
             + '<div class="patient-symptom">\u2014\u2014 \u5DF2\u6B7B\u4EA1 \u2014\u2014</div></div>';
      }
      card.innerHTML = body;

      // 拖放事件
      if (canDrop) {
        card.addEventListener("dragover", (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          card.classList.add("drag-over");
        });
        card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
        card.addEventListener("drop", (e) => {
          e.preventDefault();
          card.classList.remove("drag-over");
          const key = e.dataTransfer.getData("text/plain");
          if (key && this._onDrop) this._onDrop(p.id, key);
        });
        // 触摸回退: 已选动作时点击病人即执行
        card.addEventListener("click", () => {
          if (this.selectedAction && this._onDrop) {
            this._onDrop(p.id, this.selectedAction);
          }
        });
      }

      c.appendChild(card);
    }
  }

  // ── 药箱 (可拖动动作) ─────────────────────────────────────

  _medBox(g, actions) {
    const box = document.createElement("div");
    box.className = "medicine-box";
    const isTouch = "ontouchstart" in window;
    box.innerHTML = `<div class="med-title">\u836F\u7BB1 \u2014 \u62D6\u5230\u75C5\u4EBA\u8EAB\u4E0A${
      isTouch ? "\uFF08\u6216\u70B9\u9009\u540E\u70B9\u75C5\u4EBA\uFF09" : ""
    }</div>`;

    const row = document.createElement("div");
    row.className = "med-items";

    for (const [key, act] of Object.entries(actions)) {
      const v = VIS[key] || { icon: "\u26A1", label: key };
      const noMed = act.medicineCost > 0 && g.medicine < act.medicineCost;
      const noTime = g.time < act.timeCost;
      const dis = noMed || noTime;

      const el = document.createElement("div");
      el.className = "act-item" + (dis ? " disabled" : "");
      el.draggable = !dis;
      el.dataset.act = key;

      const costs = [];
      if (act.medicineCost > 0) costs.push(`\u{1F48A}-${act.medicineCost}`);
      costs.push(`\u23F1-${act.timeCost}`);

      el.innerHTML = `<span class="act-icon">${v.icon}</span>
        <span class="act-label">${act.label}</span>
        <span class="act-cost">${costs.join(" ")}</span>`;

      if (!dis) {
        // 拖动开始
        el.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData("text/plain", key);
          e.dataTransfer.effectAllowed = "move";
          el.classList.add("dragging");
        });
        el.addEventListener("dragend", () => el.classList.remove("dragging"));

        // 点击选中（触摸/鼠标回退）
        el.addEventListener("click", () => {
          row.querySelectorAll(".act-item.selected").forEach((x) => x.classList.remove("selected"));
          if (this.selectedAction === key) {
            this.selectedAction = null;
          } else {
            this.selectedAction = key;
            el.classList.add("selected");
          }
        });
      }

      row.appendChild(el);
    }

    box.appendChild(row);

    // 结束本轮按钮：允许玩家跳过未治疗的病人
    const endBtn = document.createElement("button");
    endBtn.className = "end-round-btn";
    endBtn.textContent = "\u7ED3\u675F\u672C\u8F6E";
    endBtn.onclick = () => { if (this._onEndRound) this._onEndRound(); };
    box.appendChild(endBtn);

    this.dom.actionsEl.appendChild(box);
  }

  // ── 查看阶段按钮 ──────────────────────────────────────────

  _viewBtn() {
    const btn = document.createElement("button");
    btn.className = "phase-btn";
    btn.textContent = "\u5F00\u59CB\u5206\u8BCA";
    btn.onclick = () => { if (this._onPhase) this._onPhase(); };
    this.dom.actionsEl.appendChild(btn);
  }

  // ── 叙事日志 ──────────────────────────────────────────────

  _narrative(g) {
    this.dom.narrative.textContent = g.log.slice(-4).join("\n") || "...";
  }

  // ── 结局 ──────────────────────────────────────────────────

  _ending(g) {
    const d = this.dom;
    d.endingEl.style.display = "block";
    d.endingEl.className = g.result;
    const r = g.result === "survive"
      ? "\u5929\u4EAE\u4E86\uFF0C\u4F60\u6491\u8FC7\u4E86\u8FD9\u4E00\u591C\u3002"
      : g.log[g.log.length - 1] || "\u5206\u8BCA\u5931\u8D25\u3002";
    d.endingEl.innerHTML = `<h2>${g.result === "survive" ? "\u5B58\u6D3B" : "\u5931\u8D25"}</h2>
      <p>${r}</p>
      <p style="margin-top:1rem;color:var(--fg)">最终 — 稳定:${g.patients_stable} 药品:${g.medicine} 轮次:${g.round}</p>
      <button class="next-btn" onclick="location.reload()">再来一次</button>`;
    d.statusBar.innerHTML = "";
    d.phaseLabel.textContent = "";
    d.narrative.textContent = "";
    d.patientsEl.innerHTML = "";
    d.actionsEl.innerHTML = "";
  }

  // ── 结算显示 ──────────────────────────────────────────────

  _resolveBox(g) {
    const data = g._resolveData || {};
    const box = document.createElement("div");
    box.className = "resolve-box";

    let html = '<div class="resolve-title">\u2014\u2014 \u672C\u8F6E\u7ED3\u7B97 \u2014\u2014</div>';

    const deaths = data.deaths || [];
    const newInf = data.newInf || [];

    if (deaths.length > 0) {
      for (const p of deaths) {
        html += '<div class="resolve-item death">\u{1F480} ' + p.name + ' \u672A\u80FD\u6491\u8FC7\u8FD9\u4E00\u8F6E</div>';
      }
    }

    if (newInf.length > 0) {
      for (const p of newInf) {
        html += '<div class="resolve-item infection">\u2623\uFE0F ' + p.name + ' \u51FA\u73B0\u611F\u67D3\u8FF9\u8C61</div>';
      }
    }

    if (deaths.length === 0 && newInf.length === 0) {
      html += '<div class="resolve-ok">\u6682\u65E0\u91CD\u5927\u53D8\u5316</div>';
    }

    html += '<div style="margin-top:.5rem;font-size:.8rem;opacity:.7">'
          + '\u7B2C ' + g.round + ' \u8F6E \u00B7 \u7A33\u5B9A ' + g.patients_stable
          + ' \u00B7 \u836F\u54C1 ' + g.medicine + '</div>';

    box.innerHTML = html;
    this.dom.actionsEl.appendChild(box);

    const btn = document.createElement("button");
    btn.className = "phase-btn";
    btn.textContent = "\u7EE7\u7EED";
    btn.onclick = () => { if (this._onContinue) this._onContinue(); };
    this.dom.actionsEl.appendChild(btn);
  }

  // ── 反馈动画 ──────────────────────────────────────────────

  flashCard(pid, ok) {
    const el = this.dom.patientsEl.querySelector(`[data-pid="${pid}"]`);
    if (!el) return;
    const cls = ok ? "flash-ok" : "flash-bad";
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 600);
  }

  showDelta(pid, before, after) {
    if (before === after) return;
    const el = this.dom.patientsEl.querySelector(`[data-pid="${pid}"]`);
    if (!el) return;
    const d = after - before;
    const span = document.createElement("div");
    span.className = "ill-delta " + (d < 0 ? "good" : "bad");
    span.textContent = d < 0 ? `${d}` : `+${d}`;
    el.appendChild(span);
    setTimeout(() => span.remove(), 1100);
  }

  // ── 回调注册 ──────────────────────────────────────────────

  onDrop(fn)      { this._onDrop = fn; }
  onPhase(fn)     { this._onPhase = fn; }
  onEndRound(fn)  { this._onEndRound = fn; }
  onContinue(fn)  { this._onContinue = fn; }
}
