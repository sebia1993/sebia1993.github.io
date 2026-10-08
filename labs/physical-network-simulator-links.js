// Simulator-only wiring: a cable and its leads are ONE continuous SVG path.
// Anchors are on the device glyph, never its label/status box. Not real port numbers.
const NS='http://www.w3.org/2000/svg',instances=new WeakMap();
export const segments=[
 {id:'utp1',from:'ap1',out:'out',to:'access',input:'ap1',cable:'utp1',kind:'copper'},
 {id:'utp2',from:'ap2',out:'out',to:'access',input:'ap2',cable:'utp2',kind:'copper'},
 {id:'sfpa',from:'access',out:'out',to:'sfpa',input:'in',kind:'module'},
 {id:'fibera',from:'sfpa',out:'out',to:'fdf',input:'in',cable:'fibera',kind:'optical'},
 {id:'fiberb',from:'fdf',out:'out',to:'sfpb',input:'in',cable:'fiberb',kind:'optical'},
 {id:'sfpb',from:'sfpb',out:'out',to:'distribution',input:'in',kind:'module'}
];
// Each [x,y] belongs to the icon's viewBox. The two APs enter distinct anchors.
const ports={
 ap1:{out:[[85,42],[15,42]]},ap2:{out:[[85,42],[15,42]]},
 access:{ap1:[[10,40],[31,41]],ap2:[[10,60],[51,41]],out:[[142,49],[112,72]]},
 sfpa:{in:[[2,16],[24,3]],out:[[46,16],[24,29]]},
 fdf:{in:[[2,16],[24,3]],out:[[46,16],[24,29]]},
 sfpb:{in:[[2,16],[24,3]],out:[[46,16],[24,29]]},
 distribution:{in:[[9,45],[26,29]]}
};
const svgEl=(name,attributes={})=>{const el=document.createElementNS(NS,name);for(const [k,v]of Object.entries(attributes))el.setAttribute(k,v);return el;};
const coords=(p)=>`${p.x.toFixed(3)},${p.y.toFixed(3)}`;
export function connectSimulator(map){
 if(instances.has(map))return instances.get(map);
 const parts=Object.fromEntries([...map.querySelectorAll('[data-part]')].map(el=>[el.dataset.part,el]));
 if(!segments.every(s=>parts[s.from]&&parts[s.to]&&parts[s.id]))throw new Error('Incomplete physical simulator topology');
 const layer=svgEl('svg',{'aria-hidden':'true',class:'physical-links continuous-links'});map.prepend(layer);
 const paths=new Map(),markers=new Map(),anchors={};
 for(const [id,defs]of Object.entries(ports)){
  let icon=parts[id].querySelector('svg');
  if(!icon){
   icon=svgEl('svg',{viewBox:'0 0 48 32','aria-hidden':'true',class:'phy-part-icon'});
   icon.innerHTML=id==='fdf'?'<rect x="2" y="3" width="44" height="26" rx="2" fill="#dcebf3" stroke="#86a8ba" stroke-width="2"/><path d="M10 8v16m9-16v16m10-16v16m9-16v16" stroke="#40859d" stroke-width="5"/>':'<rect x="2" y="3" width="44" height="26" rx="2" fill="#c5d8e3" stroke="#819eae" stroke-width="2"/><path d="M7 8h13v16H7zm21 0h13v16H28z" fill="#244b66"/>';
   parts[id].prepend(icon);
  }
  anchors[id]={};
  for(const [name,[wide,narrow]]of Object.entries(defs)){
   const dot=svgEl('circle',{r:'2.6',class:'phy-port-anchor','data-anchor':name});icon.append(dot);anchors[id][name]={dot,wide,narrow};
  }
 }
 for(const s of segments){
  if(s.cable){const slot=document.createElement('span');slot.className='phy-wire-slot';slot.setAttribute('aria-hidden','true');parts[s.cable].prepend(slot);}
  const path=svgEl('path',{class:`physical-link ${s.kind}`,'data-segment':s.id,'data-from':s.from,'data-to':s.to});layer.append(path);paths.set(s.id,path);
  const marker=svgEl('path',{class:'physical-break','data-break':s.id,hidden:''});layer.append(marker);markers.set(s.id,marker);
 }
 let queued=0,destroyed=false;
 function draw(){
  if(destroyed)return;
  const rect=map.getBoundingClientRect();if(!rect.width||!rect.height)return;
  layer.setAttribute('viewBox',`0 0 ${rect.width} ${rect.height}`);
  const narrow=getComputedStyle(map).getPropertyValue('--phy-axis').trim()==='vertical';
  for(const set of Object.values(anchors))for(const a of Object.values(set)){const [x,y]=narrow?a.narrow:a.wide;a.dot.setAttribute('cx',x);a.dot.setAttribute('cy',y);}
  const inverse=layer.getScreenCTM().inverse();
  function at(id,name){const dot=anchors[id][name].dot;const pt=new DOMPoint(+dot.getAttribute('cx'),+dot.getAttribute('cy')).matrixTransform(dot.getScreenCTM()).matrixTransform(inverse);return {x:pt.x,y:pt.y};}
  function local(x,y){const p=new DOMPoint(x,y).matrixTransform(inverse);return {x:p.x,y:p.y};}
  for(const s of segments){
   const p=at(s.from,s.out),q=at(s.to,s.input),path=paths.get(s.id);let points=[p],breakAt;
   if(s.cable){
    const slot=parts[s.cable].querySelector('.phy-wire-slot').getBoundingClientRect();
    if(narrow){
     const a=local(slot.left+slot.width/2,slot.top),b=local(slot.left+slot.width/2,slot.bottom);
     const entryTop=local(0,parts[s.to].getBoundingClientRect().top).y;
     const bend=s.kind==='copper'?(b.y+entryTop)/2:(b.y+q.y)/2;
     points.push({x:a.x,y:p.y},a,b,{x:b.x,y:bend},{x:q.x,y:bend},q);breakAt={x:a.x,y:(a.y+b.y)/2};
    }else{
     const a=local(slot.left,slot.top+slot.height/2),b=local(slot.right,slot.top+slot.height/2);
     const left=(p.x+a.x)/2,right=(b.x+q.x)/2;
     points.push({x:left,y:p.y},{x:left,y:a.y},a,b,{x:right,y:b.y},{x:right,y:q.y},q);breakAt={x:(a.x+b.x)/2,y:a.y};
    }
   }else{
    if(narrow){const y=(p.y+q.y)/2;points.push({x:p.x,y},{x:q.x,y},q);}
    else{const x=(p.x+q.x)/2;points.push({x,y:p.y},{x,y:q.y},q);}
   }
   path.setAttribute('d',points.map((pt,i)=>(i?'L':'M')+coords(pt)).join(' '));
   const broken=parts[s.id].classList.contains('disconnected');path.classList.toggle('broken',broken);
   const marker=markers.get(s.id);marker.toggleAttribute('hidden',!broken);
   if(!breakAt){const mid=path.getPointAtLength(path.getTotalLength()/2);breakAt={x:mid.x,y:mid.y};}
   marker.setAttribute('d',`M${breakAt.x-4},${breakAt.y-4}l8,8m-8,0l8,-8`);
  }
 }
 function schedule(){if(!queued&&!destroyed)queued=requestAnimationFrame(()=>{queued=0;draw();});}
 const resize=new ResizeObserver(schedule);resize.observe(map);Object.values(parts).forEach(el=>resize.observe(el));
 const mutations=new MutationObserver(schedule);Object.values(parts).forEach(el=>mutations.observe(el,{attributes:true,attributeFilter:['class','style']}));
 const media=matchMedia('(max-width:900px)');media.addEventListener('change',schedule);
 document.fonts?.ready.then(schedule);window.addEventListener('pageshow',schedule);window.addEventListener('resize',schedule);
 const api={draw,destroy(){destroyed=true;cancelAnimationFrame(queued);resize.disconnect();mutations.disconnect();media.removeEventListener('change',schedule);window.removeEventListener('pageshow',schedule);window.removeEventListener('resize',schedule);}};
 instances.set(map,api);draw();return api;
}
if(typeof document!=='undefined')for(const map of document.querySelectorAll('#physicalLab .physical-map'))connectSimulator(map);
