/* Packet lessons: geometry only. Scenario facts and grading remain in each model. */
window.PacketLabPresentation = {attach(adapter, config) {
  const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
  const svgEl=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
  const word=(s)=>{let t=String(s??'');for(const [a,b] of Object.entries({...adapter.presentation?.names,...adapter.presentation?.labels}).sort((a,b)=>b[0].length-a[0].length))t=t.replace(new RegExp('(?<![A-Za-z0-9])'+a.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Za-z0-9])','g'),b);return t;};
  let active=null;
  function setup(){
    const desktop=document.querySelector(config.desktop);if(!desktop)return;
    const host=desktop.parentElement;host.classList.add('packet-lab-host');desktop.classList.add('packet-desktop');
    if(host.querySelector('.packet-mobile'))return;
    const mobile=document.createElement('div');mobile.className='packet-mobile';
    const note=document.createElement('p');note.className='packet-map-note';note.textContent=config.note||'같은 연결 관계를 작은 화면에 맞춰 배치했습니다.';mobile.append(note);
    const svg=svgEl('svg',{viewBox:`0 0 320 ${config.height}`,role:'img','aria-label':'실습 장비와 연결 관계'});
    for(const edge of config.edges){const a=config.nodes.find(n=>n.id===edge[0]),b=config.nodes.find(n=>n.id===edge[1]);const route=mobileRoute(a,b);svg.append(svgEl('polyline',{points:route.map(p=>p.join(',')).join(' '),class:'packet-mobile-link','data-edge':edge.slice(0,2).join('-')}));}
    for(const n of config.nodes){
      const g=svgEl('g',{'data-device':n.id,class:'packet-mobile-device',transform:`translate(${n.x},${n.y})`});
      const width=n.width||126;g.append(svgEl('rect',{x:-width/2,y:-42,width,height:91,rx:13,class:'packet-device-frame'}));
      const icon=svgEl('svg',{x:-27,y:-40,width:54,height:43,viewBox:n.type==='pc'?'0 0 100 85':n.type==='switch'?'0 0 150 90':'0 0 140 110'});icon.append(svgEl('use',{href:`ip-subnetting-devices.svg#${n.type}`}));g.append(icon);
      const name=svgEl('text',{x:0,y:16,'text-anchor':'middle',class:'packet-device-name'});name.textContent=n.name;g.append(name);
      const sub=svgEl('text',{x:0,y:34,'text-anchor':'middle',class:'packet-device-detail'});sub.textContent=n.detail||'';g.append(sub);svg.append(g);
    }
    const pulse=svgEl('circle',{r:7,class:'packet-mobile-marker',visibility:'hidden'});svg.append(pulse);mobile.append(svg);host.append(mobile);
    const overlay=svgEl('svg',{class:'packet-desktop-overlay','aria-hidden':'true'});overlay.append(svgEl('circle',{r:7,class:'packet-mobile-marker',visibility:'hidden'}));desktop.append(overlay);
    const caption=document.createElement('p');caption.className='packet-motion-caption';caption.textContent='아직 실행하지 않았습니다.';host.append(caption);
  }
  function mobileRoute(a,b){
    if(a.x===b.x||a.y===b.y)return [[a.x,a.y],[b.x,b.y]];
    const mid=(a.y+b.y)/2;return [[a.x,a.y],[a.x,mid],[b.x,mid],[b.x,b.y]];
  }
  function points(ids,mobile){
    const out=[],desktop=document.querySelector(config.desktop),base=desktop?.getBoundingClientRect();
    for(let i=1;i<ids.length;i++){
      const aid=ids[i-1],bid=ids[i],a=config.nodes.find(n=>n.id===aid),b=config.nodes.find(n=>n.id===bid);if(!a||!b)continue;
      let part;
      if(mobile)part=mobileRoute(a,b);
      else {
        const edge=config.edges.find(e=>(e[0]===aid&&e[1]===bid)||(e[0]===bid&&e[1]===aid)),link=edge?.[2]?$(edge[2]):null;
        if(link&&typeof link.getTotalLength==='function'){
          const matrix=link.getScreenCTM(),len=link.getTotalLength();part=[];
          for(let j=0;j<=12;j++){const p=link.getPointAtLength(len*j/12);const sp=new DOMPoint(p.x,p.y).matrixTransform(matrix);part.push([sp.x-base.left,sp.y-base.top]);}
          if(edge[0]!==aid)part.reverse();
        }else if(link){
          const r=link.getBoundingClientRect();part=[[r.left-base.left,r.top-base.top+r.height/2],[r.right-base.left,r.top-base.top+r.height/2]];if(edge[0]!==aid)part.reverse();
        }else {const ar=$(aid).getBoundingClientRect(),br=$(bid).getBoundingClientRect();part=[[ar.left-base.left+ar.width/2,ar.top-base.top+ar.height/2],[br.left-base.left+br.width/2,br.top-base.top+br.height/2]];}
      }
      out.push(...part);
    }
    return out;
  }
  function locate(path,p){
    const lens=path.slice(1).map((n,i)=>Math.hypot(n[0]-path[i][0],n[1]-path[i][1]));let rem=lens.reduce((a,b)=>a+b,0)*p;
    for(let i=0;i<lens.length;i++){if(rem<=lens[i]||i===lens.length-1){const t=lens[i]?rem/lens[i]:0;return [path[i][0]+(path[i+1][0]-path[i][0])*t,path[i][1]+(path[i+1][1]-path[i][1])*t];}rem-=lens[i];}return path[0];
  }
  function sync(){
    for(const n of config.nodes){const original=$(n.id),copy=document.querySelector(`[data-device="${n.id}"]`);if(copy&&original){const s=original.getAttribute('class')||'';copy.setAttribute('class','packet-mobile-device '+(/stop|down|excluded/.test(s)?'is-stop':/reply|control/.test(s)?'is-reply':/active|cache|upstream/.test(s)?'is-active':''));if(n.detailSource&&$(n.detailSource))copy.querySelector('.packet-device-detail').textContent=word($(n.detailSource).textContent).replace(/^Access\s+/, '');}}
    for(const edge of config.edges){const el=edge[2]?$(edge[2]):null,copy=document.querySelector(`[data-edge="${edge.slice(0,2).join('-')}"]`);if(copy){const s=el?.getAttribute('class')||'';copy.setAttribute('class','packet-mobile-link '+(/blocked|down|stop|isolated/.test(s)?'is-stop':/reply|response/.test(s)?'is-reply':/active|tagged|native|query|upstream|broadcast|relay|icmp|arp|control/.test(s)?'is-active':''));}}
    config.sync?.();
  }
  function animate(p){
    if(!active)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const travel=Math.max(1,active.duration-1230),q=reduced?1:Math.max(0,Math.min(1,(p*active.duration-1050)/travel));
    for(const mobile of [false,true]){const marker=document.querySelector(mobile?'.packet-mobile > svg > .packet-mobile-marker':'.packet-desktop-overlay .packet-mobile-marker');if(!marker)continue;
      const surface=marker.closest(mobile?'.packet-mobile':'.packet-desktop');if(!surface?.getClientRects().length){marker.setAttribute('visibility','hidden');continue;}
      const path=points(active.path,mobile);if(path.length<2){marker.setAttribute('visibility','hidden');continue;}const pos=locate(path,q);marker.setAttribute('cx',pos[0]);marker.setAttribute('cy',pos[1]);marker.setAttribute('visibility',p===1?'hidden':'visible');marker.setAttribute('class','packet-mobile-marker '+(active.reply?'is-reply':active.stop?'is-stop':''));}
  }
  const reset=adapter.reset.bind(adapter),show=adapter.show.bind(adapter);
  adapter.reset=function(i){reset(i);active=null;setup();document.querySelectorAll('.packet-mobile-marker').forEach(n=>n.setAttribute('visibility','hidden'));document.querySelectorAll('.packet-motion-caption').forEach(n=>n.textContent='아직 실행하지 않았습니다.');sync();};
  adapter.show=function(i){show(i);setup();sync();};
  adapter.buildPlan=function(i,mode='normal'){if(mode!=='normal')return null;return adapter.raw[i].steps.map((s,j)=>{
    const spec=config.steps[adapter.raw[i].id]?.[j]||{},path=spec.path||[],duration=spec.duration||(path.length>1?1050+(path.length-1)*420+180:1230);
    return {modelStepIndex:j,title:word(spec.title||s.title),detail:word(spec.detail||s.detail),kind:word(s.kind),duration,action(){adapter.show(j);active={path,duration,reply:spec.reply,stop:spec.stop};document.querySelectorAll('.packet-motion-caption').forEach(n=>n.textContent=word(spec.caption||s.marker?.text||s.packet?.decision||s.title));$('simVisual').dataset.reveal='events';animate(0);},animate};
  });};
}};
