const DRAMA_SCRIPTS=[
 {schema:'noir.drama/1',title:'五分钟，不谈工作',scene:7,description:'茶水间 / 两个人 / 午后的一个小停顿',cast:[{role:'lan',index:0,start:[-1,3.4],angle:0},{role:'xi',index:1,start:[1,3.4],angle:0}],beats:[
  {type:'camera',roles:['lan','xi'],span:11,yaw:.18,pitch:.50},
  {type:'move',targets:[{role:'lan',place:'tea-one'},{role:'xi',place:'tea-two'}]},
  {type:'camera',roles:['lan','xi'],span:8.7,yaw:.20,pitch:.48},
  {type:'say',role:'lan',to:'xi',pose:'tea',text:'给自己五分钟，不谈工作。',seconds:4.6},
  {type:'say',role:'xi',to:'lan',pose:'tea',text:'那谈什么？',seconds:3.2},
  {type:'say',role:'lan',to:'xi',pose:'talk',text:'谈谈窗外那束光，为什么每天都不一样。',seconds:6},
  {type:'say',role:'xi',to:'lan',pose:'talk',text:'光没变。是我们今天终于抬头了。',seconds:5.6},
  {type:'wait',seconds:1.4},
  {type:'say',role:'lan',pose:'tea',text:'那就再坐一分钟。',seconds:4},
  {type:'say',role:'xi',pose:'tea',text:'这次，不用计时。',seconds:4.2},
  {type:'camera',roles:['lan','xi'],span:13,yaw:-.25,pitch:.62},{type:'wait',seconds:3}
 ]},
 {schema:'noir.drama/1',title:'桥这边，桥那边',scene:8,description:'松风 / 一座桥 / 两个走慢的人',cast:[{role:'lan',index:0,start:[4,4.3],angle:-1.5},{role:'xi',index:1,start:[4,6.7],angle:-1.5}],beats:[
  {type:'camera',roles:['lan','xi'],span:14,yaw:.35,pitch:.47},
  {type:'move',targets:[{role:'lan',x:2.1,z:2.8},{role:'xi',x:2.1,z:4.2}]},
  {type:'camera',roles:['lan','xi'],span:9.4,yaw:.5,pitch:.34},
  {type:'say',role:'lan',to:'xi',pose:'look',text:'走了这么远，还要过桥吗？',seconds:4.8},
  {type:'say',role:'xi',to:'lan',pose:'talk',text:'先听一会儿水声。',seconds:4},
  {type:'say',role:'lan',to:'xi',pose:'talk',text:'水一直在走，我们却站着。',seconds:4.7},
  {type:'say',role:'xi',to:'lan',pose:'point',text:'站着，也能到达一些地方。',seconds:4.8},
  {type:'wait',seconds:1.4},
  {type:'move',targets:[{role:'lan',x:-5.7,z:2.8},{role:'xi',x:-6.0,z:4.4}]},
  {type:'camera',roles:['lan','xi'],span:11,yaw:.4,pitch:.46},
  {type:'say',role:'lan',to:'xi',pose:'talk',text:'现在呢？',seconds:3},
  {type:'say',role:'xi',to:'lan',pose:'wave',text:'换一边，继续听。',seconds:4.2},{type:'wait',seconds:2}
 ]},
 {schema:'noir.drama/1',title:'没有写在地图上',scene:9,description:'院落 / 门与方向 / 不急着抵达',cast:[{role:'lan',index:0,start:[-1,14.4],angle:Math.PI},{role:'xi',index:1,start:[1,14.4],angle:Math.PI}],beats:[
  {type:'camera',roles:['lan','xi'],span:12,yaw:.20,pitch:.55},
  {type:'say',role:'lan',to:'xi',pose:'talk',text:'地图说，穿过这道门就到了。',seconds:5},
  {type:'say',role:'xi',to:'lan',pose:'point',text:'到了哪里？',seconds:3.3},
  {type:'move',targets:[{role:'lan',x:-1.0,z:10.8},{role:'xi',x:1.0,z:10.8}]},
  {type:'camera',roles:['lan','xi'],span:10,yaw:.4,pitch:.42},
  {type:'say',role:'lan',to:'xi',pose:'look',text:'另一座院子。还有另一道门。',seconds:5},
  {type:'say',role:'xi',to:'lan',pose:'talk',text:'那今天就不找终点了。',seconds:4.6},
  {type:'say',role:'lan',to:'xi',pose:'talk',text:'找什么？',seconds:3},
  {type:'say',role:'xi',to:'lan',pose:'wave',text:'一个能坐下来，慢慢喝茶的地方。',seconds:5.7},
  {type:'camera',roles:['lan','xi'],span:18,yaw:-.35,pitch:.60},{type:'wait',seconds:3}
 ]},
 {schema:'noir.drama/1',title:'影子先到了',scene:5,description:'抽象黑白 / 一点颜色 / 在光下相遇',cast:[{role:'lan',index:0,start:[-1.1,5],angle:1.5},{role:'xi',index:1,start:[1.1,5],angle:-1.5}],beats:[
  {type:'camera',roles:['lan','xi'],span:10,yaw:0,pitch:.20},
  {type:'say',role:'lan',to:'xi',pose:'point',text:'看，你的影子比你先到了。',seconds:4.5},
  {type:'say',role:'xi',to:'lan',pose:'look',text:'它总是比较着急。',seconds:4},
  {type:'say',role:'lan',to:'xi',pose:'talk',text:'你呢？',seconds:3},
  {type:'say',role:'xi',to:'lan',pose:'open',text:'我想等这束光，慢一点。',seconds:5},
  {type:'flight',roles:['lan','xi'],height:2.5},{type:'wait',seconds:2.7},
  {type:'camera',roles:['lan','xi'],span:14,yaw:.4,pitch:.26},
  {type:'say',role:'lan',to:'xi',pose:'open',text:'那我们先不落地。',seconds:4.2},
  {type:'say',role:'xi',to:'lan',pose:'wave',text:'好。让故事悬在这里。',seconds:5},
  {type:'camera',roles:['lan','xi'],span:28,yaw:.12,pitch:.24},{type:'wait',seconds:3}
 ]}
];
function validateDrama(input){
 const s=typeof input==='string'?JSON.parse(input):JSON.parse(JSON.stringify(input));
 const fail=msg=>{throw new Error('短剧格式：'+msg);};
 const scan=(v,d=0)=>{if(d>10)fail('嵌套过深');if(typeof v==='number'&&!Number.isFinite(v))fail('需要有限数值');if(v&&typeof v==='object')for(const [k,x]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))fail('禁止危险字段');scan(x,d+1);}};scan(s);
 if(!s||s.schema!=='noir.drama/1'||!Number.isInteger(s.scene)||s.scene<0||s.scene>9)fail('场景须为 0–9');
 if(typeof s.title!=='string'||!s.title.trim()||s.title.length>50)fail('标题须为 1–50 字');
 if(!Array.isArray(s.cast)||s.cast.length<1||s.cast.length>10||!Array.isArray(s.beats)||s.beats.length<1||s.beats.length>80)fail('角色或分段数量超限');
 const roles=new Set(),indices=new Set(),finite=x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<150;
 for(const a of s.cast){if(typeof a.role!=='string'||!/^[a-zA-Z][\w-]{0,23}$/.test(a.role)||roles.has(a.role)||!Number.isInteger(a.index)||a.index<0||a.index>9||indices.has(a.index))fail('角色标识/序号无效或重复');roles.add(a.role);indices.add(a.index);if(a.start&&(!Array.isArray(a.start)||a.start.length!==2||!a.start.every(finite)))fail('起点须为两维米制坐标');if(a.angle!==undefined&&!finite(a.angle))fail('朝向无效');}
 const role=r=>{if(!roles.has(r))fail('引用了不存在的角色 '+r);};
 let seconds=0;for(const b of s.beats){if(!['camera','move','say','pose','wait','flight'].includes(b.type))fail('未知分段类型');if(b.seconds!==undefined&&(!finite(b.seconds)||b.seconds<.2||b.seconds>35))fail('时长应为 .2–35 秒');seconds+=b.seconds||8;
 if(b.type==='say'){role(b.role);if(b.to)role(b.to);if(typeof b.text!=='string'||!b.text.trim()||Array.from(b.text).length>140)fail('每句对白 1–140 字');if(b.pose&&!Object.hasOwn(labels,b.pose))fail('动作不存在');}
 if(b.type==='pose'){role(b.role);if(!Object.hasOwn(labels,b.pose))fail('动作不存在');}
 if(b.type==='camera'||b.type==='flight'){if(!Array.isArray(b.roles)||!b.roles.length)fail('需要镜头/飞行角色');b.roles.forEach(role);if(b.type==='camera'){for(const k of ['yaw','pitch','span'])if(b[k]!==undefined&&!finite(b[k]))fail('镜头参数无效');if(b.span!==undefined&&(b.span<3||b.span>80))fail('构图跨度须为 3–80 米');}else if(!finite(b.height)||b.height<.5||b.height>40)fail('飞行高度须为 .5–40 米');}
 if(b.type==='move'){if(!Array.isArray(b.targets)||!b.targets.length||b.targets.length>10)fail('需要移动目标');const seen=new Set();for(const t of b.targets){role(t.role);if(seen.has(t.role))fail('同一移动分段中角色不能重复');seen.add(t.role);if(t.place!==undefined){if(typeof t.place!=='string'||t.place.length>80)fail('地点标识无效');}else if(!finite(t.x)||!finite(t.z))fail('移动坐标无效');}}
 }if(seconds>900)fail('短剧过长');return s;
}
