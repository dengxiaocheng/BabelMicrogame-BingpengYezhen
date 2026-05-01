# MECHANIC_SPEC: 病棚夜诊

## Primary Mechanic

- **mechanic**: 分诊优先级 + 病势倒计时 + 交叉感染
- **primary_input**: 把药物/处理动作拖到病人卡并消耗夜间时间
- **minimum_interaction**: 玩家必须在倒计时中选择病人并分配药物或隔离动作，看到 illness/infection 的即时变化

## Mechanic Steps（每轮 execute）

1. **扫描** — view 阶段，玩家看到每个病人的 illness、symptom 详情、infected 状态
2. **选择** — treat 阶段，从药箱选一个动作（medicine/bandage/observe/isolate）
3. **拖放** — 把动作拖到目标病人卡（或点击选中后点病人卡）
4. **消耗** — 扣除 timeCost + medicineCost（如果有的话）
5. **结算** — 应用 illness 变化 + relation 变化 + pressure 变化
6. **轮终** — 点"结束本轮"或全部处理完 → resolve 阶段

## Action Detail

| Key | Label | timeCost | medicineCost | 对 illness | 对 infected | 对 relation | 对 pressure |
|---|---|---|---|---|---|---|---|
| medicine | 用药治疗 | 1 | 1 | max(0, -2) | 不变 | +5 | — |
| bandage | 简单包扎 | 1 | 0 | max(0, -1) | 不变 | +2 | — |
| observe | 继续观察 | 2 | 0 | 不变 | 不变 | -2 | +2 |
| isolate | 隔离安置 | 1 | 0 | max(0, -1) | → false | -3 | — |

**约束**：
- medicine 不足时 medicine 动作不可用
- time 不足时动作不可用
- 每个病人每轮只能被处理一次（treated 标记）
- 资源不足的动作在 UI 上显示为 disabled

## State Coupling（双轨压力）

每次有效操作必须同时推动两类后果：

- **生存/资源/进度压力**：medicine↓, time↓, illness 变化, infection 变化, patients_stable 变化
- **关系/风险/秩序压力**：relation 变化, pressure 变化

具体映射：
- medicine 动作：生存(medicine↓, illness↓) + 关系(relation↑)
- bandage 动作：生存(time↓, illness↓) + 关系(relation↑)
- observe 动作：生存(time↓, pressure↑) + 关系(relation↓)
- isolate 动作：生存(time↓, infected→false, illness↓) + 关系(relation↓)

## Infection Spread Formula（resolve 阶段执行）

1. 已感染病人 illness +1，infection.risk +0.5
2. 交叉感染：感染病人的相邻存活病人，每人 probability = infection.risk × 0.15
3. 随机新感染：任一未感染存活病人，probability = infection.risk × 0.08
4. 触发感染叙事（INFECTION_FLAVOR）

## Condition Update Formula（resolve 阶段执行）

1. 未治疗病人：illness +1，stable → false
2. illness ≥ 4：alive → false，relation -10
3. 已治疗病人：不受 updateConditions 影响

## Round Transition

1. 执行 updateConditions → spreadInfection → computePatientsStable
2. round +1，pressure +1
3. time = min(time + 3, 12)
4. 所有病人 treated → false
5. 偶数轮（round % 2 === 0）且存活病人 < 5：新增 1 名随机病人
6. checkEnd 判定

## Ending Conditions

| 条件 | 结果 |
|---|---|
| 所有病人死亡 | fail：分诊彻底失败 |
| relation ≤ 0 | fail：信任崩溃，病人暴动 |
| time ≤ 0 且 patients_stable === 0 | fail：时间耗尽，病棚混乱 |
| round > maxRounds 且 relation > 30 且 patients_stable > 0 | survive：天亮了 |
| round > maxRounds 但不满足存活条件 | fail：天亮了但无人信任 |

## Event System

- 事件池：ROUND_START(8) + POST_TREAT(4) + CRISIS(3)
- 每轮最多触发 2 条事件（叙事节奏控制）
- once 事件每局只触发一次
- 每条事件含：condition(条件) → text(叙事) → effect(状态修改) → emotion(核心情绪)

## Not A Choice List

- 不能只展示 2-4 个文字按钮让玩家选择
- UI worker 必须把 primary input 映射到场景对象操作（拖放 + 点击回退）
- integration worker 必须让拖放操作进入状态结算，而不是只写叙事反馈
