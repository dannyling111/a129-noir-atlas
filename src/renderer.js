class Renderer {
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.gl)throw new Error('此浏览器未开启 WebGL 2。请使用较新的 Chrome / Edge / Safari，或开启硬件加速。');this.gl.disable(this.gl.DITHER);this.meshes={};this.width=0;this.height=0;this.resolution=1.4;this.shadowSize=2048;this.msaaSamples=0;this.initPrograms();this.materialTextures=bakeMaterialTextureArray(this.gl);this.initTargets();for(const [name,g]of Object.entries({box:Geo.box(),disc:Geo.disc(),thinRing:Geo.torus(1,.0028,96,6),sphere:Geo.sphere(24,16),artSphere:Geo.sphere(72,48),torus:Geo.torus(),rock:Geo.sphere(48,32,.055),walkway:Geo.ribbon(PATH_POINTS,2.85,28),torso:Geo.loft([[0,.105,.085],[.055,.145,.105],[.17,.125,.08],[.28,.173,.098],[.36,.202,.10],[.40,.172,.082],[.435,.085,.066]],16),pelvis:Geo.loft([[0,.077,.077],[.055,.142,.103],[.12,.15,.10],[.18,.12,.087]],16),limb:Geo.loft([[0,.70,.75],[.07,.92,.90],[.26,1,1],[.5,.91,.88],[.78,.69,.7],[1,.53,.55]],12),forelimb:Geo.loft([[0,.73,.8],[.20,1,1],[.53,.80,.82],[.87,.48,.53],[1,.45,.49]],12)}))this.meshes[name]=this.mesh(g);this.resize();}
 shader(type,source){let g=this.gl,s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw new Error(g.getShaderInfoLog(s));return s;}
 program(v,f){let g=this.gl,p=g.createProgram();g.attachShader(p,this.shader(g.VERTEX_SHADER,v));g.attachShader(p,this.shader(g.FRAGMENT_SHADER,f));g.linkProgram(p);if(!g.getProgramParameter(p,g.LINK_STATUS))throw new Error(g.getProgramInfoLog(p));return p;}
 initPrograms(){const vs=`#version 300 es
 precision highp float;layout(location=0)in vec3 aP;layout(location=1)in vec3 aN;uniform mat4 uM,uVP,uLightVP;out vec3 vP,vN,vLocal,vLocalN;out vec4 vS;void main(){vec4 p=uM*vec4(aP,1.);vP=p.xyz;vLocal=aP*vec3(length(uM[0].xyz),length(uM[1].xyz),length(uM[2].xyz));vLocalN=aN;vN=normalize(transpose(inverse(mat3(uM)))*aN);vS=uLightVP*p;gl_Position=uVP*p;}`;
 const fs=`#version 300 es
 precision highp float;in vec3 vP,vN,vLocal,vLocalN;in vec4 vS;uniform highp sampler2D uShadow;uniform vec3 uEye,uLight,uTarget,uTint;uniform float uShade,uEmissive,uAmbient,uStrength,uSpot,uCone,uFog,uBackground,uSurface,uSceneTime;out vec4 color;
 uniform highp sampler2DArray uMaterials;
 uniform vec3 uAlbedo,uSky;
 uniform float uColorMode,uMaterial,uMapScale,uLocalMap,uTextureStrength,uSaturation,uRoughness,uBump,uGloss,uKeepAccents,uColorFill,uPreserveTint;
 // Triplanar UVs are continuous world/object coordinates. Gradients are taken
 // before branching and before any periodic wrap; mipmapping handles distance.
 vec2 materialMap(vec3 pos,vec3 norm){
  vec3 w=pow(abs(normalize(norm)),vec3(4.));w/=max(dot(w,vec3(1.)),.00001);
  vec3 q=pos*uMapScale,dx=dFdx(q),dy=dFdy(q);
  vec2 a=vec2(0.);if(w.x>.005)a=textureGrad(uMaterials,vec3(q.zy,uMaterial),dx.zy,dy.zy).rg;
  vec2 b=vec2(0.);if(w.y>.005)b=textureGrad(uMaterials,vec3(q.xz,uMaterial),dx.xz,dy.xz).rg;
  vec2 c=vec2(0.);if(w.z>.005)c=textureGrad(uMaterials,vec3(q.xy,uMaterial),dx.xy,dy.xy).rg;
  return (a*w.x+b*w.y+c*w.z)/max((w.x>.005?w.x:0.)+(w.y>.005?w.y:0.)+(w.z>.005?w.z:0.),.0001);
 }
 vec3 saturateColour(vec3 c){return max(vec3(0.),mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,uSaturation));}

 float shadow(){
  vec3 p=vS.xyz/vS.w*.5+.5;
  if(p.z>1.||p.z<0.||p.x<0.||p.x>1.||p.y<0.||p.y>1.)return 1.;
  vec2 size=vec2(textureSize(uShadow,0)),pixel=p.xy*size;
  vec3 dx=dFdx(p),dy=dFdy(p);float det=dx.x*dy.y-dx.y*dy.x;
  vec2 slope=abs(det)>1.e-11?vec2(dy.y*dx.z-dx.y*dy.z,dx.x*dy.z-dy.x*dx.z)/det:vec2(0.);
  slope=clamp(slope,vec2(-8.),vec2(8.));
  float bias=uSpot>.5?.000035:.00014;
  float sum=0.,weight=0.;vec2 origin=floor(pixel-.5);
  for(int x=-1;x<=2;x++)for(int y=-1;y<=2;y++){
   vec2 samplePixel=origin+vec2(float(x),float(y))+.5;
   vec2 uv=samplePixel/size,distance=abs(samplePixel-pixel);
   float w=max(0.,2.-distance.x)*max(0.,2.-distance.y);
   float depth=texture(uShadow,uv).r;
   float receiver=p.z+dot(slope,uv-p.xy);
   sum+=w*step(receiver-bias,depth);weight+=w;
  }
  return sum/max(weight,.00001);
 }


 void main(){vec3 n=normalize(vN);vec3 l=uSpot>.5?normalize(uLight-vP):normalize(uLight-uTarget);float cone=1.;if(uSpot>.5){float c=dot(normalize(vP-uLight),normalize(uTarget-uLight));cone=smoothstep(uCone,uCone+.075,c);}
 float visibility=shadow(),direct=max(dot(n,l),0.)*uStrength*visibility*cone;
 float ambient=uAmbient*(.58+.42*max(n.y,0.));
 float value=uShade*(ambient+direct)+uEmissive;
 vec3 legacy=uKeepAccents>.5?uTint:vec3(dot(uTint,vec3(.2126,.7152,.0722)));
 vec3 rgb=legacy*value;
 if(uColorMode>.5&&uMaterial>=0.){
  vec2 texel=vec2(.5,uRoughness);
  if(uTextureStrength>.001){
   texel=materialMap(uLocalMap>.5?vLocal:vP,uLocalMap>.5?vLocalN:vN);
   // Very shallow bump only; no geometric displacement or extra surface.
   vec3 dp1=dFdx(vP),dp2=dFdy(vP),r1=cross(dp2,n),r2=cross(n,dp1);
   float det=dot(dp1,r1);vec3 grad=(dFdx(texel.r)*r1+dFdy(texel.r)*r2)/max(abs(det),.000001)*sign(det);
   grad=clamp(grad,vec3(-2.),vec3(2.));n=normalize(n-grad*uBump*uTextureStrength);
  }
  vec3 albedo=uAlbedo*(1.+(texel.r-.5)*uTextureStrength*1.25);
  float roomLight=max(uAmbient,uColorFill)*(.92+.08*max(n.y,0.));
  float sunlight=max(dot(n,l),0.)*min(uStrength,.98)*visibility*cone*.70;
  vec3 hemi=mix(vec3(.94,.97,1.02),vec3(1.),max(n.y,0.));
  float rough=clamp(mix(uRoughness,texel.g,.2*uTextureStrength),.2,1.);
  vec3 v=normalize(uEye-vP),halfway=normalize(l+v);
  float shine=pow(max(dot(n,halfway),0.),mix(80.,14.,rough))*(1.-rough)*uGloss*.38*visibility*cone;
  rgb=albedo*(roomLight*hemi+sunlight)+vec3(shine)+uEmissive*albedo;
  if(uPreserveTint<.5)rgb=saturateColour(rgb);
 }
 float fog=1.-exp(-pow(length(vP-uEye)*uFog,1.9));
 vec3 background=uColorMode>.5?saturateColour(uSky):vec3(uBackground);
 color=vec4(mix(rgb,background,fog),1.);
}`;
 this.main=this.program(vs,fs);this.depth=this.program(`#version 300 es
 precision highp float;layout(location=0)in vec3 aP;uniform mat4 uM,uVP;void main(){gl_Position=uVP*uM*vec4(aP,1.);}`,`#version 300 es
 precision highp float;void main(){}`);
 this.post=this.program(`#version 300 es
 precision highp float;out vec2 vUV;void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}`,`#version 300 es
 precision highp float;in vec2 vUV;out vec4 color;
 uniform highp sampler2D uColor,uDepth,uShadow;uniform mat4 uInvVP,uLightVP;
 uniform vec3 uLight,uTarget;uniform vec2 uRes;
 uniform float uHaze,uContrast,uSpot,uCone,uVolume,uExposure,uEdgeAA;
 vec3 world(float d){vec4 w=uInvVP*vec4(vUV*2.-1.,d*2.-1.,1.);return w.xyz/w.w;}
 float lit(vec3 w){vec4 lp=uLightVP*vec4(w,1.);vec3 q=lp.xyz/lp.w*.5+.5;if(q.z<0.||q.z>1.||q.x<0.||q.x>1.||q.y<0.||q.y>1.)return 0.;float shadow=q.z-.001<texture(uShadow,q.xy).r?1.:0.;float c=dot(normalize(w-uLight),normalize(uTarget-uLight));float cone=uSpot>.5?smoothstep(uCone,uCone+.075,c):1.;return shadow*cone;}
 void main(){
  vec2 texel=1./uRes;vec3 base=texture(uColor,vUV).rgb;
  // Offscreen MSAA is primary. This mild fallback is used only if MSAA
  // allocation is unavailable; it never adds texture or temporal dither.
  if(uEdgeAA>.5){
   vec3 nei=(texture(uColor,vUV+vec2(texel.x,0)).rgb+texture(uColor,vUV-vec2(texel.x,0)).rgb+texture(uColor,vUV+vec2(0,texel.y)).rgb+texture(uColor,vUV-vec2(0,texel.y)).rgb)*.25;
   float edge=abs(dot(nei-base,vec3(.333333)));base=mix(base,nei,clamp(edge*1.1,0.,.25));
  }
  // Optional spatial atmosphere is off by default. Fixed sample positions
  // avoid film-grain-like ray-march jitter. No moving density pattern.
  float acc=0.;
  if(uHaze>0.&&uVolume>0.){
   float dep=texture(uDepth,vUV).r;vec3 start=world(0.),end=world(min(dep,.9999));
   vec3 delta=end-start;float distance=min(length(delta),130.);vec3 ray=normalize(delta)*distance;
   for(int i=0;i<48;i++){vec3 pos=start+ray*((float(i)+.5)/48.);acc+=lit(pos)*exp(-max(pos.y,0.)*.025);}
   acc*=distance/48.*.011*uHaze*uVolume;
  }
  // Linear per-channel output retains the small character/prop colour accents.
  // No grain, vignette, film bloom, sepia paper tint, or posterization.
  vec3 rgb=(base+vec3(acc))*uExposure;rgb=(rgb-.5)*uContrast+.5;
  color=vec4(clamp(rgb,0.,1.),1.);
 }`);
 this.locations=new Map();}
 loc(p,n){let key=p===this.main?'main':p===this.depth?'depth':'post';key+=n;if(!this.locations.has(key))this.locations.set(key,this.gl.getUniformLocation(p,n));return this.locations.get(key);}
 m4(p,n,a){this.gl.uniformMatrix4fv(this.loc(p,n),false,a);}f(p,n,a){this.gl.uniform1f(this.loc(p,n),a);}v3(p,n,a){this.gl.uniform3fv(this.loc(p,n),a);}
 mesh({p,n,ix}){let g=this.gl,vao=g.createVertexArray();g.bindVertexArray(vao);let a=new Float32Array(p.length*2);for(let i=0;i<p.length/3;i++){a.set(p.slice(i*3,i*3+3),i*6);a.set(n.slice(i*3,i*3+3),i*6+3);}let vb=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,vb);g.bufferData(g.ARRAY_BUFFER,a,g.STATIC_DRAW);g.enableVertexAttribArray(0);g.vertexAttribPointer(0,3,g.FLOAT,false,24,0);g.enableVertexAttribArray(1);g.vertexAttribPointer(1,3,g.FLOAT,false,24,12);let eb=g.createBuffer();g.bindBuffer(g.ELEMENT_ARRAY_BUFFER,eb);g.bufferData(g.ELEMENT_ARRAY_BUFFER,new Uint16Array(ix),g.STATIC_DRAW);g.bindVertexArray(null);const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<p.length;i++){min[i%3]=Math.min(min[i%3],p[i]);max[i%3]=Math.max(max[i%3],p[i]);}return {vao,vb,eb,count:ix.length,bounds:{min,max}};}
 texture(w,h,depth=false){let g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,depth?g.DEPTH_COMPONENT24:g.RGBA8,w,h,0,depth?g.DEPTH_COMPONENT:g.RGBA,depth?g.UNSIGNED_INT:g.UNSIGNED_BYTE,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,depth?g.NEAREST:g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,depth?g.NEAREST:g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);return t;}
 initTargets(){let g=this.gl;this.shadow=this.texture(this.shadowSize,this.shadowSize,true);this.shadowFB=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFB);g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,this.shadow,0);g.drawBuffers([g.NONE]);g.readBuffer(g.NONE);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw new Error('阴影缓冲初始化失败');this.mainFB=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,null);}
 resize(){
  let w=Math.round(innerWidth*Math.min(devicePixelRatio||1,this.resolution)),h=Math.round(innerHeight*Math.min(devicePixelRatio||1,this.resolution));
  if(w===this.width&&h===this.height)return;const g=this.gl;
  this.width=this.canvas.width=w;this.height=this.canvas.height=h;
  if(this.color)g.deleteTexture(this.color);if(this.screenDepth)g.deleteTexture(this.screenDepth);
  this.color=this.texture(w,h);this.screenDepth=this.texture(w,h,true);
  g.bindFramebuffer(g.FRAMEBUFFER,this.mainFB);
  g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,this.color,0);
  g.framebufferTexture2D(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.TEXTURE_2D,this.screenDepth,0);
  if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw new Error('画面缓冲初始化失败');
  if(this.msaaFB)g.deleteFramebuffer(this.msaaFB);
  if(this.msaaColor)g.deleteRenderbuffer(this.msaaColor);if(this.msaaDepth)g.deleteRenderbuffer(this.msaaDepth);
  this.msaaFB=null;this.msaaColor=null;this.msaaDepth=null;this.msaaSamples=0;
  // Use a sample count supported by BOTH attachments, not just MAX_SAMPLES.
  const colorSamples=Array.from(g.getInternalformatParameter(g.RENDERBUFFER,g.RGBA8,g.SAMPLES));
  const depthSamples=Array.from(g.getInternalformatParameter(g.RENDERBUFFER,g.DEPTH_COMPONENT24,g.SAMPLES));
  const budget=innerWidth<600?2:4;
  const available=colorSamples.filter(n=>n<=budget&&n>1&&depthSamples.includes(n));
  // Some drivers support 4x only. It is still bounded and preferable to jagged edges.
  const samples=available.length?Math.max(...available):(colorSamples.includes(4)&&depthSamples.includes(4)?4:0);
  if(samples){
   this.msaaFB=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,this.msaaFB);
   this.msaaColor=g.createRenderbuffer();g.bindRenderbuffer(g.RENDERBUFFER,this.msaaColor);
   g.renderbufferStorageMultisample(g.RENDERBUFFER,samples,g.RGBA8,w,h);
   g.framebufferRenderbuffer(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.RENDERBUFFER,this.msaaColor);
   this.msaaDepth=g.createRenderbuffer();g.bindRenderbuffer(g.RENDERBUFFER,this.msaaDepth);
   g.renderbufferStorageMultisample(g.RENDERBUFFER,samples,g.DEPTH_COMPONENT24,w,h);
   g.framebufferRenderbuffer(g.FRAMEBUFFER,g.DEPTH_ATTACHMENT,g.RENDERBUFFER,this.msaaDepth);
   if(g.checkFramebufferStatus(g.FRAMEBUFFER)===g.FRAMEBUFFER_COMPLETE)this.msaaSamples=samples;
  }
  g.bindRenderbuffer(g.RENDERBUFFER,null);g.bindFramebuffer(g.FRAMEBUFFER,null);
 }
 bindTex(p,name,t,unit){let g=this.gl;g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,t);g.uniform1i(this.loc(p,name),unit);}
 configureLook(look){
  const next=look||{mode:'mono',keepAccents:true},key=JSON.stringify(next);
  if(key===this._lookKey)return;this._lookKey=key;this.activeLook=next;this._materialTable={};
  const colours=next.colours||LOOK_PRESETS.natural.colours;
  for(const [name,m]of Object.entries(MATERIAL_DEFS))this._materialTable[name]={...m,albedo:rgbHex(m.key?colours[m.key]:m.hex).map(c=>clamp(c*(m.mult||1),0,1))};
 }
 materialFor(o){return this._materialTable[o.finish]||null;}
 draw(objects,p,depth=false){let g=this.gl,last=null;for(const o of objects){if(depth&&o.emissive&&!o.castShadow)continue;let mesh=this.meshes[o.mesh||'box'];if(last!==mesh){g.bindVertexArray(mesh.vao);last=mesh;}this.m4(p,'uM',o.m);if(!depth){this.f(p,'uSurface',o.surface||0);this.f(p,'uShade',o.shade??.6);this.f(p,'uEmissive',o.emissive||0);this.v3(p,'uTint',o.tint||[1,1,1]);
 const mat=this.activeLook?.mode==='color'?this.materialFor(o):null;
 this.f(p,'uMaterial',mat?mat.layer:-1);
 if(mat){
  let albedo=o.finish==='grass'?mat.albedo.map(v=>v*.48+.40):mat.albedo;this.f(p,'uPreserveTint',o.actorId&&o.tint?1:0);
  if(o.finish==='fabric'&&o.tint)albedo=o.tint.map(v=>v*.76+.07);
  if(o.finish==='book'){
   const bookColors=['#ba8266','#7795a0','#89946b','#c8b291','#dad1bd'];albedo=rgbHex(bookColors[Math.round((o.shade||.5)*100)%5]);
  }
  const variance=.94+.09*clamp(o.shade??.6,0,1);this.v3(p,'uAlbedo',albedo.map(v=>v*variance));
  this.f(p,'uMapScale',mat.scale);this.f(p,'uRoughness',mat.roughness);this.f(p,'uBump',mat.bump);
  this.f(p,'uLocalMap',o.texLocal||o.actorId||o.mesh==='rock'?1:0);
 }
}g.drawElements(g.TRIANGLES,mesh.count,g.UNSIGNED_SHORT,0);}g.bindVertexArray(null);}
 render(objects,camera,sc,settings,time,look=null){this.resize();this.configureLook(look);let g=this.gl,s=sc.light;let eye=s.pos.slice();eye[0]+=settings.lightShift*(s.spot?.11:1);const lightPos=eye.slice();let lightAt=s.target.slice(),lightVP;
 if(s.spot){lightVP=M.mul(M.perspective(s.fov||1.32,1,1,135),M.look(eye,lightAt));}
 else{
  // Scene-anchored orthographic shadow grid. Rotating, zooming, framing an
  // actor or replaying a camera no longer rescales / translates this texture.
  const bounds=sc.bounds||[-20,20,-20,20];
  const center=[(bounds[0]+bounds[1])/2,(s.target[1]||0), (bounds[2]+bounds[3])/2];
  const extent=Math.ceil(Math.max((sc.span||40)*.90,(bounds[1]-bounds[0])*.72,(bounds[3]-bounds[2])*.72,28));
  const direction=V.norm(V.sub(lightPos,s.target));
  const shadowEye=V.add(center,V.mul(direction,110));
  const view=M.look(shadowEye,center),texel=2*extent/this.shadowSize;
  view[12]=Math.round(view[12]/texel)*texel;view[13]=Math.round(view[13]/texel)*texel;
  lightVP=M.mul(M.ortho(-extent,extent,-extent,extent,1,230),view);
 }
 this.lastLightVP=lightVP;
 g.enable(g.DEPTH_TEST);g.disable(g.DITHER);g.disable(g.BLEND);g.disable(g.CULL_FACE);g.bindFramebuffer(g.FRAMEBUFFER,this.shadowFB);g.viewport(0,0,this.shadowSize,this.shadowSize);g.clear(g.DEPTH_BUFFER_BIT);g.enable(g.POLYGON_OFFSET_FILL);g.polygonOffset(.75,1);g.useProgram(this.depth);this.m4(this.depth,'uVP',lightVP);this.draw(objects,this.depth,true);g.disable(g.POLYGON_OFFSET_FILL);
 g.bindFramebuffer(g.FRAMEBUFFER,this.msaaSamples?this.msaaFB:this.mainFB);g.viewport(0,0,this.width,this.height);const coloured=this.activeLook.mode==='color',preset=LOOK_PRESETS[this.activeLook.palette]||LOOK_PRESETS.natural;
 const sky=coloured?rgbHex(preset.sky):[sc.background,sc.background,sc.background];
 // Deep portal scenes keep their dark architecture and cinematic negative space.
 if(coloured&&sc.background<.2)for(let k=0;k<3;k++)sky[k]*=sc.background/.85;
 const sat=this.activeLook.saturation??1,luma=sky[0]*.2126+sky[1]*.7152+sky[2]*.0722;
 const clear=coloured?sky.map(v=>Math.max(0,lerp(luma,v,sat))):sky;
 g.clearColor(...clear,1);g.clear(g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT);g.useProgram(this.main);this.m4(this.main,'uVP',camera.vp);this.m4(this.main,'uLightVP',lightVP);this.v3(this.main,'uEye',camera.eye);this.v3(this.main,'uLight',lightPos);this.v3(this.main,'uTarget',s.target);this.f(this.main,'uSceneTime',time);this.f(this.main,'uAmbient',sc.ambient);this.f(this.main,'uStrength',sc.strength);this.f(this.main,'uSpot',s.spot?1:0);this.f(this.main,'uCone',s.cone??.8);this.f(this.main,'uFog',(sc.fog||.001)*settings.haze);this.f(this.main,'uBackground',sc.background);this.bindTex(this.main,'uShadow',this.shadow,0);
 this.f(this.main,'uColorMode',coloured?1:0);this.f(this.main,'uColorFill',sc.world?.55:sc.background<.2?.15:.42);this.f(this.main,'uSaturation',this.activeLook.saturation??1);
 this.f(this.main,'uTextureStrength',this.activeLook.texture??0);this.f(this.main,'uGloss',this.activeLook.gloss??.25);
 this.f(this.main,'uKeepAccents',this.activeLook.keepAccents!==false?1:0);this.v3(this.main,'uSky',sky);
 g.activeTexture(g.TEXTURE3);g.bindTexture(g.TEXTURE_2D_ARRAY,this.materialTextures.texture);g.uniform1i(this.loc(this.main,'uMaterials'),3);
 this.draw(objects,this.main);
 if(this.msaaSamples){g.bindFramebuffer(g.READ_FRAMEBUFFER,this.msaaFB);g.bindFramebuffer(g.DRAW_FRAMEBUFFER,this.mainFB);g.blitFramebuffer(0,0,this.width,this.height,0,0,this.width,this.height,g.COLOR_BUFFER_BIT|g.DEPTH_BUFFER_BIT,g.NEAREST);}
 g.bindFramebuffer(g.FRAMEBUFFER,null);g.disable(g.DEPTH_TEST);g.useProgram(this.post);this.bindTex(this.post,'uColor',this.color,0);this.bindTex(this.post,'uDepth',this.screenDepth,1);this.bindTex(this.post,'uShadow',this.shadow,2);this.m4(this.post,'uInvVP',M.inverse(camera.vp));this.m4(this.post,'uLightVP',lightVP);this.v3(this.post,'uLight',lightPos);this.v3(this.post,'uTarget',s.target);g.uniform2f(this.loc(this.post,'uRes'),this.width,this.height);for(const [k,v]of Object.entries({uEdgeAA:this.msaaSamples?0:1,uHaze:settings.haze,uContrast:settings.contrast,uSpot:s.spot?1:0,uCone:s.cone??.8,uBackground:sc.background,uVolume:sc.volume||0,uExposure:settings.exposure}))this.f(this.post,k,v);g.drawArrays(g.TRIANGLES,0,3);this.drawCalls=objects.length*2+1;}
}

