# MINI_GDD: 病棚夜诊

## Scope

- runtime: web
- duration: 20min
- project_line: 病棚夜诊
- single_core_loop: 查看病人 -> 选择治疗动作 -> 消耗时间/药品 -> 病势更新 -> 感染扩散 -> 下一轮

## Core Loop
1. 执行核心循环：查看病人 -> 选择治疗动作 -> 消耗时间/药品 -> 病势更新 -> 感染扩散 -> 下一轮
2. 按 20 分钟节奏推进：三名病人 -> 症状误判 -> 传染 -> 药品断供

## State

- medicine
- time
- illness
- infection
- patients_stable

## UI

- 只保留主界面、结果反馈、结算入口
- 不加多余菜单和后台页

## Content

- 用小型事件池支撑主循环
- 一次只验证一条 Babel 创意线

## Constraints

- 总体规模目标控制在 5000 行以内
- 单个 worker 任务必须服从 packet budget
- 如需扩线，交回 manager 重新拆
