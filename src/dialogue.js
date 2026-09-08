class Dialogue {
 constructor(app){this.app=app;this.enabled=true;this.names=true;this.voice=false;this.ambient=true;this.serial=0;this.history=[];this.layouts=[];this.nodes=new Map();this.nextAmbient=5;this.lastSpeech=new Map();this.fontSize=14;this.voiceWarning=false;}
 clear(){for(const a of this.app.actors)a.speech=null;this.nodes.clear();this.layouts=[];$('world-hud')?.replaceChildren();this.cancelVoice();this.nextAmbient=this.app.time+7;}
 cancelVoice(){if('speechSynthesis' in window)speechSynthesis.cancel();}
 voices(){return 'speechSynthesis'in window?speechSynthesis.getVoices().filter(v=>/^zh/i.test(v.lang)):[];}
 toggleVoice(on){this.voice=!!on;this.cancelVoice();if(on&&!('speechSynthesis'in window)){this.voice=false;this.app.toast('这个浏览器没有语音合成。头顶对白照常显示。');}else if(on&&!this.voices().length){this.voiceWarning=true;this.app.toast('当前未检测到中文声音；有中文语音包时才朗读。文字不受影响。',5000);}this.app.syncDialogueUI?.();}
 speakVoice(a,text){if(this.app.theatre?.active&&a.id!==this.app.theatre.speaker)return;if(!this.voice||this.app.paused||document.hidden||this.app.director?.playing)return;const voices=this.voices();if(!voices.length)return;this.cancelVoice();const u=new SpeechSynthesisUtterance(text);u.voice=voices[(a.id-1)%voices.length];u.lang=u.voice.lang;u.rate=.94+(a.id%3)*.025;u.pitch=.94+(a.id%4)*.055;u.onerror=()=>{};speechSynthesis.speak(u);}
 say(a,text,seconds=null){if(!a)return;const clean=String(text).trim().slice(0,140);if(!clean)return;const duration=clamp(seconds??(2.8+Array.from(clean).length*.15),2,24);a.speech={text:clean,started:this.app.time,until:this.app.time+duration,uid:++this.serial};this.log(a,clean);this.speakVoice(a,clean);return a.speech;}
 log(a,text){this.history.push({time:this.app.time,name:appearanceOf(a).name,actor:a.id,text});if(this.history.length>120)this.history.shift();const el=$('dialogue-log');if(el){el.replaceChildren();for(const row of this.history.slice(-30)){const line=document.createElement('p'),name=document.createElement('b');name.textContent=row.name+'　';line.append(name,document.createTextNode(row.text));el.append(line);}el.scrollTop=el.scrollHeight;}}
 tick(){const app=this.app;for(const a of app.actors){if(app.theatre?.active&&!Object.values(app.theatre.cast).includes(a.id))continue;if(a.speech&&a.speech.until>app.time&&!Number.isFinite(a.speech.started)){a.speech.started=app.time;a.speech.uid=++this.serial;this.log(a,a.speech.text);this.speakVoice(a,a.speech.text);}}
  if(!this.ambient||app.theatre?.active||app.director.playing||!app.exhibition.enabled||app.time<this.nextAmbient)return;
  this.nextAmbient=app.time+13;const available=app.actors.filter(a=>!a.speech||a.speech.until<app.time);if(!available.length)return;const a=available[(Math.floor(app.time/13))%available.length];
  if(app.living.pairs?.some(p=>p.a===a.id||p.b===a.id))return;
  const lines=app.scene.id===7?['这个位置，刚好能看到窗外。','忙完这一页，去喝杯茶吧。','先停一下，看看今天的光。']:app.scene.id===8?['水声一直在这里。','慢一点，松影还没有走远。','山不说话，风替它回答。']:app.scene.id===9?['转过这道门，就是另一座院子。','这壶茶，值得慢慢喝。','那边的桥上，风正好。']:['你的影子，比你先到了。','在这里，停下来也是一种动作。','那一点颜色，像一个还没说完的故事。'];this.say(a,lines[Math.floor(app.time/13)%lines.length],5.8);
 }
 draw(){const app=this.app,hud=$('world-hud');if(!hud)return;hud.replaceChildren();this.layouts=[];
  $('stand-up').hidden=!app.actor.seatId;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width',innerWidth);svg.setAttribute('height',innerHeight);svg.classList.add('bubble-leaders');hud.append(svg);
  const top=document.body.classList.contains('immersive')?18:(innerWidth<600?126:116),bottom=innerHeight-(document.body.classList.contains('immersive')?18:(innerWidth<600?181:153));
  const candidates=app.actors.filter(a=>this.enabled&&a.speech&&a.speech.until>app.time&&(!app.theatre?.active||a.id===app.theatre.speaker)).sort((a,b)=>(a.id===app.theatre?.speaker?-1:0)-(b.id===app.theatre?.speaker?-1:0));
  for(const a of candidates.slice(0,3)){
   const anchor=a.headWorld||[a.x,baseY(a)+(a.seatId?1.3:1.92),a.z],p=app.screen(anchor);
   if(!p.visible||p.x<6||p.x>innerWidth-6||p.y<top-30||p.y>innerHeight-25)continue;
   const text=a.speech.text,ap=appearanceOf(a),col=castColour(a),width=Math.min(innerWidth-32,innerWidth<600?218:260),font=this.fontSize;
   const chars=Math.max(9,Math.floor((width-24)/font)),lines=Math.max(1,Math.ceil(Array.from(text).length/chars)),height=lines*font*1.65+37;
   let x=clamp(p.x-width/2,12,innerWidth-width-12),y=clamp(p.y-height-19,top,Math.max(top,bottom-height));
   for(let pass=0;pass<5;pass++)for(const r of this.layouts){if(x<r.x+r.w+8&&x+width>r.x-8&&y<r.y+r.h+9&&y+height>r.y-9){if(y-height-12>=top)y=r.y-height-12;else if(r.x+ r.w+width+18<innerWidth)x=r.x+r.w+9;else if(r.x-width-9>=12)x=r.x-width-9;else y=clamp(r.y+r.h+10,top,Math.max(top,bottom-height));}}
   const div=document.createElement('div');div.className='dialogue-bubble';div.dataset.actor=String(a.id);div.style.cssText=`left:${x}px;top:${y}px;width:${width}px;--voice-colour:${col.hex};font-size:${font}px`;
   const name=document.createElement('span');name.className='bubble-name';name.textContent=ap.name;const body=document.createElement('span');body.className='bubble-text';
   const elapsed=Math.max(0,app.time-(a.speech.started??app.time)),count=matchMedia('(prefers-reduced-motion: reduce)').matches?140:Math.max(1,Math.floor(elapsed*23));body.textContent=Array.from(text).slice(0,count).join('');div.append(name,body);hud.append(div);
   const realHeight=div.offsetHeight;const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1',clamp(p.x,x+15,x+width-15));line.setAttribute('y1',y+realHeight);line.setAttribute('x2',p.x);line.setAttribute('y2',p.y+3);line.setAttribute('stroke',col.hex);line.setAttribute('stroke-opacity','.6');line.setAttribute('stroke-width','1');svg.append(line);
   this.layouts.push({id:a.id,x,y,w:width,h:Math.max(realHeight,height),anchor:p,text:body.textContent,name:ap.name,colour:col.hex,font});
  }
  if(this.names)for(const a of app.actors){if(app.theatre?.active&&!Object.values(app.theatre.cast).includes(a.id))continue;if(candidates.includes(a))continue;if(a!==app.actor&&!app.focused&&app.settings.zoom<1.7&&!app.theatre?.active)continue;const p=app.screen(a.headWorld||[a.x,a.y+1.9,a.z]);if(!p.visible||p.x<15||p.x>innerWidth-15||p.y<top||p.y>bottom)continue;const name=document.createElement('div');name.className='cast-label';name.textContent=appearanceOf(a).name;name.style.cssText=`left:${p.x}px;top:${p.y-10}px;border-color:${castColour(a).hex}`;hud.append(name);}
  if(app.showWorldLabels&&app.scene.world&&!app.focused&&!app.theatre?.active)for(const r of app.scene.rooms){const p=app.screen([r.x,.05,r.z]);if(!p.visible)continue;const tag=document.createElement('div');tag.className='room-tag';tag.textContent=r.name;tag.style.cssText=`left:${p.x}px;top:${p.y}px`;hud.append(tag);}
 }
}
