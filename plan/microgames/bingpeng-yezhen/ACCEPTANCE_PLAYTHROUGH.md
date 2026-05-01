# ACCEPTANCE_PLAYTHROUGH: 病棚夜诊

## Playthrough A：基本核心循环（必须通过）

**初始状态**：medicine=10, time=12, 3 patients (illness 1-3 random), infection.risk=1, relation=50, round=1

### Step 1: 开局
- 预期：显示 3 张病人卡，每张有 name/symptom/illness-bar
- 预期：状态条显示 灯芯=12, 药箱=10, 感染=1.0, 稳定=0/3, 第1/8轮
- 预期：叙事日志含"夜色降临，三名伤患被送入病棚"
- 预期：操作区显示"开始分诊"按钮

### Step 2: 进入分诊
- 操作：点击"开始分诊"
- 预期：操作区切换为药箱，显示 4 个动作卡片（用药💊/包扎🩹/观察👁/隔离🚫）
- 预期：每张病人卡变为可拖放目标（显示"拖到此处"提示）

### Step 3: 拖药到病人
- 操作：拖"用药治疗"到患者甲
- 预期：medicine 9, time 11
- 预期：患者甲 illness 变化（illness-2 或归零变 stable）
- 预期：患者甲 显示 flash-ok 动画 + illness delta 数字
- 预期：患者甲 标记"已处理"徽章

### Step 4: 处理剩余病人
- 操作：对 2 名未处理病人各执行 1 次动作（任意）
- 预期：所有病人标记"已处理"
- 预期：自动进入 resolve 阶段

### Step 5: 结算
- 预期：结算框显示本轮变化（死亡/新感染/暂无重大变化）
- 预期：状态条更新（轮次 2/8, time 恢复 +3）

### Step 6: 继续
- 操作：点击"继续"
- 预期：进入第 2 轮 view 阶段
- 预期：所有病人 treated 标记重置
- 预期：偶数轮，可能有新病人送来

## Playthrough B：感染扩散验证

**前置**：至少 1 名病人 infected=true, 另有 1 名相邻病人 alive 且未感染

### Step B1: 触发感染结算
- 操作：完成一轮使 infected 病人进入 resolve
- 预期：infected 病人 illness +1
- 预期：infection.risk +0.5
- 预期：相邻病人可能被传染（概率 infection.risk × 0.15）
- 预期：如传染发生，叙事日志含感染扩散描述

## Playthrough C：死亡与信任验证

**前置**：1 名病人 illness=3, treated=false

### Step C1: 病人死亡
- 操作：进入 resolve（该病人未治疗）
- 预期：updateConditions → illness 3+1=4 ≥ 4 → alive=false
- 预期：relation -10
- 预期：结算框显示"XX 未能撑过这一轮"

### Step C2: 信任崩溃
- 前置：relation 降至 ≤ 0
- 预期：checkEnd 返回 fail，reason 含"信任崩溃"

## Playthrough D：存活结局验证

**前置**：round > maxRounds, relation > 30, patients_stable > 0

### Step D1: 达成存活
- 预期：checkEnd 返回 survive
- 预期：结局画面显示"天亮了，你撑过了这一夜"
- 预期：显示最终统计（稳定数/药品/轮次）

## Playthrough E：提前结束本轮验证

### Step E1: 部分处理后结束
- 操作：treat 阶段只处理 1 名病人，点击"结束本轮"
- 预期：进入 resolve，未处理病人 illness +1
- 预期：未处理病人 stable 重置为 false

## Direction Gate

- 上述 Playthrough A 必须在当前实现中可完整执行
- 任何 worker 修改后，A-E 全部必须仍可通过
- 如试玩要求需要偏离 Direction Lock，停止并回交 manager
- 测试命令：`node --test src/game.test.js`
