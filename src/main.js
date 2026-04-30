/**
 * main.js — 病棚夜诊 UI 控制器
 *
 * 通过 SceneRenderer 实现场景化交互:
 *   拖药到病人卡 → 消耗资源 → 病势/感染即时变化
 *
 * 核心循环: 查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮
 */

import {
  initGame,
  startViewPhase,
  treatPatient,
  nextRound,
  ACTIONS,
} from "./game.js";
import { SceneRenderer } from "./ui/scene.js";

export class GameController {
  constructor(game, root) {
    this.g = game;
    this.dom = {
      statusBar:  root.querySelector("#status-bar"),
      phaseLabel: root.querySelector("#phase-label"),
      narrative:  root.querySelector("#narrative"),
      patientsEl: root.querySelector("#patients"),
      actionsEl:  root.querySelector("#actions"),
      feedback:   root.querySelector("#feedback"),
      endingEl:   root.querySelector("#ending"),
    };

    this.scene = new SceneRenderer(this.dom);

    this.scene.onDrop((pid, actionKey) => this._handleDrop(pid, actionKey));
    this.scene.onPhase(() => this._enterTreat());
  }

  start() {
    initGame(this.g);
    startViewPhase(this.g);
    this._render();
  }

  _render() {
    this.scene.render(this.g, ACTIONS);
  }

  _enterTreat() {
    this.g.phase = "treat";
    this._render();
  }

  _handleDrop(patientId, actionKey) {
    const idx = this.g.patients.findIndex((p) => p.id === patientId);
    if (idx === -1) return;

    const p = this.g.patients[idx];
    if (!p.alive || p.treated) return;

    const prevIll = p.illness;
    const ok = treatPatient(this.g, idx, actionKey);
    if (!ok) return;

    // 即时视觉反馈
    this.scene.flashCard(patientId, true);
    this.scene.showDelta(patientId, prevIll, p.illness);

    this.dom.feedback.style.display = "block";
    this.dom.feedback.textContent = this.g.log[this.g.log.length - 1];

    // 清除选中
    this.scene.selectedAction = null;

    // 全部处理完 → 结算
    const allDone = this.g.patients.filter((q) => q.alive).every((q) => q.treated);

    if (allDone) {
      this._resolve();
    } else {
      this._render();
    }
  }

  _resolve() {
    this.g.phase = "resolve";
    this._render();

    const endResult = nextRound(this.g);
    if (endResult) {
      this.g.ended = true;
      this.g.result = endResult.result;
      this.g.log.push(endResult.reason);
    }

    setTimeout(() => {
      this.dom.feedback.style.display = "none";
      this._render();
    }, 400);
  }
}
