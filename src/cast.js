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
 const bangs=()=>{obj([0,.048,.072],[.078,.038,.036]);obj([.05,.03,.068],[.042,.040,.032]);obj([-.05,.03,.068],[.042,.040,.032]);};
 switch(appearance.hair){
  case 'crop':obj([0,.055,-.01],[.086,.055,.086]);break;
  case 'short':obj([0,.062,-.012],[.092,.068,.090]);obj([.07,.02,-.01],[.038,.055,.042]);obj([-.07,.02,-.01],[.038,.055,.042]);break;
  case 'bob':obj([0,.058,-.01],[.095,.070,.092]);obj([.088,-.02,-.01],[.046,.078,.050]);obj([-.088,-.02,-.01],[.046,.078,.050]);obj([0,-.04,-.07],[.080,.060,.055]);bangs();break;
  case 'long':
   obj([0,.06,-.012],[.098,.072,.094]);obj([.09,.01,-.01],[.042,.070,.048]);obj([-.09,.01,-.01],[.042,.070,.048]);
   obj([0,-.02,-.08],[.090,.090,.070]);obj([0,-.20,-.09],[.082,.14,.065]);obj([0,-.38,-.07],[.072,.14,.058]);obj([0,-.54,-.04],[.055,.12,.048]);
   bangs();
   break;
  case 'bun':obj([0,.055,-.01],[.090,.060,.088]);obj([0,.13,-.03],[.055,.055,.055]);obj([.08,.01,-.01],[.035,.05,.038]);obj([-.08,.01,-.01],[.035,.05,.038]);break;
  case 'ponytail':obj([0,.055,-.01],[.090,.062,.088]);obj([0,.04,-.09],[.04,.04,.04]);obj([0,-.08,-.12],[.038,.12,.038]);obj([0,-.24,-.11],[.032,.12,.032]);bangs();break;
  case 'braid':obj([0,.055,-.01],[.090,.062,.088]);obj([.08,.02,-.02],[.04,.06,.04]);obj([-.08,.02,-.02],[.04,.06,.04]);
   obj([.02,-.10,-.10],[.032,.10,.032]);obj([-.01,-.24,-.09],[.030,.10,.030]);obj([.02,-.38,-.07],[.028,.10,.028]);obj([0,-.50,-.05],[.024,.08,.024]);
   bangs();
   break;
 }
}
function dressClothes(add,pelvis,torso,appearance,cloth,R){
 const flare=R.body.hipWidth;
 if(appearance.outfit==='dress'){
  add('sphere',M.mul(pelvis,tr([0,-.08,.02],[.19*flare,.09,.15])),cloth);
  add('sphere',M.mul(pelvis,tr([0,-.26,.04],[.26*flare,.16,.19])),cloth);
  add('sphere',M.mul(pelvis,tr([0,-.46,.05],[.31*flare,.18,.22])),cloth);
  add('sphere',M.mul(pelvis,tr([0,-.66,.04],[.33*flare,.16,.22])),cloth);
 }
 if(appearance.outfit==='coat'){
  add('sphere',M.mul(torso,tr([0,.18,.04],[.16*R.torsoX,.28,.12])),cloth);
  add('sphere',M.mul(pelvis,tr([0,-.10,.03],[.18*flare,.16,.14])),cloth);
 }
 if(appearance.outfit==='blouse'){
  add('sphere',M.mul(torso,tr([0,.16,.03],[.13*R.torsoX,.16,.10])),cloth);
  add('sphere',M.mul(torso,tr([0,.04,.02],[.10*R.waist,.10,.08])),cloth);
 }
 if(R.chest>0){
  add('sphere',M.mul(torso,tr([.068,.255,.102],[.072,.056,.066])),cloth);
  add('sphere',M.mul(torso,tr([-.068,.255,.102],[.072,.056,.066])),cloth);
  add('sphere',M.mul(torso,tr([0,.12,.02],[.10*R.waist,.11,.085])),cloth);
 }
}
