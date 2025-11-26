https://hua-cishu.github.io/pygame/
Neon Harvest Web

玩法：WASD/方向键移动，空格/左键射击，P暂停，R重开；试炼模式有闪现（F），道具：无敌猛袭、散射+1、加命、环绕子弹、反弹、闪现充能、时间暂停、永久攻击+1。
模式：
无尽模式：有能量/升级/收集物，武器随等级进化。
试炼模式：无基础积分豆，专属道具与散射成长，敌人/血量随时间增强，可选难度（简单/标准/艰难）。
项目结构（关键文件）：
index.html：页面骨架与模式选择菜单。
style.css：样式与菜单按钮布局。
main.js：入口，绑定菜单按钮与输入事件，启动循环。
game.js：核心调度（场景/渲染/碰撞/震动/提示等），根据 state.mode 调用模式模块。
core/constants.js：颜色、基础速度/能量等常量。
core/utils.js：随机、加权选择、向量工具。
core/particles.js：粒子生成与更新。
modes/endless.js：无尽模式逻辑、HUD、玩家外观。
modes/rogue.js：试炼模式逻辑（道具/敌人/闪现/时间暂停等）、HUD、玩家外观。
本地运行：使用任意静态服务器或直接双击 index.html（若浏览器阻止本地模块，可用 python -m http.server 后访问 http://localhost:8000）。
文件加载：使用 ES modules；index.html 已通过 <script type="module" src="main.js"></script> 入口加载其他模块。
开发提示：新增模式时在 modes/ 下添加模块并在 main.js 注册按钮；共用工具请放入 core/。
