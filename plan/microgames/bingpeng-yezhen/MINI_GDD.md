# MINI GDD: 病棚夜诊

## Scope

- runtime: web（ES6 module，无框架依赖）
- duration: ~20min（8 轮，每轮 1-3 分钟）
- project_line: 病棚夜诊
- single_core_loop: 查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮

## Player Experience Flow

1. **开局**：夜色降临，3 名伤患送入病棚，药品有限（10 份药、12 时间单位）
2. **每轮**：
   - view 阶段：查看每个病人的症状详情、病势条、感染状态
   - treat 阶段：从药箱拖动作到病人卡（或点击选中后点病人），每个病人只能处理一次
   - resolve 阶段：系统结算死亡、感染扩散，显示本轮变化摘要
3. **节奏事件**：药品短缺警告、感染空气恶化、病人呻吟、宵禁钟声、补给切断等
4. **偶数轮**：可能送来新病人（上限 5 名存活）
5. **结局**：8 轮后判定存活/失败，或中途触发失败条件

## Starting Parameters

| Parameter | Value |
|---|---|
| patients | 3 名，illness 1-3 随机 |
| medicine | 10 |
| time | 12（每轮恢复 +3，上限 12） |
| infection.risk | 1.0 |
| relation | 50 |
| pressure | 0 |
| maxRounds | 8 |

## Game Phases（单轮状态机）

```
view ──[点击"开始分诊"]──→ treat ──[全部处理/点"结束本轮"]──→ resolve ──[点"继续"]──→ view(下一轮)
                                                                                         ↓
                                                                                   checkEnd → 结局
```

- **view**：显示病人详情，药箱/时间状态提示，触发轮次开始事件。只有"开始分诊"按钮。
- **treat**：显示可拖动的动作卡片。每个病人只能被处理一次。可提前"结束本轮"。
- **resolve**：系统执行 updateConditions → spreadInfection → computePatientsStable → nextRound。显示死亡/新感染摘要。

## Treatment Actions

| Action | timeCost | medicineCost | illness效果 | relation效果 | pressure效果 |
|---|---|---|---|---|---|
| 用药治疗 | 1 | 1 | -2 | +5 | — |
| 简单包扎 | 1 | 0 | -1 | +2 | — |
| 继续观察 | 2 | 0 | 不变 | -2 | +2 |
| 隔离安置 | 1 | 0 | -1, infected→false | -3 | — |

illness 降为 0 → 标记 stable。illness ≥ 4 → 死亡。

## Content System

- 7 种症状池：高热、咳血、外伤、腹泻、昏迷、皮疹、气喘
- 每种症状 3 级详情描述（illness 1/2/3）
- 治疗结果描述池：按动作类型 × 结果（improve/partial/waste）
- 事件池：ROUND_START（8 条）、POST_TREAT（4 条）、CRISIS（3 条），每轮最多触发 2 条

## UI Layout

- 顶部：压力状态条（灯芯/药箱 + 感染风险 + 稳定计数 + 轮次）
- 阶段标签
- 叙事日志（最近 4 条）
- 病人卡列表（含感染扩散线、病势条、状态徽章）
- 操作区（药箱/按钮/结算框，随 phase 切换）
- 结局画面（survive/fail）

## Constraints

- 总体规模控制在 5000 行以内
- 单个 worker 任务服从 packet budget
- 不加多余菜单和后台页
- 如需扩线，交回 manager 重新拆
