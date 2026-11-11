import {exportPresentation,friendlyExportError} from './export.js';
import {askConfirmation} from './confirmation.js';
import {generateDeck,rewriteSlide,friendlyError} from './ai.js';
import {ProjectStore,localAdapter,annaAdapter,LAYOUTS,slideLayout} from './projects.js';
const $=id=>document.getElementById(id),hostMode=new URLSearchParams(location.search).has('wid');
let anna=null,store=null,projectId=null,active=0,busy=true,confirming=false,dirty=false,editVersion=0,saveTimer,toastTimer,saveQueue=Promise.resolve(),proposal=null,undo=null;
function createDemo(topic='让团队更高效地使用 AI',audience='团队成员',count=6,theme='ink'){
 const rows=[['一个值得讨论的问题',['明确希望解决的实际问题','给听众一个清晰的讨论目标']],['从需求开始',['梳理当前的工作场景','选择可验证的小目标']],['不同方法的比较',['现状：任务分散、重复劳动多','新方案：集中资料、逐步自动化','现状：结果依赖个人经验','新方案：用检查清单记录反馈']],['把想法落到行动',['明确目标：选择一个具体场景','小范围尝试：记录实际结果','复盘改进：调整执行方式']],['如何判断有效',['提前定义成功标准','同时记录收益和投入']],['下一步行动',['选择一个本周可以尝试的场景','约定负责人和复盘时间']]];
 return {schema:1,title:topic,topic,audience,theme,slides:Array.from({length:count},(_,i)=>{const row=rows[i===count-1?5:Math.min(i,4)];return {title:i===0?topic:row[0],bullets:[...row[1]],notes:'固定示例，请根据真实情况补充讲述内容。',layout:i===0?'cover':i===count-1?'summary':i===2?'compare':i===3?'process':'content'};})};
}
let deck=createDemo();
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast')?.classList.remove('visible'),4000);}
async function confirmAction(message,options){if(confirming)return false;confirming=true;try{return await askConfirmation(message,options);}finally{confirming=false;}}
function markDirty(){dirty=true;editVersion++;$('save-status').textContent='正在保存…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>persist().catch(()=>{}),600);}
async function persist(){
 clearTimeout(saveTimer);if(!store||!projectId||!dirty)return saveQueue;
 const id=projectId,snapshot=structuredClone(deck),version=editVersion;
 const task=saveQueue.then(()=>store.save(id,snapshot));saveQueue=task.catch(()=>{});
 try{await task;if(id===projectId&&version===editVersion)dirty=false;$('save-status').textContent=hostMode?'已保存到 Anna':'已保存到本机浏览器';renderProjects();}
 catch(e){$('save-status').textContent='保存失败：'+friendlyError(e);throw e;}
}
function renderProjects(){
 if(!store)return;const selected=$('project-select').value;const trash=$('show-trash').checked;
 const items=store.index.items.filter(i=>!!i.deleted===trash).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
 $('project-select').replaceChildren(...items.map(item=>{const opt=document.createElement('option');opt.value=item.id;opt.textContent=`${item.title} · ${item.pages} 页`;return opt;}));
 if(!trash)$('project-select').value=projectId;else if(items.some(i=>i.id===selected))$('project-select').value=selected;
 $('project-count').textContent=trash?`回收站 ${items.length} 项`:`${items.length} 个项目`;
 $('restore-project').hidden=!trash;$('project-select').disabled=busy||!items.length;
}
function renderPreview(){
 const page=deck.slides[active],layout=slideLayout(page);$('deck-title').textContent=deck.title;
 $('slide').className='slide '+deck.theme+' layout-'+layout;
 $('slide-kicker').textContent=LAYOUTS[layout]+' / '+String(active+1).padStart(2,'0');$('preview-title').textContent=page.title||'未命名页面';
 const list=$('preview-bullets');list.replaceChildren(...page.bullets.filter(Boolean).map((text,i)=>{const li=document.createElement('li');if(layout==='process'||layout==='summary'){const n=document.createElement('span');n.className='step-number';n.textContent=String(i+1).padStart(2,'0');li.append(n);}const t=document.createElement('span');t.textContent=text;li.append(t);return li;}));
 $('preview-audience').textContent=deck.audience||'面向所有听众';$('preview-page').textContent=`${active+1} / ${deck.slides.length}`;$('page-counter').textContent=`第 ${active+1} / ${deck.slides.length} 页`;
}
function renderThumbnails(){
 $('thumbnails').replaceChildren(...deck.slides.map((s,i)=>{const b=document.createElement('button');b.className='thumb';b.disabled=busy;b.setAttribute('aria-current',String(i===active));b.setAttribute('aria-label',`第 ${i+1} 页：${s.title}`);const n=document.createElement('small');n.textContent=`${i+1} · ${LAYOUTS[slideLayout(s)]}`;const t=document.createElement('strong');t.textContent=s.title||'未命名页面';b.append(n,t);b.onclick=()=>{if(busy)return;active=i;proposal=null;render();};return b;}));
}
function renderProposal(){
 $('rewrite-review').hidden=!proposal;
 if(proposal){$('rewrite-preview-title').textContent=proposal.page.title;$('rewrite-preview-body').textContent=proposal.page.bullets.join('\n');$('rewrite-preview-notes').textContent=proposal.page.notes;}
}
function render(){
 renderPreview();renderThumbnails();renderProposal();
 const s=deck.slides[active];$('slide-title').value=s.title;$('bullets').value=s.bullets.join('\n');$('notes').value=s.notes;$('layout').value=slideLayout(s);
 for(const el of document.querySelectorAll('button,input,textarea,select'))el.disabled=busy;
 $('generate').disabled=busy||!anna;for(const b of document.querySelectorAll('[data-rewrite]'))b.disabled=busy||!anna;
 $('move-left').disabled=busy||active===0;$('move-right').disabled=busy||active===deck.slides.length-1;
 $('delete').disabled=busy||deck.slides.length===1;$('undo').disabled=busy||!undo;
 $('add').disabled=$('duplicate').disabled=busy||deck.slides.length>=30;
 $('generate').textContent=busy?'正在处理…':anna?'用 Anna AI 新建项目':'连接 Anna 后生成';
 renderProjects();
}
function syncBrief(){$('topic').value=deck.topic||deck.title;$('audience').value=deck.audience;$('theme').value=deck.theme;$('project-name').value=deck.title;}
function lock(value){busy=value;$('brief-form').setAttribute('aria-busy',String(value));render();}
async function run(action){if(busy||confirming)return;lock(true);try{await action();}catch(e){toast(friendlyError(e));$('generation-status').textContent=friendlyError(e);}finally{lock(false);}}
async function openProject(id){await persist();deck=await store.open(id);projectId=id;active=0;proposal=null;undo=null;dirty=false;syncBrief();render();$('save-status').textContent='草稿已恢复';}
async function newProject(value){await persist();const id=await store.create(value);await openProject(id);$('show-trash').checked=false;renderProjects();}
$('project-select').onchange=e=>{if($('show-trash').checked)return;const id=e.target.value;run(()=>openProject(id));};
$('show-trash').onchange=()=>renderProjects();
$('restore-project').onclick=()=>run(async()=>{const id=$('project-select').value;if(!id)return;await store.archive(id,false);$('show-trash').checked=false;await openProject(id);toast('项目已恢复。');});
$('new-project').onclick=()=>run(()=>newProject({schema:1,title:'未命名项目',audience:'',theme:deck.theme,slides:[{title:'演示标题',bullets:['在这里写下你的想法'],notes:'',layout:'cover'}]}));
$('clone-project').onclick=()=>run(async()=>{await newProject({...structuredClone(deck),title:(deck.title+' · 副本').slice(0,100)});toast('已复制项目。');});
$('archive-project').onclick=async()=>{if(busy)return;if(!await confirmAction('项目将移入回收站，可以恢复。',{title:'移入回收站',action:'移入回收站'}))return;run(async()=>{await persist();await store.archive(projectId);let next=store.index.items.find(i=>!i.deleted);if(!next){const id=await store.create(createDemo());next={id};}await openProject(next.id);toast('项目已移入回收站。');});};
$('project-name').onchange=()=>{const value=$('project-name').value.trim();if(!value){$('project-name').value=deck.title;return;}deck.title=value;renderPreview();markDirty();};
$('save-now').onclick=()=>run(()=>persist());
$('brief-form').onsubmit=async e=>{
 e.preventDefault();if(busy||confirming||!anna)return;
 const brief={topic:$('topic').value.trim(),audience:$('audience').value.trim(),count:Number($('count').value),theme:$('theme').value};if(!brief.topic)return;
 if(!await confirmAction(`将生成 ${brief.count} 页并创建独立项目，使用 Anna 额度。现有项目保留。`,{title:'生成 AI 演示',action:'生成新项目'}))return;
 run(async()=>{$('generation-status').textContent='AI 正在规划内容与版式…';await persist();const generated=await generateDeck(anna,brief);await newProject(generated);$('generation-status').textContent=`已生成 ${deck.slides.length} 页 · ${deck.usage?.totalTokens||'—'} tokens，请核对内容。`;});
};
$('demo').onclick=()=>run(()=>newProject(createDemo($('topic').value.trim()||'示例演示',$('audience').value.trim(),Number($('count').value),$('theme').value)));
$('theme').onchange=()=>{deck.theme=$('theme').value;renderPreview();markDirty();};
$('layout').onchange=()=>{deck.slides[active].layout=$('layout').value;renderPreview();renderThumbnails();markDirty();};
$('slide-title').oninput=()=>{deck.slides[active].title=$('slide-title').value;proposal=null;renderProposal();renderPreview();renderThumbnails();markDirty();};
$('bullets').oninput=()=>{const lines=$('bullets').value.split('\n');const capped=lines.slice(0,4).map(s=>s.slice(0,60));if(lines.length>4||lines.some(s=>s.length>60)){$('bullets').value=capped.join('\n');toast('最多 4 条，每条最多 60 字。');}deck.slides[active].bullets=capped;proposal=null;renderProposal();renderPreview();markDirty();};
$('notes').oninput=()=>{deck.slides[active].notes=$('notes').value;proposal=null;renderProposal();markDirty();};
function change(fn){if(busy)return;fn();proposal=null;render();markDirty();}
$('add').onclick=()=>{if(deck.slides.length<30)change(()=>{deck.slides.splice(++active,0,{title:'新的观点',bullets:['填写核心内容'],notes:'',layout:'content'});});};
$('duplicate').onclick=()=>{if(deck.slides.length<30)change(()=>{deck.slides.splice(active+1,0,structuredClone(deck.slides[active]));active++;});};
$('delete').onclick=()=>{if(deck.slides.length>1)change(()=>{undo={type:'delete',index:active,page:structuredClone(deck.slides[active])};deck.slides.splice(active,1);active=Math.min(active,deck.slides.length-1);});};
$('undo').onclick=()=>{if(undo)change(()=>{if(undo.type==='delete'){if(deck.slides.length>=30){toast('请先删除一页后再恢复。');return;}deck.slides.splice(undo.index,0,undo.page);active=undo.index;}else{if(JSON.stringify(deck.slides[undo.index])!==undo.after){toast('该页已修改，无法直接撤销，请手动调整。');return;}deck.slides[undo.index]=undo.page;active=undo.index;}undo=null;});};
function move(delta){const to=active+delta;if(to>=0&&to<deck.slides.length)change(()=>{[deck.slides[active],deck.slides[to]]=[deck.slides[to],deck.slides[active]];active=to;undo=null;});}
$('move-left').onclick=()=>move(-1);$('move-right').onclick=()=>move(1);
for(const button of document.querySelectorAll('[data-rewrite]'))button.onclick=async()=>{
 if(busy||!anna)return;
 if(!await confirmAction('仅改写当前页，使用少量 Anna 额度。结果先预览，确认采用后才替换原页。',{title:button.textContent,action:'开始改写'}))return;
 run(async()=>{$('rewrite-status').textContent='正在改写当前页…';const original=JSON.stringify(deck.slides[active]);const page=await rewriteSlide(anna,{slide:structuredClone(deck.slides[active]),topic:deck.topic||deck.title,audience:deck.audience,action:button.dataset.rewrite});proposal={page,original,index:active,projectId};$('rewrite-status').textContent='候选内容已就绪，请核对后采用。';renderProposal();});
};
$('accept-rewrite').onclick=()=>change(()=>{if(!proposal||proposal.projectId!==projectId||proposal.index!==active||proposal.original!==JSON.stringify(deck.slides[active])){toast('原页面已变更，请重新改写。');return;}undo={type:'rewrite',index:active,page:structuredClone(deck.slides[active]),after:JSON.stringify(proposal.page)};deck.slides[active]=proposal.page;$('rewrite-status').textContent='已采用，可撤销。';});
$('reject-rewrite').onclick=()=>{proposal=null;renderProposal();$('rewrite-status').textContent='已保留原页。';};
$('backup').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(deck,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='演示草稿.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);};
$('export-pptx').onclick=()=>run(async()=>{if(!globalThis.PptxGenJS)throw Error('导出组件未加载，请刷新。');try{await persist();await exportPresentation({Pptx:globalThis.PptxGenJS,deck:structuredClone(deck),anna,localDownload:['localhost','127.0.0.1','[::1]'].includes(location.hostname),onProgress:message=>$('export-status').textContent=message});$('export-status').textContent='已发起 PPTX 下载，请查看浏览器下载列表。';}catch(e){$('export-status').textContent='导出失败：'+friendlyExportError(e);}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist().catch(()=>{});});
window.addEventListener('pagehide',()=>persist().catch(()=>{}));
async function boot(){
 render();try{
 if(hostMode){const {AnnaAppRuntime}=await import('/static/anna-apps/_sdk/latest/index.js');anna=await AnnaAppRuntime.connect();store=new ProjectStore(annaAdapter(anna));}else store=new ProjectStore(localAdapter(localStorage));
 await store.init(createDemo());const first=store.index.items.find(i=>!i.deleted);if(!first)throw Error('没有可用项目，请从回收站恢复。');projectId=first.id;deck=await store.open(projectId);syncBrief();
 $('connection-status').textContent=anna?'Anna 已连接 · 1.1 开发版':'本地预览 · 1.1 开发版';$('save-status').textContent='项目已恢复';
 busy=false;render();
 }catch(e){$('connection-status').textContent='草稿加载失败，已停止写入';$('generation-status').textContent=friendlyError(e);}
}
boot();
