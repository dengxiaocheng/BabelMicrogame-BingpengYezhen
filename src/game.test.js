/**
 * game.test.js — 验证 Direction Lock 核心循环骨架
 *
 * 核心循环: 查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮
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
  ACTIONS,
} from "./game.js";

// ── Required State ─────────────────────────────────────────

describe("Required State", () => {
  it("createGame 包含所有 Direction Lock 必要状态", () => {
    const g = createGame();
    assert.ok("resource" in g, "缺少 resource");
    assert.ok("pressure" in g, "缺少 pressure");
    assert.ok("risk" in g, "缺少 risk");
    assert.ok("relation" in g, "缺少 relation");
    assert.ok("round" in g, "缺少 round");
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

  it("每个病人有 id, symptom, severity, alive", () => {
    const g = createGame();
    initGame(g);
    for (const p of g.patients) {
      assert.ok(typeof p.id === "number");
      assert.ok(typeof p.symptom === "string");
      assert.ok(p.severity >= 1 && p.severity <= 3);
      assert.equal(p.alive, true);
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
  it("medicine 消耗 resource 并降低 severity", () => {
    const g = createGame();
    initGame(g);
    const beforeRes = g.resource;
    const beforeSev = g.patients[0].severity;
    const ok = treatPatient(g, 0, "medicine");
    assert.equal(ok, true);
    assert.equal(g.resource, beforeRes - 1);
    assert.ok(g.patients[0].severity <= beforeSev);
    assert.equal(g.patients[0].treated, true);
  });

  it("bandage 增加 pressure 并降低 severity", () => {
    const g = createGame();
    initGame(g);
    const beforePres = g.pressure;
    const ok = treatPatient(g, 0, "bandage");
    assert.equal(ok, true);
    assert.equal(g.pressure, beforePres + 1);
  });

  it("observe 增加 pressure 不改变 severity", () => {
    const g = createGame();
    initGame(g);
    const beforePres = g.pressure;
    const beforeSev = g.patients[0].severity;
    treatPatient(g, 0, "observe");
    assert.equal(g.pressure, beforePres + 2);
    assert.equal(g.patients[0].severity, beforeSev);
  });

  it("resource 不足时 medicine 失败", () => {
    const g = createGame();
    initGame(g);
    g.resource = 0;
    const ok = treatPatient(g, 0, "medicine");
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

// ── 病势更新 ───────────────────────────────────────────────

describe("病势更新", () => {
  it("未治疗的病人 severity +1", () => {
    const g = createGame();
    initGame(g);
    const beforeSev = g.patients[0].severity;
    updateConditions(g);
    assert.equal(g.patients[0].severity, beforeSev + 1);
  });

  it("severity >= 4 时病人死亡", () => {
    const g = createGame();
    initGame(g);
    g.patients[0].severity = 3;
    g.patients[0].treated = false;
    updateConditions(g);
    assert.equal(g.patients[0].alive, false);
  });
});

// ── 感染扩散 ───────────────────────────────────────────────

describe("感染扩散", () => {
  it("infected 病人 severity 增加", () => {
    const g = createGame();
    initGame(g);
    g.patients[0].infected = true;
    g.patients[0].severity = 1;
    spreadInfection(g);
    assert.ok(g.patients[0].severity >= 2);
  });
});

// ── 下一轮 ─────────────────────────────────────────────────

describe("下一轮 (nextRound)", () => {
  it("推进 round 并重置 treated 标记", () => {
    const g = createGame();
    initGame(g);
    treatPatient(g, 0, "bandage");
    assert.equal(g.patients[0].treated, true);
    nextRound(g);
    assert.equal(g.round, 2);
    assert.equal(g.patients[0].treated, false);
  });

  it("偶数轮可能送来新病人", () => {
    const g = createGame();
    initGame(g);
    nextRound(g); // round 2
    assert.ok(g.patients.length >= 3);
  });

  it("超过 maxRounds 结束游戏", () => {
    const g = createGame();
    initGame(g);
    g.maxRounds = 2;
    nextRound(g); // round 2
    const end = nextRound(g); // round 3 > maxRounds
    assert.ok(end && end.ended);
    assert.equal(g.ended, true);
  });
});

// ── 完整核心循环回放 ───────────────────────────────────────

describe("完整核心循环回放", () => {
  it("完成一轮完整循环不崩溃", () => {
    const g = createGame();
    initGame(g);

    // 查看病人
    startViewPhase(g);
    assert.equal(g.phase, "view");

    // 选择治疗动作 (对所有存活病人)
    for (let i = 0; i < g.patients.length; i++) {
      if (g.patients[i].alive) {
        treatPatient(g, i, "bandage");
      }
    }

    // 下一轮 (内部执行 病势更新 → 感染扩散)
    const end = nextRound(g);
    assert.equal(g.round, 2);
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
          treatPatient(g, i, g.resource > 0 ? "medicine" : "observe");
        }
      }
      nextRound(g);
    }

    assert.equal(g.ended, true);
    assert.ok(g.result === "survive" || g.result === "fail");
  });
});
