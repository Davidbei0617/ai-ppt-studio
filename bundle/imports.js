import {validateDeck} from './projects.js';
export const MAX_IMPORT_BYTES=1024*1024;
export function parseDraft(text){
 if(typeof text!=='string'||new TextEncoder().encode(text).length>MAX_IMPORT_BYTES)throw Error('JSON 草稿不能超过 1 MB。');
 let value;try{value=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw Error('文件不是有效的 JSON 草稿，请选择应用导出的 .json 文件。');}
 if(!validateDeck(value)||value.audience.length>60)throw Error('草稿格式不正确：请检查版本、主题、页数及文字长度（最多 30 页，每页最多 4 条要点）。');
 // Keep only supported data fields; do not import arbitrary metadata.
 return {schema:1,title:value.title.trim()||'导入的演示',topic:typeof value.topic==='string'?value.topic.slice(0,100):value.title,audience:value.audience,theme:value.theme,source:value.source==='ai'?'ai':'import',slides:value.slides.map(s=>({title:s.title,bullets:[...s.bullets],notes:s.notes,...(s.layout?{layout:s.layout}:{})}))};
}
export async function readDraftFile(file){
 if(!file||!file.name.toLowerCase().endsWith('.json'))throw Error('请选择 .json 草稿文件。');
 if(file.size>MAX_IMPORT_BYTES)throw Error('JSON 草稿不能超过 1 MB。');
 return parseDraft(await file.text());
}
