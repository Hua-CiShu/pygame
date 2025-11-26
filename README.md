目前最新版本、手机端友好、两个模式较为健全、怪物种类多样、道具多样。
https://hua-cishu.github.io/pygame/
# Neon Harvest Web
霓虹弹幕生存 · 双模式 · 支持 PC / 手机触控

## 🕹️ 模式
- **无尽模式**：捡能量护盾，武器进化；等级可提升移速/子弹/能量/生命/敌人上限。
- **试炼模式**（简单 / 标准 / 艰难）：无基础积分豆，全靠道具成长；敌人血量随时间与难度成长，支持闪现、时间暂停等技能。

## 🎯 操作
- **PC**：WASD/方向键移动 · 空格/左键射击 · P 暂停 · R 重来 · 试炼模式 F 闪现
- **移动端**：双指并行——第一指移动，第二指任意位置瞄准射击；右下按钮：暂停 / 闪现 / 重来 / 全屏
- 全屏只放大游戏画布，竖屏全屏时自动旋转视图模拟横屏。

## 👾 敌人阵容（两模式共享）
慢行、潜行、之字、射手、冲锋、分裂者（死亡分裂）、蛮横、护盾指挥官（给周围敌人上盾）、毒物行者（掉毒圈）、相位刺客（闪现贴脸）、裂隙召唤者（放裂隙召小怪）。  
无尽血量成长：`hp = baseHp × (1 + ⌊modeElapsed/900⌋·0.3 + ⌊level/3⌋·0.25)`。  
试炼血量成长：`hp = baseHp × (1 + ⌊modeElapsed/900⌋) × 难度系数`，其中难度系数：简单×1，标准×1.5，艰难×2。

## 💥 试炼道具
猛袭无敌 · 散射+1 · 增命 · 环绕子弹 · 反弹（限时） · 闪现充能 · 时间暂停 · 攻击+1（可叠加）。

## ✨ 视觉与反馈
霓虹渐变子弹、受击闪光 + 减速、分裂爆碎、裂隙召唤、毒圈持续伤害；时间暂停金色沙漏动画，结束有轻微屏幕震动；Buff 横幅居中提示。

## 🚀 运行
- 在线：GitHub Pages 直接访问仓库页面。
- 本地：在项目根目录执行 `python -m http.server`，打开 `http://localhost:8000`。

## 📂 文件结构
- `index.html`：页面骨架、模式选择、触控按钮
- `style.css`：霓虹风样式、全屏/旋转适配、触控按钮
- `main.js`：入口、菜单与输入绑定、全屏控制
- `game.js`：主循环、渲染、碰撞、震动、通用状态
- `core/`：`constants.js` 常量；`utils.js` 随机/向量/权重；`particles.js` 粒子
- `modes/`：`endless.js`（无尽逻辑、升级/HUD/玩家绘制），`rogue.js`（试炼逻辑、道具/敌人/HUD/玩家绘制）

## 🧪 难度血量示例（试炼基础血量，仅示例，最终还会随时间成长）
- 简单（×1）：slow 2，sneaky 2，zigzag 2，shooter 2，charger 2，splitter 2.4，brute 6，commander 4.4，toxic 2.8，assassin 3，riftcaller 5，splitling ~1.9，riftling 2
- 标准（×1.5）：slow 3，sneaky 3，zigzag 3，shooter 3，charger 3，splitter 3.6，brute 9，commander 6.6，toxic 4.2，assassin 4.5，riftcaller 7.5，splitling ~2.9，riftling 3
- 艰难（×2）：slow 4，sneaky 4，zigzag 4，shooter 4，charger 4，splitter 4.8，brute 12，commander 8.8，toxic 5.6，assassin 6，riftcaller 10，splitling ~3.8，riftling 4
