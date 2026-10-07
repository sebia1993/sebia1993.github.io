// Teaching Simulation only. No physical measurements or hardware evidence.
export const baseline=()=>({utp1:true,utp2:true,sfpa:true,sfpb:true,fibera:true,fiberb:true});
export function derive(m){
 const uplink=m.sfpa&&m.sfpb&&m.fibera&&m.fiberb;
 const ap=connected=>({power:connected,link:connected,service:!connected?'연결 끊김':uplink?'정상':'상위망 영향'});
 return {uplink,ap1:ap(m.utp1),ap2:ap(m.utp2),accessPower:true,distributionPower:true};
}
const event=(title,detail,active,change={})=>({title,detail,active,change});
export const scenarios=[
 {id:'normal',title:'정상 연결',question:'Cat5e로 연결된 두 AP도 정상적으로 상위망에 연결될 수 있을까요?',choices:['가능합니다 · 조건이 맞으면 정상 연결','불가능합니다 · Cat6로 바꿔야 합니다'],answer:0,reason:'조건에 맞는 Cat5e 배선에서도 정상 링크를 구성할 수 있습니다. UTP, 양쪽 SFP와 광 경로가 이어져 두 AP의 상위 연결이 모두 정상입니다.',events:[
 event('AP와 UTP','AP A와 AP B는 Cat5e UTP로 Switch A에 연결됩니다. 이번 모델에서는 같은 선으로 PoE 전원도 받습니다.',['ap1','ap2','utp1','utp2']),
 event('Switch A와 광 SFP','Switch A는 켜져 있고, 장착된 광 SFP가 Fiber를 연결합니다.',['access','sfpa']),
 event('Fiber와 중간 연결 지점','광 경로는 Fiber → FDF → Fiber로 이어집니다. FDF는 중간 연결 지점입니다.',['fibera','fdf','fiberb']),
 event('양단 연결 확인','Switch B 쪽 SFP와 Switch B까지 연결되어 있습니다. 두 AP 모두 정상이고 상위 연결도 정상입니다.',['sfpb','distribution'])]},
 {id:'utp',title:'AP A UTP 분리',question:'AP A의 UTP만 분리하면 어느 장비까지 영향을 받을까요?',choices:['AP A만 연결이 끊깁니다','AP A·AP B와 상위 연결이 모두 끊깁니다','Cat5e이므로 원래부터 연결되지 않습니다'],answer:0,reason:'AP A의 선만 분리했습니다. AP A는 PoE 전원과 연결을 잃지만 AP B·Switch A·상위 연결은 정상입니다. 단일 AP의 UTP 문제가 Switch A 전체나 상위 연결 장애를 의미하지는 않습니다.',events:[
 event('바꾸는 것은 AP A의 UTP 하나','두 AP와 상위 연결은 정상인 상태에서 시작합니다. 다른 케이블과 모듈은 바꾸지 않습니다.',['utp1']),
 event('AP A UTP 분리','AP A의 UTP가 분리되었습니다. 이 모델의 AP A는 별도 전원이 없으므로 PoE 전원과 데이터 연결이 함께 끊깁니다.',['utp1','ap1'],{utp1:false}),
 event('영향 범위 비교','AP A만 연결이 끊겼습니다. AP B는 정상이고 Switch A 전원과 상위 연결도 정상입니다.',['ap2','access','distribution'],{utp1:false})]},
 {id:'sfp',title:'SFP 제거',question:'Switch A 쪽 광 SFP가 없어지면 무엇이 영향을 받을까요?',choices:['AP A만 꺼집니다','두 AP의 상위망 연결이 영향을 받습니다 · 전원은 유지','Switch A 전원도 꺼집니다'],answer:1,reason:'Switch A 쪽 광 SFP가 없으면 단일 상위 경로가 완성되지 않습니다. 상위 연결이 끊겨 두 AP의 상위망 서비스가 영향을 받지만 AP의 UTP·PoE와 두 스위치 전원은 유지됩니다.',events:[
 event('Switch A 쪽 광모듈 확인','정상 상태에서 시작해 Switch A 쪽 SFP 하나의 유무만 바꿉니다.',['access','sfpa']),
 event('SFP가 없는 상태','Switch A 쪽 SFP가 없습니다. 광 경로를 완성할 수 없어 상위 연결이 끊깁니다.',['sfpa'],{sfpa:false}),
 event('여러 AP의 공통 상위 연결','AP A와 AP B는 전원이 켜져 있고 UTP도 연결된 상태지만 상위망 연결에 영향을 받습니다. 두 스위치 자체도 켜져 있습니다.',['ap1','ap2','access'],{sfpa:false})]},
 {id:'fiber',title:'Fiber 분리',question:'SFP는 모두 꽂혀 있고 Fiber 한 구간만 분리되면 상위 연결은 어떻게 될까요?',choices:['SFP가 있으니 상위 연결은 정상','상위 연결이 끊깁니다 · 광 경로가 완성되지 않음','두 스위치의 전원이 꺼집니다'],answer:1,reason:'양쪽 SFP가 장착되어 있어도 Fiber 경로가 끊기면 상위 연결도 끊깁니다. 이 모델에서는 두 AP의 전원·UTP는 정상이지만 같은 상위 경로를 사용하는 서비스가 영향을 받습니다.',events:[
 event('SFP와 케이블은 다른 요소','양쪽 SFP가 정상 장착된 상태에서 시작합니다. Switch A 쪽 Fiber 구간 하나만 바꿉니다.',['sfpa','sfpb','fibera']),
 event('Fiber 경로 단절','Switch A 쪽 Fiber가 분리되었습니다. 양쪽 SFP는 그대로 장착되어 있지만 상위 연결은 끊깁니다.',['fibera'],{fibera:false}),
 event('모듈만으로는 연결이 완성되지 않음','SFP가 정상이어도 광케이블이 끊기면 상위 연결은 정상일 수 없습니다. 두 AP의 UTP·PoE는 유지되고 상위망 연결만 영향을 받습니다.',['sfpa','sfpb','ap1','ap2'],{fibera:false})]}
];
export const roles={ap1:'AP A · 휴대폰 같은 무선 단말의 접속을 받습니다. 이번 모델은 UTP로 데이터와 PoE 전원을 받습니다.',ap2:'AP B · AP A와 다른 UTP로 Switch A에 연결됩니다. 두 AP는 상위 연결을 함께 사용합니다.',utp1:'AP A UTP · AP A와 Switch A 사이의 구리 케이블입니다. Cat5e는 케이블 분류이지 장애 표시가 아닙니다.',utp2:'AP B UTP · AP B의 독립된 구리 연결입니다. 이번 모델에서는 Cat5e로 1G 링크가 정상인 예입니다.',access:'Switch A · AP들을 연결하고 상위망으로 이어줍니다. 전원 상태와 상위 연결 상태는 서로 다릅니다.',sfpa:'Switch A 쪽 광 SFP · Switch A의 포트에 장착되어 광 신호를 보내고 받는 모듈입니다.',sfpb:'Switch B 쪽 광 SFP · 반대쪽 Switch B에도 광 신호를 보내고 받는 모듈이 있습니다.',fibera:'Switch A 쪽 Fiber · SFP와 FDF 사이의 광 경로입니다. 빛으로 데이터를 전달합니다.',fiberb:'Switch B 쪽 Fiber · FDF에서 Switch B의 SFP까지 이어지는 광 경로입니다.',fdf:'FDF · 여러 광케이블을 정리하고 서로 연결하기 위한 중간 지점입니다.',distribution:'Switch B · 여러 연결을 모아 더 넓은 네트워크로 이어주는 상위 스위치입니다. 이번 광 경로가 끊겨도 이 장비 자체의 전원은 유지됩니다.'};
