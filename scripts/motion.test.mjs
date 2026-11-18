import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {motionDefinitions, resolveMotion, motionPlayback, applyMotionPose, advanceMotionClock} from '../motion.js';
import {parseMDL, disposeMDL} from '../mdl.js';

const bytes = fs.readFileSync(new URL('../assets/gign.mdl', import.meta.url));
const table = bytes.readInt32LE(168);
const sequences = Array.from({length: bytes.readInt32LE(164)}, (_, index) => {
  const at = table + index * 176;
  return {index, name: bytes.toString('ascii', at, at + 32).split('\0')[0],
    frames: bytes.readInt32LE(at + 56), fps: bytes.readFloatLE(at + 32),
    loop: Boolean(bytes.readInt32LE(at + 36) & 1), anim: bytes.readInt32LE(at + 124)};
});
const fixture = names => names.map((name, index) => ({index, name, frames: 21, fps: 10, loop: true, anim: 100}));

test('all offered actions resolve to real CT sequences and preserve static index zero', () => {
  for (const definition of motionDefinitions) {
    const resolved = resolveMotion(sequences, definition.id);
    assert.equal(resolved.supported, true, definition.id);
    assert.equal(resolved.sequence, sequences[resolved.sequenceIndex]);
  }
  assert.equal(resolveMotion(sequences, 'static').sequenceIndex, 0);
  assert.equal(motionDefinitions.length, 17);
  for (const removed of ['flinch', 'head_flinch']) {
    assert.equal(resolveMotion(sequences, removed).reason, 'unknown-motion');
  }
});

test('equipped AK, pistol and knife use the matching weapon action family', () => {
  for (const action of ['aim', 'shoot', 'reload']) {
    assert.equal(resolveMotion(sequences, action, {id: 'ak-47-asiimov', category: 'rifle'}).sequence.name, 'ref_' + action + '_ak47');
    assert.equal(resolveMotion(sequences, action, {id: 'desert-eagle', category: 'pistol'}).sequence.name, 'ref_' + action + '_onehanded');
  }
  assert.equal(resolveMotion(sequences, 'shoot', {category: 'knife'}).sequence.name, 'ref_shoot_knife');
  const reload = resolveMotion(sequences, 'reload', {category: 'knife'});
  assert.equal(reload.supported, false);
  assert.equal(reload.reason, 'weapon-has-no-reload');
  assert.equal(reload.sequenceIndex, null);
});

test('an absent pistol or knife sequence never silently plays a rifle action', () => {
  const rifleOnly = fixture(['idle1', 'ref_shoot_rifle', 'ref_reload_rifle']);
  for (const category of ['pistol', 'knife']) {
    const resolved = resolveMotion(rifleOnly, 'shoot', {category});
    assert.equal(resolved.supported, false);
    assert.equal(resolved.sequence, null);
  }
  assert.equal(resolveMotion(rifleOnly, 'shoot', {category: 'rifle'}).sequence.name, 'ref_shoot_rifle');
});

test('short models expose only present actions; idle and dual-pistol aliases work', () => {
  const short = fixture(['DUMMY', ' Idle_Animation ', 'WALK', 'RUN']);
  assert.equal(resolveMotion(short, 'idle1').sequenceIndex, 1);
  assert.equal(resolveMotion(short, 'walk').sequenceIndex, 2);
  assert.equal(resolveMotion(short, 'jump').supported, false);
  assert.equal(resolveMotion(short, 'unknown').reason, 'unknown-motion');
  const dual = fixture(['idle1', 'ref_shoot_dualpistols_2']);
  assert.equal(resolveMotion(dual, 'shoot', {name: 'Dual Berettas', category: 'pistol'}).sequenceIndex, 1);
  const external = [{index: 0, name: 'jump', frames: 61, fps: 30, loop: false, anim: 0}];
  assert.equal(resolveMotion(external, 'jump').supported, false);
});

test('one-shots finish at their last frame and remain there instead of restarting', () => {
  for (const action of ['death1', 'death2', 'death3', 'crouch_die']) {
    const resolved = resolveMotion(sequences, action);
    assert.equal(motionPlayback(resolved, resolved.duration / 2).finished, false, action);
    const ended = motionPlayback(resolved, resolved.duration);
    assert.equal(ended.time, resolved.duration, action);
    assert.equal(ended.finished, true, action);
    assert.deepEqual(motionPlayback(resolved, resolved.duration + 1000), ended, action);
  }
});

test('jump, long jump, attack and reload hold their final frame while the repeat clock keeps running', () => {
  for (const action of ['jump', 'longjump', 'shoot', 'reload']) {
    const resolved = resolveMotion(sequences, action);
    assert.equal(resolved.playback, 'repeat');
    assert.equal(resolved.repeatInterval, 3.5);
    assert.equal(resolved.loop, false);
    assert.deepEqual(motionPlayback(resolved, resolved.duration + 100), {time: resolved.duration, finished: false});
    let clock = {time: 0, cycleTime: 0};
    let sawFinalFrame = false, restartAt = null;
    for (let frame = 1; frame < 600; frame++) {
      const previous = clock;
      clock = advanceMotionClock(resolved, clock, 1 / 60);
      if (clock.time === resolved.duration) sawFinalFrame = true;
      if (previous.cycleTime > 0 && clock.cycleTime === 0) { restartAt = frame / 60; break; }
    }
    assert(sawFinalFrame, action + ' must render its last frame before repeating');
    assert(restartAt >= 3.5 && restartAt < 3.55, action + ' must restart on a real 3.5-second cadence');
  }
});

test('repeat cadence is independent of speed, and changing speed preserves current clip progress', () => {
  const shot = resolveMotion(sequences, 'shoot');
  for (const speed of [.5, 1, 1.5]) {
    let clock = {time: 0, cycleTime: 0}, restartAt;
    for (let frame = 1; frame < 300; frame++) {
      const previous = clock;
      clock = advanceMotionClock(shot, clock, 1 / 60, speed);
      if (previous.cycleTime > 0 && clock.cycleTime === 0) { restartAt = frame / 60; break; }
    }
    assert(restartAt >= 3.5 && restartAt < 3.55, 'speed ' + speed);
  }
  const jump = resolveMotion(sequences, 'jump');
  const first = advanceMotionClock(jump, {time: 0, cycleTime: 0}, .2, 1);
  const slower = advanceMotionClock(jump, first, .2, .5);
  assert(Math.abs(slower.time - .3) < 1e-12);
  assert.equal(slower.cycleTime, .4);
});

test('a slow long clip completes fully; a zero-step snapshot or pause never restarts it', () => {
  const slow = resolveMotion([{index: 0, name: 'ref_reload_rifle', frames: 81, fps: 10, anim: 100}], 'reload', {category: 'rifle'});
  let clock = {time: 0, cycleTime: 0};
  for (let frame = 0; frame < 160; frame++) clock = advanceMotionClock(slow, clock, .1, .5);
  assert(Math.abs(clock.time - 8) < 1e-10);
  // Floating point accumulation can need one final step to clamp exactly.
  if (clock.time < slow.duration) clock = advanceMotionClock(slow, clock, .1, .5);
  assert.equal(clock.time, 8);
  assert(clock.cycleTime >= 16);
  const ended = {...clock};
  for (let frame = 0; frame < 100; frame++) {
    clock = advanceMotionClock(slow, clock, 0, .5);
    assert.deepEqual(clock, ended);
  }
  assert.deepEqual(advanceMotionClock(slow, clock, .1, .5), {time: 0, cycleTime: 0});
});

test('loops repeat safely and invalid clocks never propagate nonfinite pose times', () => {
  const walk = resolveMotion(sequences, 'walk');
  const half = walk.duration / 2;
  const replayed = motionPlayback(walk, walk.duration * 100 + half);
  assert(Math.abs(replayed.time - half) < 1e-10);
  assert.equal(replayed.finished, false);
  assert.deepEqual(motionPlayback(walk, NaN), {time: 0, finished: false});
  assert.deepEqual(motionPlayback(walk, -1), {time: 0, finished: false});
  assert.deepEqual(motionPlayback(resolveMotion(sequences, 'static'), 50), {time: 0, finished: false});
});

test('real MDL knife attack reaches its exact last frame even when the source loops', () => {
  const model = parseMDL(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), null, 1, {}, 1, {indexed: true});
  try {
    const resolved = resolveMotion(model.userData.sequences, 'shoot', {category: 'knife'});
    assert.equal(resolved.sequence.loop, true, 'CT source knife is deliberately a looping regression fixture');
    const original = model.userData.updatePose;
    let observed;
    model.userData.updatePose = (index, time, target) => {
      observed = {index, time, loop: model.userData.sequences[index].loop};
      return original(index, time, target);
    };
    const state = applyMotionPose(model, resolved, resolved.duration + .1);
    assert.deepEqual(observed, {index: resolved.sequenceIndex, time: resolved.duration, loop: false});
    assert.equal(state.finished, false, 'the attack waits for its next automatic repeat');
    assert.equal(resolved.sequence.loop, true, 'cached MDL metadata is restored after evaluation');
    const actual = Array.from(model.userData.meshes[0].geometry.attributes.position.array);
    resolved.sequence.loop = false;
    original(resolved.sequenceIndex, resolved.duration);
    resolved.sequence.loop = true;
    assert.deepEqual(Array.from(model.userData.meshes[0].geometry.attributes.position.array), actual);
    assert(actual.every(Number.isFinite));
  } finally {
    disposeMDL(model);
  }
});

test('pose failures still restore source flags and unsupported actions do not touch the model', () => {
  const list = fixture(['ref_shoot_knife']);
  const resolved = resolveMotion(list, 'shoot', {category: 'knife'});
  let called = 0;
  const model = {userData: {sequences: list, updatePose() { called++; throw Error('pose failure'); }}};
  assert.throws(() => applyMotionPose(model, resolved, 1), /pose failure/);
  assert.equal(list[0].loop, true);
  assert.equal(called, 1);
  applyMotionPose(model, resolveMotion(list, 'reload', {category: 'knife'}), 1);
  assert.equal(called, 1);
});
