# TASKS: 病棚夜诊

本文件保留给旧入口兼容；任务真源见 `TASK_BREAKDOWN.md`。

# TASK_BREAKDOWN: 病棚夜诊

## Standard Worker Bundle

1. `bingpeng-yezhen-foundation`
   - lane: foundation
   - level: M
   - goal: 建立只服务「查看病人 -> 选择治疗动作 -> 消耗时间/药品 -> 病势更新 -> 感染扩散 -> 下一轮」的可运行骨架

2. `bingpeng-yezhen-state`
   - lane: logic
   - level: M
   - goal: 实现 Direction Lock 状态的一次分配/操作结算

3. `bingpeng-yezhen-content`
   - lane: content
   - level: M
   - goal: 用事件池强化「分诊优先级 + 病势倒计时 + 交叉感染」

4. `bingpeng-yezhen-ui`
   - lane: ui
   - level: M
   - goal: 让玩家看见核心压力、可选操作和后果反馈

5. `bingpeng-yezhen-integration`
   - lane: integration
   - level: M
   - goal: 把已有 state/content/ui 接成单一主循环

6. `bingpeng-yezhen-qa`
   - lane: qa
   - level: S
   - goal: 用测试和 scripted playthrough 确认方向没跑偏
