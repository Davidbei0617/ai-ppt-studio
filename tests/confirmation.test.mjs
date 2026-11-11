import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const listeners=new Map();
class Element {
  children=[];attrs={};
  append(...children){this.children.push(...children);for(const c of children)c.parent=this;}
  setAttribute(k,v){this.attrs[k]=v;}
  focus(){document.activeElement=this;}
  remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
}
globalThis.document={body:new Element(),activeElement:new Element(),createElement:()=>new Element(),addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
globalThis.confirm=()=>{throw Error('Native confirm must not run in sandbox');};
const source=await readFile(new URL('../bundle/confirmation.js',import.meta.url),'utf8');
const {askConfirmation}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const previous=document.activeElement;
const first=askConfirmation('将使用额度',{action:'开始'});
let box=document.body.children[0].children[0];
assert.equal(box.attrs.role,'dialog');
box.children[2].children[1].onclick();assert.equal(await first,true);assert.equal(document.body.children.length,0);assert.equal(document.activeElement,previous);
const second=askConfirmation('取消测试');box=document.body.children[0].children[0];box.children[2].children[0].onclick();assert.equal(await second,false);
const third=askConfirmation('Esc 测试');listeners.get('keydown')({key:'Escape',preventDefault(){},stopPropagation(){}});assert.equal(await third,false);assert.equal(document.body.children.length,0);
console.log('页面内确认、取消、Esc 及焦点恢复检查通过，无原生弹窗调用。');
