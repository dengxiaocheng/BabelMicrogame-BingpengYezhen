# ACCEPTANCE_PLAYTHROUGH: 病棚夜诊

## Scripted Playthrough
1. 开局显示 medicine(10) / time(12) / illness(1-3) / infection(risk=1) / patients_stable(0)
2. 查看病人阶段：三名病人卡展示症状、病势条、感染状态
3. 点击「开始分诊」进入治疗阶段
4. 从药箱拖动动作（用药/包扎/观察/隔离）到病人卡，或点选动作后点击病人卡
   - 即时反馈：illness 数值变化动画、卡面闪光
   - 每次操作消耗 time 和/或 medicine
   - 每次操作同时推动两类后果：生存压力（illness/medicine/time）+ 关系压力（relation/pressure）
5. 可随时点击「结束本轮」跳过未治疗病人
6. 全部治疗完毕或点击「结束本轮」→ 进入结算
   - 结算面板显示：死亡病人、新感染病人、当前轮次/稳定数/药品
   - 未治疗病人 illness +1，illness >= 4 则死亡
   - 感染扩散：已感染病人传染邻近病人
   - 事件池触发条件事件（药箱见底、感染扩散、病势告急等）
7. 点击「继续」进入下一轮查看病人阶段
8. 循环直至触发结局（存活/失败）

## Direction Gate
- integration worker 让此流程完整可试玩：拖药到病人 → 状态结算 → 结算面板 → 下一轮
- qa worker 必须用测试验证此流程的每个状态变化
- 结算入口通过结算面板 + 「继续」按钮可达
- primary input（拖动/点选动作到病人卡）真实驱动 illness/medicine/time/infection 状态变化
