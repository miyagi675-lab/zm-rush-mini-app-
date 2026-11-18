// UI actions are resolved against each model's actual embedded sequences.
// The short web models do not necessarily contain the complete CT animation set.
const definitions = [
  ['static', 'Статичная поза', 'Основные движения', 'static'],
  ['idle1', 'Ожидание', 'Основные движения', 'loop'],
  ['walk', 'Ходьба', 'Основные движения', 'loop'],
  ['run', 'Бег', 'Основные движения', 'loop'],
  ['crouch_idle', 'Приседание', 'Основные движения', 'loop'],
  ['crouchrun', 'Ходьба сидя', 'Основные движения', 'loop'],
  ['jump', 'Прыжок', 'Основные движения', 'once'],
  ['longjump', 'Длинный прыжок', 'Основные движения', 'once'],
  ['swim', 'Плавание', 'Основные движения', 'loop'],
  ['treadwater', 'На воде', 'Основные движения', 'loop'],
  ['aim', 'Прицеливание', 'Действия с оружием', 'loop'],
  ['shoot', 'Стрельба / удар', 'Действия с оружием', 'once'],
  ['reload', 'Перезарядка', 'Действия с оружием', 'once'],
  ['flinch', 'Попадание в корпус', 'Реакции', 'once'],
  ['head_flinch', 'Попадание в голову', 'Реакции', 'once'],
  ['death1', 'Падение · 1', 'Реакции', 'once'],
  ['death2', 'Падение · 2', 'Реакции', 'once'],
  ['death3', 'Падение · 3', 'Реакции', 'once'],
  ['crouch_die', 'Падение сидя', 'Реакции', 'once'],
];

export const motionDefinitions = Object.freeze(definitions.map(([id, label, group, playback]) =>
  Object.freeze({id, label, group, playback})));
const byId = new Map(motionDefinitions.map(definition => [definition.id, definition]));
const aliases = {
  idle1: ['idle1', 'idle', 'idle_animation', 'look_idle', 'deep_idle'],
  walk: ['walk', 'walk1', 'walk_forward'],
  run: ['run', 'run1', 'run2', 'run_forward'],
  crouch_idle: ['crouch_idle', 'crouchidle', 'crouch', 'crouch_idle1'],
  crouchrun: ['crouchrun', 'crouch_run', 'crouch_walk', 'crouchwalk'],
  jump: ['jump', 'jump1'],
  longjump: ['longjump', 'long_jump'],
  swim: ['swim', 'swim1'],
  treadwater: ['treadwater', 'tread_water', 'swim_idle'],
  flinch: ['gut_flinch', 'flinch', 'body_flinch'],
  head_flinch: ['head_flinch', 'headflinch'],
  death1: ['death1', 'death_1', 'death01', 'death'],
  death2: ['death2', 'death_2', 'death02'],
  death3: ['death3', 'death_3', 'death03'],
  crouch_die: ['crouch_die', 'crouchdie', 'crouch_death'],
};
const normalize = name => String(name || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

function weaponFamilies(weapon) {
  const name = normalize((weapon?.id || '') + ' ' + (weapon?.name || ''));
  if (weapon?.category === 'knife' || /knife|bayonet|karambit|dagger/.test(name)) return ['knife'];
  if (/dual|elite|berettas/.test(name)) return ['dualpistols', 'dualpistols_1', 'dualpistols_2'];
  if (weapon?.category === 'pistol' || /deagle|desert_eagle|glock|usp|p228|five_?seven/.test(name)) return ['onehanded'];
  if (/m249|negev/.test(name)) return ['m249'];
  if (/shotgun|xm1014|nova|mag_?7|sawed|\bm3\b/.test(name)) return ['shotgun'];
  if (/mp5|mp7|mp9|p90|ump|mac_?10|tmp/.test(name)) return ['mp5', 'carbine'];
  if (/ak_?47|galil/.test(name)) return ['ak47', 'rifle', 'carbine'];
  if (/m4|famas|aug|sg_?552/.test(name)) return ['carbine', 'rifle', 'ak47'];
  return weapon ? ['rifle', 'carbine', 'ak47'] : ['carbine', 'rifle', 'ak47', 'mp5', 'shotgun', 'm249'];
}

function usable(sequence, staticPose = false) {
  return sequence && Number.isInteger(sequence.index) && sequence.index >= 0 &&
    Number.isFinite(sequence.fps) && sequence.fps > 0 &&
    Number.isInteger(sequence.frames) && sequence.frames > 0 &&
    (staticPose || sequence.anim === undefined || sequence.anim > 0);
}

export function resolveMotion(sequences, motion, weapon = null) {
  const definition = byId.get(motion);
  const result = {supported: false, definition: definition || null, sequence: null,
    sequenceIndex: null, duration: 0, playback: definition?.playback || 'static',
    loop: definition?.playback === 'loop', reason: definition ? 'missing-sequence' : 'unknown-motion'};
  if (!definition || !Array.isArray(sequences)) return result;

  let sequence;
  if (motion === 'static') {
    sequence = sequences.find(item => item.index === 0 && usable(item, true));
  } else {
    let names = aliases[motion];
    if (['aim', 'shoot', 'reload'].includes(motion)) {
      const families = weaponFamilies(weapon);
      if (motion === 'reload' && families[0] === 'knife') return {...result, reason: 'weapon-has-no-reload'};
      names = families.map(family => 'ref_' + motion + '_' + family);
    }
    for (const name of names || []) {
      sequence = sequences.find(item => normalize(item.name) === name && usable(item));
      if (sequence) break;
    }
  }
  if (!sequence) return result;
  return {...result, supported: true, sequence, sequenceIndex: sequence.index,
    duration: motion === 'static' ? 0 : Math.max(0, (sequence.frames - 1) / sequence.fps), reason: null};
}

// Keep the preview clock bounded and distinguish an ended one-shot from a loop.
// A caller can preserve this time while paused and restart by passing zero.
export function motionPlayback(resolved, elapsed = 0) {
  if (!resolved?.supported) return {time: 0, finished: false};
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const duration = resolved.duration;
  if (resolved.playback === 'static') return {time: 0, finished: false};
  if (resolved.playback === 'once') return {time: Math.min(time, duration), finished: time >= duration};
  return {time: duration > 0 ? time % duration : 0, finished: false};
}

// Some CT attacks are flagged as looping in the original MDL. Override the flag
// only during pose evaluation so a one-shot can reach its exact last frame.
// Restoring it also leaves direct MDL consumers and cached models unaffected.
export function applyMotionPose(model, resolved, elapsed = 0, targetBones) {
  const playback = motionPlayback(resolved, elapsed);
  if (!resolved?.supported || typeof model?.userData?.updatePose !== 'function') return playback;
  const sequence = model.userData.sequences[resolved.sequenceIndex];
  if (!sequence) return playback;
  const loop = sequence.loop;
  try {
    sequence.loop = resolved.loop;
    model.userData.updatePose(resolved.sequenceIndex, playback.time, targetBones);
  } finally {
    sequence.loop = loop;
  }
  return playback;
}
