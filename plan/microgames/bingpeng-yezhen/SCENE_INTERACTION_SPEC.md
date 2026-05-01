# SCENE_INTERACTION_SPEC: 病棚夜诊

## Screen Layout（从上到下）

```
┌─────────────────────────────────┐
│  状态条 (#status-bar)           │  灯芯(时间条) + 药箱(药品条) + 感染风险 + 稳定数 + 轮次
├─────────────────────────────────┤
│  阶段标签 (#phase-label)        │  "—— 查看病人 ——" 或 "—— 分诊 ——"
├─────────────────────────────────┤
│  叙事日志 (#narrative)          │  最近 4 条叙事文本
├─────────────────────────────────┤
│  病人卡列表 (#patients)         │  病人卡 + 感染扩散线，垂直排列
├─────────────────────────────────┤
│  操作区 (#actions)              │  按 phase 切换内容（见下方）
├─────────────────────────────────┤
│  反馈 (#feedback)               │  治疗结果即时文本
└─────────────────────────────────┘
```

## Scene Objects

| Object | DOM 元素 | 作用 |
|---|---|---|
| 病人卡 | `.patient-card[data-pid]` | 拖放目标，显示 name/symptom/illness-bar/badges |
| 药箱 | `.medicine-box` | 包含 `.act-item` 可拖动动作卡片 |
| 时间灯芯 | 状态条内 `.pressure-fill.time` | 可视化剩余时间 |
| 药箱条 | 状态条内 `.pressure-fill.medicine` | 可视化剩余药品 |
| 感染扩散线 | `.inf-line > .inf-dash` | 病人卡之间的虚线动画 |
| 分诊标记 | `.badge` (inf/stb/don) | 感染/稳定/已处理 徽章 |

## Phase-dependent 操作区内容

| Phase | 操作区内容 | 玩家动作 |
|---|---|---|
| view | "开始分诊" 按钮 (`.phase-btn`) | 点击 → 进入 treat |
| treat | 药箱 (`.medicine-box`) + "结束本轮" 按钮 | 拖动/点击动作到病人卡；或提前结束 |
| resolve | 结算框 (`.resolve-box`) + "继续" 按钮 | 查看本轮结果，点击继续 |
| ended | 结局画面 (`.ending-el`) | "再来一次" 按钮 (reload) |

## Interaction: Drag & Drop + Touch Fallback

**鼠标拖放**：
1. 在 treat 阶段，玩家从药箱拖动 `.act-item`（设置 `draggable=true`）
2. 拖到目标 `.patient-card` 上（dragover → 显示 `.drag-over` 高亮）
3. 松手（drop）→ 触发 `_onDrop(patientId, actionKey)`

**触摸/点击回退**：
1. 点击 `.act-item` → 选中（添加 `.selected` 样式），记录 `selectedAction`
2. 点击 `.patient-card` → 如果有 `selectedAction`，触发 `_onDrop`
3. 再次点击同一 `.act-item` → 取消选中

**禁用状态**：
- 资源不足的 `.act-item` 添加 `.disabled`（opacity 0.25, cursor not-allowed, draggable=false）
- 已死亡的 `.patient-card` 添加 `.dead`（opacity 0.3, pointer-events none）
- 已处理的病人添加 `.badge.don`，不可再接受拖放

## Feedback Channels

| 触发 | 反馈 | 持续时间 |
|---|---|---|
| 治疗成功 | `.flash-ok` 动画（金色光晕） | 600ms |
| 治疗负面 | `.flash-bad` 动画（红色光晕） | 600ms |
| illness 变化 | `.ill-delta` 浮动数字（-2 绿色 / +1 红色） | 1100ms |
| illness 条 | `.illness-fill` 宽度/颜色过渡 | 400ms |
| 时间/药品低 | `.pressure-fill.low` 脉冲动画 | 持续 |
| 感染扩散线 | `.inf-dash` 虚线脉冲动画 | 持续（仅 active 时可见） |
| 叙事日志 | `#narrative` 文本更新 | 即时 |
| 反馈文本 | `#feedback` 显示最新 log 条目 | 即时 |

## illness 条颜色映射

| illness 值 | 颜色 class | 含义 |
|---|---|---|
| 0 | s0 (--success) | 稳定 |
| 1 | s1 (--success) | 轻症 |
| 2 | s2 (--warn) | 中症 |
| 3 | s3 (--danger) | 重症 |
| 4+ | s4 (#8b0000) | 死亡线 |

## Forbidden UI

- 不允许只用普通治疗选项列表（必须拖放到场景对象）
- 不允许做完整医疗模拟（不做诊断小游戏、不做手术模拟）
- 不允许用纯随机事件文本替代核心循环

## Acceptance Rule

- 首屏必须让玩家看到至少 3 个病人卡和 4 个可操作动作
- 拖放操作必须产生即时可见反馈（flash + delta + narrative）
- 反馈必须能追溯到 Required State 变化
- 触摸设备必须能通过点击完成全部操作
