# SCENE_INTERACTION_SPEC: 病棚夜诊

## Scene Objects

- 病人卡
- 药箱
- 时间灯芯
- 感染距离
- 分诊标记

## Player Input

- primary_input: 把药物/处理动作拖到病人卡并消耗夜间时间
- minimum_interaction: 玩家必须在倒计时中选择病人并分配药物或隔离动作，看到 illness/infection 的即时变化

## Feedback Channels

- 病势倒计时
- medicine 消耗
- infection 扩散线
- patients_stable 计数

## Forbidden UI

- 不允许只用普通治疗选项列表
- 不允许做完整医疗模拟

## Acceptance Rule

- 首屏必须让玩家看到至少一个可直接操作的场景对象
- 玩家操作必须产生即时可见反馈，且反馈能追溯到 Required State
- 不得只靠随机事件文本或普通选择按钮完成主循环
