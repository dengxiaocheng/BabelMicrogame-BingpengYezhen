/**
 * game.js — 病棚夜诊 核心状态与主循环逻辑
 *
 * 服务 Direction Lock 核心循环:
 *   查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮
 *
 * Required State: resource, pressure, risk, relation, round
 */

// ── 病人模板 ──────────────────────────────────────────────

const SYMPTOM_POOL = ["高热", "咳血", "外伤", "腹泻", "昏迷", "皮疹", "气喘"];
const PATIENT_NAMES = ["甲", "乙", "丙", "丁", "戊", "己"];

function makePatient(id) {
  return {
    id,
    name: `患者${PATIENT_NAMES[id % PATIENT_NAMES.length]}`,
    symptom: SYMPTOM_POOL[Math.floor(Math.random() * SYMPTOM_POOL.length)],
    severity: Math.floor(Math.random() * 3) + 1, // 1-3
    infected: false,
    treated: false,
    alive: true,
  };
}

// ── 游戏状态 ──────────────────────────────────────────────

export function createGame() {
  return {
    resource: 10,   // 药品
    pressure: 0,    // 时间压力
    risk: 1,        // 感染风险基数
    relation: 50,   // 信任度
    round: 1,
    maxRounds: 8,
    patients: [],
    phase: "view",  // view | treat | resolve
    log: [],
    ended: false,
    result: null,
  };
}

export function initGame(g) {
  g.patients = [makePatient(0), makePatient(1), makePatient(2)];
  g.phase = "view";
  g.log = [];
  g.ended = false;
  g.result = null;
  addLog(g, "夜色降临，三名伤患被送入病棚。药品有限，时间紧迫。");
  return g;
}

// ── 核心循环: 查看病人 ────────────────────────────────────

export function startViewPhase(g) {
  g.phase = "view";
  const alive = g.patients.filter((p) => p.alive);
  addLog(g, describePatients(alive));
  return g;
}

function describePatients(patients) {
  return patients
    .map(
      (p) =>
        `${p.name}：${p.symptom}（危重${"!".repeat(p.severity)}）${p.infected ? " [已感染]" : ""}`
    )
    .join("\n");
}

// ── 核心循环: 选择治疗动作 → 消耗时间/药品 ────────────────

export const ACTIONS = {
  medicine: { label: "用药治疗", cost: "resource", amount: 1 },
  bandage:  { label: "简单包扎", cost: "pressure", amount: 1 },
  observe:  { label: "继续观察", cost: "pressure", amount: 2 },
  isolate:  { label: "隔离安置", cost: "resource", amount: 1 },
};

export function treatPatient(g, patientIdx, actionKey) {
  const patient = g.patients[patientIdx];
  if (!patient || !patient.alive || patient.treated) return false;

  const action = ACTIONS[actionKey];
  if (!action) return false;

  // 消耗资源
  if (action.cost === "resource" && g.resource < action.amount) return false;
  if (action.cost === "resource") g.resource -= action.amount;
  if (action.cost === "pressure") g.pressure += action.amount;

  // 应用治疗
  patient.treated = true;
  switch (actionKey) {
    case "medicine":
      patient.severity = Math.max(0, patient.severity - 2);
      g.relation += 5;
      addLog(g, `你为 ${patient.name} 用药，症状缓解。药品 -1`);
      break;
    case "bandage":
      patient.severity = Math.max(0, patient.severity - 1);
      g.relation += 2;
      addLog(g, `你为 ${patient.name} 包扎，略有好转。压力 +1`);
      break;
    case "observe":
      addLog(g, `你选择继续观察 ${patient.name}。压力 +2`);
      break;
    case "isolate":
      patient.infected = false;
      g.relation -= 3;
      addLog(g, `你将 ${patient.name} 隔离。感染清除，但信任下降。`);
      break;
  }

  return true;
}

// ── 核心循环: 病势更新 ────────────────────────────────────

export function updateConditions(g) {
  for (const p of g.patients) {
    if (!p.alive) continue;
    if (!p.treated) {
      p.severity += 1;
    }
    if (p.severity >= 4) {
      p.alive = false;
      g.relation -= 10;
      addLog(g, `${p.name} 病情恶化，不治身亡。信任 -10`);
    }
  }
}

// ── 核心循环: 感染扩散 ────────────────────────────────────

export function spreadInfection(g) {
  const alive = g.patients.filter((p) => p.alive);

  // 已感染病人加重
  for (const p of alive) {
    if (p.infected) {
      p.severity += 1;
      g.risk += 0.5;
    }
  }

  // 交叉感染：感染病人可能传染邻近病人
  for (let i = 0; i < alive.length; i++) {
    if (!alive[i].infected) continue;
    const neighbors = [alive[i - 1], alive[i + 1]].filter(Boolean);
    for (const n of neighbors) {
      if (!n.infected && Math.random() < g.risk * 0.15) {
        n.infected = true;
        addLog(g, `${n.name} 被 ${alive[i].name} 传染！`);
      }
    }
  }

  // 随机新感染（随 risk 增大而概率增加）
  const uninfected = alive.filter((p) => !p.infected);
  if (uninfected.length > 0 && Math.random() < g.risk * 0.08) {
    const target = uninfected[Math.floor(Math.random() * uninfected.length)];
    target.infected = true;
    addLog(g, `${target.name} 出现感染迹象。`);
  }
}

// ── 核心循环: 下一轮 ──────────────────────────────────────

export function nextRound(g) {
  updateConditions(g);
  spreadInfection(g);

  g.round += 1;
  g.pressure += 1;

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
  if (g.round > g.maxRounds) {
    g.ended = true;
    g.result = g.relation > 30 ? "survive" : "fail";
    return { ended: true, result: g.result, reason: g.result === "survive" ? "天亮了，你撑过了这一夜。" : "天亮了，但病棚里已经没有信任你的人。" };
  }
  if (g.patients.every((p) => !p.alive)) {
    g.ended = true;
    g.result = "fail";
    return { ended: true, result: "fail", reason: "所有病人都已死亡。你的分诊彻底失败。" };
  }
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
