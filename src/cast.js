// Distinct people: two adult silhouettes, hair, clothes. Heads stay featureless.
const CAST_COLOURS = [
 {name:'朱红',hex:'#ed5548',rgb:[.93,.22,.16]}, {name:'湖蓝',hex:'#39bcca',rgb:[.13,.69,.78]},
 {name:'琥珀',hex:'#e9ae32',rgb:[.95,.60,.08]}, {name:'紫罗兰',hex:'#b58ce8',rgb:[.61,.34,.90]},
 {name:'松绿',hex:'#65b38c',rgb:[.23,.65,.43]}, {name:'玫红',hex:'#e079a2',rgb:[.91,.31,.54]}
];
const CAST_NAMES=['阿岚','小汐','阿墨','知夏','青禾','白露','南星','闻川','初九','洛生','林晚','顾深'];
const HATS=['none','beret','cap','beanie','brim'];
const HAT_NAMES={none:'无帽',beret:'贝雷帽',cap:'鸭舌帽',beanie:'针织帽',brim:'宽檐帽'};
function defaultAppearance(id){return applyRoster({name:'',colour:0,hat:'none',outfit:'sleeves',body:'male',hair:'short',hairColour:0},rosterCard(id));}
function appearanceOf(a){
 const card=rosterCard(a.id||1),p=a.appearance||defaultAppearance(a.id);
 const colour=Number.isInteger(p.colour)?clamp(p.colour,0,CAST_COLOURS.length-1):(card.colour||0);
 const hairColour=Number.isInteger(p.hairColour)?clamp(p.hairColour,0,HAIR_COLOURS.length-1):(card.hairColour||0);
 return {
  name:String(p.name||card.name||CAST_NAMES[(a.id-1)%CAST_NAMES.length]).slice(0,12),
  colour,hairColour,
  hat:HATS.includes(p.hat)?p.hat:(card.hat||'none'),
  outfit:OUTFITS.includes(p.outfit)?p.outfit:(card.outfit||'sleeves'),
  body:p.body==='female'?'female':'male',
  hair:HAIRS.includes(p.hair)?p.hair:(p.body==='female'?'long':'short'),
  roster:p.roster||card.id
 };
}
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
function dressHair(add,headRoot,appearance,hairMat){
 const obj=(p,s,rot=0)=>add('sphere',compose(headRoot,M.translation(...p),M.rz(rot),M.scale(...s)),hairMat);
 const bangs=()=>{obj([0,.055,.070],[.070,.032,.028]);obj([.048,.038,.062],[.036,.034,.026]);obj([-.048,.038,.062],[.036,.034,.026]);};
 switch(appearance.hair){
  case 'crop':obj([0,.055,-.01],[.086,.055,.086]);break;
  case 'short':obj([0,.062,-.012],[.092,.068,.090]);obj([.07,.02,-.02],[.038,.055,.042]);obj([-.07,.02,-.02],[.038,.055,.042]);break;
  case 'bob':obj([0,.058,-.02],[.092,.068,.088]);obj([.082,-.02,-.04],[.042,.070,.046]);obj([-.082,-.02,-.04],[.042,.070,.046]);obj([0,-.02,-.08],[.074,.055,.050]);bangs();break;
  case 'long':
   obj([0,.06,-.02],[.094,.068,.090]);obj([.08,.01,-.04],[.038,.060,.042]);obj([-.08,.01,-.04],[.038,.060,.042]);
   obj([0,-.04,-.10],[.080,.080,.060]);obj([0,-.22,-.11],[.072,.13,.055]);obj([0,-.40,-.09],[.062,.13,.050]);obj([0,-.56,-.06],[.048,.11,.042]);
   bangs();
   break;
  case 'bun':obj([0,.055,-.02],[.088,.058,.086]);obj([0,.13,-.04],[.052,.052,.052]);obj([.07,.01,-.03],[.032,.048,.034]);obj([-.07,.01,-.03],[.032,.048,.034]);break;
  case 'ponytail':obj([0,.055,-.02],[.088,.060,.086]);obj([0,.04,-.10],[.038,.038,.038]);obj([0,-.08,-.13],[.034,.12,.034]);obj([0,-.24,-.12],[.028,.12,.028]);bangs();break;
  case 'braid':obj([0,.055,-.02],[.088,.060,.086]);obj([.07,.02,-.04],[.036,.055,.036]);obj([-.07,.02,-.04],[.036,.055,.036]);
   obj([.02,-.10,-.12],[.028,.10,.028]);obj([-.01,-.24,-.11],[.026,.10,.026]);obj([.02,-.38,-.09],[.024,.10,.024]);obj([0,-.50,-.07],[.022,.08,.022]);
   bangs();
   break;
 }
}
function dressClothes(add,pelvis,torso,appearance,cloth,R){
 const flare=R.body.hipWidth, female=appearance.body==='female', o=appearance.outfit;
 if(female){
  add('sphere',M.mul(torso,tr([ .048,.305,.102],[.054,.048,.060])),cloth);
  add('sphere',M.mul(torso,tr([-.048,.305,.102],[.054,.048,.060])),cloth);
  add('sphere',M.mul(torso,tr([0,.118,.018],[.080*R.waist,.12,.070])),cloth);
 }
 if(o==='blouse'||o==='skirt'||o==='dress'){
  add('sphere',M.mul(torso,tr([0,.20,.042],[.128*R.torsoX,.16,.098])),cloth);
 }
 if(o==='blouse'||o==='skirt'){
  add('sphere',M.mul(torso,tr([ .17,.345,.02],[.062,.048,.056])),cloth);
  add('sphere',M.mul(torso,tr([-.17,.345,.02],[.062,.048,.056])),cloth);
 }
 if(o==='skirt'||o==='dress'){
  add('sphere',M.mul(pelvis,tr([0,.04,.02],[.128*flare,.028,.100])),cloth);
  add('sphere',M.mul(pelvis,tr([0,-.07,.032],[.178*flare,.062,.132])),cloth);
  add('sphere',M.mul(pelvis,tr([0,-.19,.040],[.205*flare,.085,.148])),cloth);
  if(o==='dress'){
   add('sphere',M.mul(pelvis,tr([0,-.38,.032],[.230*flare,.13,.160])),cloth);
   add('sphere',M.mul(pelvis,tr([0,-.56,.022],[.242*flare,.12,.162])),cloth);
  }
 }
 if(o==='coat'){
  add('sphere',M.mul(torso,tr([0,.18,.05],[.16*R.torsoX,.28,.12])),cloth);
  add('sphere',M.mul(pelvis,tr([0,-.10,.03],[.17*flare,.14,.13])),cloth);
 }
}
