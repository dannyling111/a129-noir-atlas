// Actlib roster + body dimorphism. Faceless NOIR figures; gender is silhouette.
const BODY_MALE = {id:'male',zh:'男',height:1,hipWidth:1,shoulderWidth:1,torsoX:1,torsoY:1,torsoZ:1,waist:1,chest:0,limb:1,hand:1,foot:1,neck:1,head:1};
const BODY_FEMALE = {id:'female',zh:'女',height:.97,hipWidth:1.04,shoulderWidth:.88,torsoX:.96,torsoY:1,torsoZ:.97,waist:.90,chest:1,limb:.97,hand:.94,foot:.92,neck:1.12,head:.98};
const BODIES = {male:BODY_MALE,female:BODY_FEMALE};
const HAIRS = ['none','crop','short','bob','long','bun','ponytail','braid'];
const HAIR_NAMES = {none:'光头',crop:'寸发',short:'短发',bob:'齐耳',long:'长发',bun:'发髻',ponytail:'马尾',braid:'辫子'};
const HAIR_COLOURS = [
 {name:'墨黑',hex:'#1c1814',rgb:[.11,.09,.08]},
 {name:'茶褐',hex:'#4a3428',rgb:[.29,.20,.16]},
 {name:'栗红',hex:'#6e322c',rgb:[.43,.20,.17]},
 {name:'浅金',hex:'#c4a574',rgb:[.77,.65,.45]},
 {name:'青灰',hex:'#6b6e72',rgb:[.42,.43,.45]},
 {name:'夜棕',hex:'#2a1c14',rgb:[.16,.11,.08]}
];
const OUTFITS = ['vest','sleeves','blouse','skirt','dress','coat'];
const OUTFIT_NAMES = {vest:'彩色背心 · 黑袖',sleeves:'彩色长袖',blouse:'短袖罩衫',skirt:'短裙',dress:'连衣长裙',coat:'长外套'};
const CAST_ROSTER = [
 {id:'alan',name:'阿岚',body:'male',hair:'short',hat:'beret',outfit:'sleeves',colour:0,hairColour:0,note:'动作库·方块人短发男'},
 {id:'xiaoxi',name:'小汐',body:'female',hair:'long',hat:'none',outfit:'skirt',colour:1,hairColour:1,note:'动作库·长发短裙女'},
 {id:'amo',name:'阿墨',body:'male',hair:'crop',hat:'cap',outfit:'vest',colour:2,hairColour:0,note:'动作库·寸发背心男'},
 {id:'zhixia',name:'知夏',body:'female',hair:'bob',hat:'none',outfit:'blouse',colour:3,hairColour:2,note:'动作库·齐耳罩衫女'},
 {id:'qinghe',name:'青禾',body:'female',hair:'braid',hat:'none',outfit:'skirt',colour:4,hairColour:1,note:'动作库·辫子短裙女'},
 {id:'bailu',name:'白露',body:'female',hair:'bun',hat:'none',outfit:'coat',colour:5,hairColour:4,note:'动作库·发髻外套女'},
 {id:'nanxing',name:'南星',body:'male',hair:'short',hat:'none',outfit:'coat',colour:1,hairColour:5,note:'动作库·短发外套男'},
 {id:'wenchuan',name:'闻川',body:'female',hair:'ponytail',hat:'none',outfit:'sleeves',colour:0,hairColour:2,note:'动作库·马尾长袖女'},
 {id:'chujiu',name:'初九',body:'female',hair:'long',hat:'brim',outfit:'dress',colour:2,hairColour:3,note:'动作库·长发长裙女'},
 {id:'luosheng',name:'洛生',body:'male',hair:'short',hat:'beanie',outfit:'sleeves',colour:4,hairColour:0,note:'动作库·针织帽男'},
 {id:'linwan',name:'林晚',body:'female',hair:'bob',hat:'beret',outfit:'coat',colour:5,hairColour:0,note:'动作库·贝雷齐耳女'},
 {id:'gushen',name:'顾深',body:'male',hair:'none',hat:'brim',outfit:'coat',colour:3,hairColour:4,note:'动作库·宽檐光头男'}
];
const ACTLIB_CAT_ZH = {posture:'姿态',gesture:'手势',loco:'位移',react:'反应',combat:'战斗',special:'超能力',object:'物体互动'};
const ACTLIB_ACTS = [
 {id:'stand',zh:'站立',cat:'posture',pose:'idle',fid:'exact'},
 {id:'stand_easy',zh:'稍息',cat:'posture',pose:'idle',fid:'near'},
 {id:'arms_crossed',zh:'抱臂',cat:'posture',pose:'arms_crossed',fid:'exact'},
 {id:'hands_pocket',zh:'插兜',cat:'posture',pose:'hands_pocket',fid:'exact'},
 {id:'hug_self',zh:'抱住自己',cat:'posture',pose:'hug_self',fid:'exact'},
 {id:'sit',zh:'坐下',cat:'posture',pose:'sit',fid:'exact'},
 {id:'crouch',zh:'蹲下',cat:'posture',pose:'crouch',fid:'exact'},
 {id:'bow',zh:'鞠躬',cat:'posture',pose:'bow',fid:'exact'},
 {id:'turn_away',zh:'背过身',cat:'posture',pose:'turn',fid:'near'},
 {id:'sleep',zh:'睡',cat:'posture',pose:'lie',fid:'near'},
 {id:'talk',zh:'说话',cat:'posture',pose:'talk',fid:'exact'},
 {id:'listen',zh:'倾听',cat:'posture',pose:'listen',fid:'exact'},
 {id:'kneel',zh:'跪下',cat:'posture',pose:'kneel',fid:'exact'},
 {id:'lie',zh:'躺下',cat:'posture',pose:'lie',fid:'exact'},
 {id:'stretch',zh:'伸懒腰',cat:'posture',pose:'stretch',fid:'exact'},
 {id:'flop',zh:'瘫倒',cat:'posture',pose:'lie',fid:'near'},
 {id:'shrug',zh:'耸肩',cat:'gesture',pose:'shrug',fid:'exact'},
 {id:'wave',zh:'挥手',cat:'gesture',pose:'wave',fid:'exact'},
 {id:'point',zh:'指向',cat:'gesture',pose:'point',fid:'exact'},
 {id:'reach',zh:'伸手',cat:'gesture',pose:'reach',fid:'exact'},
 {id:'raise',zh:'举手',cat:'gesture',pose:'raise',fid:'exact'},
 {id:'hold_out',zh:'递东西',cat:'gesture',pose:'hold',fid:'near'},
 {id:'cheer',zh:'欢呼',cat:'gesture',pose:'cheer',fid:'exact'},
 {id:'call',zh:'招手叫人',cat:'gesture',pose:'wave',fid:'near'},
 {id:'hug',zh:'拥抱',cat:'gesture',pose:'open',fid:'near'},
 {id:'shake',zh:'握手',cat:'gesture',pose:'hold',fid:'sub'},
 {id:'carry',zh:'搬东西',cat:'gesture',pose:'carry',fid:'exact'},
 {id:'work',zh:'干活',cat:'gesture',pose:'work',fid:'exact'},
 {id:'cover_face',zh:'掩面',cat:'gesture',pose:'facepalm',fid:'near'},
 {id:'facepalm',zh:'扶额',cat:'gesture',pose:'facepalm',fid:'exact'},
 {id:'clap',zh:'鼓掌',cat:'gesture',pose:'clap',fid:'exact'},
 {id:'nod',zh:'点头',cat:'gesture',pose:'nod',fid:'exact'},
 {id:'shake_head',zh:'摇头',cat:'gesture',pose:'shake_head',fid:'exact'},
 {id:'shrug_big',zh:'摊手',cat:'gesture',pose:'open',fid:'near'},
 {id:'scratch_head',zh:'挠头',cat:'gesture',pose:'think',fid:'near'},
 {id:'selfie',zh:'自拍',cat:'gesture',pose:'selfie',fid:'exact'},
 {id:'walk',zh:'走',cat:'loco',pose:'walk',fid:'exact'},
 {id:'run',zh:'跑',cat:'loco',pose:'run',fid:'exact'},
 {id:'sprint',zh:'冲刺',cat:'loco',pose:'run',fid:'near'},
 {id:'jump',zh:'跳',cat:'loco',pose:'idle',fid:'sub'},
 {id:'spin',zh:'转圈',cat:'loco',pose:'turn',fid:'near'},
 {id:'dance',zh:'跳舞',cat:'loco',pose:'dance',fid:'exact'},
 {id:'fly',zh:'飞行',cat:'loco',pose:'float',fid:'exact'},
 {id:'hover',zh:'悬停',cat:'loco',pose:'float',fid:'near'},
 {id:'land',zh:'落地',cat:'loco',pose:'idle',fid:'sub'},
 {id:'climb',zh:'攀爬',cat:'loco',pose:'reach',fid:'sub'},
 {id:'head_down',zh:'低头',cat:'react',pose:'listen',fid:'near'},
 {id:'look_up',zh:'抬头',cat:'react',pose:'look',fid:'near'},
 {id:'slump',zh:'垮肩',cat:'react',pose:'hug_self',fid:'near'},
 {id:'hurt',zh:'受伤',cat:'react',pose:'crouch',fid:'sub'},
 {id:'knockback',zh:'击退',cat:'react',pose:'open',fid:'sub'},
 {id:'stomp',zh:'跳脚',cat:'react',pose:'cheer',fid:'sub'},
 {id:'guard',zh:'戒备',cat:'combat',pose:'arms_crossed',fid:'near'},
 {id:'stance',zh:'起势',cat:'combat',pose:'idle',fid:'sub'},
 {id:'punch',zh:'出拳',cat:'combat',pose:'punch',fid:'exact'},
 {id:'kick',zh:'踢腿',cat:'combat',pose:'kick',fid:'exact'},
 {id:'spinkick',zh:'回旋踢',cat:'combat',pose:'kick',fid:'near'},
 {id:'block',zh:'格挡',cat:'combat',pose:'arms_crossed',fid:'sub'},
 {id:'dodge',zh:'闪避',cat:'combat',pose:'crouch',fid:'near'},
 {id:'charge',zh:'蓄力',cat:'combat',pose:'stretch',fid:'sub'},
 {id:'powerup',zh:'爆气',cat:'special',pose:'open',fid:'sub'},
 {id:'beam',zh:'发射光波',cat:'special',pose:'point',fid:'sub'},
 {id:'shield',zh:'护盾',cat:'special',pose:'open',fid:'sub'},
 {id:'hammer',zh:'抡锤',cat:'special',pose:'cheer',fid:'sub'},
 {id:'web',zh:'发射丝线',cat:'special',pose:'point',fid:'sub'},
 {id:'drink',zh:'喝水',cat:'object',pose:'tea',fid:'exact'},
 {id:'read',zh:'阅读',cat:'object',pose:'read',fid:'exact'},
 {id:'write',zh:'书写',cat:'object',pose:'work',fid:'near'},
 {id:'throw',zh:'投掷',cat:'object',pose:'reach',fid:'near'},
 {id:'hold',zh:'举着',cat:'object',pose:'hold',fid:'exact'},
 {id:'push',zh:'推',cat:'object',pose:'hold',fid:'near'},
 {id:'give',zh:'递给',cat:'object',pose:'hold',fid:'near'},
 {id:'phone',zh:'打电话',cat:'object',pose:'phone',fid:'exact'}
];
function bodyOf(a){return BODIES[appearanceOf(a).body]||BODY_MALE;}
function hairColourOf(a){return HAIR_COLOURS[appearanceOf(a).hairColour]||HAIR_COLOURS[0];}
function rig(a){
 const b=bodyOf(a);
 return {height:b.height,hip:.088*b.hipWidth,shoulder:.181*b.shoulderWidth,upperLeg:.43*b.limb,lowerLeg:.42*b.limb,upperArm:.305*b.limb,lowerArm:.255*b.limb,torsoX:b.torsoX,torsoY:b.torsoY,torsoZ:b.torsoZ,chest:b.chest,waist:b.waist,hand:b.hand,foot:b.foot,neck:b.neck,head:b.head,body:b};
}
function rosterCard(id){return CAST_ROSTER[(Math.max(1,id)-1)%CAST_ROSTER.length];}
function applyRoster(ap,card){return {...ap,name:card.name,body:card.body,hair:card.hair,hat:card.hat,outfit:card.outfit,colour:card.colour,hairColour:card.hairColour,roster:card.id};}
