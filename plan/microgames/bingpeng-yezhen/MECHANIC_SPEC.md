# MECHANIC_SPEC: 病棚夜诊

## Primary Mechanic

- mechanic: 分诊优先级 + 病势倒计时 + 交叉感染
- primary_input: 把药物/处理动作拖到病人卡并消耗夜间时间
- minimum_interaction: 玩家必须在倒计时中选择病人并分配药物或隔离动作，看到 illness/infection 的即时变化

## Mechanic Steps

1. 扫描病人 illness 和感染相邻关系
2. 选择药物或隔离动作
3. 拖到病人卡执行
4. 消耗 time 并传播 infection

## State Coupling

每次有效操作必须同时推动两类后果：

- 生存/资源/进度压力：从 Required State 中选择至少一个直接变化
- 关系/风险/秩序压力：从 Required State 中选择至少一个直接变化

## Not A Choice List

- 不能只展示 2-4 个文字按钮让玩家选择
- UI worker 必须把 primary input 映射到场景对象操作
- integration worker 必须让这个操作进入状态结算，而不是只写叙事反馈
