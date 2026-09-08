/* 5.3 — One geometry / two looks. Material identity is semantic, never inferred
   from the camera or painted as a second coplanar layer. Textures are original,
   deterministic, tileable raster maps baked once into a mipmapped texture array.
   No remote assets, film grain, screen-space noise or animation-time random seed. */
const LOOK_SCHEMA='noir-atlas-look/1';
const LOOK_STORAGE='noir-atlas.look.v1';
const LOOK_COLOUR_KEYS=['wall','stone','wood','roof','foliage','water','trim'];
const LOOK_PRESETS=Object.freeze({
 natural:{name:'自然原色',note:'浅墙 · 原木 · 青瓦 · 绿植',colours:{wall:'#ece9df',stone:'#bfc5bd',wood:'#bd9b70',roof:'#536b6c',foliage:'#517750',water:'#74b8bb',trim:'#8b5540'},sky:'#e1eceb'},
 warm:{name:'暖阳陶土',note:'米白 · 橡木 · 陶瓦 · 橄榄绿',colours:{wall:'#eee1cb',stone:'#c8bfae',wood:'#b7824f',roof:'#ad7358',foliage:'#718357',water:'#84b9b1',trim:'#9b6747'},sky:'#eee8dc'},
 jade:{name:'青绿雅色',note:'素墙 · 淡木 · 黛瓦 · 青碧',colours:{wall:'#e6ede6',stone:'#b2c4c0',wood:'#ad9875',roof:'#3f636b',foliage:'#427762',water:'#64aca9',trim:'#677f79'},sky:'#deece9'}
});
function normalizeLook(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))value={};
 const palette=Object.hasOwn(LOOK_PRESETS,value.palette)?value.palette:'natural',preset=LOOK_PRESETS[palette];
 const finite=(v,d,min,max)=>typeof v==='number'&&Number.isFinite(v)?clamp(v,min,max):d;
 const colours={};for(const k of LOOK_COLOUR_KEYS){const c=value.colours?.[k];colours[k]=typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c)?c.toLowerCase():preset.colours[k];}
 return {mode:value.mode==='mono'?'mono':'color',palette,saturation:finite(value.saturation,1,0,1.5),texture:finite(value.texture,.58,0,1),gloss:finite(value.gloss,.25,0,1),keepAccents:value.keepAccents!==false,colours};
}
function readLook(){try{const s=localStorage.getItem(LOOK_STORAGE);return normalizeLook(s?JSON.parse(s):{});}catch(_){return normalizeLook();}}
function validateLook(input){
 const data=typeof input==='string'?JSON.parse(input):input;
 if(!data||data.schema!==LOOK_SCHEMA||!data.look||typeof data.look!=='object'||Array.isArray(data.look))throw new Error('请选择 NOIR 配色文件（noir-atlas-look/1）。');
 const x=data.look;
 if(!['mono','color'].includes(x.mode)||!Object.hasOwn(LOOK_PRESETS,x.palette))throw new Error('配色模式或预设名称无效。');
 for(const k of ['saturation','texture','gloss'])if(typeof x[k]!=='number'||!Number.isFinite(x[k]))throw new Error('配色参数必须是有效数字。');
 for(const k of LOOK_COLOUR_KEYS)if(!/^#[0-9a-f]{6}$/i.test(x.colours?.[k]||''))throw new Error('材质颜色无效：'+k);
 return normalizeLook(x);
}
const rgbHex=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
const MATERIAL_DEFS=Object.freeze({
 plaster:{layer:0,key:'wall',scale:.75,roughness:.95,bump:.003},
 stone:{layer:1,key:'stone',scale:.42,roughness:.89,bump:.005},
 paving:{layer:1,key:'stone',scale:.38,roughness:.94,bump:.003,mult:.91},
 path:{layer:1,key:'wall',scale:.34,roughness:.94,bump:.001},
 wood:{layer:2,key:'wood',scale:.65,roughness:.78,bump:.003},
 roof:{layer:3,key:'roof',scale:1.0,roughness:.82,bump:.004},
 leaf:{layer:4,key:'foliage',scale:.52,roughness:.97,bump:.002},
 water:{layer:5,key:'water',scale:.24,roughness:.30,bump:.013},
 metal:{layer:6,hex:'#606f72',scale:1.5,roughness:.50,bump:.003},
 fabric:{layer:7,hex:'#a8b6af',scale:6,roughness:.97,bump:.003},
 lacquer:{layer:2,key:'trim',scale:1.0,roughness:.57,bump:.006},
 grass:{layer:4,key:'foliage',scale:.17,roughness:.98,bump:.001,mult:1},
 ceramic:{layer:0,hex:'#e9e6d8',scale:1.5,roughness:.38,bump:.003},
 book:{layer:7,hex:'#be9572',scale:3,roughness:.94,bump:.004}
});
function assignWorldFinishes(sc){
 // Explicit assignments in builders win. These dimensional rules only cover
 // generic architectural primitives which predate the material system.
 for(const o of sc.objects){if(o.finish)continue;
  const m=o.m,y=m[13],sx=Math.hypot(m[0],m[1],m[2]),sy=Math.hypot(m[4],m[5],m[6]),sz=Math.hypot(m[8],m[9],m[10]);
  if(o.tint||o.emissive>0){o.finish='neutral';continue;}
  if(o.mesh==='foliage'){o.finish='leaf';continue;}
  if(o.mesh==='mountain'||o.mesh==='mountain2'||o.mesh==='rock'){o.finish='stone';continue;}
  if(o.mesh==='roof'){o.finish='roof';continue;}
  if(o.surface===2){o.finish='water';continue;}
  if(o.mesh==='floorShell'){o.finish='stone';continue;}
  if(o.mesh==='twig'){o.finish=sc.id===7?'metal':'wood';continue;}
  if(o.mesh==='sphere'){
   o.finish=sc.id===9&&y>.45&&y<.8&&sx>.35?'leaf':sc.id===9&&y<.1?'neutral':'ceramic';continue;
  }
  if(o.mesh==='box'){
   if(y<.2){o.finish='stone';continue;}
   if(sc.id===7){
    if(sz<.3&&sx<.2&&sy<.5&&m[14]<-8.8){o.finish='book';continue;}
    if(Math.min(sx,sz)<.22&&sy>1.1){o.finish=o.shade<.5?'wood':'plaster';continue;}
    if(sy<.2&&y>.4&&sx>.4&&sz>.35){o.finish='wood';continue;}
    if(o.shade<.28){o.finish='metal';continue;}
    o.finish=y<1.4&&sz<.7&&sx>1?'wood':'plaster';
   }else{
    if(sy>1.2&&Math.max(sx,sz)>2.2&&o.shade>.5){o.finish='plaster';continue;}
    if(o.shade<.4&&sy>.5){o.finish='lacquer';continue;}
    o.finish=sy<.3&&sx>1&&sz>1&&y>.4?'wood':'stone';
   }
  }else o.finish='stone';
 }
}
function assignAbstractFinishes(sc){
 for(const o of sc.objects){if(o.finish)continue;if(o.emissive||o.tint){o.finish='neutral';continue;}
  if(o.mesh==='rock'||o.mesh==='walkway')o.finish='stone';
  else if(o.mesh==='artSphere')o.finish='roof';
  else if(o.mesh==='thinRing')o.finish='metal';
  else {const m=o.m;const sy=Math.hypot(m[4],m[5],m[6]);o.finish=sy<2||sc.id===1?'stone':sc.id===4?'wood':'plaster';}
 }
}
function bakeMaterialTextureArray(gl,size=256){
 const layers=8,all=new Uint8Array(size*size*4*layers),TAU=2*Math.PI;
 let seed=982451653;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const noise=(grid,rows=grid)=>{const samples=Float32Array.from({length:grid*rows},()=>rand()*2-1),out=new Float32Array(size*size);
  for(let y=0;y<size;y++){const yy=y/size*rows,yi=Math.floor(yy),fy=yy-yi,sy=fy*fy*(3-2*fy);
   for(let x=0;x<size;x++){const xx=x/size*grid,xi=Math.floor(xx),fx=xx-xi,sx=fx*fx*(3-2*fx);const at=(i,j)=>samples[(j%rows)*grid+i%grid];out[y*size+x]=lerp(lerp(at(xi,yi),at(xi+1,yi),sx),lerp(at(xi,yi+1),at(xi+1,yi+1),sx),sy);}
  }return out;
 };
 const broad=noise(4),medium=noise(16),fine=noise(64),woodLong=noise(48,3),woodSoft=noise(12,2);
 for(let layer=0;layer<layers;layer++)for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=y*size+x,u=x/size,v=y/size,n=broad[i],m=medium[i],f=fine[i];let h=.5,r=.85;
  if(layer===0){h=.5+.019*n+.009*m+.004*f;r=.95;} // freshly painted mineral plaster
  if(layer===1){h=.5+.053*n+.024*m+.008*f;r=.85+.05*m;} // honed limestone, not dirty concrete
  if(layer===2){const seam=Math.exp(-Math.pow(Math.sin(Math.PI*u*4)*54,2));h=.52+.065*woodLong[i]+.035*woodSoft[i]+.006*f-.043*seam;r=.72+.045*n;} // long wood fibre
  if(layer===3){const seam=Math.exp(-Math.pow(Math.sin(TAU*v*2)*22,2));h=.54+.045*n+.023*m-.08*seam;r=.78+.04*m;} // broad, quiet ceramic roof courses
  if(layer===4){h=.5+.045*n+.021*m;r=.98;} // grouped leaf colour; no photographic alpha cards
  if(layer===5){h=.5+.07*Math.sin(TAU*(u+v))+.025*Math.sin(TAU*(u*3-v*2));r=.24;} // broad water detail
  if(layer===6){h=.5+.012*Math.sin(TAU*v*53)+.015*n;r=.48;} // brushed metal
  if(layer===7){h=.5+.034*Math.sin(TAU*u*32)*Math.sin(TAU*v*32)+.02*m;r=.94;} // fabric weave
  const k=(layer*size*size+i)*4;all[k]=Math.round(clamp(h,0,1)*255);all[k+1]=Math.round(clamp(r,0,1)*255);all[k+2]=128;all[k+3]=255;
 }
 const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D_ARRAY,t);
 gl.texImage3D(gl.TEXTURE_2D_ARRAY,0,gl.RGBA8,size,size,layers,0,gl.RGBA,gl.UNSIGNED_BYTE,all);
 gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_WRAP_T,gl.REPEAT);
 gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D_ARRAY,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
 const ext=gl.getExtension('EXT_texture_filter_anisotropic');let anisotropy=1;
 if(ext){anisotropy=Math.min(4,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT));gl.texParameterf(gl.TEXTURE_2D_ARRAY,ext.TEXTURE_MAX_ANISOTROPY_EXT,anisotropy);}
 gl.bindTexture(gl.TEXTURE_2D_ARRAY,null);
 return {texture:t,size,layers,mipLevels:Math.log2(size)+1,anisotropy,bytes:all.length,pixels:all};
}
