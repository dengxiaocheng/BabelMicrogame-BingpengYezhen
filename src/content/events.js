/**
 * events.js — 病棚夜诊 事件池
 *
 * 所有事件必须服务于核心情绪：
 *   分诊优先级 + 病势倒计时 + 交叉感染
 *
 * 事件类型：
 *   ROUND_START  — 每轮开始时按条件触发
 *   POST_TREAT   — 治疗后按病人状态触发
 *   CRISIS       — 关键状态临界时触发
 *
 * 每个事件：
 *   condition(g, patient?) → 是否触发
 *   text                   → 叙事文本（进入 log）
 *   effect(g, patient?)    → 对 Required State 的直接修改
 *   once                   → 每局只触发一次
 *   emotion                → 强化哪条核心情绪
 */

// ── 轮次开始事件 ──────────────────────────────────────────

export const ROUND_START_EVENTS = [
  {
    id: "medicine_dwindling",
    emotion: "分诊优先级",
    once: true,
    condition: (g) => g.medicine <= 3 && g.round >= 2,
    text: "药箱快见底了。你必须决定谁值得用药，谁只能靠运气。",
    effect(g) { g.infection.risk += 0.2; },
  },
  {
    id: "infection_air",
    emotion: "交叉感染",
    once: true,
    condition: (g) => g.infection.risk >= 2,
    text: "棚里的空气越来越浑浊。每拖一刻，传染的风险就更大。",
    effect(g) { g.pressure += 3; },
  },
  {
    id: "patient_cry",
    emotion: "病势倒计时",
    once: true,
    condition: (g) => g.patients.some((p) => p.alive && p.illness >= 3),
    text: "角落里传来痛苦的呻吟。有人在恶化——你没有时间犹豫了。",
    effect(g) { g.time = Math.max(0, g.time - 1); },
  },
  {
    id: "curfew_bell",
    emotion: "病势倒计时",
    once: true,
    condition: (g) => g.round >= 4,
    text: "远处传来宵禁的钟声。天亮之前，你只剩几轮机会了。",
    effect(g) { g.pressure += 2; },
  },
  {
    id: "supply_cut",
    emotion: "分诊优先级",
    once: true,
    condition: (g) => g.round >= 5 && g.medicine > 0,
    text: "后方补给线被切断的消息传来。不会再有新药品了。",
    effect(g) { g.medicine = Math.min(g.medicine, 2); },
  },
  {
    id: "stable_encouragement",
    emotion: "分诊优先级",
    once: true,
    condition: (g) => g.patients_stable >= 1 && g.round >= 3,
    text: "稳定下来的病人微微点头。至少有人被你救回来了。",
    effect(g) { g.relation += 5; },
  },
  {
    id: "crowded_ward",
    emotion: "交叉感染",
    once: true,
    condition: (g) => g.patients.filter((p) => p.alive).length >= 4,
    text: "病棚太挤了。病人挨着病人，咳嗽声此起彼伏。",
    effect(g) { g.infection.risk += 0.4; },
  },
  {
    id: "time_crunch",
    emotion: "病势倒计时",
    once: false,
    condition: (g) => g.time <= 2 && g.round >= 2,
    text: "时间不够了。你必须尽快做出分诊决定。",
    effect(g) { g.pressure += 2; },
  },
];

// ── 治疗后事件 ────────────────────────────────────────────

export const POST_TREAT_EVENTS = [
  {
    id: "medicine_resist",
    emotion: "分诊优先级",
    once: false,
    condition: (g, p) => p.illness >= 2 && p.treated,
    text: (p) => `${p.name} 的身体对药物反应迟钝。这点剂量可能不够。`,
    effect(g) { g.pressure += 1; },
  },
  {
    id: "infection_spread_treat",
    emotion: "交叉感染",
    once: false,
    condition: (g, p) => p.infected && p.treated,
    text: (p) => `处理 ${p.name} 时，你注意到邻床病人也开始咳嗽。`,
    effect(g) { g.infection.risk += 0.3; },
  },
  {
    id: "grateful_patient",
    emotion: "分诊优先级",
    once: true,
    condition: (g, p) => p.stable && p.treated,
    text: (p) => `${p.name} 用尽力气说了声「谢谢」。你知道药没有白用。`,
    effect(g) { g.relation += 3; },
  },
  {
    id: "untreated_worsen",
    emotion: "病势倒计时",
    once: false,
    condition: (g) => g.patients.some((p) => p.alive && !p.treated && p.illness >= 2),
    text: "还有病人没处理，情况在恶化。你的每一个选择都意味着有人在等死。",
    effect(g) { g.pressure += 2; },
  },
];

// ── 危机事件 ──────────────────────────────────────────────

export const CRISIS_EVENTS = [
  {
    id: "death_imminent",
    emotion: "病势倒计时",
    once: true,
    condition: (g) => g.patients.filter((p) => p.alive && p.illness >= 3).length >= 2,
    text: "两张病床上的人在同时恶化。你救不了两个人。选谁？",
    effect(g) { g.pressure += 4; },
  },
  {
    id: "full_infection",
    emotion: "交叉感染",
    once: true,
    condition: (g) => g.patients.filter((p) => p.alive && p.infected).length >= 2,
    text: "感染已经扩散到多人。不隔离的话，整个病棚都会沦陷。",
    effect(g) { g.infection.risk += 0.5; },
  },
  {
    id: "trust_shake",
    emotion: "分诊优先级",
    once: true,
    condition: (g) => g.relation <= 15 && g.relation > 0,
    text: "病人开始质疑你的决定。有人小声说要自己处理伤口。",
    effect(g) { g.pressure += 3; },
  },
];

// ── 事件引擎 ──────────────────────────────────────────────

/**
 * 触发事件池：检查所有事件的 condition，返回匹配的事件列表并执行 effect。
 * 避免同轮触发过多事件（最多 2 条），保持叙事节奏。
 *
 * @param {object} g          游戏状态
 * @param {Array}  eventPool  事件数组
 * @param {object?} patient   相关病人（可选）
 * @param {Set}    fired      已触发事件 id 集合（用于 once 控制）
 * @returns {string[]}  触发的事件文本列表
 */
export function triggerEvents(g, eventPool, patient, fired) {
  const texts = [];

  for (const evt of eventPool) {
    if (texts.length >= 2) break; // 每轮最多 2 条事件
    if (evt.once && fired.has(evt.id)) continue;

    let matched;
    try {
      matched = evt.condition(g, patient);
    } catch {
      continue;
    }

    if (!matched) continue;

    // 执行效果
    evt.effect(g, patient);

    // 获取文本
    const txt = typeof evt.text === "function" ? evt.text(patient) : evt.text;
    texts.push(txt);
    g.log.push(txt);

    if (evt.once) fired.add(evt.id);
  }

  return texts;
}

/**
 * 创建事件追踪器，挂在 game state 上。
 */
export function createEventTracker() {
  return { fired: new Set() };
}
