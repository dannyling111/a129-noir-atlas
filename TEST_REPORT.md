# NOIR ATLAS 5.3 · 本轮测试回执

最终 **149 项通过 / 0 项失败**。这不是移动真机性能或所有 GPU 上无瑕疵的保证。

输入：对话提供的 `NOIR_ATLAS_v5_2.html` 和工程 ZIP；输出同一项目的双模式材质升级。

## 最终执行结果

| 检查组 | 通过 | 失败 | 原始结果 |
|---|---:|---:|---|
| 原有功能集成回归 | 47 | 0 | `evidence-v53/browser-results.json` |
| 纯净黑白渲染 | 30 | 0 | `evidence-v53/clean-render-results.json` |
| 动作与骨架 | 17 | 0 | `evidence-v53/motion-results.json` |
| 地面/阴影稳定性（含负对照） | 15 | 0 | `evidence-v53/depth-stability-results.json` |
| 彩色材质、菜单与兼容性 | 40 | 0 | `evidence-v53/material-results.json` |

## 新增功能的可核对证据

八层真实栅格纹理均存在不同像素值，纹理数组为 256×256×8，9 级 mip 链，线性过滤与可用时的各向异性过滤。切换模式改变真实 WebGL 像素，而不仅是按钮状态；冻结画面彩色→黑白→彩色回到相同像素哈希。严格黑白关闭点缀后彩色像素为零。纹理强度零真正关闭纹理效果；饱和度零环境无残留彩色像素。

切换时人物、镜头、时间、设置及场景几何数组保持不变；短剧中的当前台词和进度不重置。录制配色可恢复，手动覆盖回放有效。三个预设、独立选色、实际 JSON 下载及上传恢复通过。

十个场景分别在两种模式、三组旋转/缩放下渲染，共 60 组完整视图，GL 错误为零。办公楼与庭院地面分区保持无重叠、无重复底座顶面。另运行旧版 5.1 负对照和新版 72 组地面抽样：旧版检出 204008 个错误样本，新版错误样本为零。该数量仅指本测试抽样，不代表整幅画面所有像素或所有观察角度。方向光矩阵保持固定；原有 96 组双投影旋转/缩放测试继续通过。

四段短剧均完成；人物飞行持续 120 秒模拟时间不落地。原生双指缩放、摇杆与升降并用、松手停止输入通过。材质菜单在 390×844、768×900、844×390 三种布局中可到达，页面无横向溢出，面板内容超出时内部滚动。

## 实际画面

`evidence-v53/colour-mode-comparison.jpg`：同镜头、同人物状态的黑白/彩色真实浏览器截图；`office-colour.png`：办公楼；`mobile-material-menu.png`：手机触控模拟菜单；`original-material-maps.png`：GPU 使用的原创栅格纹理 R 通道展示，不是效果图或运行依赖。

## 调试记录与边界

首次新测试发现饱和度零时环境光仍有蓝色分量，已在最终着色阶段修正并重跑通过。并发软件渲染曾导致旧回归启动超时，最终使用足够加载等待完整跑完 47 项，未跳过手机检查。初始记录在 `evidence-v53/diagnostics/`，不计入最终通过数。

环境为 Chromium + WebGL2 / ANGLE SwiftShader + Xvfb。浏览器策略阻止文件和站点 URL 导航，未修改或绕过策略；使用内存 HTML 并禁止外部请求。导出/导入是真实浏览器文件动作；存储读写契约使用显式注入 Storage 适配器复建应用测试，**不声称已验证原生磁盘持久化**。禁止存储的异常分支也已通过。

尚未在用户 Android 真机验证帧率、显卡差异、触感及下载文件来源下的存储行为；没有可听语音质量测试。动画仍是程序化骨架，不是真人动捕。贴图是原创程序化栅格而非照片扫描；光照不是完整物理 PBR。

GitHub 插件本轮检索 `installed=false`；未推送 A129，未做线上 Pages 验收。

## 全部检查项

### 原有功能集成回归

1. PASS — Real WebGL2 boot and linked shader programs
2. PASS — No duplicated HTML ids
3. PASS — Scene 0: perspective geometry, orbital view and GL error-free draw
4. PASS — Scene 1: perspective geometry, orbital view and GL error-free draw
5. PASS — Scene 2: perspective geometry, orbital view and GL error-free draw
6. PASS — Scene 3: perspective geometry, orbital view and GL error-free draw
7. PASS — Scene 4: perspective geometry, orbital view and GL error-free draw
8. PASS — Scene 5: perspective geometry, orbital view and GL error-free draw
9. PASS — Scene 6: perspective geometry, orbital view and GL error-free draw
10. PASS — Scene 7: perspective geometry, orbital view and GL error-free draw
11. PASS — Scene 8: perspective geometry, orbital view and GL error-free draw
12. PASS — Scene 9: perspective geometry, orbital view and GL error-free draw
13. PASS — All 23 poses, five hat choices and every actor mesh have finite matrices
14. PASS — Camera uses perspective division, orthographic is separately selectable
15. PASS — Zoom has bounded real-camera range .35 to 12
16. PASS — Ground picking is inverse of perspective projection
17. PASS — Right-drag changes camera yaw, not actor position
18. PASS — Left-drag on empty artwork rotates camera
19. PASS — Mouse wheel increases camera zoom
20. PASS — Click on perspective ground walks the character, not the camera
21. PASS — Pause freezes the scene clock during real browser frames
22. PASS — Head bubble follows animated 3D head with constant readable screen font
23. PASS — Dialogue HTML is escaped, not executed
24. PASS — Speech stays visible in immersive mode, UI does not
25. PASS — Visible controls change name, hat, garment and colour
26. PASS — Character identity survives changing scenes
27. PASS — Hat is attached to rotating 3D head, not a screen sticker
28. PASS — Voice defaults off; missing Chinese voice does not break text
29. PASS — Record/replay roundtrip preserves free camera, costume and speech
30. PASS — Existing v2 shot imports and renders
31. PASS — Four included scripts pass validation
32. PASS — Bad roles, bad coordinates, oversized text, unknown poses rejected
33. PASS — Prototype pollution field is rejected
34. PASS — Drama 0: complete navigation, ordered lines and only the main speaker visible
35. PASS — Drama 1: complete navigation, ordered lines and only the main speaker visible
36. PASS — Drama 2: complete navigation, ordered lines and only the main speaker visible
37. PASS — Drama 3: complete navigation, ordered lines and only the main speaker visible
38. PASS — Keyboard takeover stops a running drama
39. PASS — Flight stays airborne during 120 seconds of simulation
40. PASS — Mobile controls fit width without horizontal page overflow
41. PASS — Native two-finger pinch changes zoom without a stuck actor drag
42. PASS — Flight ascent is beside left thumb, small visible key
43. PASS — Native two-finger joystick plus ascent work together
44. PASS — Releasing fingers clears both inputs, preserves flight
45. PASS — Mobile closeup yields readable body and 14px bubble
46. PASS — Portrait/landscape resizing preserves valid camera and WebGL
47. PASS — No uncaught browser JavaScript errors

### 纯净黑白渲染

1. PASS — First boot really defaults to grain=0, haze=0, contrast=1 (no harness override)
2. PASS — Offscreen multisample target is complete; no WebGL error
3. PASS — GPU colour dithering is off; polygon offset is not leaked into main pass
4. PASS — No photographic fullscreen gradient layers remain
5. PASS — Grain slider is not visible or keyboard-focusable; fog control starts at zero
6. PASS — Visible reset button restores pure defaults without moving the camera
7. PASS — Scene 0: clean defaults survive switching, neutral paper, zoom/orbit renders
8. PASS — Scene 1: clean defaults survive switching, neutral paper, zoom/orbit renders
9. PASS — Scene 2: clean defaults survive switching, neutral paper, zoom/orbit renders
10. PASS — Scene 3: clean defaults survive switching, neutral paper, zoom/orbit renders
11. PASS — Scene 4: clean defaults survive switching, neutral paper, zoom/orbit renders
12. PASS — Scene 5: clean defaults survive switching, neutral paper, zoom/orbit renders
13. PASS — Scene 6: clean defaults survive switching, neutral paper, zoom/orbit renders
14. PASS — Scene 7: clean defaults survive switching, neutral paper, zoom/orbit renders
15. PASS — Scene 8: clean defaults survive switching, neutral paper, zoom/orbit renders
16. PASS — Scene 9: clean defaults survive switching, neutral paper, zoom/orbit renders
17. PASS — Five old surface types render identically: no mountain ink or water brightness stripes
18. PASS — Static geometry at different times has identical pixels, even with legacy grain=.4
19. PASS — Legacy sepia paper settings cannot tint clean geometry
20. PASS — Unoccluded flat surface has no speckles or black/white self-shadow stripes
21. PASS — Opt-in spatial fog has no temporal grain or moving random pattern
22. PASS — v2 shot with film settings imports and seeks in clean style
23. PASS — A new clean shot can intentionally retain opt-in spatial fog
24. PASS — No film-noise or ink-noise GLSL remains compiled in either fragment program
25. PASS — Coloured wardrobe and props still produce non-gray scene pixels
26. PASS — Head-top dialogue remains visible with clean renderer
27. PASS — Mobile boots clean and fits viewport without horizontal scroll
28. PASS — Native pinch zoom retains clean defaults and valid GL frame
29. PASS — Rotating mobile viewport rebuilds MSAA attachments without GL errors
30. PASS — No uncaught JavaScript errors in clean-render suite

### 动作与骨架

1. PASS — walk: planted foot travels backward locally
2. PASS — walk: lifted foot swings forward
3. PASS — walk: straight-line contact foot is world-locked
4. PASS — walk: phase is frame-rate independent
5. PASS — run: planted foot travels backward locally
6. PASS — run: lifted foot swings forward
7. PASS — run: straight-line contact foot is world-locked
8. PASS — run: phase is frame-rate independent
9. PASS — All 18 poses × ground/air × 4 timestamps render finite matrices
10. PASS — All gesture bone lengths remain fixed
11. PASS — Airborne moving figure is never a grounded gait
12. PASS — Pose transition starts continuously
13. PASS — walk: continuous foot velocity across contact boundaries
14. PASS — walk: upper arm opposes same-side leg, elbow follows an arc
15. PASS — run: continuous foot velocity across contact boundaries
16. PASS — run: upper arm opposes same-side leg, elbow follows an arc
17. PASS — Wave envelope is continuous through lift, waves and lowering

### 地面/阴影稳定性（含负对照）

1. PASS — Negative control: original scene 7 reproduces incorrect ground pixels with shadows OFF
2. PASS — Negative control: original scene 9 reproduces incorrect ground pixels with shadows OFF
3. PASS — Scene 7: ground materials correct through 36 orbit/zoom views
4. PASS — Scene 7: camera movement does not change directional shadow matrix
5. PASS — Scene 7: all 36 diagnostic draws are GL-error-free
6. PASS — Scene 9: ground materials correct through 36 orbit/zoom views
7. PASS — Scene 9: camera movement does not change directional shadow matrix
8. PASS — Scene 9: all 36 diagnostic draws are GL-error-free
9. PASS — Scene 7: cap partition has no overlap or gaps; structural slab has no duplicate top
10. PASS — Scene 9: cap partition has no overlap or gaps; structural slab has no duplicate top
11. PASS — Depth textures explicitly use highp samplers in surface and atmosphere programs
12. PASS — 96 full-scene views: wide/close zoom and 360° orbit in BOTH 3D projections
13. PASS — Final renderer still casts real building/person shadows; not a shadows-off workaround
14. PASS — Repeated frozen render is byte-identical (no added dithering or random jitter)
15. PASS — No uncaught JavaScript errors in regression or negative control

### 彩色材质、菜单与兼容性

1. PASS — Fresh profile defaults to colour; film grain and fog still default OFF
2. PASS — Eight actual raster texture layers; complete nine-level mip chain and linear filtering
3. PASS — Texture layers contain different real values (not eight copies of a flat tint)
4. PASS — Wall, floor, wood, metal, books and plant batches keep distinct material identities
5. PASS — Visible mode buttons preserve actor state, camera, timeline, settings and identical geometry array
6. PASS — Colour changes actual WebGL pixels; colour → mono → colour roundtrip is byte-identical
7. PASS — Strict monochrome checkbox also removes character and prop colour
8. PASS — Colour panel opens and has unique, labelled UI controls
9. PASS — All three visible palette presets give different rendered colour
10. PASS — Custom wood picker alters wood colour without recolouring walls or moving geometry
11. PASS — Texture-strength zero really disables surface texture sampling effect
12. PASS — Saturation control affects environment only; untextured props retain role colours
13. PASS — Frozen scene/material renders are byte-identical; no temporal material noise
14. PASS — Scene 0: both modes at three zoom/orbit views; same shadow matrix and all material IDs
15. PASS — Scene 1: both modes at three zoom/orbit views; same shadow matrix and all material IDs
16. PASS — Scene 2: both modes at three zoom/orbit views; same shadow matrix and all material IDs
17. PASS — Scene 3: both modes at three zoom/orbit views; same shadow matrix and all material IDs
18. PASS — Scene 4: both modes at three zoom/orbit views; same shadow matrix and all material IDs
19. PASS — Scene 5: both modes at three zoom/orbit views; same shadow matrix and all material IDs
20. PASS — Scene 6: both modes at three zoom/orbit views; same shadow matrix and all material IDs
21. PASS — Scene 7: both modes at three zoom/orbit views; same shadow matrix and all material IDs
22. PASS — Scene 8: both modes at three zoom/orbit views; same shadow matrix and all material IDs
23. PASS — Scene 9: both modes at three zoom/orbit views; same shadow matrix and all material IDs
24. PASS — Fragment shader uses explicit derivative texture lookup, not a screen-space overlay
25. PASS — Court and office partition still have no overlapping caps or duplicate slab top
26. PASS — Mode switch during short play preserves speaker, speech, current beat and actors
27. PASS — Record and seek restores the palette, texture strength and material colours
28. PASS — Manual mode override remains selectable during recorded camera playback
29. PASS — Style validator rejects invalid format/colours; clamps finite sliders safely
30. PASS — Storage API contract: custom material settings restore on new app boot (injected adapter, not native disk persistence)
31. PASS — Visible export action produces a valid palette JSON file
32. PASS — Actual file upload restores the exported look
33. PASS — Blocked storage does not prevent boot, palette changes or rendering
34. PASS — No external texture/model requests or dependency scripts
35. PASS — Material menu fits and header buttons are reachable at 390×844
36. PASS — Material menu fits and header buttons are reachable at 768×900
37. PASS — Material menu fits and header buttons are reachable at 844×390
38. PASS — Native mobile taps switch modes without leaving pointer/flight inputs stuck
39. PASS — Escape closes the material panel and updates expanded state
40. PASS — No uncaught browser exceptions in colour/material tests
