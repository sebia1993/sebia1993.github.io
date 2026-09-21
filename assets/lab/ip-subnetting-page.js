import { mountLab } from './engine.js';
import { parseIPv4, subnetInfo, sameSubnet } from './ipv4.js';
import { topology, scenarios } from './scenarios/ip-subnetting.js';

const root = document.querySelector('#subnet-lab');
if (root) mountLab(root, { title: '직접 전달할까, Gateway에 맡길까?', topology, scenarios });

const form = document.querySelector('#subnet-calculator');
const output = document.querySelector('#calculator-result');
const message = document.querySelector('#calculator-message');
const labels = {
  network: 'Network Address', mask: 'Subnet Mask', broadcast: 'Broadcast Address',
  firstHost: '첫 Host 주소', lastHost: '마지막 Host 주소', hostCount: 'Host 주소 수'
};

function calculate() {
  const source = form.elements.namedItem('source').value.trim();
  const target = form.elements.namedItem('destination').value.trim();
  const prefixText = form.elements.namedItem('prefix').value.trim();
  output.replaceChildren();
  message.classList.remove('is-error');
  for (const name of ['source', 'destination', 'prefix']) form.elements.namedItem(name).removeAttribute('aria-invalid');
  let currentField = 'source';
  try {
    parseIPv4(source);
    currentField = 'prefix';
    if (!/^(0|[1-9]\d?)$/.test(prefixText) || Number(prefixText) > 32) {
      throw new Error('Prefix는 0부터 32까지의 정수로 입력하세요.');
    }
    const prefix = Number(prefixText);
    const info = subnetInfo(source, prefix);
    currentField = 'destination';
    parseIPv4(target);
    for (const [key, label] of Object.entries(labels)) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      term.textContent = label;
      value.textContent = info[key] === null ? '해당 없음' : typeof info[key] === 'number' ? info[key].toLocaleString('ko-KR') : info[key];
      row.append(term, value);
      output.append(row);
    }
    const local = sameSubnet(source, target, prefix);
    let interpretation = local
      ? '송신자의 Mask 기준으로 같은 Subnet입니다. 일반 LAN 모델에서는 목적지 MAC을 직접 ARP로 찾습니다.'
      : '송신자의 Mask 기준으로 다른 Subnet입니다. 추가 경로가 없는 일반 LAN 모델에서는 Gateway로 전달합니다.';
    const specialAddress = address => {
      const octets = address.split('.').map(Number);
      return octets[0] === 0 || octets[0] === 127 || octets[0] >= 224 || (octets[0] === 169 && octets[1] === 254);
    };
    if (specialAddress(source) || specialAddress(target)) {
      interpretation = `Mask 계산상 ${local ? '같은 Prefix' : '다른 Prefix'}입니다. 입력에 특수 용도 주소(0/8, Loopback, Link-local, Multicast 또는 예약 범위)가 포함되어 일반 Host의 ARP·Gateway 전달을 판정하지 않습니다.`;
    } else if (source === target) {
      interpretation = '출발지와 목적지 주소가 같습니다. 이 주소가 자신에게 설정되어 있다면 로컬 처리가 우선하며, 원격 Host를 찾는 ARP·Gateway 모델을 적용하지 않습니다.';
    } else if (prefix === 31 || prefix === 32) {
      interpretation = `Mask 계산상 ${local ? '같은 Prefix' : '다른 Prefix'}입니다. /${prefix}는 일반 LAN 직접 전달·Gateway 규칙으로 판단하지 마세요. 실제 인터페이스 종류와 Routing Table을 확인해야 합니다.`;
    } else if (target === info.network || target === info.broadcast || source === info.network || source === info.broadcast) {
      interpretation = '입력 주소에 Network 또는 Broadcast 주소가 포함됩니다. 일반 LAN의 Host 주소로 사용할 수 없으므로 직접 전달/왕복 성공을 판정하지 않습니다.';
    }
    message.textContent = `${interpretation} ${info.description || ''}`;
  } catch (error) {
    const field = form.elements.namedItem(currentField);
    field.setAttribute('aria-invalid', 'true');
    message.classList.add('is-error');
    const name = { source: '출발지 IP', destination: '목적지 IP', prefix: 'Prefix' }[currentField];
    message.textContent = `${name} 입력을 확인하세요. ${error.message}`;
  }
}

if (form) {
  form.addEventListener('submit', event => { event.preventDefault(); calculate(); });
  calculate();
}

document.querySelectorAll('[data-quiz-answer]').forEach(button => {
  button.addEventListener('click', () => {
    const correct = button.dataset.quizAnswer === 'correct';
    document.querySelector('#quiz-feedback').textContent = correct
      ? '맞습니다. IP 목적지는 PC2로 유지되고, 첫 링크의 Ethernet 목적지 MAC은 R1입니다. 다음 링크에서는 Ethernet 헤더가 달라집니다.'
      : '다시 생각해 보세요. IP 목적지는 최종 도착지이고 Ethernet 목적지는 현재 링크의 다음 전달 대상입니다. 위의 다른 Subnet 시나리오에서 확인할 수 있습니다.';
    document.querySelectorAll('[data-quiz-answer]').forEach(answer => answer.setAttribute('aria-pressed', String(answer === button)));
  });
});
