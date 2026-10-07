import {subnetInfo, parseIPv4} from "../assets/lab/ipv4.js";
export {subnetInfo,parseIPv4};
export const legacyLessons=[
    {title:'그림에서 .10과 .20은 같은 그룹일까요?',label:'1 · 그림으로 같은 그룹',src:'10.77.10.10',dst:'10.77.10.20',prefix:25,answer:'on',choices:[['on','같은 그룹 · PC3(.20)을 전달 대상으로 본다'],['gw','다른 그룹 · 출구 Gateway(.1)를 먼저 이용한다'],['drop','주소 숫자가 다르면 보낼 수 없다']],next:'목적지 .20',decision:'같은 Subnet',validated:'PASS',explain:'그림에서 .10과 .20은 모두 첫 번째 주소 그룹(.0~.127)에 있습니다. 네트워크 용어로는 같은 Subnet입니다.',evidence:'CP1에서 PC1이 10.77.10.20에 직접 ARP했고 ICMP 3/3이 성공했습니다.'},
    {title:'그림에서 .10과 .140은 같은 그룹일까요?',label:'2 · 그림으로 다른 그룹',src:'10.77.10.10',dst:'10.77.10.140',prefix:25,answer:'gw',choices:[['on','같은 그룹 · .140을 전달 대상으로 본다'],['gw','다른 그룹 · 출구 Gateway(.1)를 먼저 이용한다'],['rewrite','출구를 이용하면 목적지 IP를 .1로 바꾼다']],next:'gateway 10.77.10.1',decision:'다른 Subnet',validated:'PASS',explain:'.10은 첫 번째 그룹(.0~.127), .140은 두 번째 그룹(.128~.255)에 있습니다. 따라서 다른 Subnet이고 이번 예제에서는 출구 Gateway(.1)를 먼저 이용합니다.',evidence:'CP1에서 gateway .1 ARP/Reply가 관측됐고, 원격 ICMP의 IPv4 Destination은 .140으로 유지되었습니다. 같은 설정의 추가 정상 시험은 3/3 성공했습니다.'},
    {title:'경계 규칙이 /24로 바뀌면 .10과 .140은 어떻게 보일까요?',label:'3 · 경계를 바꿔 보기',src:'10.77.10.10',dst:'10.77.10.140',prefix:24,answer:'on',choices:[['gw','그래도 Gateway(.1)에 먼저 보낸다'],['on','하나의 큰 그룹으로 보여 같은 Subnet이라고 판단한다'],['drop','Prefix Length가 다르면 바로 버린다']],next:'목적지 .140 직접',decision:'같은 Subnet으로 오판',validated:'PASS',explain:'/24에서는 PC1이 .10과 .140을 하나의 10.77.10.0/24 범위로 봅니다. 실제 배치는 그대로인데 PC1의 경계 기준만 넓어져 같은 Subnet이라고 잘못 판단합니다.',evidence:'Proxy ARP를 끈 검증에서 PC1은 .140에 직접 ARP 3회를 보냈고 Reply는 0, remote ICMP도 0이었습니다. 같은 LAN의 .20 control ping은 3/3 성공했습니다.'},
    {title:'경계를 다시 /25로 돌리면 어떤 길을 선택할까요?',label:'4 · 정상 경계로 복구',src:'10.77.10.10',dst:'10.77.10.140',prefix:25,answer:'gw',choices:[['on','여전히 같은 그룹으로 보고 .140을 직접 찾는다'],['gw','다시 두 그룹으로 보이므로 출구 Gateway(.1)를 이용한다'],['none','아무 확인 없이 바로 보낸다']],next:'gateway 10.77.10.1',decision:'다른 Subnet으로 복구',validated:'PASS',explain:'경계 규칙을 /25로 되돌리면 .10은 첫 번째 그룹, .140은 두 번째 그룹으로 다시 나뉩니다. 따라서 출구 Gateway(.1)를 이용하는 정상 판단으로 돌아옵니다.',evidence:'복구 후 gateway .1 ARP/Reply가 다시 형성됐고 원격 ping 3/3이 성공했습니다. .140 직접 ARP는 나타나지 않았습니다.'}
];
// Actual destination configuration is distinct from the sender's calculation mask.
legacyLessons.forEach(function(l,i){
 l.dstPrefix=25;l.dstNode=i===0?'PC3':'PC2';l.destinationLan=i===0?'A':'B';l.gateway='10.77.10.1';
 l.scenarioId=['same-subnet','different-subnet','wrong-mask','mask-recovery'][i];
 l.claimIds=i<2?['IPSUB-01','IPSUB-02']:[i===2?'IPSUB-03':'IPSUB-04'];
});

function ipToInt(ip){return ip.split('.').reduce(function(a,v){return ((a<<8)>>>0)+Number(v);},0)>>>0;}
function intToIp(n){return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join('.');}
function net(ip,p){return intToIp(ipToInt(ip)&(p===0?0:(0xffffffff<<(32-p))>>>0))+'/'+p;}
function buildObservation(l){
 var sourceNetwork=net(l.src,l.prefix),destinationNetwork=net(l.dst,l.prefix);
 var onLink=sourceNetwork===destinationNetwork;
 var target=onLink?l.dst:l.gateway;
 var resolved=!onLink||l.destinationLan==='A';
 var targetRole=onLink?'목적지':'Gateway';
 var decision=onLink?(resolved?'ON-LINK':'ON-LINK로 오판'):'VIA GATEWAY';
 var destinationId=(l.dstNode||(l.destinationLan==='A'?'PC3':'PC2')).toLowerCase();
 var finalRoute=onLink
  ? (resolved?['pc1','lana','pc3']:['pc1','lana','link-a-r1','r1'])
  : ['pc1','lana','link-a-r1','r1','link-r1-b','lanb','pc2'];
 var arpPath=onLink
  ? (resolved?['pc1','lana','pc3']:['pc1','lana','link-a-r1','r1'])
  : ['pc1','lana','link-a-r1','r1'];
 var replyPath=resolved
  ? (onLink?['pc3','lana','pc1']:['r1','link-a-r1','lana','pc1'])
  : [];
 var events=[
  {kind:'prefix-comparison',label:'PREFIX',text:'PC1이 /'+l.prefix+'로 계산합니다. '+sourceNetwork+' '+(onLink?'＝':'≠')+' '+destinationNetwork+'.',path:[],focus:['pc1',destinationId],motion:[],packetLabel:'',tone:'normal'},
  {kind:'arp-request',label:'ARP REQUEST',text:onLink?'같은 네트워크라고 판단해 “'+l.dst+'의 MAC 주소가 누구인가요?”라고 묻습니다.':'다른 네트워크라고 판단해 Gateway에게 먼저 보내기 위해 “'+l.gateway+'의 MAC 주소가 누구인가요?”라고 묻습니다.',path:arpPath,focus:[resolved?(onLink?'pc3':'r1'):'r1'],motion:onLink&&resolved?['pc1','pc3']:['pc1','r1'],packetLabel:'ARP Request',tone:resolved?'normal':'warning'},
  resolved
   ? {kind:'arp-reply',label:'ARP REPLY',text:(onLink?'PC3 '+l.dst:'R1 '+l.gateway)+'이 자신의 MAC 주소를 알려줍니다.',path:replyPath,focus:['pc1'],motion:onLink?['pc3','pc1']:['r1','pc1'],packetLabel:'ARP Reply',tone:'reply'}
   : {kind:'unresolved-arp',label:'응답 없음',text:'PC1은 .140을 같은 네트워크라고 생각해 직접 찾지만, .140은 다른 LAN에 있어 ARP Reply가 돌아오지 않습니다.',path:arpPath,focus:['r1'],motion:['pc1','r1'],packetLabel:'응답 없음',tone:'warning',stopAt:'r1'}
 ];
 if(resolved){
  events.push(onLink
   ? {kind:'direct-path',label:'IPv4',text:'MAC 주소를 확인했으므로 PC1은 라우터를 거치지 않고 같은 LAN의 PC3에게 IPv4 데이터를 전달합니다.',path:finalRoute,focus:['pc3'],motion:['pc1','pc3'],packetLabel:'IPv4',tone:'success'}
   : {kind:'routed-path',label:'IPv4',text:'PC1은 Gateway인 R1에게 먼저 보내고, R1이 PC2가 있는 LAN B로 전달합니다. 최종 목적지 IP는 10.77.10.140 그대로입니다.',path:finalRoute,focus:['pc2'],motion:['pc1','r1','pc2'],packetLabel:'IPv4',tone:'success'});
 }
 events.forEach(function(e){['path','focus','motion'].forEach(function(k){if(e[k])Object.freeze(e[k]);});Object.freeze(e);});
 return Object.freeze({kind:'teaching-simulation',scenarioId:l.scenarioId,claimIds:Object.freeze(l.claimIds.slice()),sourceNetwork:sourceNetwork,destinationNetwork:destinationNetwork,arpTarget:target,targetRole:targetRole,onLink:onLink,decision:decision,resolved:resolved,destinationIp:l.dst,destinationPrefix:l.dstPrefix,route:Object.freeze(finalRoute.slice()),events:Object.freeze(events)});
}

export {buildObservation};

// Address-space arithmetic delegates to the existing, shared IPv4 implementation.
export function addressWindow(ip,prefix){
 const info=subnetInfo(ip,prefix),size=2**(32-prefix),address=parseIPv4(ip);
 const parentPrefix=prefix>24?24:Math.max(0,prefix-2);
 const parent=subnetInfo(ip,parentPrefix),parentStart=parseIPv4(parent.network);
 const total=2**(prefix-parentPrefix),visible=Math.min(4,total);
 const selected=Math.floor((address-parentStart)/size),first=Math.floor(selected/visible)*visible;
 const blocks=Array.from({length:visible},(_,i)=>{
  const start=parentStart+(first+i)*size;
  return {start,end:start+size-1,network:intToIp(start),last:intToIp(start+size-1),active:address>=start&&address<start+size};
 });
 return {info,size,parentPrefix,parent:parent.network,total,first,blocks};
}
export function addressLesson(ip='192.168.10.70',prefix=26,kind='network'){
 const info=subnetInfo(ip,prefix),w=addressWindow(ip,prefix);
 const actual=kind==='broadcast'?info.broadcast:kind==='hosts'?`${info.firstHost} ~ ${info.lastHost}`:`${info.network}/${prefix}`;
 let choices;
 if(kind==='network'){
  choices=w.blocks.map(b=>[b.network+'/'+prefix,b.network+'/'+prefix]);
  if(choices.length>3){const at=choices.findIndex(c=>c[0]===actual);choices=choices.slice(at===3?1:0,at===3?4:3);}
  if(choices.length===1)choices.push(['other','다른 주소 범위에 속한다']);
 }else if(kind==='broadcast')choices=[[info.network,info.network],[info.lastHost,info.lastHost],[actual,actual]];
 else choices=[[`${info.network} ~ ${info.broadcast}`,`${info.network} ~ ${info.broadcast}`],[actual,actual],['none','사용할 수 있는 Host 주소가 없다']];
 return {type:'address',ip,prefix,kind,answer:actual,choices,
  label:kind==='network'?'어느 Network일까?':kind==='broadcast'?'Broadcast는 어디일까?':'Host 범위는 어디일까?',
  title:kind==='network'?`${ip}/${prefix}은 어느 Network에 속할까요?`:kind==='broadcast'?`${ip}/${prefix}의 Broadcast 주소는 무엇일까요?`:`${ip}/${prefix}에서 장비에 쓸 Host 범위는 어디일까요?`,
  explain:kind==='network'?`${ip}는 ${info.network} ~ ${intToIp(parseIPv4(info.network)+w.size-1)} 안에 있습니다. 이 범위의 시작 주소가 Network입니다.`:kind==='broadcast'?`${w.size}개 주소 중 마지막 주소 ${info.broadcast}가 이 Subnet의 Broadcast입니다.`:`범위의 시작(Network)과 끝(Broadcast)을 제외하면 ${actual}, 총 ${info.hostCount}개입니다.`};
}
export const lessons=[addressLesson(),addressLesson('192.168.10.150',27,'broadcast'),addressLesson('192.168.10.65',30,'hosts'),...legacyLessons.map(l=>({...l,type:'network'}))];
export function eventsFor(l){
 if(l.type==='network'){
  const o=buildObservation(l);
  return o.events.map((e,i)=>({...e,title:i===0?'PC1 · Network 비교':e.label,
   kind:e.label,tone:e.tone==='warning'?'error':e.tone==='reply'?'reply':i===0?'route':'arp',
   motion:e.motion.flatMap((n,j,a)=>j===0?[n]:a[j-1]==='pc1'&&n==='pc3'?['sw1','pc3']:a[j-1]==='pc3'&&n==='pc1'?['sw1','pc1']:a[j-1]==='pc1'&&n==='r1'?['sw1','r1']:a[j-1]==='r1'&&n==='pc1'?['sw1','pc1']:a[j-1]==='r1'&&n==='pc2'?['sw2','pc2']:[n]),
   observation:o}));
 }
 const w=addressWindow(l.ip,l.prefix),i=w.info;
 const final=w.blocks.find(b=>b.active);
 return [
  {kind:'PREFIX LENGTH',title:'경계 규칙 확인',text:`${l.ip}/${l.prefix}에서 /${l.prefix}는 앞의 ${l.prefix}비트를 Network 부분으로 사용한다는 뜻입니다.`},
  {kind:'BOUNDARY',title:'Network / Host 경계',text:`Network 부분 ${l.prefix}비트 · Host 부분 ${32-l.prefix}비트로 나눕니다.`},
  {kind:'BLOCK',title:'주소 범위 나누기',text:`Host 부분 ${32-l.prefix}비트로 한 Subnet에 ${w.size.toLocaleString('ko-KR')}개 주소가 들어갑니다.`},
  {kind:'SUBNET',title:'IP가 속한 범위 선택',text:`${l.ip}는 ${final.network} ~ ${final.last} 안에 있습니다.`},
  {kind:'NETWORK',title:'범위의 시작 확인',text:`선택한 범위의 시작 주소는 ${i.network}입니다. 이 주소가 Network 주소입니다.`},
  {kind:'BROADCAST',title:l.prefix>=31?'특수 주소 문맥 확인':'범위의 끝 확인',text:l.prefix>=31?i.description:`선택한 범위의 마지막 주소 ${i.broadcast}가 Broadcast 주소입니다.`},
  {kind:'HOST RANGE',title:l.prefix>=31?'사용 문맥 확인':'장비에 쓸 주소 범위 확인',text:l.prefix>=31?`${i.firstHost} ~ ${i.lastHost}. ${i.description}`:`Network와 Broadcast를 제외한 ${i.firstHost} ~ ${i.lastHost}, 총 ${i.hostCount.toLocaleString('ko-KR')}개입니다.`}
 ].map(e=>({...e,tone:'route',motion:[]}));
}
