# noir.drama/1

顶层：schema、title（1–50字）、scene（0–9）、cast（1–10人）、beats（1–80段）。
每个 cast：role（英文字母开头标识）、index（场景人物序号0–9）、可选 start:[x,z] 与 angle（弧度）。
移动坐标为世界米制 X/Z；高度遵循场景地面。角色名字、衣服在「角色」面板编辑。

beats 类型：

camera：roles、span（3–80米构图跨度）、yaw/pitch（弧度）。
move：targets:[{role,x,z}] 或 [{role,place}]，后者使用场景座位/地点标识。等所有目标到达；最多48秒失败停止。
say：role、可选 to、text（1–140字）、pose、seconds。
pose：role、pose、seconds。
wait：seconds。
flight：roles、height（0.5–40米相对地面）、seconds，持续悬空不会自动落地。

所有动作标识来自 `src/app.js` labels。示例是可直接导入的完整 JSON。
校验拒绝未知角色/动作、重复人物索引、非法坐标、危险字段、超限内容。剧本不是 JavaScript，不使用 eval。
摄像机位置会平滑靠近构图中心，但示例镜头角度切换不是完整电影轨道曲线编辑器。
