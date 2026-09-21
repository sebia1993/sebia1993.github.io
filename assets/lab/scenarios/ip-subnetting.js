// Documentation-only addresses and locally administered example MACs.
// These steps are a teaching model, never captured frames or lab results.
const PC1 = '192.0.2.10';
const PC3 = '192.0.2.20';
const PC2 = '192.0.2.140';
const GW = '192.0.2.1';
const MAC = {
  pc1: '02:00:00:00:01:10', pc3: '02:00:00:00:01:20',
  left: '02:00:00:00:01:01', right: '02:00:00:00:02:01',
  pc2: '02:00:00:00:02:14'
};
const arp = (target, note) => ({
  protocol: 'ARP Request (교육용 예시)', senderIp: PC1, arpTarget: target,
  destinationMac: 'ff:ff:ff:ff:ff:ff', note
});
const ip = (destination, destinationMac, note, routed = false) => ({
  protocol: 'IPv4 / ICMP Echo Request (교육용 예시)', sourceIp: PC1,
  destinationIp: destination, sourceMac: routed ? MAC.right : MAC.pc1,
  destinationMac, ttl: routed ? '63' : '64', note
});
const step = (title, detail, nodeId, packet = {}, fromNodeId = null) => ({
  title, detail, nodeId, packet, ...(fromNodeId ? { fromNodeId } : { animate: false })
});
const nextHopChoices = [
  { id: 'direct', label: '목적지 PC를 직접 ARP로 찾는다' },
  { id: 'gateway', label: 'Gateway의 MAC을 ARP로 찾는다' },
  { id: 'rewrite', label: 'IP 목적지를 Gateway IP로 바꾼다' }
];

export const topology = {
  provenance: 'simulation',
  nodes: [
    { id: 'pc1', label: 'PC1 · 출발지', subtitle: '192.0.2.10/25', x: 80, y: 90 },
    { id: 'sw1', label: 'SW1', subtitle: '왼쪽 LAN', x: 270, y: 90 },
    { id: 'r1', label: 'R1 · Gateway', subtitle: '.1/25 ↔ .129/25', x: 470, y: 90 },
    { id: 'sw2', label: 'SW2', subtitle: '오른쪽 LAN', x: 670, y: 90 },
    { id: 'pc2', label: 'PC2 · 원격', subtitle: '192.0.2.140/25', x: 870, y: 90 },
    { id: 'pc3', label: 'PC3 · 같은 LAN', subtitle: '192.0.2.20/25', x: 270, y: 245 }
  ],
  links: [
    { id: 'pc1-sw1', from: 'pc1', to: 'sw1' },
    { id: 'sw1-r1', from: 'sw1', to: 'r1' },
    { id: 'r1-sw2', from: 'r1', to: 'sw2' },
    { id: 'sw2-pc2', from: 'sw2', to: 'pc2' },
    { id: 'sw1-pc3', from: 'sw1', to: 'pc3' }
  ]
};

const routedSteps = (recoveryTitle) => [
  step(recoveryTitle || '다른 Subnet으로 판단', 'PC1 /25 기준으로 .10은 192.0.2.0/25, .140은 192.0.2.128/25입니다. 추가 경로가 없으므로 기본 Gateway .1을 선택합니다.', 'pc1', { sourceIp: PC1, destinationIp: PC2, prefix: '/25', nextHop: GW }),
  step('Gateway에 ARP', '먼저 같은 LAN에 있는 Gateway의 MAC을 묻습니다. 원격 PC2를 직접 ARP로 찾지 않습니다.', 'sw1', arp(GW, 'ARP 요청은 왼쪽 LAN에만 퍼집니다.'), 'pc1'),
  step('Gateway MAC으로 첫 프레임 전달', 'R1이 ARP에 응답한 뒤 PC1은 R1 왼쪽 MAC으로 ICMP 요청을 보냅니다. IP 목적지는 여전히 PC2입니다.', 'r1', ip(PC2, MAC.left, '다음 홉 MAC과 최종 목적지 IP는 서로 다른 역할입니다.'), 'pc1'),
  step('라우터에서 PC2로 전달', 'R1은 PC2의 MAC을 ARP로 확인한 뒤 Ethernet 헤더를 바꾸고 TTL을 1 줄여 오른쪽 링크로 전달합니다. PC2가 요청을 받습니다.', 'pc2', ip(PC2, MAC.pc2, 'NAT가 없으므로 출발지·목적지 IP는 유지됩니다.', true), 'r1'),
  step('PC2는 자기 Gateway로 응답', 'PC2는 자기 Gateway .129의 MAC으로 Echo Reply를 보냅니다. 반환 IP 목적지는 PC1입니다.', 'r1', { protocol: 'ICMP Echo Reply (교육용 예시)', sourceIp: PC2, destinationIp: PC1, sourceMac: MAC.pc2, destinationMac: MAC.right, nextHop: '192.0.2.129' }, 'pc2'),
  step('반환 프레임이 PC1에 도착', 'R1이 왼쪽 링크에 맞게 Ethernet 헤더를 바꾸어 응답을 전달합니다. 정상 주소·경로·링크라는 모델 조건에서 왕복이 가능합니다.', 'pc1', { protocol: 'ICMP Echo Reply (교육용 예시)', sourceIp: PC2, destinationIp: PC1, sourceMac: MAC.left, destinationMac: MAC.pc1, note: '실제 ping 성공 또는 패킷 관측 기록이 아닙니다.' }, 'r1')
];

export const scenarios = [
  {
    id: 'same-subnet', title: '정상 ① 같은 Subnet', kind: 'normal', provenance: 'simulation',
    description: 'PC1 .10/25 → PC3 .20/25. 두 PC는 SW1에 연결되어 있습니다. 토폴로지의 주소는 정상 기준값입니다.',
    question: 'PC1은 PC3에게 보내기 전에 누구의 MAC을 찾아야 할까요?',
    choices: nextHopChoices, correctId: 'direct',
    feedback: '두 주소에 /25를 적용하면 모두 192.0.2.0/25입니다. PC1은 PC3를 직접 ARP로 찾습니다. 이 통신에는 Gateway가 필요하지 않습니다.',
    steps: [
      step('같은 Subnet으로 판단', '192.0.2.10 AND 255.255.255.128과 192.0.2.20 AND 255.255.255.128은 모두 192.0.2.0입니다.', 'pc1', { sourceIp: PC1, destinationIp: PC3, prefix: '/25', nextHop: PC3 }),
      step('PC3 주소에 ARP', 'SW1이 ARP Broadcast를 같은 LAN에 전달합니다. R1에도 보일 수 있지만 R1을 넘어 오른쪽 LAN으로 라우팅되지 않습니다.', 'pc3', arp(PC3, 'PC3로 전달되는 경로를 강조합니다. Broadcast는 왼쪽 LAN의 다른 포트에도 퍼집니다.'), 'pc1'),
      step('PC3의 MAC 확인', 'PC3가 자신의 MAC으로 ARP Reply를 보냅니다. 이 모델은 캐시가 비어 있는 상태에서 시작합니다.', 'pc1', { protocol: 'ARP Reply (교육용 예시)', senderIp: PC3, senderMac: MAC.pc3, destinationMac: MAC.pc1 }, 'pc3'),
      step('같은 LAN에서 ICMP 전달', 'PC1은 PC3의 MAC으로 프레임을 보냅니다. IP 목적지도 PC3이며 Gateway를 거치지 않습니다.', 'pc3', ip(PC3, MAC.pc3, '스위치는 IP 목적지를 Gateway로 바꾸지 않습니다.'), 'pc1'),
      step('PC3가 응답', '정상 모델에서는 PC3가 PC1에 직접 응답합니다. 같은 Subnet 계산만으로 실제 케이블·정책·상대 장비 상태까지 보장되는 것은 아닙니다.', 'pc1', { protocol: 'ICMP Echo Reply (교육용 예시)', sourceIp: PC3, destinationIp: PC1, sourceMac: MAC.pc3, destinationMac: MAC.pc1 }, 'pc3')
    ]
  },
  {
    id: 'different-subnet', title: '정상 ② 다른 Subnet', kind: 'normal', provenance: 'simulation',
    description: 'PC1 .10/25 → PC2 .140/25. PC1 Gateway는 .1, PC2 Gateway는 .129입니다.',
    question: 'PC1에서 나가는 첫 프레임을 만들려면 누구의 MAC이 필요할까요?',
    choices: nextHopChoices, correctId: 'gateway',
    feedback: 'PC2는 PC1의 /25 밖에 있습니다. PC1은 Gateway .1의 MAC을 찾지만 IP 목적지 .140은 유지합니다.',
    steps: routedSteps()
  },
  {
    id: 'wrong-mask', title: '장애 ① PC1의 Mask 오류', kind: 'failure', provenance: 'simulation',
    description: '정상 기준에서 PC1만 /24로 바꿉니다. 다른 노드는 /25 그대로이며 R1의 Proxy ARP는 꺼져 있습니다. 그림은 정상 기준 주소이고 이 시나리오의 PC1은 /24입니다.',
    question: 'PC1 .10/24는 PC2 .140을 어떻게 판단할까요?',
    choices: [
      { id: 'on-link', label: '같은 Subnet이라고 판단하고 PC2에 직접 ARP한다' },
      { id: 'gateway', label: '다른 Subnet으로 판단하고 Gateway .1에 ARP한다' },
      { id: 'drop-ip', label: 'Mask가 다르므로 ARP 없이 모든 통신을 중단한다' }
    ], correctId: 'on-link',
    feedback: 'PC1의 /24 계산으로는 .10과 .140이 같은 Network입니다. 하지만 실제 L2 영역은 R1로 나뉘어 있어 PC2는 그 ARP를 받지 못합니다. PC1의 판단과 실제 토폴로지를 함께 봐야 합니다.',
    steps: [
      step('너무 넓은 /24 적용', 'PC1만 255.255.255.0으로 바뀌어 원격 PC2까지 직접 연결된 것으로 판단합니다. Gateway 값은 정상 .1입니다.', 'pc1', { sourceIp: PC1, destinationIp: PC2, prefix: '/24 (오류)', nextHop: PC2 }),
      step('원격 PC2에 직접 ARP', 'PC1은 Gateway를 사용하지 않고 .140의 MAC을 묻습니다. SW1의 왼쪽 LAN에만 Broadcast됩니다.', 'sw1', arp(PC2, '192.0.2.140에 대한 ARP는 오른쪽 LAN으로 전달되지 않습니다.'), 'pc1'),
      step('R1은 대신 응답하지 않음', 'Proxy ARP가 꺼진 조건에서 R1은 PC2 대신 응답하지 않습니다. PC2에는 ARP가 도착하지 않아 다음 홉 MAC을 얻지 못합니다.', 'r1', { protocol: 'ARP 응답 없음 (모델)', arpTarget: PC2, note: '무응답 원인은 실제 실험에서 CLI와 양쪽 링크로 확인해야 합니다.' }),
      step('원인 분리', 'PC3 .20은 같은 LAN이므로 정상 모델에서는 계속 통신할 수 있습니다. Mask와 L2 경계를 비교하고 PC1 /25 복구 시나리오를 선택하세요.', 'pc1', { condition: 'PC1→PC2 전달 불가 / PC1→PC3 대조 테스트 정상', recovery: 'PC1 Prefix를 /25로 복원', note: '장애를 실제로 재현한 결과가 아닙니다.' })
    ]
  },
  {
    id: 'mask-recovery', title: '복구 ① PC1 /25 복원', kind: 'recovery', provenance: 'simulation',
    description: 'PC1 Prefix를 /25로 되돌립니다. Gateway .1, 정상 라우터와 링크를 유지합니다.',
    question: 'Mask를 /25로 복구하면 PC2 통신의 ARP 대상은 무엇으로 바뀔까요?',
    choices: [
      { id: 'gateway', label: 'PC2 .140에서 Gateway .1로 바뀐다' },
      { id: 'unchanged', label: '계속 PC2 .140에 직접 ARP한다' },
      { id: 'pc3', label: '같은 LAN의 PC3 .20으로 바뀐다' }
    ], correctId: 'gateway',
    feedback: '정상 /25에서 원격 PC2는 다른 Subnet입니다. Gateway ARP와 원격 왕복 통신을 모두 확인해야 실제 복구를 판정할 수 있습니다.',
    steps: routedSteps('PC1의 /25 복구')
  },
  {
    id: 'wrong-gateway', title: '장애 ② 잘못된 Gateway', kind: 'failure', provenance: 'simulation',
    description: 'PC1 /25 정상 상태에서 Gateway만 미사용 .126으로 바꿉니다. Mask 장애와 동시에 적용하지 않습니다.',
    question: 'PC1이 PC2로 보낼 때 ARP로 찾는 대상은 누구일까요?',
    choices: [
      { id: 'wrong', label: '설정된 Gateway .126' },
      { id: 'right', label: '자동으로 올바른 Gateway .1을 찾는다' },
      { id: 'pc2', label: '원격 PC2 .140' }
    ], correctId: 'wrong',
    feedback: 'PC1은 설정된 Gateway .126을 사용합니다. 이 주소는 같은 /25 안에 있지만 응답하는 장비가 없습니다. 올바른 Gateway를 자동으로 추측하지 않습니다.',
    steps: [
      step('Subnet 판단은 정상', 'PC1 /25는 PC2가 다른 망인 것을 올바르게 판단합니다. 기본 경로의 다음 홉만 잘못되었습니다.', 'pc1', { sourceIp: PC1, destinationIp: PC2, prefix: '/25', nextHop: '192.0.2.126 (오류)' }),
      step('잘못된 Gateway에 ARP', 'PC1은 .126의 MAC을 반복해서 묻습니다. 이 모델에서는 .126을 사용하는 노드가 없습니다.', 'sw1', arp('192.0.2.126', '올바른 Gateway .1이 있어도 설정된 .126을 자동으로 대체하지 않습니다.'), 'pc1'),
      step('MAC을 얻지 못해 전달 중단', 'Gateway의 MAC을 알 수 없으므로 원격 PC2로 보낼 ICMP 프레임 전달이 진행되지 않습니다.', 'pc1', { protocol: 'ARP 응답 없음 (모델)', arpTarget: '192.0.2.126', note: 'PC2가 꺼졌다는 증거가 아닙니다.' }),
      step('같은 LAN은 별도로 점검', 'PC3는 직접 전달 대상이라 정상 모델에서 계속 통신됩니다. Gateway .1 복구 후 원격 경로를 다시 점검하세요.', 'pc3', { sourceIp: PC1, destinationIp: PC3, recovery: 'PC1 Gateway를 192.0.2.1로 복원', note: '장애를 실제로 재현한 결과가 아닙니다.' })
    ]
  },
  {
    id: 'gateway-recovery', title: '복구 ② Gateway .1 복원', kind: 'recovery', provenance: 'simulation',
    description: 'PC1 /25를 유지하고 Gateway를 .1로 되돌립니다. 원격 PC2의 Gateway는 .129입니다.',
    question: '복구 후 PC1의 첫 ICMP 요청에서 맞는 조합은 무엇일까요?',
    choices: [
      { id: 'correct', label: 'IP 목적지 = PC2 .140 / Ethernet 목적지 = R1 왼쪽 MAC' },
      { id: 'rewrite', label: 'IP 목적지 = Gateway .1 / Ethernet 목적지 = PC2 MAC' },
      { id: 'direct', label: 'IP 목적지 = PC2 .140 / Ethernet 목적지 = PC2 MAC' }
    ], correctId: 'correct',
    feedback: 'IP 목적지는 최종 목적지 PC2입니다. 첫 Ethernet 프레임은 같은 LAN의 다음 홉 R1로 전달합니다. 라우터는 다음 링크에 맞게 MAC 헤더를 새로 만듭니다.',
    steps: routedSteps('정상 Gateway .1 복구')
  }
];
