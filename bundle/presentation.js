import {LAYOUTS,slideLayout} from './projects.js';
export function renderSlidePreview(element,deck,index){
 const page=deck.slides[index],layout=slideLayout(page),doc=element.ownerDocument;
 element.className='slide '+deck.theme+' layout-'+layout;
 element.querySelector('.slide-top span').textContent=LAYOUTS[layout]+' / '+String(index+1).padStart(2,'0');
 element.querySelector('.slide-content h3').textContent=page.title||'未命名页面';
 element.querySelector('.slide-content ul').replaceChildren(...page.bullets.filter(Boolean).map((text,i)=>{
  const li=doc.createElement('li');if(layout==='process'||layout==='summary'){const number=doc.createElement('span');number.className='step-number';number.textContent=String(i+1).padStart(2,'0');li.append(number);}
  const span=doc.createElement('span');span.textContent=text;li.append(span);return li;
 }));
 const footer=element.querySelectorAll('.slide-bottom span');footer[0].textContent=deck.audience||'面向所有听众';footer[1].textContent=`${index+1} / ${deck.slides.length}`;
}
export function createSlideshow({overlay,stage,template,previous,next,counter,close,fullscreen,hint,onOpen=()=>{},onExit=()=>{}}){
 const doc=overlay.ownerDocument;let deck=null,index=0,returnFocus=null,native=false;
 function render(){const slide=template.cloneNode(true);slide.removeAttribute('id');for(const node of slide.querySelectorAll('[id]'))node.removeAttribute('id');renderSlidePreview(slide,deck,index);stage.replaceChildren(slide);previous.disabled=index===0;next.disabled=index===deck.slides.length-1;counter.textContent=`${index+1} / ${deck.slides.length}`;}
 function go(value){if(!deck)return;index=Math.max(0,Math.min(deck.slides.length-1,value));render();}
 function finish(){if(!deck)return;const last=index;deck=null;overlay.hidden=true;if(doc.fullscreenElement===overlay)Promise.resolve(doc.exitFullscreen?.()).catch(()=>{});native=false;onExit(last);returnFocus?.focus();}
 async function enterFullscreen(){if(!deck)return;if(!overlay.requestFullscreen){hint.textContent='当前环境不支持全屏，可继续在窗口内放映。';return;}try{await overlay.requestFullscreen();native=true;hint.textContent='← → 翻页 · Esc 退出';}catch{hint.textContent='当前环境限制了全屏，已保留窗口放映。';}}
 overlay.addEventListener('keydown',event=>{
  if(!deck||event.ctrlKey||event.metaKey||event.altKey)return;
  if(['ArrowRight','ArrowDown','PageDown',' '].includes(event.key)){event.preventDefault();go(index+1);}
  else if(['ArrowLeft','ArrowUp','PageUp'].includes(event.key)){event.preventDefault();go(index-1);}
  else if(event.key==='Home'){event.preventDefault();go(0);}else if(event.key==='End'){event.preventDefault();go(deck.slides.length-1);}
  else if(event.key==='Escape'){event.preventDefault();finish();}
  else if(event.key==='Tab'){const buttons=[...overlay.querySelectorAll('button')].filter(b=>!b.disabled);const first=buttons[0],last=buttons.at(-1);if(event.shiftKey&&(doc.activeElement===first||doc.activeElement===overlay)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}}
 });
 doc.addEventListener('fullscreenchange',()=>{if(doc.fullscreenElement===overlay)native=true;else if(native)finish();});
 previous.onclick=()=>go(index-1);next.onclick=()=>go(index+1);close.onclick=finish;fullscreen.onclick=enterFullscreen;
 return {open(value,start=0){deck=structuredClone(value);index=Math.max(0,Math.min(deck.slides.length-1,start));returnFocus=doc.activeElement;native=false;overlay.hidden=false;hint.textContent='← → 翻页 · Home / End 首尾页 · Esc 退出';render();onOpen();overlay.focus();},close:finish};
}
