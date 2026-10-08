// Independent DOM/paint geometry measurements. Serialized into the browser by Playwright.
export function measureLines(){
 const map=document.querySelector('#physicalLab .physical-map'),layer=map.querySelector('.physical-links');
 const box=map.getBoundingClientRect(),paths=[...layer.querySelectorAll('.physical-link')];
 const screen=(el,point)=>{const p=new DOMPoint(point.x,point.y).matrixTransform(el.getScreenCTM());return {x:p.x,y:p.y};};
 const end=(el,last)=>screen(el,el.getPointAtLength(last?el.getTotalLength():0));
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),issues=[];
 if(!layer.classList.contains('continuous-links')){
  const gaps=[];
  for(const [id,incoming,outgoing]of [['utp1',0,1],['utp2',2,3],['fibera',5,6],['fiberb',7,8]]){
   const e=map.querySelector(`[data-part="${id}"]`),r=e.getBoundingClientRect(),c=getComputedStyle(e),p=getComputedStyle(e,'::before');
   const n=s=>parseFloat(s)||0,vertical=p.position==='absolute';
   const left=r.left+n(c.borderLeftWidth)+(vertical?n(p.left):n(c.paddingLeft)+n(p.marginLeft));
   const top=r.top+n(c.borderTopWidth)+(vertical?n(p.top):n(c.paddingTop)+n(p.marginTop));
   const w=n(p.width),h=n(p.height),start=vertical?{x:left+w/2,y:top}:{x:left,y:top+h/2},finish=vertical?{x:left+w/2,y:top+h}:{x:left+w,y:top+h/2};
   gaps.push({id,inlet:distance(end(paths[incoming],true),start),outlet:distance(end(paths[outgoing],false),finish)});
  }
  return {mode:'legacy',gaps,issues:['Independent CSS cable paint does not meet SVG leads']};
 }
 const refs=[['utp1','ap1','out','access','ap1'],['utp2','ap2','out','access','ap2'],['sfpa','access','out','sfpa','in'],['fibera','sfpa','out','fdf','in'],['fiberb','fdf','out','sfpb','in'],['sfpb','sfpb','out','distribution','in']];
 if(paths.length!==6)issues.push('segment count');
 const labels=[];
 for(const el of map.querySelectorAll('strong,small,.phy-status')){
  const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
  while(walker.nextNode()){if(!walker.currentNode.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(walker.currentNode);for(const r of range.getClientRects())labels.push({r,text:walker.currentNode.textContent});}
 }
 const rows=[];
 for(const [id,from,out,to,input]of refs){
  const path=map.querySelector(`[data-segment="${id}"]`),a=map.querySelector(`[data-part="${from}"] [data-anchor="${out}"]`),b=map.querySelector(`[data-part="${to}"] [data-anchor="${input}"]`);
  if(!path||!a||!b){issues.push('missing '+id);continue;}
  const at=dot=>screen(dot,{x:+dot.getAttribute('cx'),y:+dot.getAttribute('cy')});
  const p=end(path,false),q=end(path,true),gap=Math.max(distance(p,at(a)),distance(q,at(b)));
  if(gap>.35)issues.push(id+' endpoint gap '+gap);
  if((path.getAttribute('d').match(/M/g)||[]).length!==1)issues.push(id+' discontinuous subpaths');
  const style=getComputedStyle(path);if(style.stroke==='none'||+style.strokeWidth===0)issues.push(id+' invisible stroke');
  const broken=path.classList.contains('broken'),expected=map.querySelector(`[data-part="${id}"]`).classList.contains('disconnected');
  if(broken!==expected)issues.push(id+' state mismatch');
  if(!broken&&style.strokeDasharray!=='none')issues.push(id+' dash in normal state');
  if(broken&&style.strokeDasharray==='none')issues.push(id+' no failure dash');
  const marker=map.querySelector(`[data-break="${id}"]`);if(marker.hasAttribute('hidden')===broken)issues.push(id+' break marker mismatch');
  let crosses=null;const length=path.getTotalLength();
  for(let d=0;d<=length;d+=1){
   const point=screen(path,path.getPointAtLength(d));
   if(point.x<box.left-1||point.x>box.right+1||point.y<box.top-1||point.y>box.bottom+1){issues.push(id+' outside map');break;}
   const label=labels.find(({r})=>point.x>r.left-.8&&point.x<r.right+.8&&point.y>r.top-.8&&point.y<r.bottom+.8);
   if(label){crosses=label.text;break;}
  }
  if(crosses)issues.push(id+' crosses text: '+crosses);
  rows.push({id,gap,broken,d:path.getAttribute('d')});
 }
 for(const e of map.querySelectorAll('.phy-cable'))if(getComputedStyle(e,'::before').display!=='none')issues.push('duplicate CSS cable paint');
 if(+getComputedStyle(layer).zIndex<=+getComputedStyle(map.querySelector('.phy-element')).zIndex)issues.push('node backgrounds can hide leads');
 if(getComputedStyle(layer).pointerEvents!=='none')issues.push('wire intercepts controls');
 return {mode:'continuous',rows,issues,box:{width:box.width,height:box.height},overflow:document.documentElement.scrollWidth>innerWidth+1};
}
