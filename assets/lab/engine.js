import { createState, choose, advance, reset, validateScenario } from './core.js';

let instanceCount = 0;
const SVG = 'http://www.w3.org/2000/svg';

/** Mount an isolated, educational simulation; it never changes evidence/results. */
export function mountLab(root, { title, topology, scenarios }) {
  if (!root || !root.ownerDocument) throw new TypeError('A DOM root is required.');
  if (!Array.isArray(scenarios) || !scenarios.length) throw new TypeError('Scenarios are required.');
  scenarios.forEach(validateScenario);
  if (new Set(scenarios.map(item => item.id)).size !== scenarios.length) throw new TypeError('Duplicate scenario ID.');
  if (!topology?.nodes?.length || !Array.isArray(topology.links)) throw new TypeError('Topology nodes and links are required.');
  const nodes = new Map(topology.nodes.map(node => [node.id, node]));
  if (nodes.size !== topology.nodes.length || topology.nodes.some(node => !node.id || !Number.isFinite(node.x) || !Number.isFinite(node.y))) {
    throw new TypeError('Topology nodes need unique IDs and finite coordinates.');
  }
  if (new Set(topology.links.map(link => link.id)).size !== topology.links.length ||
      topology.links.some(link => !link.id || !nodes.has(link.from) || !nodes.has(link.to)) ||
      scenarios.some(item => item.steps.some(step =>
        (step.nodeId && !nodes.has(step.nodeId)) || (step.fromNodeId && !nodes.has(step.fromNodeId))))) {
    throw new TypeError('Topology/step references are invalid.');
  }
  const doc = root.ownerDocument, view = doc.defaultView;
  const prefix = `nl-${++instanceCount}`;
  const lifecycle = new AbortController();
  let scenario = scenarios[0], state = createState(scenario), playing = false, destroyed = false;
  let runVersion = 0, timer = null, frame = null, zoom = 1, overview = false, follow = false, userPauseUntil = 0;
  const reduced = () => Boolean(view.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const el = (tag, className = '', text = '') => {
    const element = doc.createElement(tag);
    element.className = className;
    if (text !== '') element.textContent = text;
    return element;
  };
  const svgEl = (tag, attributes = {}) => {
    const element = doc.createElementNS(SVG, tag);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
    return element;
  };
  const on = (target, event, callback, options = {}) => target.addEventListener(event, callback, { ...options, signal: lifecycle.signal });
  const button = (text, action, className = '') => {
    const result = el('button', `nl-button ${className}`, text);
    result.type = 'button';
    on(result, 'click', action);
    return result;
  };
  root.classList.add('nl-lab');
  root.dataset.mode = 'basic';
  const header = el('div', 'nl-header');
  header.append(el('span', 'nl-badge', '교육용 시뮬레이션 · 실제 Lab 미실행'), el('h3', '', title || '네트워크 실습'));
  const selectorRow = el('div', 'nl-selector-row');
  const scenarioLabel = el('label', '', '실습 시나리오');
  const select = el('select', 'nl-select');
  select.id = `${prefix}-scenario`; scenarioLabel.htmlFor = select.id;
  const kindNames = { normal: '정상', failure: '장애', recovery: '복구' };
  scenarios.forEach(item => {
    const option = el('option', '', `${kindNames[item.kind] || '연습'} · ${item.title}`);
    option.value = item.id; select.append(option);
  });
  selectorRow.append(scenarioLabel, select);
  const description = el('p', 'nl-description');
  const modes = el('div', 'nl-modes');
  modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', '보기 모드');
  const modeButtons = ['basic', 'advanced'].map(mode => button(mode === 'basic' ? '기본 모드' : '고급 모드', () => {
    root.dataset.mode = mode;
    modeButtons.forEach((item, index) => item.setAttribute('aria-pressed', String(index === (mode === 'basic' ? 0 : 1))));
    packetDetails.open = mode === 'advanced';
  }));
  modeButtons.forEach((item, index) => item.setAttribute('aria-pressed', String(index === 0)));
  modes.append(...modeButtons);
  const prediction = el('fieldset', 'nl-prediction');
  const question = el('legend');
  const choices = el('div', 'nl-choices');
  prediction.append(question, choices);
  const feedback = el('p', 'nl-feedback');
  feedback.setAttribute('role', 'status');
  const controls = el('div', 'nl-controls');
  const playButton = button('자동 재생', startPlayback, 'nl-primary');
  const stepButton = button('한 단계', () => { if (!playing && !destroyed) moveNext(); });
  const resetButton = button('초기화', resetCurrent);
  controls.append(playButton, stepButton, resetButton);
  const resetNote = el('p', 'nl-note', '초기화하면 예상·단계·로그를 비웁니다. 보기 모드·확대·따라가기 설정은 유지합니다.');
  const tools = el('div', 'nl-topology-tools');
  const zoomOut = button('축소', () => changeZoom(-0.25));
  const zoomIn = button('확대', () => changeZoom(0.25));
  const fit = button('보기 맞춤', () => { overview = true; zoom = 1; applyZoom(); viewport.scrollLeft = 0; });
  const zoomLabel = el('span', 'nl-zoom-label', '100%');
  zoomLabel.setAttribute('aria-live', 'polite');
  const followLabel = el('label', 'nl-follow');
  const followInput = el('input'); followInput.type = 'checkbox';
  followLabel.append(followInput, doc.createTextNode('패킷 가로 따라가기'));
  on(followInput, 'change', () => { follow = followInput.checked; userPauseUntil = 0; });
  tools.append(zoomOut, zoomIn, fit, zoomLabel, followLabel);
  const viewport = el('div', 'nl-topology-viewport');
  viewport.tabIndex = 0; viewport.setAttribute('role', 'region'); viewport.setAttribute('aria-label', '네트워크 토폴로지 · 확대 후 좌우 이동');
  const topologyHint = el('p', 'nl-note nl-topology-hint');
  topologyHint.id = `${prefix}-topology-hint`;
  viewport.setAttribute('aria-describedby', topologyHint.id);
  const minX = Math.min(...topology.nodes.map(node => node.x)) - 90;
  const minY = Math.min(...topology.nodes.map(node => node.y)) - 60;
  const width = Math.max(...topology.nodes.map(node => node.x)) - minX + 90;
  const height = Math.max(...topology.nodes.map(node => node.y)) - minY + 70;
  const canvas = svgEl('svg', { viewBox: `${minX} ${minY} ${width} ${height}`, role: 'img', 'aria-labelledby': `${prefix}-topology-title` });
  const canvasTitle = svgEl('title', { id: `${prefix}-topology-title` });
  canvasTitle.textContent = `교육 토폴로지: ${topology.nodes.map(node => node.label).join(', ')}`;
  canvas.append(canvasTitle);
  const linkEls = new Map(), nodeEls = new Map();
  topology.links.forEach(link => {
    const from = nodes.get(link.from), to = nodes.get(link.to);
    const line = svgEl('line', { x1: from.x, y1: from.y, x2: to.x, y2: to.y, class: 'nl-link' });
    canvas.append(line); linkEls.set(link.id, line);
  });
  topology.nodes.forEach(node => {
    const group = svgEl('g', { transform: `translate(${node.x},${node.y})`, class: 'nl-node' });
    const rect = svgEl('rect', { x: -75, y: -30, width: 150, height: 60, rx: 12 });
    const label = svgEl('text', { 'text-anchor': 'middle', y: node.subtitle ? -3 : 5 });
    label.textContent = node.label;
    group.append(rect, label);
    if (node.subtitle) {
      const subtitle = svgEl('text', { 'text-anchor': 'middle', y: 17, class: 'nl-node-subtitle' });
      subtitle.textContent = node.subtitle; group.append(subtitle);
    }
    canvas.append(group); nodeEls.set(node.id, group);
  });
  const marker = svgEl('circle', { r: 8, class: 'nl-packet', visibility: 'hidden' });
  canvas.append(marker); viewport.append(canvas);
  const pauseFollow = () => { userPauseUntil = Date.now() + 3000; };
  ['touchstart', 'wheel', 'pointerdown', 'keydown'].forEach(event => on(viewport, event, pauseFollow, { passive: true }));
  const status = el('div', 'nl-step-status'); status.setAttribute('role', 'status');
  const progress = el('progress', 'nl-progress'); progress.max = scenario.steps.length; progress.value = 0;
  progress.setAttribute('aria-label', '현재 연습 단계');
  const currentTitle = el('h4', '', '먼저 결과를 예상하세요.');
  const currentDetail = el('p');
  status.append(currentTitle, currentDetail);
  const packetDetails = el('details', 'nl-packet-details');
  packetDetails.append(el('summary', '', '패킷 자세히 보기'));
  const packetBody = el('div', 'nl-packet-body'); packetDetails.append(packetBody);
  const advancedNote = el('p', 'nl-note nl-advanced', '표시되는 필드는 Scenario의 교육 모델입니다. 실제 PCAP의 Header를 읽어 온 결과가 아닙니다.');
  packetDetails.append(advancedNote);
  const logHeading = el('h4', '', '이벤트 로그');
  const eventLog = el('ol', 'nl-event-log'); eventLog.setAttribute('aria-label', '현재 실행 이벤트 로그');
  const complete = el('p', 'nl-complete'); complete.hidden = true; complete.setAttribute('role', 'status');
  complete.textContent = '현재 시뮬레이션 연습 완료 · 실제 Lab 검증이나 로드맵 완료를 의미하지 않습니다.';
  root.replaceChildren(header, selectorRow, description, modes, prediction, feedback, controls, resetNote,
    tools, topologyHint, viewport, progress, status, packetDetails, logHeading, eventLog, complete);

  function stop() {
    runVersion += 1;
    if (timer !== null) view.clearTimeout(timer);
    if (frame !== null) view.cancelAnimationFrame(frame);
    timer = frame = null;
    playing = false;
  }

  function renderChoices() {
    choices.replaceChildren();
    scenario.choices.forEach(choice => {
      const choiceButton = button(choice.label, () => {
        if (destroyed || playing || state.stepIndex >= 0) return;
        state = choose(state, scenario, choice.id); render();
      });
      choiceButton.dataset.choice = choice.id;
      choiceButton.setAttribute('aria-pressed', 'false');
      choices.append(choiceButton);
    });
  }

  function render() {
    root.dataset.phase = state.phase; root.dataset.scenario = scenario.id; root.dataset.step = String(state.stepIndex);
    description.textContent = scenario.description || '';
    question.textContent = scenario.question;
    choices.querySelectorAll('button').forEach(item => {
      item.setAttribute('aria-pressed', String(item.dataset.choice === state.choiceId));
      item.disabled = playing || state.stepIndex >= 0;
    });
    const correctChoice = scenario.choices.find(item => item.id === scenario.correctId);
    feedback.textContent = state.choiceId
      ? `${state.correct ? '예상이 맞았습니다.' : `다시 비교해 보세요. 정답: ${correctChoice.label}.`} ${scenario.feedback || ''}`
      : '답을 먼저 선택하면 자동 재생 또는 한 단계씩 확인할 수 있습니다.';
    feedback.dataset.correct = String(state.correct);
    playButton.disabled = playing || !state.choiceId || state.phase === 'finished';
    stepButton.disabled = playButton.disabled;
    playButton.textContent = playing ? '재생 중…' : '자동 재생';
    progress.max = scenario.steps.length; progress.value = state.stepIndex + 1;
    const step = state.events.at(-1);
    currentTitle.textContent = step ? `${state.stepIndex + 1} / ${scenario.steps.length} · ${step.title}` : '먼저 결과를 예상하세요.';
    currentDetail.textContent = step?.detail || '예상한 다음 패킷 흐름과 결과를 비교합니다.';
    complete.hidden = state.phase !== 'finished';
    packetBody.replaceChildren();
    if (step?.packet && Object.keys(step.packet).length) {
      const fields = el('dl', 'nl-packet-fields');
      const labels = { sourceIp: 'Source IP', destinationIp: 'Destination IP', arpTarget: 'ARP 대상', destinationMac: 'Destination MAC', sourceMac: 'Source MAC', note: '해석', protocol: 'Protocol', prefix: 'Prefix' };
      Object.entries(step.packet).forEach(([key, value]) => fields.append(el('dt', '', labels[key] || key), el('dd', '', String(value))));
      packetBody.append(fields);
    } else packetBody.append(el('p', 'nl-note', '현재 단계에 패킷 필드가 없습니다.'));
    eventLog.replaceChildren(...state.events.map(event => {
      const row = el('li'); row.append(el('strong', '', event.title), el('span', '', event.detail)); return row;
    }));
    if (!state.events.length) eventLog.append(el('li', 'nl-note', '실행하면 단계별 판단이 기록됩니다.'));
    nodeEls.forEach((item, id) => item.classList.toggle('nl-active', id === step?.nodeId));
    if (!step) {
      marker.setAttribute('visibility', 'hidden');
      linkEls.forEach(item => item.classList.remove('nl-active'));
    }
  }

  function routeBetween(from, to) {
    if (!from || from === to) return { points: [nodes.get(to)], links: [] };
    const queue = [{ id: from, points: [nodes.get(from)], links: [] }], seen = new Set([from]);
    while (queue.length) {
      const current = queue.shift();
      for (const link of topology.links) {
        const next = link.from === current.id ? link.to : link.to === current.id ? link.from : null;
        if (!next || seen.has(next)) continue;
        const path = { id: next, points: [...current.points, nodes.get(next)], links: [...current.links, link.id] };
        if (next === to) return path;
        seen.add(next); queue.push(path);
      }
    }
    return { points: [nodes.get(to)], links: [] };
  }

  function showStep(fromId, toId, animate = true) {
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    if (!toId) { marker.setAttribute('visibility', 'hidden'); return; }
    const path = routeBetween(animate ? fromId : null, toId);
    linkEls.forEach((item, id) => item.classList.toggle('nl-active', path.links.includes(id)));
    const end = nodes.get(toId), version = runVersion;
    marker.setAttribute('visibility', 'visible');
    const position = (x, y) => { marker.setAttribute('cx', x); marker.setAttribute('cy', y); };
    if (follow && Date.now() >= userPauseUntil && viewport.scrollWidth > viewport.clientWidth) {
      const x = (end.x - minX) / width * canvas.getBoundingClientRect().width;
      viewport.scrollTo({ left: Math.max(0, x - viewport.clientWidth / 2), behavior: reduced() ? 'auto' : 'smooth' });
    }
    if (reduced() || path.points.length < 2) { position(end.x, end.y); return; }
    const lengths = path.points.slice(1).map((point, index) => Math.hypot(point.x - path.points[index].x, point.y - path.points[index].y));
    const distance = lengths.reduce((a, b) => a + b, 0), started = view.performance.now();
    const tick = now => {
      if (destroyed || version !== runVersion) return;
      const ratio = Math.min(1, (now - started) / 650);
      let remaining = ratio * distance, segment = 0;
      while (segment < lengths.length - 1 && remaining > lengths[segment]) remaining -= lengths[segment++];
      const a = path.points[segment], b = path.points[segment + 1], local = lengths[segment] ? remaining / lengths[segment] : 1;
      position(a.x + (b.x - a.x) * local, a.y + (b.y - a.y) * local);
      if (ratio < 1) frame = view.requestAnimationFrame(tick); else frame = null;
    };
    frame = view.requestAnimationFrame(tick);
  }

  function moveNext() {
    const previous = state.events.at(-1);
    const next = advance(state, scenario);
    if (next === state) return false;
    state = next;
    const current = state.events.at(-1);
    const fromId = current.fromNodeId || (current.packetId && current.packetId === previous?.packetId ? previous.nodeId : null);
    render(); showStep(fromId, current.nodeId, current.animate); return true;
  }

  function startPlayback() {
    if (destroyed || playing || !state.choiceId || state.phase === 'finished') return;
    playing = true;
    const version = ++runVersion;
    const next = () => {
      if (destroyed || version !== runVersion) return;
      moveNext();
      if (state.phase === 'finished') { playing = false; timer = null; render(); return; }
      timer = view.setTimeout(next, reduced() ? 40 : 1100);
    };
    next();
  }

  function resetCurrent() {
    if (destroyed) return;
    stop(); state = reset(scenario); render();
  }
  function applyZoom() {
    // A narrow screen starts at a readable natural size inside its own viewport.
    // Only the explicit overview action scales labels below their natural size.
    const baseWidth = Math.max(width, viewport.clientWidth);
    canvas.style.width = overview ? '100%' : `${baseWidth * zoom}px`;
    zoomLabel.textContent = overview ? '전체 보기' : `${Math.round(zoom * 100)}%`;
    fit.setAttribute('aria-pressed', String(overview));
    topologyHint.textContent = overview
      ? '전체 구조를 축소한 보기입니다. 장비 이름은 확대해서 읽을 수 있습니다.'
      : '그림 안에서 좌우로 이동하세요. ‘보기 맞춤’은 전체 구조를 작게 보여줍니다.';
    zoomOut.disabled = overview || zoom <= 1; zoomIn.disabled = !overview && zoom >= 2.5;
  }
  function changeZoom(delta) {
    overview = false;
    zoom = Math.max(1, Math.min(2.5, zoom + delta));
    applyZoom();
  }
  on(select, 'change', () => {
    stop(); scenario = scenarios.find(item => item.id === select.value); state = createState(scenario);
    renderChoices(); render();
  });
  const resizeObserver = view.ResizeObserver ? new view.ResizeObserver(applyZoom) : null;
  resizeObserver?.observe(viewport);
  renderChoices(); applyZoom(); render();
  return {
    destroy() {
      if (destroyed) return;
      stop(); destroyed = true; lifecycle.abort(); resizeObserver?.disconnect(); root.replaceChildren();
      root.classList.remove('nl-lab');
      ['mode', 'phase', 'scenario', 'step'].forEach(key => delete root.dataset[key]);
    }
  };
}
