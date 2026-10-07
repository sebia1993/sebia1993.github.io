import assert from 'node:assert/strict';

export async function playbackSnapshot(page) {
  return page.locator('#simLab').evaluate(element => {
    const data = element.dataset;
    return {
      phase: data.state,
      index: Number(data.eventIndex),
      count: Number(data.eventCount),
      elapsed: Number(data.eventElapsedMs),
      duration: Number(data.eventDurationMs),
      modelStep: data.modelStepIndex === '' ? null : Number(data.modelStepIndex),
      mode: data.playbackMode,
      title: document.getElementById('eventTitle').textContent
    };
  });
}

// Follow the actual event boundaries exposed by the playback owner. Fixed
// 2490 ms assumptions miss short decisions and fail to test longer movement.
// The virtual clock is a CI regression tool; real-tempo browser review remains
// a separately reported gate and cannot be inferred from this helper passing.
export async function finishPlayback(page, { eq = assert.deepEqual, nativeSteps = null, verifyBoundaries = false } = {}) {
  const trace = [];
  for (let guard = 0; guard < 100; guard++) {
    const current = await playbackSnapshot(page);
    if (current.phase === 'COMPLETED') {
      if (nativeSteps) {
        const order = trace.map(event => event.modelStep).filter((value, i, list) => value !== null && value >= 0 && (i === 0 || value !== list[i - 1]));
        eq(order, nativeSteps.map((_, i) => i), 'all original model events observed once in order');
      }
      return trace;
    }
    eq(current.phase, 'RUNNING', 'observation must be running until completed');
    eq(Number.isInteger(current.index) && current.index >= 0 && current.index < current.count, true, 'valid public event position');
    eq(Number.isFinite(current.duration) && current.duration > 0 && current.duration <= 60000, true, 'finite event duration');
    eq(Number.isFinite(current.elapsed) && current.elapsed >= 0 && current.elapsed <= current.duration + 1, true, 'elapsed time within current event');
    eq(Boolean(current.title.trim()), true, 'current event is explained');
    eq(await page.locator('#simResult').isVisible(), false, 'no grading before observation completes');
    if (trace.length) {
      eq(current.index, trace.at(-1).index + 1, 'event progression cannot skip an event');
      eq(current.count, trace[0].count, 'event plan remains stable while running');
      eq(current.mode, trace[0].mode, 'playback mode remains stable');
    } else if (verifyBoundaries) {
      eq(current.index, 0, 'single run starts at first event');
    }
    trace.push(current);
    const remaining = current.duration - current.elapsed;
    if (verifyBoundaries && remaining > 80) {
      await page.clock.fastForward(remaining - 40);
      const before = await playbackSnapshot(page);
      eq(before.phase, 'RUNNING', 'event holds until its duration expires');
      eq(before.index, current.index, 'event cannot advance before its duration');
      eq(await page.locator('#simResult').isVisible(), false, 'last event stays ungraded during hold');
      await page.clock.fastForward(80);
    } else {
      await page.clock.fastForward(remaining + 40);
    }
  }
  throw new Error('Playback did not finish within 100 event transitions');
}
