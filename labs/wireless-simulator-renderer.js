/* Rendering only: no timers, scoring, protocol calculations or external side effects. */
window.WirelessLab = (() => {
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icon=kind=>kind==='ap'?'<svg viewBox="0 0 64 54" aria-hidden="true"><rect x="7" y="30" width="50" height="16" rx="5" fill="#264b77" stroke="#78bce9"/><path d="M16 30V17m32 13V17M20 9q12-10 24 0M25 16q7-6 14 0M15 38h3m6 0h3" fill="none" stroke="#78bce9" stroke-width="2"/></svg>':kind==='server'?'<svg viewBox="0 0 64 54" aria-hidden="true"><rect x="15" y="3" width="34" height="48" rx="5" fill="#264b77" stroke="#78bce9"/><path d="M21 14h22M21 25h22M21 36h22" stroke="#9ed9fa"/><circle cx="24" cy="43" r="2" fill="#78e3bd"/></svg>':`<svg aria-hidden="true"><use href="ip-subnetting-devices.svg#${kind==='switch'?'switch':'pc'}"/></svg>`;
 function flow(id,actors,label){const host=document.getElementById(id);if(!host)return;host.innerHTML=`<div class="wireless-flow" style="--actors:${actors.length}" role="img" aria-label="${esc(actors.map(a=>a.name+' · '+a.role).join(' ↔ '))}">${actors.map(a=>`<div class="wireless-actor">${icon(a.kind)}<b>${esc(a.name)}</b><small>${esc(a.role)}</small></div>`).join('')}<svg class="wireless-wire" aria-hidden="true"></svg><span class="wireless-flow-label">${esc(label||'메시지 방향을 관찰하세요.')}</span></div>`;motion(id,null,null,0);}
 function motion(id,from,to,progress){const host=document.querySelector('#'+id+' .wireless-flow');if(!host)return;const svg=host.querySelector('svg.wireless-wire'),rect=host.getBoundingClientRect(),actors=[...host.querySelectorAll('.wireless-actor')],r=actors.map(a=>a.getBoundingClientRect());if(!r.length)return;const vertical=Math.abs(r[0].left-r[r.length-1].left)<10;
  const endpoints=(a,b)=>{const x=r[a],y=r[b],forward=a<b;return vertical?[[x.left+x.width/2-rect.left,(forward?x.bottom:x.top)-rect.top],[y.left+y.width/2-rect.left,(forward?y.top:y.bottom)-rect.top]]:[[(forward?x.right:x.left)-rect.left,x.top+x.height/2-rect.top],[(forward?y.left:y.right)-rect.left,y.top+y.height/2-rect.top]];};
  let lines='';for(let i=0;i<r.length-1;i++){const [a,b]=endpoints(i,i+1);lines+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;}
  actors.forEach((a,i)=>a.classList.toggle('current',i===from||i===to));
  if(from!==null&&to!==null){const [a,b]=endpoints(from,to),p=Math.min(1,Math.max(0,progress));lines+=`<circle cx="${a[0]+(b[0]-a[0])*p}" cy="${a[1]+(b[1]-a[1])*p}" r="7"/>`;}
  svg.innerHTML=lines;
 }
 const fact=(title,detail,current=false)=>`<div class="wireless-fact${current?' current':''}"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div>`;
 return {flow,motion,fact,esc};
})();
