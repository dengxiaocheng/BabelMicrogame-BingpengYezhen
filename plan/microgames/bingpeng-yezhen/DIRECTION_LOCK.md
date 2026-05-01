# Direction Lock: 病棚夜诊

## One Sentence
玩家在夜间病棚做分诊，有限药物和时间无法救所有人。

## Core Loop
1. 查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮
2. 每轮节奏：最多 8 轮 → 三名初始病人 → 偶数轮可能送来新病人 → 药品断供

## Must Keep
- 核心机制必须保持：分诊优先级 + 病势倒计时 + 交叉感染
- 核心循环必须保持：查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮
- Primary Input：把药物/处理动作拖到病人卡并消耗夜间时间
- 双轨压力：每次有效操作必须同时推动生存压力和关系压力
- 8 轮上限只作为节奏锚点，不扩成长期经营

## Must Not Add
- 不做医学模拟；核心是时间同时流动的分诊
- 不新增第二套主循环
- 不把小游戏扩成开放世界
- 不能只用文字选项或通用按钮列表模拟核心互动

## Required State（执行 worker 不可删除或重命名）
| State | 类型 | 初始值 | 作用 |
|---|---|---|---|
| medicine | number | 10 | 药品库存 |
| time | number | 12 | 夜间时间单位（每轮恢复 +3，上限 12） |
| illness | per-patient | 1-3 随机 | 病势等级（0=稳定，≥4=死亡） |
| infection | {risk, spreadCount} | {risk:1, spreadCount:0} | 感染扩散概率基数与本轮扩散次数 |
| patients_stable | number | 0 | 存活且稳定的病人数量 |

## Internal State（辅助双轨压力，执行 worker 可读不可删）
| State | 初始值 | 作用 |
|---|---|---|
| relation | 50 | 信任度（≤0 信任崩溃 → 失败） |
| pressure | 0 | 累积压力 |

## Success
在 8 轮内完成主循环，且 relation > 30 且 patients_stable > 0 → 存活结局

## Failure
- 全员死亡
- 信任崩溃（relation ≤ 0）
- 时间耗尽且无人稳定
- 超过最大轮数但不满足存活条件
