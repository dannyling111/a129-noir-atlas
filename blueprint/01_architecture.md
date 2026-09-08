# 模块与边界

Renderer → 真 WebGL2 网格、深度、阴影与后处理。
CameraRig → 透视/正交、旋转、平移、缩放、人物跟随；只变换相机，不缩放画布位图。
Figure / Motion / Cast → 原成人 IK 人体 + 彩色上衣与帽子；头部世界坐标导出给字幕锚点。
Scene / World / Nav / Living → 原十场景与地面路线、座位活动、社交。
Dialogue → 屏幕空间可读字幕、逐字显示、设备朗读、对白记录；不执行文本。
Theatre → 有限状态调度 camera/move/say/pose/wait/flight；手动输入可接管，移动失败则停止，不瞬移掩盖路线问题。
Director → 原镜头 JSON，增加 cameraRig 与人物外观/对白状态。

原图形资产没有扁平贴图背景，也没有外部 CDN/模型依赖。
