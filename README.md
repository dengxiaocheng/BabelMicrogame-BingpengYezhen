# 病棚夜诊

> 玩家在夜间病棚做分诊，有限药物和时间无法救所有人。

## 在线试玩

https://dengxiaocheng.github.io/BabelMicrogame-BingpengYezhen/

## 本地运行

纯 HTML/JS 项目，无需构建步骤：

```bash
# 方式一：直接在浏览器打开
open index.html

# 方式二：本地 HTTP 服务（ES Module 需要同源策略）
npx serve .
# 或
python3 -m http.server 8000
```

## 测试

```bash
npm test
```

## 核心玩法

查看病人 → 选择治疗动作 → 消耗时间/药品 → 病势更新 → 感染扩散 → 下一轮

将药箱中的药物/处理动作拖到病人卡上，消耗夜间时间进行分诊。
