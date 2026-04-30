/**
 * descriptions.js — 病棚夜诊 叙事描述池
 *
 * 服务核心循环的每个阶段：
 *   查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮
 *
 * 描述维度：
 *   SYMPTOM_DETAIL  — 按症状 + illness 等级提供查看病人时的视觉/触觉描写
 *   TREAT_RESULT    — 按动作 + 病人状态提供治疗后反馈
 *   CONDITION_SHIFT — 病势更新时的恶化/稳定描写
 *   INFECTION_FLAVOR— 感染扩散时的环境描写
 *
 * 所有描写围绕 Scene Objects (病人卡/药箱/时间灯芯/感染距离) 和
 * Feedback Channels (病势倒计时/medicine消耗/infection扩散线/patients_stable计数)
 */

// ── 症状详情（查看病人阶段）──────────────────────────────────
//
// illness 等级: 1=轻  2=中  3=重

export const SYMPTOM_DETAIL = {
  高热: {
    1: "额头滚烫，但意识尚清，还能回答问题。",
    2: "烧得浑身发抖，嘴唇干裂，嘴里开始说胡话。",
    3: "高热不退，皮肤烫得像炭火。瞳孔开始涣散，再不处理就来不及了。",
  },
  咳血: {
    1: "偶尔咳嗽带血丝，呼吸还算平稳。",
    2: "频繁咳血，每次咳嗽都捂不住。胸口气味不对。",
    3: "大口咳血，呼吸急促到几乎喘不上气。床单已被染红。",
  },
  外伤: {
    1: "伤口还在渗血，但不算深。简单包扎应该能撑住。",
    2: "伤口裂开，能看见里面的肉。没有缝合工具，只能尽力止血。",
    3: "大出血止不住。伤口周围已经开始发黑。再拖下去会感染败血症。",
  },
  腹泻: {
    1: "频繁跑厕所，脸色发白但还能走动。",
    2: "已经虚脱到站不起来，嘴唇发紫，严重脱水。",
    3: "几乎无法离开病床。身体在急剧衰竭，皮肤失去弹性。",
  },
  昏迷: {
    1: "意识模糊，偶尔能被叫醒，但很快又陷入昏睡。",
    2: "对外界刺激反应迟钝，呼唤只能换来含糊的呻吟。",
    3: "完全失去意识。呼吸微弱，生命体征在边缘徘徊。",
  },
  皮疹: {
    1: "皮肤出现零散红斑，有扩散趋势但没有大面积蔓延。",
    2: "红斑已连成片，部分区域开始起水泡。有感染扩散的风险。",
    3: "大面积皮疹蔓延至半身，水泡破裂渗液。极易交叉感染。",
  },
  气喘: {
    1: "呼吸费力但尚能维持，说话时会中断喘气。",
    2: "每次呼吸都像在拉风箱，嘴唇开始发紫。",
    3: "几乎窒息。喉咙发出嘶哑的喘鸣声，这是最后的机会。",
  },
};

/**
 * 获取病人症状详情文本。
 * @param {object} patient  病人对象 { symptom, illness }
 * @returns {string}
 */
export function getSymptomDetail(patient) {
  const pool = SYMPTOM_DETAIL[patient.symptom];
  if (!pool) return `${patient.symptom}，病情危重。`;
  return pool[patient.illness] || pool[3];
}

// ── 治疗结果描述（消耗时间/药品阶段）─────────────────────────

export const TREAT_RESULT = {
  medicine: {
    improve: (p) => `你把最后的药液灌入 ${p.name} 嘴里。药效很快——呼吸平稳了些，脸色也好看了一点。`,
    partial: (p) => `${p.name} 勉强吞下了药，但效果不如预期。病势只是暂时稳住。`,
    waste:   (p) => `药用在了 ${p.name} 身上，但病人状态太差，效果微乎其微。药品浪费了。`,
  },
  bandage: {
    improve: (p) => `简单包扎后，${p.name} 的伤口不再渗血。虽然远不够，但至少暂缓了恶化。`,
    partial: (p) => `绷带很快又被 ${p.name} 的动作弄松了。这种处理撑不了多久。`,
    waste:   (p) => `包扎几乎没有作用。${p.name} 需要的是真正的治疗，不是敷衍了事。`,
  },
  observe: {
    stable:  (p) => `你仔细观察 ${p.name} 的状态。目前还算稳定，但你知道这不会持续太久。`,
    decline: (p) => `你盯着 ${p.name} 看了一阵——情况在变差。你的犹豫正在付出代价。`,
    crisis:  (p) => `你观察了 ${p.name} 几秒，但已经能看出病势在急转直下。不能再等了。`,
  },
  isolate: {
    calm:    (p) => `${p.name} 被隔离到角落。周围病人的表情松弛了一些——至少不用担心被传染。`,
    resist:  (p) => `${p.name} 不愿意被移走，但在你的坚持下还是被隔开了。信任在减少。`,
    late:    (p) => `你把 ${p.name} 隔离了，但感染可能已经扩散。这只是止损，不是解决。`,
  },
};

/**
 * 获取治疗结果描述。
 * @param {string} actionKey  动作类型
 * @param {object} patient    病人对象
 * @param {number} prevIllness 治疗前 illness 值
 * @returns {string}
 */
export function getTreatResult(actionKey, patient, prevIllness) {
  const pool = TREAT_RESULT[actionKey];
  if (!pool) return `你对 ${patient.name} 执行了处理。`;

  if (actionKey === "medicine") {
    if (patient.stable) return pool.improve(patient);
    if (patient.illness < prevIllness) return pool.partial(patient);
    return pool.waste(patient);
  }

  if (actionKey === "bandage") {
    if (patient.illness < prevIllness) return pool.improve(patient);
    if (patient.illness === prevIllness) return pool.partial(patient);
    return pool.waste(patient);
  }

  if (actionKey === "observe") {
    if (patient.stable) return pool.stable(patient);
    if (patient.illness >= 3) return pool.crisis(patient);
    return pool.decline(patient);
  }

  if (actionKey === "isolate") {
    if (!patient.infected) return pool.calm(patient);
    if (patient.illness >= 2) return pool.late(patient);
    return pool.resist(patient);
  }

  return pool.improve?.(patient) ?? `你对 ${patient.name} 执行了处理。`;
}

// ── 病势变化描述（病势更新阶段）─────────────────────────────

export const CONDITION_SHIFT = {
  worsening: [
    "病棚里的空气越来越沉，有人在低声呜咽。",
    "一声压抑的咳嗽打破了沉默。你不敢回头看。",
    "夜更深了，病情却不会等人。",
  ],
  death: (p) => `${p.name} 的呼吸渐渐停了。你盖上布，转身去看下一个。没有时间哀悼。`,
  survived: "又熬过了一轮。但你知道下一轮只会更难。",
};

/**
 * 获取病势更新阶段的叙事文本。
 * @param {object} g          游戏状态
 * @param {Array}  died       本轮死亡的病人列表
 * @returns {string}
 */
export function getConditionShift(g, died) {
  const lines = [];
  for (const p of died) {
    lines.push(CONDITION_SHIFT.death(p));
  }
  if (lines.length === 0 && g.pressure > 5) {
    const pool = CONDITION_SHIFT.worsening;
    lines.push(pool[g.round % pool.length]);
  }
  return lines.join("\n");
}

// ── 感染扩散描述（感染扩散阶段）─────────────────────────────

export const INFECTION_FLAVOR = {
  spread: (from, to) => `${from.name} 的咳嗽喷到了 ${to.name} 的方向。你看到 ${to.name} 的眼睛里闪过恐惧。`,
  new_infection: (p) => `${p.name} 开始出现感染迹象。你注意到皮肤上不正常的潮红。`,
  air_heavy: "棚里的空气越来越重，每一次呼吸都在吸入看不见的危险。",
  proximity: (p) => `${p.name} 距离感染源太近了。隔离是唯一的办法——但你还有时间吗？`,
};

// ── 药箱状态描述 ──────────────────────────────────────────

export const MEDICINE_STATUS = {
  0: "药箱空了。",
  1: "只剩一份药了。这一份要给谁？",
  2: "药品所剩无几。每一份都可能决定生死。",
  low: (g) => `药箱里还剩 ${g.medicine} 份药。省着用。`,
  ok: "药箱还有一定存量，但不会永远够用。",
};

/**
 * 获取药箱状态描述。
 */
export function getMedicineStatus(g) {
  if (g.medicine === 0) return MEDICINE_STATUS[0];
  if (g.medicine === 1) return MEDICINE_STATUS[1];
  if (g.medicine === 2) return MEDICINE_STATUS[2];
  if (g.medicine <= 4) return MEDICINE_STATUS.low(g);
  return MEDICINE_STATUS.ok;
}

// ── 时间状态描述 ──────────────────────────────────────────

export const TIME_STATUS = {
  critical: "灯芯快要燃尽了。你必须立刻做出决定。",
  low:      "时间不多。每一秒都在流逝。",
  ok:       "夜还长，但不会永远等你。",
};

/**
 * 获取时间状态描述。
 */
export function getTimeStatus(g) {
  if (g.time <= 1) return TIME_STATUS.critical;
  if (g.time <= 3) return TIME_STATUS.low;
  return TIME_STATUS.ok;
}
