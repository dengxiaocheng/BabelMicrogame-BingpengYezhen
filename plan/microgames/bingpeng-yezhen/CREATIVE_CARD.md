# CREATIVE_CARD: 病棚夜诊

- slug: `bingpeng-yezhen`
- creative_line: 病棚夜诊
- target_runtime: web
- target_minutes: 20
- core_emotion: 分诊优先级 + 病势倒计时 + 交叉感染
- core_loop: 查看病人 -> 选择治疗动作 -> 消耗时间/药品 -> 病势更新 -> 感染扩散 -> 下一轮
- failure_condition: 关键状态崩溃，或在本轮主循环中被系统淘汰
- success_condition: 在限定时长内完成主循环，并稳定进入至少一个可结算结局

## Intent

- 做一个 Babel 相关的单创意线微游戏
- 只保留一个主循环，不扩成大项目
- 让 Claude worker 能按固定 packet 稳定并行
