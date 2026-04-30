/**
 * game.js — 病棚夜诊 核心状态与主循环逻辑
 *
 * 服务 Direction Lock 核心循环:
 *   查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮
 *
 * Required State (Direction Lock):
 *   medicine, time, illness, infection, patients_stable
 *
 * Internal tracking (support dual-pressure settlement):
 *   relation → 信任度 / 关系压力
 *   pressure → 累积压力 / 进度压力
 */

import {
  triggerEvents,
  createEventTracker,
  ROUND_START_EVENTS,
  POST_TREAT_EVENTS,
  CRISIS_EVENTS,
} from "./content/events.js";
import {
  getSymptomDetail,
  getTreatResult,
  getConditionShift,
  INFECTION_FLAVOR,
  getMedicineStatus,
  getTimeStatus,
} from "./content/descriptions.js";

// ── 病人模板 ──────────────────────────────────────────────

const SYMPTOM_POOL = ["高热", "咳血", "外伤", "腹泻", "昏迷", "皮疹", "气喘"];
const PATIENT_NAMES = ["甲", "乙", "丙", "丁", "戊", "己"];

function makePatient(id) {
  return {
    id,
    name: `患者${PATIENT_NAMES[id % PATIENT_NAMES.length]}`,
    symptom: SYMPTOM_POOL[Math.floor(Math.random() * SYMPTOM_POOL.length)],
    illness: Math.floor(Math.random() * 3) + 1, // 1-3
    infected: false,
    treated: false,
    alive: true,
    stable: false,
  };
}

// ── 游戏状态 ──────────────────────────────────────────────

export function createGame() {
  return {
    medicine: 10,        // Direction Lock: medicine（药品库存）
    time: 12,            // Direction Lock: time（夜间时间单位）
    patients_stable: 0,  // Direction Lock: patients_stable
    infection: {         // Direction Lock: infection
      risk: 1,           //   感染扩散概率基数
      spreadCount: 0,    //   本轮扩散次数
    },
    round: 1,
    maxRounds: 8,
    patients: [],
    phase: "view",       // view | treat | resolve
    log: [],
    ended: false,
    result: null,
    // 内部追踪：支撑双轨压力结算
    relation: 50,        // 信任度
    pressure: 0,         // 累积压力
  };
}

export function initGame(g) {
  Object.assign(g, createGame());
  g.patients = [makePatient(0), makePatient(1), makePatient(2)];
  g.phase = "view";
  g.log = [];
  g.ended = false;
  g.result = null;
  g._events = createEventTracker();
  addLog(g, "夜色降临，三名伤患被送入病棚。药品有限，时间紧迫。");
  addLog(g, getMedicineStatus(g));
  return g;
}

// ── 核心循环: 查看病人 ────────────────────────────────────

export function startViewPhase(g) {
  g.phase = "view";
  const alive = g.patients.filter((p) => p.alive);

  // 丰富描述：每个病人显示症状详情
  for (const p of alive) {
    addLog(g, `${p.name}：${getSymptomDetail(p)}`);
  }

  // 状态提示：药箱和时间
  if (g.round > 1) {
    addLog(g, getMedicineStatus(g));
    addLog(g, getTimeStatus(g));
  }

  // 触发轮次开始事件
  triggerEvents(g, ROUND_START_EVENTS, null, g._events.fired);
  triggerEvents(g, CRISIS_EVENTS, null, g._events.fired);

  return g;
}

// ── 核心循环: 选择治疗动作 → 消耗时间/药品 ────────────────
//
// 每个动作必须同时推动两类后果 (MECHANIC_SPEC State Coupling):
//   生存/资源/进度压力  +  关系/风险/秩序压力

export const ACTIONS = {
  medicine: { label: "用药治疗", timeCost: 1, medicineCost: 1 },
  bandage:  { label: "简单包扎", timeCost: 1, medicineCost: 0 },
  observe:  { label: "继续观察", timeCost: 2, medicineCost: 0 },
  isolate:  { label: "隔离安置", timeCost: 1, medicineCost: 0 },
};

export function treatPatient(g, patientIdx, actionKey) {
  const patient = g.patients[patientIdx];
  if (!patient || !patient.alive || patient.treated) return false;

  const action = ACTIONS[actionKey];
  if (!action) return false;

  // 所有动作都消耗时间
  if (g.time < action.timeCost) return false;

  // 消耗药品
  if (action.medicineCost > 0 && g.medicine < action.medicineCost) return false;

  // 记录治疗前状态（用于描述选择）
  const prevIllness = patient.illness;

  // 扣除资源
  g.time -= action.timeCost;
  if (action.medicineCost > 0) g.medicine -= action.medicineCost;

  // 应用治疗（双轨压力）
  patient.treated = true;

  switch (actionKey) {
    case "medicine":
      // 生存: illness -2  |  关系: 信任 +5
      patient.illness = Math.max(0, patient.illness - 2);
      g.relation += 5;
      if (patient.illness === 0) patient.stable = true;
      break;

    case "bandage":
      // 生存: illness -1  |  关系: 信任 +2
      patient.illness = Math.max(0, patient.illness - 1);
      g.relation += 2;
      if (patient.illness === 0) patient.stable = true;
      break;

    case "observe":
      // 生存: illness 不变，时间多消耗  |  关系: 信任 -2（病人不安）
      g.relation -= 2;
      g.pressure += 2;
      break;

    case "isolate":
      // 生存: 感染清除，illness -1  |  关系: 信任 -3（被隔离的感受）
      patient.infected = false;
      patient.illness = Math.max(0, patient.illness - 1);
      g.relation -= 3;
      if (patient.illness === 0) patient.stable = true;
      break;
  }

  // 用内容池生成治疗结果描述
  addLog(g, getTreatResult(actionKey, patient, prevIllness));

  // 触发治疗后事件
  triggerEvents(g, POST_TREAT_EVENTS, patient, g._events.fired);

  return true;
}

// ── 核心循环: 病势更新 ────────────────────────────────────

export function updateConditions(g) {
  const died = [];

  for (const p of g.patients) {
    if (!p.alive) continue;
    if (!p.treated) {
      p.illness += 1;
      p.stable = false;
    }
    if (p.illness >= 4) {
      p.alive = false;
      g.relation -= 10;
      died.push(p);
    }
  }

  // 病势更新叙事
  if (died.length > 0 || g.pressure > 5) {
    addLog(g, getConditionShift(g, died));
  }
}

// ── 核心循环: 感染扩散 ────────────────────────────────────

export function spreadInfection(g) {
  const alive = g.patients.filter((p) => p.alive);
  g.infection.spreadCount = 0;

  // 已感染病人 illness 加重，infection.risk 上升
  for (const p of alive) {
    if (p.infected) {
      p.illness += 1;
      g.infection.risk += 0.5;
    }
  }

  // 交叉感染：感染病人可能传染邻近病人
  for (let i = 0; i < alive.length; i++) {
    if (!alive[i].infected) continue;
    const neighbors = [alive[i - 1], alive[i + 1]].filter(Boolean);
    for (const n of neighbors) {
      if (!n.infected && Math.random() < g.infection.risk * 0.15) {
        n.infected = true;
        g.infection.spreadCount += 1;
        addLog(g, INFECTION_FLAVOR.spread(alive[i], n));
      }
    }
  }

  // 随机新感染
  const uninfected = alive.filter((p) => !p.infected);
  if (uninfected.length > 0 && Math.random() < g.infection.risk * 0.08) {
    const target = uninfected[Math.floor(Math.random() * uninfected.length)];
    target.infected = true;
    g.infection.spreadCount += 1;
    addLog(g, INFECTION_FLAVOR.new_infection(target));
  }

  // 感染氛围描写
  if (g.infection.spreadCount > 0 && g.infection.risk > 1.5) {
    addLog(g, INFECTION_FLAVOR.air_heavy);
  }
}

// ── 计算 patients_stable ─────────────────────────────────

export function computePatientsStable(g) {
  g.patients_stable = g.patients.filter((p) => p.alive && p.stable).length;
  return g.patients_stable;
}

// ── 核心循环: 下一轮 ──────────────────────────────────────

export function nextRound(g) {
  updateConditions(g);
  spreadInfection(g);
  computePatientsStable(g);

  g.round += 1;
  g.pressure += 1;

  // 每轮恢复部分时间（夜间节奏推进）
  g.time = Math.min(g.time + 3, 12);

  // 重置治疗标记
  for (const p of g.patients) p.treated = false;

  // 偶数轮可能送来新病人
  if (g.round % 2 === 0 && g.patients.filter((p) => p.alive).length < 5) {
    const np = makePatient(g.patients.length);
    g.patients.push(np);
    addLog(g, `新伤患 ${np.name} 被送来（${np.symptom}）。`);
  }

  const end = checkEnd(g);
  if (end) return end;

  startViewPhase(g);
  return null;
}

// ── 结局判定 ──────────────────────────────────────────────

function checkEnd(g) {
  // 时间耗尽且无人稳定
  if (g.time <= 0 && g.patients_stable === 0) {
    g.ended = true;
    g.result = "fail";
    return { ended: true, result: "fail", reason: "时间耗尽，病棚陷入混乱。" };
  }
  // 超过最大轮数
  if (g.round > g.maxRounds) {
    g.ended = true;
    g.result = g.relation > 30 && g.patients_stable > 0 ? "survive" : "fail";
    const reason = g.result === "survive"
      ? "天亮了，你撑过了这一夜。"
      : "天亮了，但病棚里已经没有信任你的人。";
    return { ended: true, result: g.result, reason };
  }
  // 全员死亡
  if (g.patients.every((p) => !p.alive)) {
    g.ended = true;
    g.result = "fail";
    return { ended: true, result: "fail", reason: "所有病人都已死亡。你的分诊彻底失败。" };
  }
  // 信任崩溃
  if (g.relation <= 0) {
    g.ended = true;
    g.result = "fail";
    return { ended: true, result: "fail", reason: "信任崩溃，病人暴动，你被赶出病棚。" };
  }
  return null;
}

// ── 工具 ──────────────────────────────────────────────────

function addLog(g, msg) {
  g.log.push(msg);
}
