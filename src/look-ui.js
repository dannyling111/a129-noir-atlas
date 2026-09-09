/* Look controls are independent of scene loading, actor simulation and camera. */
App.prototype.setLook=function(patch={},persist=true){
 if(this.director?.playing)this.director.lookOverride=true;
 this.look=normalizeLook({...this.look,...patch,colours:patch.colours?{...this.look?.colours,...patch.colours}:this.look?.colours});
 if(persist){try{localStorage.setItem(LOOK_STORAGE,JSON.stringify(this.look));this.lookSaved=true;}catch(_){this.lookSaved=false;}}
 this.syncLookUI?.();this.draw();
};
App.prototype.syncLookUI=function(){
 if(!$('look-mode-mono'))return;
 const l=this.look||normalizeLook(),color=l.mode==='color';
 document.body.classList.toggle('colour-world',color);
 for(const mode of ['mono','color'])$('look-mode-'+mode).setAttribute('aria-pressed',String(l.mode===mode));
 $('look-mode-note').textContent=color?'按物体材质上色，不改变场景、镜头与人物。':'纯净黑白：场景不采样纹理，保留正常光影。';
 $('look-controls').disabled=!color;
 $('look-keep-accents').checked=l.keepAccents;
 for(const k of ['saturation','texture','gloss']){
  $('look-'+k).value=l[k];$('look-'+k+'-value').value=Math.round(l[k]*100)+'%';
 }
 for(const key of LOOK_COLOUR_KEYS){const el=$('look-colour-'+key);el.value=l.colours[key];}
 for(const el of document.querySelectorAll('[data-look-preset]'))el.setAttribute('aria-pressed',String(el.dataset.lookPreset===l.palette&&LOOK_COLOUR_KEYS.every(k=>l.colours[k]===LOOK_PRESETS[l.palette].colours[k])));
 $('look-storage-note').textContent=this.lookSaved===false?'此浏览器禁止本地存储；本次设置仍然有效，可导出配色。':'选择会在此浏览器自动保存；也可以导出配色文件。';
};
App.prototype.setupLookUI=function(){
 const sub=document.querySelector('.brand-sub');sub.classList.add('look-menu');
 sub.innerHTML='<span class="look-version">5.4</span><div class="look-segments" role="group" aria-label="画面模式"><button id="look-mode-mono" type="button" aria-pressed="false">黑白</button><button id="look-mode-color" type="button" aria-pressed="true">彩色</button></div><button id="look-toggle" type="button" aria-expanded="false" aria-controls="look-panel">配色 <span aria-hidden="true">⚙</span></button>';
 const colourNames={wall:'墙面',stone:'石材 / 铺地',wood:'原木',roof:'屋瓦 / 巨物',foliage:'植物',water:'水面',trim:'门窗 / 梁柱'};
 document.body.insertAdjacentHTML('beforeend',`<aside id="look-panel" class="look-panel ui" hidden aria-label="材质与配色设置">
 <div class="look-panel-heading"><div><small>CHROMA / 5.4</small><h2>材质与配色</h2></div><button id="look-close" type="button" aria-label="关闭配色面板">×</button></div>
 <p id="look-mode-note"></p>
 <fieldset id="look-controls"><legend>彩色材质设置</legend>
 <div class="look-presets">${Object.entries(LOOK_PRESETS).map(([key,p])=>`<button data-look-preset="${key}" type="button" aria-pressed="false"><span class="look-dots">${['wall','wood','roof','foliage','water'].map(k=>`<i style="background:${p.colours[k]}"></i>`).join('')}</span><strong>${p.name}</strong><small>${p.note}</small></button>`).join('')}</div>
 <div class="look-sliders">
 ${[['saturation','场景饱和度',1.5,1,'0 = 去饱和；仍保留材质'],['texture','纹理强度',1,.58,'0 = 无纹理；1 = 清晰细节'],['gloss','柔和光泽',1,.25,'从哑光到少量高光，不做镜面']].map(([k,label,max,v,hint])=>`<label class="look-slider"><span>${label}<output id="look-${k}-value"></output></span><input id="look-${k}" type="range" min="0" max="${max}" step=".01" value="${v}" aria-label="${label}"><small>${hint}</small></label>`).join('')}
 </div>
 <details class="look-custom"><summary>单独调整材质颜色</summary><div class="look-colours">${LOOK_COLOUR_KEYS.map(k=>`<label><span>${colourNames[k]}</span><input type="color" id="look-colour-${k}" aria-label="${colourNames[k]}颜色" value="${LOOK_PRESETS.natural.colours[k]}"></label>`).join('')}</div></details>
 </fieldset>
 <label class="look-checkbox"><input id="look-keep-accents" type="checkbox" checked>保留人物与小物件的彩色点缀</label>
 <small class="look-hint">关闭此项并选择“黑白”，可得到包括人物在内的纯黑白画面。彩色模式的服装保持角色原有颜色。</small>
 <div class="look-footer"><button type="button" id="look-reset">恢复推荐</button><button type="button" id="look-save">导出配色</button><button type="button" id="look-import">导入</button><input type="file" id="look-file" accept=".json,application/json" hidden></div>
 <p id="look-message" role="status"></p><small id="look-storage-note"></small>
 </aside>`);
 for(const mode of ['mono','color'])$('look-mode-'+mode).onclick=()=>this.setLook({mode});
 const close=()=>{$('look-panel').hidden=true;$('look-toggle').setAttribute('aria-expanded','false');};
 $('look-toggle').onclick=()=>{
  const open=$('look-panel').hidden;
  for(const id of ['settings','motion-panel','director-panel','cast-panel','theatre-panel','places-panel','social-panel'])$(id).hidden=true;
  $('look-panel').hidden=!open;$('look-toggle').setAttribute('aria-expanded',String(open));this.syncLookUI();
 };
 $('look-close').onclick=close;
 for(const el of document.querySelectorAll('[data-look-preset]'))el.onclick=()=>{
  const p=LOOK_PRESETS[el.dataset.lookPreset];this.setLook({mode:'color',palette:el.dataset.lookPreset,colours:{...p.colours}});
 };
 for(const k of ['saturation','texture','gloss'])$('look-'+k).oninput=e=>this.setLook({[k]:Number(e.target.value)});
 for(const k of LOOK_COLOUR_KEYS)$('look-colour-'+k).oninput=e=>this.setLook({colours:{[k]:e.target.value}});
 $('look-keep-accents').onchange=e=>this.setLook({keepAccents:e.target.checked});
 $('look-reset').onclick=()=>{this.setLook(normalizeLook({mode:this.look.mode}));$('look-message').textContent='已恢复推荐配色与材质强度。';};
 $('look-save').onclick=()=>{const blob=new Blob([JSON.stringify({schema:LOOK_SCHEMA,look:normalizeLook(this.look)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='NOIR_ATLAS_colour_palette.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('look-import').onclick=()=>$('look-file').click();$('look-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;try{if(file.size>16384)throw new Error('配色文件不能大于 16 KB。');this.setLook(validateLook(await file.text()));$('look-message').textContent='配色已应用，镜头和人物未改变。';}catch(err){$('look-message').textContent=err.message;}e.target.value='';
 };
 document.addEventListener('click',e=>{if(e.target.closest('#settings-toggle,#motion-toggle,#director-toggle,#cast-toggle,#theatre-toggle,#world-guide,#nearby,[data-scene]'))close();},{capture:true});
 document.addEventListener('keydown',e=>{if(e.code==='Escape')close();});
 this.syncLookUI();
};
