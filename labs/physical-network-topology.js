// Join responsive HTML device nodes without scaling their readable labels.
export function connectTopology(map){
 const ns='http://www.w3.org/2000/svg',layer=document.createElementNS(ns,'svg');layer.classList.add('physical-links');layer.setAttribute('aria-hidden','true');map.prepend(layer);
 const links=[['ap1','utp1','copper','utp1'],['utp1','access','copper','utp1'],['ap2','utp2','copper','utp2'],['utp2','access','copper','utp2'],['access','sfpa','module','sfpa'],['sfpa','fibera','optical','fibera'],['fibera','fdf','optical','fibera'],['fdf','fiberb','optical','fiberb'],['fiberb','sfpb','optical','fiberb'],['sfpb','distribution','module','sfpb']];
 const parts=Object.fromEntries([...map.querySelectorAll('[data-part]')].map(e=>[e.dataset.part,e]));
 function draw(){
  const r=map.getBoundingClientRect(),mobile=matchMedia('(max-width:900px)').matches;layer.setAttribute('viewBox',`0 0 ${r.width} ${r.height}`);layer.replaceChildren();
  function point(el,out){let b=el.getBoundingClientRect();if(mobile){return {x:(el.classList.contains('phy-cable')?b.left+7:b.left+b.width/2)-r.left,y:(out?b.bottom:b.top)-r.top};}const svg=el.querySelector('svg');if(svg)b=svg.getBoundingClientRect();return {x:(out?b.right:b.left)-r.left,y:(svg?b.top+b.height/2:el.classList.contains('phy-cable')?b.top+13:b.top+20)-r.top};}
  for(const [a,b,kind,state]of links){if(!parts[a]||!parts[b])continue;const p=point(parts[a],true),q=point(parts[b],false),path=document.createElementNS(ns,'path');path.setAttribute('d',mobile?`M${p.x},${p.y} V${(p.y+q.y)/2} H${q.x} V${q.y}`:`M${p.x},${p.y} H${(p.x+q.x)/2} V${q.y} H${q.x}`);path.setAttribute('class',`physical-link ${kind}${parts[state].classList.contains('disconnected')?' broken':''}`);layer.append(path);}
 }
 const observer=new ResizeObserver(draw);observer.observe(map);const mutations=new MutationObserver(draw);Object.values(parts).forEach(e=>mutations.observe(e,{attributes:true,attributeFilter:['class']}));draw();return draw;
}
for(const map of document.querySelectorAll('.physical-map'))connectTopology(map);
