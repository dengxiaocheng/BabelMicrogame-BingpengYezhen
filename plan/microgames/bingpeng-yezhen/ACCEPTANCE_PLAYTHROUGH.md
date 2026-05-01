# ACCEPTANCE_PLAYTHROUGH: 病棚夜诊

## Scripted Playthrough
1. 开局显示 medicine / time / illness / infection / patients_stable
2. 玩家执行一次核心操作：查看病人 -> 选择治疗动作 -> 消耗时间/药品 -> 病势更新 -> 感染扩散 -> 下一轮
3. 系统必须反馈一个资源或身体压力变化
4. 系统必须反馈一个关系或风险变化

## Direction Gate
- integration worker 必须让这个流程可试玩
- qa worker 必须用测试或手工记录验证这个流程
- 如试玩要求需要偏离 Direction Lock，停止并回交 manager
