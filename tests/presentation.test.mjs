import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import {createSlideshow} from '../bundle/presentation.js';
import assert from 'node:assert/strict';
const win=new Window();const doc=win.document;
doc.write((await readFile('bundle/index.html','utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
const $=id=>doc.getElementById(id);const deck={title:'放映',theme:'forest',audience:'同学',slides:[{title:'第一页',layout:'cover',bullets:['要点一'],notes:''},{title:'第二页',layout:'process',bullets:['第一步','第二步'],notes:''}]};let exited;
const player=createSlideshow({overlay:$('slideshow-overlay'),stage:$('slideshow-stage'),template:$('slide'),previous:$('slideshow-prev'),next:$('slideshow-next'),counter:$('slideshow-counter'),close:$('slideshow-exit'),fullscreen:$('slideshow-fullscreen'),hint:$('slideshow-hint'),onExit:index=>exited=index});
function key(key){$('slideshow-overlay').dispatchEvent(new win.KeyboardEvent('keydown',{key,bubbles:true}));}
$('start-slideshow').focus();player.open(deck,0);assert.equal($('slideshow-prev').disabled,true);assert.match($('slideshow-stage').textContent,/第一页/);assert.equal(doc.querySelectorAll('#slide').length,1);
key('ArrowRight');assert.equal($('slideshow-counter').textContent,'2 / 2');assert.equal($('slideshow-next').disabled,true);key('ArrowRight');assert.equal($('slideshow-counter').textContent,'2 / 2');assert.equal($('slideshow-stage').querySelectorAll('.step-number').length,2);
key('Home');assert.equal($('slideshow-counter').textContent,'1 / 2');key('End');assert.equal($('slideshow-counter').textContent,'2 / 2');
$('slideshow-overlay').requestFullscreen=async()=>{throw Error('permission denied');};$('slideshow-fullscreen').click();await new Promise(r=>setTimeout(r,5));assert.match($('slideshow-hint').textContent,/窗口放映/);assert.equal($('slideshow-overlay').hidden,false);
key('Escape');assert.equal(exited,1);assert.equal($('slideshow-overlay').hidden,true);assert.equal(doc.activeElement,$('start-slideshow'));
player.open(deck,1);$('slideshow-exit').click();assert.equal($('slideshow-overlay').hidden,true);
console.log('放映的共享渲染、翻页边界、首尾页、退出、焦点恢复与全屏受限回退通过。');await win.happyDOM.close();
