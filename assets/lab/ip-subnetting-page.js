import { mountLab } from './engine.js';
import { parseIPv4, subnetInfo, sameSubnet } from './ipv4.js';
import { topology, scenarios } from './scenarios/ip-subnetting.js';

const root = document.querySelector('#subnet-lab');
if (root) mountLab(root, { title: '직접 전달할까, Gateway에 맡길까?', topology, scenarios });

const course = document.querySelector('.subnet-course');
const modeDescription = document.querySelector('#mode-description');
document.querySelectorAll('[data-learning-mode]').forEach(button => {
  button.addEventListener('click', () => {
    const mode = button.dataset.learningMode;
    if (course) course.dataset.mode = mode;
    document.querySelectorAll('[data-learning-mode]').forEach(item => {
      item.setAttribute('aria-pressed', String(item === button));
    });
    if (modeDescription) {
      modeDescription.textContent = mode === 'advanced'
        ? '기본 흐름에 Binary 계산, /31·/32, Proxy ARP와 예외 조건까지 함께 봅니다.'
        : '처음에는 핵심 판단과 정상·대표 장애만 봅니다.';
    }
  });
});

const form = document.querySelector('#subnet-calculator');
const output = document.querySelector('#calculator-result');
const message = document.querySelector('#calculator-message');
const decision = document.querySelector('#calculator-decision');
const binaryResult = document.querySelector('#binary-result');
const labels = {
  network: 'Source Network', mask: 'Subnet Mask', broadcast: 'Broadcast Address',
  firstHost: '첫 Host 주소', lastHost: '마지막 Host 주소', hostCount: 'Host 주소 수'
};

const formatBinary = value => parseIPv4(value).toString(2).padStart(32, '0').replace(/(.{8})(?=.)/g, '$1.');
const maskFromPrefix = prefix => prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;

function calculate() {
  if (!form || !output || !message) return;
  const source = form.elements.namedItem('source').value.trim();
  const target = form.elements.namedItem('destination').value.trim();
  const prefixText = form.elements.namedItem('prefix').value.trim();
  output.replaceChildren();
  if (decision) decision.replaceChildren();
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
    const targetInfo = subnetInfo(target, prefix);

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
    if (decision) {
      const cards = [
        ['Source Network', info.network],
        ['Destination Network', targetInfo.network],
        ['판단', local ? '같음 · ON-LINK · 목적지 직접 전달' : '다름 · OFF-LINK · Route / Gateway 확인']
      ];
      for (const [label, value] of cards) {
        const card = document.createElement('div');
        const small = document.createElement('span');
        const strong = document.createElement('strong');
        small.className = 'subnet-muted';
        small.textContent = label;
        strong.textContent = value;
        card.append(small, strong);
        decision.append(card);
      }
    }

    if (binaryResult) {
      binaryResult.textContent =
        'Source      ' + formatBinary(source) + '\n' +
        'Mask        ' + formatBinary(info.mask) + '\n' +
        '            -----------------------------------\n' +
        'Network     ' + formatBinary(info.network) + '  (' + info.network + ')\n\n' +
        'Destination ' + formatBinary(target) + '\n' +
        'Mask        ' + formatBinary(info.mask) + '\n' +
        '            -----------------------------------\n' +
        'Network     ' + formatBinary(targetInfo.network) + '  (' + targetInfo.network + ')';
    }

    let interpretation = local
      ? '송신자의 Mask 기준으로 같은 Subnet입니다. 일반 LAN 모델에서는 목적지 MAC을 직접 ARP로 찾습니다.'
      : '송신자의 Mask 기준으로 다른 Subnet입니다. Routing Table을 확인하고, 이 과정의 기본 모델에서는 Default Gateway를 다음 홉으로 사용합니다.';
    const specialAddress = address => {
      const octets = address.split('.').map(Number);
      return octets[0] === 0 || octets[0] === 127 || octets[0] >= 224 || (octets[0] === 169 && octets[1] === 254);
    };
    if (specialAddress(source) || specialAddress(target)) {
      interpretation = `Mask 계산상 ${local ? '같은 Prefix' : '다른 Prefix'}입니다. 입력에 특수 용도 주소가 포함되어 일반 Host의 ARP·Gateway 전달을 판정하지 않습니다.`;
    } else if (source === target) {
      interpretation = '출발지와 목적지 주소가 같습니다. 이 주소가 자신에게 설정되어 있다면 로컬 처리가 우선합니다.';
    } else if (prefix === 31 || prefix === 32) {
      interpretation = `Mask 계산상 ${local ? '같은 Prefix' : '다른 Prefix'}입니다. /${prefix}는 일반 LAN 직접 전달·Gateway 규칙으로 단정하지 말고 인터페이스 종류와 Routing Table을 확인하세요.`;
    } else if (target === targetInfo.network || target === targetInfo.broadcast || source === info.network || source === info.broadcast) {
      interpretation = '입력 주소에 Network 또는 Broadcast 주소가 포함됩니다. 일반 LAN의 Host 주소로 사용할 수 없으므로 직접 전달/왕복 성공을 판정하지 않습니다.';
    }
    message.textContent = `${interpretation} ${info.description || ''}`;
  } catch (error) {
    const field = form.elements.namedItem(currentField);
    field.setAttribute('aria-invalid', 'true');
    message.classList.add('is-error');
    const name = { source: '출발지 IP', destination: '목적지 IP', prefix: 'Prefix' }[currentField];
    message.textContent = `${name} 입력을 확인하세요. ${error.message}`;
    if (binaryResult) binaryResult.textContent = '유효한 값을 입력하면 Binary AND 과정을 표시합니다.';
  }
}

if (form) {
  form.addEventListener('submit', event => { event.preventDefault(); calculate(); });
  calculate();
}

const boundaryInput = document.querySelector('#boundary-prefix');
const boundaryValue = document.querySelector('#boundary-prefix-value');
const boundarySummary = document.querySelector('#boundary-summary');
const boundaryStrip = document.querySelector('#boundary-strip');

function renderBoundary() {
  if (!boundaryInput || !boundaryStrip) return;
  const prefix = Number(boundaryInput.value);
  const blockSize = 2 ** (32 - prefix);
  const count = 256 / blockSize;
  boundaryStrip.replaceChildren();
  if (boundaryValue) boundaryValue.textContent = String(prefix);
  if (boundarySummary) boundarySummary.textContent = `${count}개 Subnet · 블록 크기 ${blockSize} · 경계 간격 ${blockSize}`;
  for (let i = 0; i < count; i += 1) {
    const start = i * blockSize;
    const end = start + blockSize - 1;
    const item = document.createElement('div');
    item.className = 'boundary-block';
    item.style.flex = '1 1 0';
    const title = document.createElement('b');
    const range = document.createElement('span');
    title.textContent = `.${start}/${prefix}`;
    range.textContent = `.${start}–.${end}`;
    item.append(title, range);
    boundaryStrip.append(item);
  }
}
if (boundaryInput) {
  boundaryInput.addEventListener('input', renderBoundary);
  renderBoundary();
}

const trainerQuestion = document.querySelector('#training-question');
const trainerAnswers = document.querySelector('#training-answers');
const trainerFeedback = document.querySelector('#training-feedback');
const newQuestionButton = document.querySelector('#new-training-question');
let trainingAnswer = null;
let trainingExplanation = '';

const shuffle = array => [...array].sort(() => Math.random() - 0.5);
const pick = array => array[Math.floor(Math.random() * array.length)];

function newTrainingQuestion() {
  if (!trainerQuestion || !trainerAnswers || !trainerFeedback) return;
  const prefix = pick([25, 26, 27]);
  const block = 2 ** (32 - prefix);
  const type = pick(['network', 'same', 'change']);
  let question;
  let answers;

  if (type === 'network') {
    const host = Math.floor(Math.random() * 254) + 1;
    const ip = `192.168.10.${host}`;
    const info = subnetInfo(ip, prefix);
    trainingAnswer = info.network;
    trainingExplanation = `/${prefix}의 블록 크기는 ${block}입니다. .${host}가 속한 블록은 ${info.network}/${prefix}입니다.`;
    const base = Math.floor(host / block) * block;
    const candidateStarts = [...new Set([base, Math.max(0, base - block), Math.min(255 - block + 1, base + block)])];
    answers = candidateStarts.map(start => `192.168.10.${start}`);
    while (answers.length < 3) answers.push(`192.168.10.${Math.min(255, (answers.length + 1) * block)}`);
    question = `${ip}/${prefix}의 Network Address는?`;
  } else if (type === 'same') {
    const a = Math.floor(Math.random() * 254) + 1;
    const same = Math.random() >= 0.5;
    const base = Math.floor(a / block) * block;
    let b;
    if (same) {
      const low = Math.max(base + 1, 1);
      const high = Math.min(base + block - 2, 254);
      b = low <= high ? low + Math.floor(Math.random() * (high - low + 1)) : a;
    } else {
      const nextBase = (base + block) <= 255 ? base + block : Math.max(0, base - block);
      b = Math.min(254, nextBase + 1);
    }
    const left = `192.168.10.${a}`;
    const right = `192.168.10.${b}`;
    const result = sameSubnet(left, right, prefix);
    trainingAnswer = result ? '같은 Subnet' : '다른 Subnet';
    const leftNet = subnetInfo(left, prefix).network;
    const rightNet = subnetInfo(right, prefix).network;
    trainingExplanation = `${left} → ${leftNet}/${prefix}, ${right} → ${rightNet}/${prefix}. Network 값이 ${result ? '같습니다' : '다릅니다'}.`;
    answers = ['같은 Subnet', '다른 Subnet', '주소만으로 판단 불가'];
    question = `${left}/${prefix}와 ${right}/${prefix}는 같은 Subnet인가?`;
  } else {
    const chosenPrefix = pick([24, 25]);
    const local = sameSubnet('192.0.2.10', '192.0.2.140', chosenPrefix);
    trainingAnswer = local ? '직접 전달' : 'Gateway / Route';
    trainingExplanation = chosenPrefix === 24
      ? '/24에서는 .10과 .140이 모두 192.0.2.0/24에 있으므로 ON-LINK로 판단합니다.'
      : '/25에서는 .10은 192.0.2.0/25, .140은 192.0.2.128/25이므로 OFF-LINK로 판단합니다.';
    answers = ['직접 전달', 'Gateway / Route', '항상 Drop'];
    question = `PC1 192.0.2.10/${chosenPrefix} → 192.0.2.140. 첫 전달 판단은?`;
  }

  trainerQuestion.textContent = question;
  trainerAnswers.replaceChildren();
  for (const answer of shuffle(answers).slice(0, 3)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = answer;
    button.addEventListener('click', () => {
      const correct = answer === trainingAnswer;
      trainerFeedback.textContent = (correct ? '맞습니다. ' : '다시 계산해 보세요. ') + trainingExplanation;
      [...trainerAnswers.children].forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    });
    trainerAnswers.append(button);
  }
  trainerFeedback.textContent = '먼저 답을 선택한 뒤 계산 근거를 확인하세요.';
}
if (newQuestionButton) newQuestionButton.addEventListener('click', newTrainingQuestion);
newTrainingQuestion();

document.querySelectorAll('[data-quiz-answer]').forEach(button => {
  button.addEventListener('click', () => {
    const correct = button.dataset.quizAnswer === 'correct';
    const feedback = document.querySelector('#quiz-feedback');
    if (feedback) {
      feedback.textContent = correct
        ? '맞습니다. IP 목적지는 PC2로 유지되고, 첫 링크의 Ethernet 목적지 MAC은 R1입니다. 다음 링크에서는 Ethernet 헤더가 달라집니다.'
        : '다시 생각해 보세요. IP 목적지는 최종 도착지이고 Ethernet 목적지는 현재 링크의 다음 전달 대상입니다.';
    }
    document.querySelectorAll('[data-quiz-answer]').forEach(answer => answer.setAttribute('aria-pressed', String(answer === button)));
  });
});

const drillCorrect = { '1': 'mask', '2': 'gateway', '3': 'host' };
const drillText = {
  '1': '직접 ARP 대상이 원격 IP로 잡혔습니다. 먼저 PC1의 IP/Mask로 on-link 판단이 왜 그렇게 나왔는지 확인합니다.',
  '2': 'Subnet 판단은 OFF-LINK인데 ARP 대상이 .126입니다. 설정된 Default Gateway / Route의 next-hop을 먼저 확인합니다.',
  '3': '같은 Subnet 대상의 ARP가 이미 성공했습니다. Subnet/Gateway를 임의 변경하기보다 상대 Host, ICMP 정책, 방화벽과 패킷 흐름을 확인합니다.'
};
document.querySelectorAll('[data-drill]').forEach(button => {
  button.addEventListener('click', () => {
    const id = button.dataset.case;
    const correct = button.dataset.drill === drillCorrect[id];
    const feedback = document.querySelector(`#drill-feedback-${id}`);
    if (feedback) feedback.textContent = (correct ? '맞습니다. ' : '우선순위를 다시 보세요. ') + drillText[id];
    document.querySelectorAll(`[data-case="${id}"]`).forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  });
});
