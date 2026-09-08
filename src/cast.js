// Distinct people, one adult-proportioned rig. Everything here is a 3D mesh.
const CAST_COLOURS = [
 {name:'朱红',hex:'#ed5548',rgb:[.93,.22,.16]}, {name:'湖蓝',hex:'#39bcca',rgb:[.13,.69,.78]},
 {name:'琥珀',hex:'#e9ae32',rgb:[.95,.60,.08]}, {name:'紫罗兰',hex:'#b58ce8',rgb:[.61,.34,.90]},
 {name:'松绿',hex:'#65b38c',rgb:[.23,.65,.43]}, {name:'玫红',hex:'#e079a2',rgb:[.91,.31,.54]}
];
const CAST_NAMES=['阿岚','小汐','阿墨','知夏','青禾','白露','南星','闻川','初九','洛生'];
const HATS=['none','beret','cap','beanie','brim'];
const HAT_NAMES={none:'无帽',beret:'贝雷帽',cap:'鸭舌帽',beanie:'针织帽',brim:'宽檐帽'};
function defaultAppearance(id){return {name:CAST_NAMES[(id-1)%CAST_NAMES.length],colour:(id-1)%CAST_COLOURS.length,hat:['beret','cap','none','beanie','brim'][((id-1)%5)],outfit:(id-1)%2?'sleeves':'vest'};}
function appearanceOf(a){const p=a.appearance||defaultAppearance(a.id);return {name:String(p.name||CAST_NAMES[(a.id-1)%10]).slice(0,12),colour:Number.isInteger(p.colour)?clamp(p.colour,0,5):0,hat:HATS.includes(p.hat)?p.hat:'none',outfit:p.outfit==='vest'?'vest':'sleeves'};}
function castColour(a){return CAST_COLOURS[appearanceOf(a).colour];}
function dressHat(add,headRoot,appearance,cloth){
 const obj=(mesh,p,s,material=cloth,rot=0)=>add(mesh,compose(headRoot,M.translation(...p),M.rz(rot),M.scale(...s)),material);
 switch(appearance.hat){
  case 'beret':obj('sphere',[.019,.094,0],[.113,.041,.096],cloth,-.17);obj('sphere',[.028,.134,-.008],[.011,.018,.010],cloth,-.17);break;
  case 'cap':obj('sphere',[0,.075,-.006],[.087,.061,.087]);obj('sphere',[0,.067,.087],[.092,.009,.082]);break;
  case 'beanie':obj('sphere',[0,.087,-.007],[.088,.073,.086]);obj('sphere',[0,.156,-.009],[.023,.025,.023]);obj('sphere',[0,.062,0],[.090,.019,.089],cloth);break;
  case 'brim':obj('sphere',[0,.074,-.006],[.151,.011,.13]);obj('sphere',[0,.113,-.008],[.08,.046,.071]);obj('sphere',[0,.085,-.008],[.085,.015,.075],{shade:.055});break;
 }
}
