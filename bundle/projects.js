export const LAYOUTS={cover:'封面',content:'内容',compare:'双栏对比',process:'步骤流程',summary:'总结'};
export function slideLayout(slide){return Object.hasOwn(LAYOUTS,slide.layout)?slide.layout:'content';}
export function validateDeck(d){
 return !!(d&&d.schema===1&&typeof d.title==='string'&&d.title.length<=100&&typeof d.audience==='string'&&['ink','paper','forest'].includes(d.theme)&&Array.isArray(d.slides)&&d.slides.length>0&&d.slides.length<=30&&d.slides.every(s=>s&&typeof s.title==='string'&&s.title.length<=64&&typeof s.notes==='string'&&s.notes.length<=2000&&Array.isArray(s.bullets)&&s.bullets.length<=4&&s.bullets.every(b=>typeof b==='string'&&b.length<=60)&&(!s.layout||Object.hasOwn(LAYOUTS,s.layout))));
}
export function localAdapter(storage){return {
 async get(key){const raw=storage.getItem('xuye:'+key);if(!raw)return {exists:false};return {exists:true,...JSON.parse(raw)};},
 async set(key,value,etag){const old=await this.get(key);if(etag&&old.etag!==etag)throw Error('草稿已在其他窗口修改，请刷新后再编辑。');const next={value,etag:crypto.randomUUID()};storage.setItem('xuye:'+key,JSON.stringify(next));return next;},
 async legacy(){const raw=storage.getItem('xuye-preview-deck-v1');return raw?JSON.parse(raw):null;}
};}
export function annaAdapter(anna){return {
 get:key=>anna.storage.get({key}),set:(key,value,etag)=>anna.storage.set({key,value,...(etag?{if_match:etag}:{})}),
 async legacy(){const result=await anna.storage.get({key:'decks/current'});return result?.value??null;}
};}
export class ProjectStore {
 constructor(adapter){this.adapter=adapter;this.etags=new Map();this.index={schema:2,items:[]};}
 async readIndex(){const r=await this.adapter.get('projects/index-v2');if(r.exists){if(r.value?.schema!==2||!Array.isArray(r.value.items))throw Error('项目列表格式异常，已停止写入。');this.index=r.value;}return r;}
 async changeIndex(fn){const r=await this.readIndex();const next=structuredClone(this.index);fn(next.items);await this.adapter.set('projects/index-v2',next,r.etag);this.index=next;}
 async init(initial){const r=await this.readIndex();if(!r.exists){const legacy=await this.adapter.legacy();if(legacy&&!validateDeck(legacy))throw Error('旧版草稿格式异常，已保留原数据。');await this.create(legacy||initial);}return this.index.items;}
 async open(id){const item=this.index.items.find(i=>i.id===id&&!i.deleted);if(!item)throw Error('项目不存在或已移入回收站。');const r=await this.adapter.get('projects/'+id);if(!r.exists||!validateDeck(r.value))throw Error('草稿无法读取，已停止覆盖。');this.etags.set(id,r.etag);return structuredClone(r.value);}
 async create(deck){if(!validateDeck(deck))throw Error('项目内容格式不正确。');if(this.index.items.filter(i=>!i.deleted).length>=100)throw Error('最多保留 100 个活动项目，请先将不用的项目移入回收站。');const id=crypto.randomUUID();const r=await this.adapter.set('projects/'+id,structuredClone(deck));this.etags.set(id,r.etag);await this.changeIndex(items=>items.unshift({id,title:deck.title,updatedAt:new Date().toISOString(),pages:deck.slides.length,deleted:false}));return id;}
 async save(id,deck){if(!validateDeck(deck))throw Error('草稿格式不正确，未写入存储。');const current=this.index.items.find(i=>i.id===id&&!i.deleted);if(!current)throw Error('当前项目已删除。');const r=await this.adapter.set('projects/'+id,structuredClone(deck),this.etags.get(id));this.etags.set(id,r.etag);await this.changeIndex(items=>{const item=items.find(i=>i.id===id);if(!item||item.deleted)throw Error('项目已在其他窗口删除，请刷新。');Object.assign(item,{title:deck.title,pages:deck.slides.length,updatedAt:new Date().toISOString()});});}
 async archive(id,deleted=true){await this.changeIndex(items=>{const item=items.find(i=>i.id===id);if(!item)throw Error('项目不存在。');item.deleted=deleted;});}
}
