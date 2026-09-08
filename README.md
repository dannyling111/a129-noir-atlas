# NOIR ATLAS 5.4 · 清爽彩色 / 纯净黑白

A129 独立仓库网页：十个真实 3D 场景、男女两副成人体型、动作库 73 项对照、自由镜头、清爽彩色贴图与纯净黑白随时切换。

## 线上地址

- 首页：https://dannyling111.github.io/a129-noir-atlas/
- 仓库：https://github.com/dannyling111/a129-noir-atlas
- 动作库对照：https://dannyling111.github.io/A129/actlib/

纯静态单文件，无 CDN、无外部模型、无 Three.js。用支持 WebGL2 的浏览器打开即可。头部不画五官。

## 5.4 新增

- 女性是另一副成人骨架（窄肩、细腰、宽髋、胸型），不是把男人缩小
- 12 张动作库人物卡：发型、发色、裙装 / 罩衫 / 外套
- 「更多动作」对标动作库 73 项（绿原样 / 蓝接近 / 黄替代）

## 怎么玩

点地行走；拖空白旋转；滚轮或双指缩放；左下摇杆移动。页眉可切 **黑白 / 彩色 / 配色**。点「角色」换人换装；点「更多动作」打开动作库。

## 本地

打开 `index.html`，或：

```sh
python3 -m http.server 8080
```

源码在 `src/`，`python build.py` 可重新打包单文件。
