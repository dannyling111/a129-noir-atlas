# 纯净渲染契约

默认：renderStyle=clean, grain=0, haze=0, contrast=1, exposure=1。

材质：shade/tint 为每个物体恒定值，曲面法线与光源负责明暗。旧 surface 编号保留为源代码兼容数据，但不再对应随机墨纹、水纹等着色分支。

后处理：无照片纹理、无屏幕噪声、无随机光束采样、无纸张乘色、无暗角、无胶片辉光。空间雾只能由用户主动打开；不改变其余默认契约。

序列化：grain 字段与隐藏 input 仅为 v2–v5 镜头兼容保留。cleanRenderSettings 在旧镜头回放入口迁移视觉设置；没有 renderStyle=clean 的旧镜头将 haze/contrast 重置到纯净值。新镜头主动设置的空间雾可保留。

抗锯齿：主场景用支持的离屏 MSAA 采样数绘制，同时 resolve 颜色/深度供后处理。无多重采样时使用轻量确定性边缘滤波。阴影深度偏移仅在阴影阶段开启、之后关闭。

验收：tests/test_clean_render.py；tests/test_browser.py；tests/test_motion.js。
