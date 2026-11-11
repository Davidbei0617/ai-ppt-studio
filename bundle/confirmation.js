// HTML confirmation UI works inside Anna's sandbox without allow-modals.
// No browser alert/confirm/prompt calls are used.
export function askConfirmation(message, {title='确认操作',action='继续'}={}) {
  return new Promise(resolve=>{
    const previous=document.activeElement;
    const overlay=document.createElement('div');overlay.className='confirmation-overlay';
    const box=document.createElement('section');box.className='confirmation-box';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-labelledby','confirmation-title');box.setAttribute('aria-describedby','confirmation-message');
    const heading=document.createElement('h2');heading.id='confirmation-title';heading.textContent=title;
    const text=document.createElement('p');text.id='confirmation-message';text.textContent=message;
    const actions=document.createElement('div');actions.className='confirmation-actions';
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='取消';
    const accept=document.createElement('button');accept.type='button';accept.className='confirm-accept';accept.textContent=action;
    actions.append(cancel,accept);box.append(heading,text,actions);overlay.append(box);
    let settled=false;
    function finish(value){if(settled)return;settled=true;document.removeEventListener('keydown',onKey,true);overlay.remove();previous?.focus();resolve(value);}
    function onKey(e){
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();finish(false);}
      if(e.key==='Tab'){e.preventDefault();(document.activeElement===cancel?accept:cancel).focus();}
    }
    cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);
    overlay.onclick=e=>{if(e.target===overlay)finish(false);};
    document.addEventListener('keydown',onKey,true);document.body.append(overlay);cancel.focus();
  });
}
