https://hua-cishu.github.io/pygame/
# Neon Harvest Web

> 霓虹小宇宙里的双模式弹幕生存：无尽进化 + 试炼道具狂欢

## 🎮 模式与玩法
- **无尽模式**：能量收集、武器随等级进化，升级加速/上限/能量/子弹/生命。
- **试炼模式**（简单/标准/艰难）：道具驱动成长，无基础积分豆。道具包括猛袭无敌、散射+1、加命、环绕子弹、反弹、闪现充能、时间暂停、永久攻击+1。敌人/血量随时间增长。
- **操作**：WASD/方向键移动，Space / 左键射击，P 暂停，R 重开，试炼模式 F 闪现。

## 🛠️ 运行
- 直接双击 `index.html`（如浏览器限制本地模块，可用本地服务）  
- 或 `python -m http.server` 后访问 `http://localhost:8000`

## 🗂️ 项目结构
- `index.html`：页面骨架、模式选择菜单
- `style.css`：整体视觉与菜单按钮样式
- `main.js`：入口，绑定菜单与输入，启动循环
- `game.js`：核心调度（场景、渲染、碰撞、震动、提示），按 `state.mode` 调用模式模块
- `core/`：共用模块
  - `constants.js`：颜色/速度/能量等常量
  - `utils.js`：随机、向量、加权选择
  - `particles.js`：粒子生成与更新
- `modes/`：模式逻辑
  - `endless.js`：无尽模式（升级/能量/收集/HUD/玩家绘制）
  - `rogue.js`：试炼模式（道具/敌人/闪现/时间暂停/HUD/玩家绘制）

## ✨ 设计细节
- 霓虹子弹与光晕、敌人受击闪红+短暂减速
- 时间暂停附带金色沙漏动画，结束时屏幕轻微震动
- 帧率无关更新（高刷与低帧设备速度一致）

## 🚀 扩展
- 新模式：在 `modes/` 下新增模块（导出 `initState/resetState/update/drawHUD/drawPlayerAvatar`），在 `main.js` 注册按钮并切换 `state.mode`。
- 共用工具/常量统一放入 `core/`，避免各模式重复代码。
