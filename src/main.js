/**
 * main.js — 病棚夜诊 UI 控制器 & 主循环编排
 *
 * 将 GameState 渲染到 DOM，驱动核心循环:
 *   查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮
 */

import {
  initGame,
  startViewPhase,
  treatPatient,
  nextRound,
  ACTIONS,
} from "./game.js";

export class GameController {
  constructor(game, root) {
    this.g = game;
    this.root = root;
    this.selectedPatient = null;

    // DOM refs
    this.statusBar = root.querySelector("#status-bar");
    this.phaseLabel = root.querySelector("#phase-label");
    this.narrative = root.querySelector("#narrative");
    this.patientsEl = root.querySelector("#patients");
    this.actionsEl = root.querySelector("#actions");
    this.feedback = root.querySelector("#feedback");
    this.endingEl = root.querySelector("#ending");
  }

  // ── 启动 ─────────────────────────────────────────────

  start() {
    initGame(this.g);
    startViewPhase(this.g);
    this.render();
  }

  // ── 渲染 ─────────────────────────────────────────────

  render() {
    if (this.g.ended) return this.renderEnding();

    this.renderStatus();
    this.renderPhase();
    this.renderNarrative();
    this.renderPatients();
    this.renderActions();
  }

  renderStatus() {
    const { medicine, time, infection, patients_stable, round, maxRounds } = this.g;
    this.statusBar.innerHTML = [
      `药品: ${medicine}`,
      `时间: ${time}`,
      `感染风险: ${infection.risk.toFixed(1)}`,
      `稳定: ${patients_stable}`,
      `第 ${round}/${maxRounds} 轮`,
    ]
      .map((s) => `<span>${s}</span>`)
      .join("");
  }

  renderPhase() {
    const labels = {
      view: "—— 查看病人 ——",
      treat: "—— 选择治疗 ——",
      resolve: "—— 结算 ——",
    };
    this.phaseLabel.textContent = labels[this.g.phase] || "";
  }

  renderNarrative() {
    const recent = this.g.log.slice(-3).join("\n");
    this.narrative.textContent = recent || "...";
  }

  renderPatients() {
    this.patientsEl.innerHTML = "";
    for (const p of this.g.patients) {
      const card = document.createElement("div");
      card.className = "patient-card" + (p.alive ? "" : " dead");

      const state = p.alive
        ? `${p.symptom} | 危重 ${"!".repeat(p.illness)}${p.infected ? " [感染]" : ""}${p.stable ? " [稳定]" : ""}${p.treated ? " [已处理]" : ""}`
        : "—— 已死亡 ——";

      card.innerHTML = `<strong>${p.name}</strong><span>${state}</span>`;

      if (p.alive && !p.treated && this.g.phase === "treat") {
        card.style.cursor = "pointer";
        card.onclick = () => this.selectPatient(p.id);
        if (this.selectedPatient === p.id) {
          card.style.borderColor = "var(--accent)";
        }
      }

      this.patientsEl.appendChild(card);
    }
  }

  renderActions() {
    this.actionsEl.innerHTML = "";

    if (this.g.phase === "view") {
      const btn = this.makeBtn("开始分诊", () => this.enterTreatPhase());
      this.actionsEl.appendChild(btn);
      return;
    }

    if (this.g.phase === "treat") {
      if (this.selectedPatient === null) {
        const hint = document.createElement("div");
        hint.textContent = "选择一位病人...";
        hint.style.color = "var(--accent)";
        hint.style.textAlign = "center";
        this.actionsEl.appendChild(hint);
        return;
      }

      for (const [key, act] of Object.entries(ACTIONS)) {
        const noMedicine = act.medicineCost > 0 && this.g.medicine < act.medicineCost;
        const noTime = this.g.time < act.timeCost;
        const disabled = noMedicine || noTime;

        const costs = [];
        if (act.medicineCost > 0) costs.push(`药品 -${act.medicineCost}`);
        costs.push(`时间 -${act.timeCost}`);

        const btn = this.makeBtn(
          `${act.label}（${costs.join("，")}）`,
          () => this.doTreat(key),
          disabled
        );
        this.actionsEl.appendChild(btn);
      }
      return;
    }

    if (this.g.phase === "resolve") {
      // handled automatically via nextRound
    }
  }

  renderEnding() {
    this.endingEl.style.display = "block";
    this.endingEl.className = this.g.result;
    const reason =
      this.g.result === "survive"
        ? "天亮了，你撑过了这一夜。"
        : this.g.log[this.g.log.length - 1] || "分诊失败。";
    this.endingEl.innerHTML = `
      <h2>${this.g.result === "survive" ? "存活" : "失败"}</h2>
      <p>${reason}</p>
      <p style="margin-top:1rem;color:var(--fg)">最终 — 稳定:${this.g.patients_stable} 药品:${this.g.medicine} 轮次:${this.g.round}</p>
      <button class="next-btn" onclick="location.reload()">再来一次</button>
    `;
    this.statusBar.innerHTML = "";
    this.phaseLabel.textContent = "";
    this.narrative.textContent = "";
    this.patientsEl.innerHTML = "";
    this.actionsEl.innerHTML = "";
  }

  // ── 交互 ─────────────────────────────────────────────

  selectPatient(id) {
    this.selectedPatient = id;
    this.render();
  }

  enterTreatPhase() {
    this.g.phase = "treat";
    this.selectedPatient = null;
    this.render();
  }

  doTreat(actionKey) {
    if (this.selectedPatient === null) return;

    const idx = this.g.patients.findIndex((p) => p.id === this.selectedPatient);
    const ok = treatPatient(this.g, idx, actionKey);
    if (!ok) return;

    this.feedback.style.display = "block";
    this.feedback.textContent = this.g.log[this.g.log.length - 1];

    // Check if all alive patients are treated this round
    const allTreated = this.g.patients
      .filter((p) => p.alive)
      .every((p) => p.treated);

    this.selectedPatient = null;

    if (allTreated) {
      this.resolveRound();
    } else {
      this.render();
    }
  }

  resolveRound() {
    this.g.phase = "resolve";
    this.render();

    const endResult = nextRound(this.g);
    if (endResult) {
      this.g.ended = true;
      this.g.result = endResult.result;
      this.g.log.push(endResult.reason);
    }

    // Brief pause to show resolve, then re-render
    setTimeout(() => {
      this.feedback.style.display = "none";
      this.render();
    }, 300);
  }

  // ── 工具 ─────────────────────────────────────────────

  makeBtn(text, onClick, disabled = false) {
    const btn = document.createElement("button");
    btn.className = "action-btn";
    btn.textContent = text;
    btn.onclick = onClick;
    btn.disabled = disabled;
    return btn;
  }
}
