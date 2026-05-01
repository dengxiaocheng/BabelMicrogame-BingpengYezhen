# TASK_BREAKDOWN: 病棚夜诊

## Worker Dependency Graph

```
foundation ──→ state ──→ content ──→ ui ──→ integration ──→ qa
```

每个 worker 必须读取 plan/ 目录下全部文件作为方向合同，不依赖聊天上下文。

---

## Worker 1: `bingpeng-yezhen-foundation`

- **Lane**: foundation
- **Level**: M
- **Goal**: 建立 HTML 骨架 + CSS 变量 + ES6 module 入口，确保 index.html 可加载并显示空状态
- **File Contract**:
  - `index.html` — 必须包含 `#status-bar`, `#phase-label`, `#narrative`, `#patients`, `#actions`, `#feedback`, `#ending` 容器
  - `src/main.js` — GameController 骨架（可只含 start 和空 render）
  - `src/game.js` — createGame() 和 initGame() 骨架（必须包含 Direction Lock 全部 5 个 Required State）
- **Acceptance**:
  - 浏览器加载 index.html 无报错
  - createGame() 返回含 medicine/time/infection/patients_stable 的对象
  - initGame() 生成 3 名含 illness 字段的病人
- **Prohibited**: 不实现拖放、不实现治疗逻辑、不添加事件系统
- **Serves**: 为后续 worker 提供可运行的 DOM 和状态骨架

---

## Worker 2: `bingpeng-yezhen-state`

- **Lane**: logic
- **Level**: M
- **Goal**: 在 src/game.js 中实现完整的核心循环状态机：treatPatient / updateConditions / spreadInfection / nextRound / checkEnd
- **File Contract**:
  - `src/game.js` — 必须导出 treatPatient, updateConditions, spreadInfection, computePatientsStable, nextRound, ACTIONS
  - `src/game.test.js` — 必须覆盖 Direction Lock 全部 5 个 Required State 的测试 + 双轨压力测试
- **Acceptance**:
  - `node --test src/game.test.js` 全部通过
  - treatPatient 按 MECHANIC_SPEC 表格精确扣除资源并更新状态
  - 每个动作的双轨压力映射符合 MECHANIC_SPEC State Coupling
  - 感染扩散公式精确匹配：邻居 risk×0.15，随机 risk×0.08
  - 结局条件覆盖 4 种 fail + 1 种 survive
- **Prohibited**: 不做 UI、不拖入 content、不改 index.html
- **Serves**: 为 ui/content/integration worker 提供可调用的纯函数状态机

---

## Worker 3: `bingpeng-yezhen-content`

- **Lane**: content
- **Level**: M
- **Goal**: 在 src/content/ 下实现症状详情池、治疗结果池、感染描述池、事件池
- **File Contract**:
  - `src/content/descriptions.js` — 导出 getSymptomDetail, getTreatResult, getConditionShift, INFECTION_FLAVOR, getMedicineStatus, getTimeStatus
  - `src/content/events.js` — 导出 ROUND_START_EVENTS, POST_TREAT_EVENTS, CRISIS_EVENTS, triggerEvents, createEventTracker
- **Acceptance**:
  - 7 种症状 × 3 级 = 21 条症状详情
  - 4 种动作 × 2-3 种结果分支 = 治疗结果池
  - 事件池 ≥ 12 条，每条含 condition/text/effect/emotion
  - triggerEvents 每轮最多触发 2 条，once 事件不重复
- **Prohibited**: 不改 src/game.js 逻辑、不做 UI
- **Serves**: 为 game.js 提供叙事内容，强化"分诊优先级 + 病势倒计时 + 交叉感染"核心情绪

---

## Worker 4: `bingpeng-yezhen-ui`

- **Lane**: ui
- **Level**: M
- **Goal**: 在 src/ui/scene.js 中实现 SceneRenderer，把 SCENE_INTERACTION_SPEC 映射到 DOM
- **File Contract**:
  - `src/ui/scene.js` — 导出 SceneRenderer class
  - 必须实现：render, flashCard, showDelta, onDrop, onPhase, onEndRound, onContinue
- **Acceptance**:
  - 药箱动作卡片可拖动（HTML5 dragstart/dragend）
  - 病人卡接受拖放（dragover/drop）+ 点击回退
  - 拖放触发 `_onDrop(patientId, actionKey)`
  - 治疗后 flash 动画 + illness delta 数字
  - 状态条显示 time/medicine/infection/patients_stable/round
  - 资源不足动作显示 disabled
  - 按 phase (view/treat/resolve) 切换操作区
- **Prohibited**: 不实现游戏逻辑（不调 treatPatient/nextRound）、不改 src/game.js
- **Serves**: 为 integration worker 提供可回调的 UI 渲染层

---

## Worker 5: `bingpeng-yezhen-integration`

- **Lane**: integration
- **Level**: M
- **Goal**: 在 src/main.js 的 GameController 中把 game.js 状态机 + scene.js 渲染 + content 池接成单一可运行主循环
- **File Contract**:
  - `src/main.js` — GameController 完整实现，桥接 SceneRenderer 回调到 game.js 函数
- **Acceptance**:
  - ACCEPTANCE_PLAYTHROUGH Playthrough A 可在浏览器中完整执行
  - 拖药到病人 → 即时反馈（flash + delta + narrative + feedback text）
  - 全部处理完或点"结束本轮" → resolve → 显示结算 → 继续
  - 结局画面正确显示（survive/fail）
  - 叙事日志持续更新（最近 4 条）
- **Prohibited**: 不改 src/game.js 的状态逻辑、不改 src/content/ 的叙事文本
- **Serves**: 让 qa worker 可以运行完整试玩

---

## Worker 6: `bingpeng-yezhen-qa`

- **Lane**: qa
- **Level**: S
- **Goal**: 用测试和手工试玩验证 ACCEPTANCE_PLAYTHROUGH 全部 Playthrough A-E
- **File Contract**:
  - `src/game.test.js` — 扩展测试覆盖感染扩散、死亡结算、结局判定、完整多轮循环
  - 可在 report 中记录手工试玩结果
- **Acceptance**:
  - `node --test src/game.test.js` 全部通过
  - 测试覆盖：Required State 存在性、动作资源消耗、双轨压力、病势更新、感染扩散、patients_stable、轮次推进、4 种结局
  - 手工验证 Playthrough A-E（记录在 report）
- **Prohibited**: 不修改任何非测试文件来修复问题（必须回交对应 worker）
- **Serves**: 确认方向未跑偏，核心循环闭环

---

## 通用禁止项（所有 worker）

1. 不偏离 Direction Lock 中的 Required State 和 Core Loop
2. 不新增第二套主循环
3. 不做医学模拟细节
4. 不能只用文字按钮替代拖放交互
5. 每个文件修改必须在 write scope 内
