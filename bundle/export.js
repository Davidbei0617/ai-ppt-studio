export const PPTX_MIME='application/vnd.openxmlformats-officedocument.presentationml.presentation';
const palettes={ink:{bg:'102640',fg:'F2F5FC',muted:'8FA8C9',line:'2F4965'},paper:{bg:'F8F2E7',fg:'443C32',muted:'997C55',line:'D2C2AA'},forest:{bg:'173E35',fg:'F2F8ED',muted:'A7C99C',line:'3F6A57'}};
export function safeFilename(title){return (String(title||'演示文稿').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,80)||'演示文稿')+'.pptx';}
export function buildPresentation(Pptx,deck){
  if(!Array.isArray(deck?.slides)||!deck.slides.length)throw new Error('请先创建演示内容。');
  const pptx=new Pptx();pptx.layout='LAYOUT_WIDE';pptx.author='叙页 AI PPT Studio';pptx.subject=deck.audience||'';pptx.title=deck.title;pptx.company='叙页';pptx.lang='zh-CN';pptx.theme={headFontFace:'Microsoft YaHei',bodyFontFace:'Microsoft YaHei',lang:'zh-CN'};
  const p=palettes[deck.theme]||palettes.ink;
  const base={fontFace:'Microsoft YaHei',color:p.fg,lang:'zh-CN',margin:0,breakLine:false};
  deck.slides.forEach((page,index)=>{
    const slide=pptx.addSlide();slide.background={color:p.bg};
    slide.addText((deck.source==='ai'?'AI 演示':'演示文稿')+' / '+String(index+1).padStart(2,'0'),{...base,x:0.8,y:0.48,w:8,h:0.25,fontSize:10,color:p.muted});
    slide.addText('叙页 / STUDIO',{...base,x:10.25,y:0.48,w:2.25,h:0.25,fontSize:10,color:p.muted,align:'right'});
    slide.addShape(pptx.ShapeType.line,{x:0.8,y:0.95,w:11.7,h:0,line:{color:p.line,width:1}});
    slide.addText(page.title||'未命名页面',{...base,x:0.8,y:1.4,w:11.7,h:1.35,fontSize:page.title?.length>36?28:34,bold:true,valign:'mid',fit:'shrink'});
    const bullets=page.bullets.filter(Boolean);
    bullets.forEach((text,i)=>{
      const y=3.0+i*0.76;
      slide.addShape(pptx.ShapeType.ellipse,{x:0.84,y:y+0.19,w:0.065,h:0.065,line:{color:p.muted,transparency:100},fill:{color:p.muted}});
      slide.addText(text,{...base,x:1.08,y,w:11.3,h:0.7,fontSize:21,valign:'mid',fit:'shrink',paraSpaceAfterPt:0});
    });
    slide.addText(deck.audience||'面向所有听众',{...base,x:0.8,y:6.85,w:10,h:0.22,fontSize:10,color:p.muted});
    slide.addText(`${index+1} / ${deck.slides.length}`,{...base,x:11.1,y:6.85,w:1.4,h:0.22,fontSize:10,color:p.muted,align:'right'});
    slide.addNotes(page.notes||'');
  });
  return pptx;
}
// PptxGenJS 4.0.0 declares one master per slide but writes only master1.
// Remove only declarations for master parts that do not exist in the ZIP.
export async function createPptxBytes(Pptx,deck,Zip=globalThis.JSZip){
  if(!Zip)throw new Error('PPTX 压缩组件未加载，请刷新页面。');
  const raw=await buildPresentation(Pptx,deck).write({outputType:'arraybuffer',compression:true});
  const zip=await Zip.loadAsync(raw);
  const types=await zip.file('[Content_Types].xml').async('string');
  const fixed=types.replace(/<Override\b[^>]*PartName="([^"]+)"[^>]*\/>/g,(entry,part)=>{
    const relative=part.replace(/^\//,'');
    return /^ppt\/slideMasters\/slideMaster\d+\.xml$/.test(relative)&&!zip.file(relative)?'':entry;
  });
  if(fixed===types)return raw;
  zip.file('[Content_Types].xml',fixed);
  return zip.generateAsync({type:'arraybuffer',compression:'DEFLATE'});
}
let cachedUpload=null;
export async function exportPresentation({Pptx,deck,anna,localDownload=false,onProgress=()=>{}}){
  const filename=safeFilename(deck.title),signature=JSON.stringify(deck);
  if(anna&&!localDownload&&cachedUpload?.signature===signature){
    onProgress('正在重新发起下载…');await anna.files.download({path:cachedUpload.path,filename});return;
  }
  onProgress('正在生成可编辑 PPTX…');
  const bytes=await createPptxBytes(Pptx,deck);
  const blob=new Blob([bytes],{type:PPTX_MIME});
  if(!anna||localDownload){
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);return;
  }
  const path=`exports/${crypto.randomUUID()}.pptx`;
  onProgress('正在保存到 Anna 文件存储…');
  const upload=await anna.files.upload_init({path,content_type:PPTX_MIME,size:blob.size});
  let response;
  try {response=await fetch(upload.put_url,{method:'PUT',headers:upload.headers,body:blob});}
  catch {throw new Error('无法连接文件上传服务，请检查网络连接或平台文件跨域配置。');}
  if(!response.ok)throw new Error('文件上传失败（HTTP '+response.status+'），请重试导出。');
  await anna.files.upload_finalize({path,size_bytes:blob.size});
  cachedUpload={signature,path};
  onProgress('正在发起下载…');await anna.files.download({path,filename});
}

export function friendlyExportError(error){
  const msg=String(error?.message||error||'未知错误');
  if(/quota|insufficient|额度|容量/i.test(msg))return 'Anna 文件存储空间或额度不足，请检查账户后重试。';
  if(/network|fetch|502|503|timeout|timed.out/i.test(msg))return '文件上传或下载连接失败，请检查网络后重试。';
  if(/401|expired|unauthorized/i.test(msg))return '文件服务会话已过期，请刷新应用后重试。';
  return msg.slice(0,240);
}
