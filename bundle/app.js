import {exportPresentation,friendlyExportError} from './export.js';
import {askConfirmation} from './confirmation.js';
import {generateDeck,friendlyError} from './ai.js';
const $ = id => document.getElementById(id);
const KEY = 'xuye-preview-deck-v1';
let anna=null, busy=false, confirming=false, cloudReady=false, saveQueue=Promise.resolve();
const hostMode=new URLSearchParams(location.search).has('wid');
let active = 0, undo = null, saveTimer, toastTimer;
const themes = ['ink', 'paper', 'forest'];
function createDemo(topic, audience, count, theme) {
  const sections = [
    [topic, ['一份清晰的演示，从一个值得讨论的问题开始', '梳理背景、展开观点，最后落到行动'], '开场时用一个与听众相关的问题引入主题。'],
    ['为什么现在讨论这个话题', ['描述当前面临的实际场景', '找出最值得解决的一个问题', '明确这次讨论希望达成的共识'], '这里是示例提示，请替换为你的真实背景。'],
    ['从真实需求开始', ['了解听众已有的经验与困惑', '选择一个具体、可验证的目标', '用实际案例代替抽象描述'], '准备一个真实案例，并说明它与听众的关联。'],
    ['把想法拆成可执行的步骤', ['第一步：明确目标和输入', '第二步：小范围尝试并收集反馈', '第三步：复盘结果，调整方法'], '解释各步骤的负责人和预期产出。'],
    ['如何判断是否有效', ['提前定义成功的标准', '记录实际结果，不编造数据', '同时观察收益、成本和局限'], '用经过核实的信息补充这一页。'],
    ['从一个小行动开始', ['选择一个最容易落地的场景', '约定负责人和下一次复盘时间', '留出空间，听听大家的想法'], '邀请听众提出一个本周可以尝试的行动。']
  ];
  const slides = Array.from({length:count}, (_,i) => {
    const row = i === count-1 ? sections[5] : sections[Math.min(i,4)];
    return {title:row[0].slice(0,64),bullets:[...row[1]],notes:row[2]};
  });
  return {schema:1,title:topic,audience,theme,slides};
}
function validDeck(d) {
  return d && d.schema === 1 && typeof d.title === 'string' && typeof d.audience === 'string' && themes.includes(d.theme) && Array.isArray(d.slides) && d.slides.length > 0 && d.slides.length <= 30 && d.slides.every(s => typeof s.title === 'string' && s.title.length <= 64 && typeof s.notes === 'string' && Array.isArray(s.bullets) && s.bullets.length <= 4 && s.bullets.every(b=>typeof b === 'string' && b.length <= 60));
}
let deck = createDemo('让团队更高效地使用 AI','团队成员',6,'ink');
let restored = false;
try { const raw = hostMode ? null : localStorage.getItem(KEY); if(raw) { const saved = JSON.parse(raw); if(validDeck(saved)) {deck=saved;restored=true;} else toast('旧草稿格式不兼容，已加载示例。'); }} catch { toast('无法读取本地草稿，可使用 JSON 下载备份。'); }
function toast(message) { $('toast').textContent=message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4000); }
function persist() {
  clearTimeout(saveTimer);
  const snapshot=structuredClone(deck);
  if(hostMode) {
    if(!cloudReady) return;
    $('save-status').textContent='正在保存到 Anna…';
    saveQueue=saveQueue.then(()=>anna.storage.set({key:'decks/current',value:snapshot})).then(()=>{
      $('save-status').textContent='已保存到 Anna';
    }).catch(()=>{$('save-status').textContent='云端保存失败，请下载 JSON 备份';});
    return saveQueue;
  }
  try { localStorage.setItem(KEY,JSON.stringify(snapshot)); $('save-status').textContent='已保存到本机浏览器'; }
  catch { $('save-status').textContent='本地保存失败，请下载 JSON 草稿'; }
}
function scheduleSave() { $('save-status').textContent='正在保存…';clearTimeout(saveTimer);saveTimer=setTimeout(persist,300); }
function renderPreview() {
  const s=deck.slides[active];
  $('deck-title').textContent=deck.title;
  $('slide').className='slide '+deck.theme;
  $('slide-kicker').textContent=(deck.source==='ai'?'AI 演示 / ':'示例演示 / ')+String(active+1).padStart(2,'0');
  $('preview-title').textContent=s.title || '未命名页面';
  $('preview-bullets').replaceChildren(...s.bullets.filter(Boolean).map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
  $('preview-audience').textContent=deck.audience || '面向所有听众';
  $('preview-page').textContent=String(active+1).padStart(2,'0')+' / '+String(deck.slides.length).padStart(2,'0');
  $('page-counter').textContent=`第 ${active+1} / ${deck.slides.length} 页`;
}
function renderThumbnails() {
  $('thumbnails').replaceChildren(...deck.slides.map((s,i)=>{
    const b=document.createElement('button'); b.className='thumb'; b.setAttribute('aria-current',String(i===active));b.setAttribute('aria-label',`第 ${i+1} 页：${s.title}`);
    const n=document.createElement('small');n.textContent=String(i+1).padStart(2,'0');const t=document.createElement('strong');t.textContent=s.title || '未命名页面'; b.append(n,t);
    b.onclick=()=>{active=i;render();};return b;
  }));
}
function render() {
  const s=deck.slides[active];renderPreview();renderThumbnails();
  $('slide-title').value=s.title;$('bullets').value=s.bullets.join('\n');$('notes').value=s.notes;
  $('move-left').disabled=active===0;$('move-right').disabled=active===deck.slides.length-1;
  $('delete').disabled=deck.slides.length===1;$('undo').disabled=!undo;
  $('add').disabled=$('duplicate').disabled=deck.slides.length>=30;
}
$('topic').value=deck.title;$('audience').value=deck.audience;$('theme').value=deck.theme;
function setBusy(value,label="AI 正在构思演示…") {
  busy=value;
  for(const el of document.querySelectorAll('button,input,textarea,select')) el.disabled=value;
  if(!value) {render();$('generate').disabled=!anna;}
  $('generate').textContent=value?label:anna?'用 Anna AI 生成':'连接 Anna 后生成';
  $('brief-form').setAttribute('aria-busy',String(value));
}
$('brief-form').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||confirming||!anna)return;
  const brief={topic:$('topic').value.trim(),audience:$('audience').value.trim(),count:Number($('count').value),theme:$('theme').value};
  if(!brief.topic){toast('请先填写主题。');return;}
  confirming=true;
  const accepted=await askConfirmation(`将生成 ${brief.count} 页演示，使用你的 Anna 额度。成功后替换当前草稿，失败时保留草稿。`,{title:'生成 AI 演示',action:'确认并开始生成'});
  confirming=false;
  if(!accepted){$('generation-status').textContent='已取消生成，未发起 AI 请求。';return;}
  setBusy(true);$('generation-status').textContent='正在生成内容，通常需要几十秒，请保持页面打开…';
  try {
    const generated=await generateDeck(anna,brief);
    deck=generated;active=0;undo=null;render();await persist();
    const tokens=deck.usage?.totalTokens;
    $('generation-status').textContent=`已生成 ${deck.slides.length} 页${tokens?' · 本次 '+tokens+' tokens':''}。请核对内容后使用。`;
    toast('AI 演示已生成，可以开始编辑。');
  } catch(error) {$('generation-status').textContent=friendlyError(error);}
  finally {setBusy(false);}
});
$('demo').onclick=async()=>{
  if(busy||confirming)return;
  const topic=$('topic').value.trim();if(!topic){toast('请先填写主题。');return;}
  confirming=true;
  const accepted=await askConfirmation('创建免费示例将替换当前草稿。需要保留时，请先下载 JSON 草稿。',{title:'创建免费示例',action:'创建示例'});
  confirming=false;
  if(!accepted)return;
  deck=createDemo(topic,$('audience').value.trim(),Number($('count').value),$('theme').value);active=0;undo=null;render();persist();
  $('generation-status').textContent='免费示例来自固定模板，未调用 AI。';
};
$('theme').onchange=()=>{deck.theme=$('theme').value;renderPreview();scheduleSave();};
$('slide-title').oninput=()=>{deck.slides[active].title=$('slide-title').value;renderPreview();renderThumbnails();scheduleSave();};
$('bullets').oninput=()=>{
  const raw=$('bullets').value;const lines=raw.split('\n');const capped=lines.slice(0,4).map(s=>s.slice(0,60));
  if(lines.length>4 || lines.some(s=>s.length>60)){ $('bullets').value=capped.join('\n');toast('每页最多 4 条要点，每条最多 60 字。'); }
  deck.slides[active].bullets=capped;renderPreview();scheduleSave();
};
$('notes').oninput=()=>{deck.slides[active].notes=$('notes').value;scheduleSave();};
function change(fn){fn();render();persist();}
$('add').onclick=()=>{if(deck.slides.length>=30)return;change(()=>{deck.slides.splice(active+1,0,{title:'新的观点',bullets:['在这里写下这一页的核心内容'],notes:''});active++;});};
$('duplicate').onclick=()=>{if(deck.slides.length>=30)return;change(()=>{deck.slides.splice(active+1,0,structuredClone(deck.slides[active]));active++;});};
$('delete').onclick=()=>{if(deck.slides.length<=1)return;change(()=>{undo=structuredClone(deck);deck.slides.splice(active,1);active=Math.min(active,deck.slides.length-1);});toast('已删除当前页，可以撤销。');};
$('undo').onclick=()=>{if(!undo)return;change(()=>{deck=undo;undo=null;active=Math.min(active,deck.slides.length-1);$('theme').value=deck.theme;});};
function move(delta){const to=active+delta;if(to<0||to>=deck.slides.length)return;change(()=>{[deck.slides[active],deck.slides[to]]=[deck.slides[to],deck.slides[active]];active=to;});}
$('move-left').onclick=()=>move(-1);$('move-right').onclick=()=>move(1);
$('backup').onclick=()=>{
  const blob=new Blob([JSON.stringify(deck,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(deck.title.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,60)||'演示草稿')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);toast('已发起 JSON 草稿下载。这不是 PPTX 文件。');
};
window.addEventListener('pagehide',persist);
render();$('save-status').textContent=restored?'已恢复本机浏览器草稿':'示例已就绪 · 修改后自动保存';

async function connectHost() {
  if(!hostMode) {
    $('connection-status').textContent='本地预览 · 免费示例可用';
    $('generation-status').textContent='真实 AI 请在 Anna 开发环境中打开应用。';
    return;
  }
  setBusy(true);
  try {
    const {AnnaAppRuntime}=await import('/static/anna-apps/_sdk/latest/index.js');
    anna=await AnnaAppRuntime.connect();
    const saved=await anna.storage.get({key:'decks/current'});
    const value=saved?.value ?? (saved?.schema===1?saved:null);
    if(value && !validDeck(value))throw new Error('云端草稿格式无法识别，已停止写入以保护原草稿。');
    if(value){deck=value;active=0;$('topic').value=deck.topic||deck.title;$('audience').value=deck.audience;$('theme').value=deck.theme;render();}
    cloudReady=true;
    $('connection-status').textContent='Anna 已连接 · AI 生成可用';
    $('save-status').textContent=value?'已恢复 Anna 草稿':'Anna 云端草稿已就绪';
    $('generation-status').textContent='选择页数后点击生成，将使用你的 Anna 额度。';
  } catch(error) {
    anna=null;cloudReady=false;
    $('connection-status').textContent='Anna 连接失败';
    $('generation-status').textContent=friendlyError(error);
  } finally {setBusy(false);}
}
connectHost();


$('export-pptx').onclick=async()=>{
  if(busy||confirming)return;
  if(!globalThis.PptxGenJS){$('export-status').textContent='PPTX 组件加载失败，请刷新后重试。';return;}
  if(hostMode&&!anna){$('export-status').textContent='请先连接 Anna，再导出文件。';return;}
  setBusy(true,'正在导出…');$('export-pptx').textContent='正在导出…';
  try {
    await exportPresentation({Pptx:globalThis.PptxGenJS,deck:structuredClone(deck),anna,localDownload:['localhost','127.0.0.1','[::1]'].includes(location.hostname),onProgress:message=>{$('export-status').textContent=message;}});
    $('export-status').textContent='已发起 PPTX 下载，可在 PowerPoint 或 WPS 中继续编辑。';
    toast('已发起下载，请查看浏览器下载列表。');
  } catch(error) {$('export-status').textContent='导出失败：'+friendlyExportError(error)+' 可再次点击导出重试。';}
  finally {setBusy(false);$('export-pptx').textContent='导出 PPTX ↓';}
};
