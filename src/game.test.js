/**
 * game.test.js — 验证 Direction Lock 核心循环状态与结算
 *
 * Required State: medicine, time, illness, infection, patients_stable
 * Core Loop: 查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createGame,
  initGame,
  startViewPhase,
  treatPatient,
  nextRound,
  updateConditions,
  spreadInfection,
  computePatientsStable,
  ACTIONS,
} from "./game.js";

// ── Required State (Direction Lock) ─────────────────────────

describe("Required State (Direction Lock)", () => {
  it("createGame 包含全部 5 个 Direction Lock 必要状态", () => {
    const g = createGame();
    assert.ok("medicine" in g, "缺少 medicine");
    assert.ok("time" in g, "缺少 time");
    assert.ok("infection" in g, "缺少 infection");
    assert.ok("patients_stable" in g, "缺少 patients_stable");
    // illness 在 per-patient 上
    assert.equal(g.patients.length, 0, "初始无病人");
  });

  it("initGame 生成的病人包含 illness 字段", () => {
    const g = createGame();
    initGame(g);
    for (const p of g.patients) {
      assert.ok(typeof p.illness === "number", `${p.name} 缺少 illness`);
      assert.ok(p.illness >= 1 && p.illness <= 3, "illness 应在 1-3");
    }
  });

  it("infection 包含 risk 和 spreadCount", () => {
    const g = createGame();
    assert.ok("risk" in g.infection, "缺少 infection.risk");
    assert.ok("spreadCount" in g.infection, "缺少 infection.spreadCount");
  });
});

// ── 查看病人 ───────────────────────────────────────────────

describe("查看病人 (view phase)", () => {
  it("initGame 生成三名病人", () => {
    const g = createGame();
    initGame(g);
    assert.equal(g.patients.length, 3);
    assert.equal(g.phase, "view");
  });

  it("每个病人有 id, symptom, illness, alive, stable", () => {
    const g = createGame();
    initGame(g);
    for (const p of g.patients) {
      assert.ok(typeof p.id === "number");
      assert.ok(typeof p.symptom === "string");
      assert.ok(typeof p.illness === "number");
      assert.equal(p.alive, true);
      assert.equal(p.stable, false);
    }
  });

  it("startViewPhase 设置 view 阶段并记录日志", () => {
    const g = createGame();
    initGame(g);
    const logLen = g.log.length;
    startViewPhase(g);
    assert.equal(g.phase, "view");
    assert.ok(g.log.length > logLen);
  });
});

// ── 选择治疗动作 → 消耗时间/药品 ───────────────────────────

describe("选择治疗动作 → 消耗时间/药品", () => {
  it("medicine 消耗 medicine 和 time，降低 illness", () => {
    const g = createGame();
    initGame(g);
    const beforeMed = g.medicine;
    const beforeTime = g.time;
    const beforeIll = g.patients[0].illness;
    const ok = treatPatient(g, 0, "medicine");
    assert.equal(ok, true);
    assert.equal(g.medicine, beforeMed - 1);
    assert.equal(g.time, beforeTime - 1);
    assert.ok(g.patients[0].illness <= beforeIll);
    assert.equal(g.patients[0].treated, true);
  });

  it("bandage 消耗 time，降低 illness", () => {
    const g = createGame();
    initGame(g);
    const beforeTime = g.time;
    const beforeIll = g.patients[0].illness;
    const ok = treatPatient(g, 0, "bandage");
    assert.equal(ok, true);
    assert.equal(g.time, beforeTime - 1);
    assert.ok(g.patients[0].illness <= beforeIll);
  });

  it("observe 消耗更多 time，不改变 illness", () => {
    const g = createGame();
    initGame(g);
    const beforeTime = g.time;
    const beforeIll = g.patients[0].illness;
    treatPatient(g, 0, "observe");
    assert.equal(g.time, beforeTime - 2);
    assert.equal(g.patients[0].illness, beforeIll);
  });

  it("medicine 不足时失败", () => {
    const g = createGame();
    initGame(g);
    g.medicine = 0;
    const ok = treatPatient(g, 0, "medicine");
    assert.equal(ok, false);
  });

  it("time 不足时失败", () => {
    const g = createGame();
    initGame(g);
    g.time = 0;
    const ok = treatPatient(g, 0, "observe");
    assert.equal(ok, false);
  });

  it("已治疗过的病人不可再次治疗", () => {
    const g = createGame();
    initGame(g);
    treatPatient(g, 0, "bandage");
    const ok = treatPatient(g, 0, "medicine");
    assert.equal(ok, false);
  });
});

// ── 双轨压力 (MECHANIC_SPEC State Coupling) ────────────────

describe("双轨压力：每次有效操作同时推动两类后果", () => {
  it("medicine — 生存(medicine↓, illness↓) + 关系(relation↑)", () => {
    const g = createGame();
    initGame(g);
    const beforeMed = g.medicine;
    const beforeIll = g.patients[0].illness;
    const beforeRel = g.relation;
    treatPatient(g, 0, "medicine");
    assert.ok(g.medicine < beforeMed, "medicine 应减少");
    assert.ok(g.patients[0].illness < beforeIll, "illness 应降低");
    assert.ok(g.relation > beforeRel, "relation 应增加");
  });

  it("bandage — 生存(time↓, illness↓) + 关系(relation↑)", () => {
    const g = createGame();
    initGame(g);
    const beforeTime = g.time;
    const beforeIll = g.patients[0].illness;
    const beforeRel = g.relation;
    treatPatient(g, 0, "bandage");
    assert.ok(g.time < beforeTime, "time 应减少");
    assert.ok(g.patients[0].illness <= beforeIll, "illness 应不增");
    assert.ok(g.relation > beforeRel, "relation 应增加");
  });

  it("observe — 生存(time↓, pressure↑) + 关系(relation↓)", () => {
    const g = createGame();
    initGame(g);
    const beforeTime = g.time;
    const beforePres = g.pressure;
    const beforeRel = g.relation;
    treatPatient(g, 0, "observe");
    assert.ok(g.time < beforeTime, "time 应减少");
    assert.ok(g.pressure > beforePres, "pressure 应增加");
    assert.ok(g.relation < beforeRel, "relation 应减少");
  });

  it("isolate — 生存(time↓, infected→false) + 关系(relation↓)", () => {
    const g = createGame();
    initGame(g);
    g.patients[0].infected = true;
    const beforeTime = g.time;
    const beforeRel = g.relation;
    treatPatient(g, 0, "isolate");
    assert.ok(g.time < beforeTime, "time 应减少");
    assert.equal(g.patients[0].infected, false, "感染应被清除");
    assert.ok(g.relation < beforeRel, "relation 应减少");
  });
});

// ── 病势更新 ───────────────────────────────────────────────

describe("病势更新 (illness)", () => {
  it("未治疗的病人 illness +1", () => {
    const g = createGame();
    initGame(g);
    const beforeIll = g.patients[0].illness;
    updateConditions(g);
    assert.equal(g.patients[0].illness, beforeIll + 1);
  });

  it("illness >= 4 时病人死亡", () => {
    const g = createGame();
    initGame(g);
    g.patients[0].illness = 3;
    g.patients[0].treated = false;
    updateConditions(g);
    assert.equal(g.patients[0].alive, false);
  });
});

// ── 感染扩散 ───────────────────────────────────────────────

describe("感染扩散 (infection)", () => {
  it("infected 病人 illness 增加", () => {
    const g = createGame();
    initGame(g);
    g.patients[0].infected = true;
    g.patients[0].illness = 1;
    spreadInfection(g);
    assert.ok(g.patients[0].illness >= 2);
  });

  it("infected 病人使 infection.risk 上升", () => {
    const g = createGame();
    initGame(g);
    g.patients[0].infected = true;
    const beforeRisk = g.infection.risk;
    spreadInfection(g);
    assert.ok(g.infection.risk > beforeRisk);
  });
});

// ── patients_stable ────────────────────────────────────────

describe("patients_stable", () => {
  it("初始为 0", () => {
    const g = createGame();
    initGame(g);
    assert.equal(g.patients_stable, 0);
  });

  it("illness 降为 0 的病人标记为 stable", () => {
    const g = createGame();
    initGame(g);
    g.patients[0].illness = 1;
    treatPatient(g, 0, "medicine"); // illness -2 → 0 → stable
    computePatientsStable(g);
    assert.ok(g.patients[0].stable);
    assert.ok(g.patients_stable >= 1);
  });

  it("未治疗导致 illness 上升后 stable 重置", () => {
    const g = createGame();
    initGame(g);
    g.patients[0].illness = 1;
    treatPatient(g, 0, "medicine");
    assert.ok(g.patients[0].stable);
    // 下一轮未治疗
    g.patients[0].treated = false;
    updateConditions(g);
    assert.equal(g.patients[0].stable, false);
  });
});

// ── 下一轮 ─────────────────────────────────────────────────

describe("下一轮 (nextRound)", () => {
  it("推进 round，恢复 time，重置 treated", () => {
    const g = createGame();
    initGame(g);
    g.time = 3;
    treatPatient(g, 0, "bandage");
    assert.equal(g.patients[0].treated, true);
    nextRound(g);
    assert.equal(g.round, 2);
    assert.equal(g.patients[0].treated, false);
    assert.ok(g.time > 3, "time 应恢复");
  });

  it("偶数轮可能送来新病人", () => {
    const g = createGame();
    initGame(g);
    nextRound(g);
    assert.ok(g.patients.length >= 3);
  });

  it("超过 maxRounds 结束游戏", () => {
    const g = createGame();
    initGame(g);
    g.maxRounds = 2;
    nextRound(g);
    const end = nextRound(g);
    assert.ok(end && end.ended);
    assert.equal(g.ended, true);
  });

  it("nextRound 计算 patients_stable", () => {
    const g = createGame();
    initGame(g);
    g.patients[0].illness = 1;
    g.patients[0].treated = false;
    // 手动治疗使病人 stable
    treatPatient(g, 0, "medicine");
    // illness 可能已为 0 → stable
    if (g.patients[0].stable) {
      // 强制下轮结算
      g.patients[1].illness = 1;
      g.patients[2].illness = 1;
      treatPatient(g, 1, "bandage");
      treatPatient(g, 2, "bandage");
      nextRound(g);
      assert.ok(typeof g.patients_stable === "number");
    }
  });
});

// ── 完整核心循环回放 ───────────────────────────────────────

describe("完整核心循环回放", () => {
  it("完成一轮完整循环不崩溃", () => {
    const g = createGame();
    initGame(g);

    startViewPhase(g);
    assert.equal(g.phase, "view");

    for (let i = 0; i < g.patients.length; i++) {
      if (g.patients[i].alive) {
        treatPatient(g, i, "bandage");
      }
    }

    const end = nextRound(g);
    assert.equal(g.round, 2);
    assert.ok(typeof g.patients_stable === "number");
    assert.ok(typeof g.infection.risk === "number");
    assert.ok(end === null || end.ended === true);
  });

  it("多轮推进至结局", () => {
    const g = createGame();
    initGame(g);
    g.maxRounds = 4;

    for (let r = 0; r < 10; r++) {
      if (g.ended) break;
      startViewPhase(g);
      for (let i = 0; i < g.patients.length; i++) {
        if (g.patients[i].alive && !g.patients[i].treated) {
          treatPatient(g, i, g.medicine > 0 ? "medicine" : "observe");
        }
      }
      nextRound(g);
    }

    assert.equal(g.ended, true);
    assert.ok(g.result === "survive" || g.result === "fail");
    assert.ok(typeof g.patients_stable === "number");
  });
});
