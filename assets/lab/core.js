// Pure learning progress. These values never represent real lab verification.
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export function validateScenario(scenario) {
  if (!scenario || typeof scenario.id !== 'string' || !scenario.id ||
      !Array.isArray(scenario.choices) || scenario.choices.length < 2 ||
      !Array.isArray(scenario.steps) || !scenario.steps.length) {
    throw new TypeError('Scenario needs an id, at least two choices, and steps.');
  }
  const ids = scenario.choices.map(choice => choice.id);
  if (ids.some(id => typeof id !== 'string' || !id) ||
      new Set(ids).size !== ids.length || !ids.includes(scenario.correctId)) {
    throw new TypeError('Scenario choice IDs must be unique and include correctId.');
  }
  return scenario;
}

export function createState(scenario) {
  validateScenario(scenario);
  return freeze({ scenarioId: scenario.id, phase: 'predicting', choiceId: null,
    correct: null, stepIndex: -1, events: [] });
}

function checkScenario(state, scenario) {
  if (state.scenarioId !== scenario.id) throw new Error('State/scenario mismatch.');
}

export function choose(state, scenario, choiceId) {
  checkScenario(state, scenario);
  if (!scenario.choices.some(choice => choice.id === choiceId)) {
    throw new RangeError('Unknown choice.');
  }
  if (state.stepIndex >= 0) return state;
  return freeze({ ...state, phase: 'answered', choiceId, correct: choiceId === scenario.correctId });
}

export function advance(state, scenario) {
  checkScenario(state, scenario);
  if (!state.choiceId || state.phase === 'finished') return state;
  const stepIndex = state.stepIndex + 1;
  const step = scenario.steps[stepIndex];
  if (!step) return state;
  const event = { stepIndex, title: String(step.title || ''), detail: String(step.detail || ''),
    nodeId: step.nodeId || null, fromNodeId: step.fromNodeId || null,
    packetId: step.packetId || null, animate: step.animate !== false,
    packet: step.packet ? { ...step.packet } : null };
  return freeze({ ...state, stepIndex,
    phase: stepIndex === scenario.steps.length - 1 ? 'finished' : 'playing',
    events: [...state.events, event] });
}

export function reset(scenario) { return createState(scenario); }
