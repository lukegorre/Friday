'use strict';

// =============================================================================
// SECTION 0 — Dependencies
// =============================================================================

const EventEmitter = require('events');
const {
  GESTURE_NAMES,
  GESTURE_EVENTS,
  TIMING,
  HOLD_DURATIONS,
  ACTIVATION_ZONE,
  GestureInputProvider,
} = require('../src/shared/constants');

// =============================================================================
// SECTION 1 — Contract constants (imported from src/shared/constants.js)
// =============================================================================

// SECTION 2 — GestureInputProvider base class (imported from src/shared/constants.js)

// =============================================================================
// SECTION 3 — ConformantProvider
//
// The minimal conformant implementation. Passes every test in this file.
// LeapMotionProvider must be a drop-in replacement that also passes every test.
// =============================================================================

class ConformantProvider extends GestureInputProvider {
  constructor() {
    super();
    this._connected = false;
    this._lastFired = {};     // gesture name → timestamp of last fire
    this._layer3Active = false;
    this._layer3Timer = null;
    this._layer3HoldStart = null;
  }

  async connect()    { this._connected = true; }
  async disconnect() { this._connected = false; }
  isConnected()      { return this._connected; }
  getConfidenceThreshold()       { return TIMING.CONFIDENCE_THRESHOLD; }
  getCooldownMs()                { return TIMING.COOLDOWN_MS; }
  getModifierVelocityThreshold() { return TIMING.MODIFIER_VELOCITY_THRESHOLD_MM_S; }

  // Emits gesture:forming or gesture:fire based on confidence, respecting cooldown.
  _tryFireGesture(payload) {
    if (typeof payload.confidence !== 'number' || isNaN(payload.confidence)) return;

    if (payload.confidence < TIMING.CONFIDENCE_THRESHOLD) {
      this.emit(GESTURE_EVENTS.GESTURE_FORMING, payload);
      return;
    }

    const last = this._lastFired[payload.gesture] || 0;
    if (payload.timestamp - last >= TIMING.COOLDOWN_MS) {
      this._lastFired[payload.gesture] = payload.timestamp;
      this.emit(GESTURE_EVENTS.GESTURE_FIRE, payload);
    }
  }

  // Emits modifier:enter if conditions are met.
  _tryEnterModifier(payload) {
    if (payload.hand !== 'left') return;
    if (payload.entryVelocity >= TIMING.MODIFIER_VELOCITY_THRESHOLD_MM_S) return;
    this.emit(GESTURE_EVENTS.MODIFIER_ENTER, payload);
  }

  // Starts the Layer 3 pinch hold timer.
  _startLayer3PinchHold() {
    const now = Date.now();
    this._layer3HoldStart = now;

    const startPayload = {
      gestureId: 'layer3-hold',
      gesture: GESTURE_NAMES.PINCH,
      hand: 'left',
      requiredDuration: TIMING.LAYER3_HOLD_MS,
      elapsed: 0,
      timestamp: now,
    };
    this.emit(GESTURE_EVENTS.HOLD_START, startPayload);

    this._layer3Timer = setTimeout(() => {
      const elapsed = Date.now() - this._layer3HoldStart;
      const completePayload = { ...startPayload, elapsed, timestamp: Date.now() };
      this.emit(GESTURE_EVENTS.HOLD_COMPLETE, completePayload);

      if (!this._layer3Active) {
        this._layer3Active = true;
        this.emit(GESTURE_EVENTS.LAYER3_ENTER, { timestamp: Date.now() });
      } else {
        this._layer3Active = false;
        this.emit(GESTURE_EVENTS.LAYER3_EXIT, { timestamp: Date.now() });
      }
    }, TIMING.LAYER3_HOLD_MS);
  }

  // Cancels an in-progress Layer 3 hold.
  _cancelLayer3PinchHold() {
    if (this._layer3Timer === null) return;
    clearTimeout(this._layer3Timer);
    this._layer3Timer = null;

    const elapsed = Date.now() - this._layer3HoldStart;
    this.emit(GESTURE_EVENTS.HOLD_CANCEL, {
      gestureId: 'layer3-hold',
      gesture: GESTURE_NAMES.PINCH,
      hand: 'left',
      requiredDuration: TIMING.LAYER3_HOLD_MS,
      elapsed,
      timestamp: Date.now(),
    });
  }

  // Exits Layer 3 immediately (open palm path — no hold required).
  _exitLayer3() {
    this._layer3Active = false;
    this.emit(GESTURE_EVENTS.LAYER3_EXIT, { timestamp: Date.now() });
  }
}

// =============================================================================
// SECTION 4 — CONSTANTS
// =============================================================================

describe('CONSTANTS', () => {

  describe('GESTURE_NAMES', () => {
    test('has exactly 12 entries', () => {
      expect(Object.keys(GESTURE_NAMES)).toHaveLength(12);
    });

    test('every value equals its key (identity map)', () => {
      for (const [key, value] of Object.entries(GESTURE_NAMES)) {
        expect(value).toBe(key);
      }
    });

    test('every value is a non-empty string', () => {
      for (const value of Object.values(GESTURE_NAMES)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test('contains all 12 expected gesture names', () => {
      const expected = [
        'TWO_FINGER_FLICK', 'PINCH', 'GUN_SHAPE', 'HANG_LOOSE',
        'THUMBS_UP', 'THUMBS_DOWN', 'INDEX_POINT_TWIST', 'OPEN_PALM',
        'SNAP_TO_FIST', 'PEACE_SIGN', 'WRIST_SHOO', 'DIAL_ROTATE',
      ];
      for (const name of expected) {
        expect(GESTURE_NAMES[name]).toBe(name);
      }
    });
  });

  describe('GESTURE_EVENTS', () => {
    test('has exactly 15 entries', () => {
      expect(Object.keys(GESTURE_EVENTS)).toHaveLength(15);
    });

    test('every value uses namespace:event format (contains a colon)', () => {
      for (const value of Object.values(GESTURE_EVENTS)) {
        expect(value).toMatch(/:/);
      }
    });

    test('no two event strings are equal', () => {
      const values = Object.values(GESTURE_EVENTS);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    test('HAND_ENTER === "hand:enter"',           () => expect(GESTURE_EVENTS.HAND_ENTER).toBe('hand:enter'));
    test('HAND_EXIT === "hand:exit"',             () => expect(GESTURE_EVENTS.HAND_EXIT).toBe('hand:exit'));
    test('HAND_UPDATE === "hand:update"',         () => expect(GESTURE_EVENTS.HAND_UPDATE).toBe('hand:update'));
    test('GESTURE_FORMING === "gesture:forming"', () => expect(GESTURE_EVENTS.GESTURE_FORMING).toBe('gesture:forming'));
    test('GESTURE_FIRE === "gesture:fire"',       () => expect(GESTURE_EVENTS.GESTURE_FIRE).toBe('gesture:fire'));
    test('GESTURE_CANCELLED === "gesture:cancelled"', () => expect(GESTURE_EVENTS.GESTURE_CANCELLED).toBe('gesture:cancelled'));
    test('HOLD_START === "gesture:hold:start"',   () => expect(GESTURE_EVENTS.HOLD_START).toBe('gesture:hold:start'));
    test('HOLD_PROGRESS === "gesture:hold:progress"', () => expect(GESTURE_EVENTS.HOLD_PROGRESS).toBe('gesture:hold:progress'));
    test('HOLD_COMPLETE === "gesture:hold:complete"', () => expect(GESTURE_EVENTS.HOLD_COMPLETE).toBe('gesture:hold:complete'));
    test('HOLD_CANCEL === "gesture:hold:cancel"', () => expect(GESTURE_EVENTS.HOLD_CANCEL).toBe('gesture:hold:cancel'));
    test('DIAL_CHANGE === "dial:change"',         () => expect(GESTURE_EVENTS.DIAL_CHANGE).toBe('dial:change'));
    test('MODIFIER_ENTER === "modifier:enter"',   () => expect(GESTURE_EVENTS.MODIFIER_ENTER).toBe('modifier:enter'));
    test('MODIFIER_EXIT === "modifier:exit"',     () => expect(GESTURE_EVENTS.MODIFIER_EXIT).toBe('modifier:exit'));
    test('LAYER3_ENTER === "layer3:enter"',       () => expect(GESTURE_EVENTS.LAYER3_ENTER).toBe('layer3:enter'));
    test('LAYER3_EXIT === "layer3:exit"',         () => expect(GESTURE_EVENTS.LAYER3_EXIT).toBe('layer3:exit'));
  });

  describe('TIMING', () => {
    test('CONFIDENCE_THRESHOLD === 0.82',                    () => expect(TIMING.CONFIDENCE_THRESHOLD).toBe(0.82));
    test('COOLDOWN_MS === 350',                              () => expect(TIMING.COOLDOWN_MS).toBe(350));
    test('MODIFIER_VELOCITY_THRESHOLD_MM_S === 15',          () => expect(TIMING.MODIFIER_VELOCITY_THRESHOLD_MM_S).toBe(15));
    test('LAYER3_HOLD_MS === 800',                           () => expect(TIMING.LAYER3_HOLD_MS).toBe(800));
    test('DIAL_DEAD_ZONE_DEGREES === 15',                    () => expect(TIMING.DIAL_DEAD_ZONE_DEGREES).toBe(15));
  });

  describe('HOLD_DURATIONS', () => {
    test('PINCH_WINDOW_CLOSE === 500',    () => expect(HOLD_DURATIONS.PINCH_WINDOW_CLOSE).toBe(500));
    test('GUN_SHAPE_OVERVIEW === 300',    () => expect(HOLD_DURATIONS.GUN_SHAPE_OVERVIEW).toBe(300));
    test('HANG_LOOSE_CLEAR_DESK === 300', () => expect(HOLD_DURATIONS.HANG_LOOSE_CLEAR_DESK).toBe(300));
    test('PEACE_SIGN_CHEAT_SHEET === 600',() => expect(HOLD_DURATIONS.PEACE_SIGN_CHEAT_SHEET).toBe(600));
    test('PINCH_FORCE_QUIT === 800',      () => expect(HOLD_DURATIONS.PINCH_FORCE_QUIT).toBe(800));
    test('PINCH_LEAVE_VOICE === 800',     () => expect(HOLD_DURATIONS.PINCH_LEAVE_VOICE).toBe(800));
    test('INDEX_UP_GO_QUIET === 400',     () => expect(HOLD_DURATIONS.INDEX_UP_GO_QUIET).toBe(400));
    test('CLOSED_FIST_GO_DARK === 400',   () => expect(HOLD_DURATIONS.CLOSED_FIST_GO_DARK).toBe(400));
  });

  describe('ACTIVATION_ZONE', () => {
    test('WIDTH_CM === 40',               () => expect(ACTIVATION_ZONE.WIDTH_CM).toBe(40));
    test('DEPTH_CM === 30',               () => expect(ACTIVATION_ZONE.DEPTH_CM).toBe(30));
    test('HEIGHT_CM === 25',              () => expect(ACTIVATION_ZONE.HEIGHT_CM).toBe(25));
    test('OFFSET_FROM_SENSOR_CM === 5',   () => expect(ACTIVATION_ZONE.OFFSET_FROM_SENSOR_CM).toBe(5));
  });

  describe('immutability', () => {
    test('TIMING is frozen — mutation has no effect', () => {
      const original = TIMING.COOLDOWN_MS;
      try { TIMING.COOLDOWN_MS = 0; } catch (_) { /* strict mode throws */ }
      expect(TIMING.COOLDOWN_MS).toBe(original);
    });

    test('GESTURE_NAMES is frozen', () => {
      const original = GESTURE_NAMES.PINCH;
      try { GESTURE_NAMES.PINCH = 'HACKED'; } catch (_) {}
      expect(GESTURE_NAMES.PINCH).toBe(original);
    });

    test('GESTURE_EVENTS is frozen', () => {
      const original = GESTURE_EVENTS.GESTURE_FIRE;
      try { GESTURE_EVENTS.GESTURE_FIRE = 'hacked'; } catch (_) {}
      expect(GESTURE_EVENTS.GESTURE_FIRE).toBe(original);
    });

    test('HOLD_DURATIONS is frozen', () => {
      const original = HOLD_DURATIONS.PINCH_WINDOW_CLOSE;
      try { HOLD_DURATIONS.PINCH_WINDOW_CLOSE = 0; } catch (_) {}
      expect(HOLD_DURATIONS.PINCH_WINDOW_CLOSE).toBe(original);
    });
  });
});

// =============================================================================
// SECTION 5 — GestureInputProvider interface
// =============================================================================

describe('GestureInputProvider interface', () => {
  let base;

  beforeEach(() => { base = new GestureInputProvider(); });

  test('extends EventEmitter', () => {
    expect(base).toBeInstanceOf(EventEmitter);
  });

  test('connect is a function',                  () => expect(typeof base.connect).toBe('function'));
  test('disconnect is a function',               () => expect(typeof base.disconnect).toBe('function'));
  test('isConnected is a function',              () => expect(typeof base.isConnected).toBe('function'));
  test('getConfidenceThreshold is a function',   () => expect(typeof base.getConfidenceThreshold).toBe('function'));
  test('getCooldownMs is a function',            () => expect(typeof base.getCooldownMs).toBe('function'));
  test('getModifierVelocityThreshold is a function', () => expect(typeof base.getModifierVelocityThreshold).toBe('function'));

  test('connect() throws "Not implemented" on base class',      () => expect(() => base.connect()).toThrow('Not implemented'));
  test('disconnect() throws "Not implemented" on base class',   () => expect(() => base.disconnect()).toThrow('Not implemented'));
  test('isConnected() throws "Not implemented" on base class',  () => expect(() => base.isConnected()).toThrow('Not implemented'));

  describe('ConformantProvider satisfies the interface', () => {
    let provider;

    beforeEach(() => { provider = new ConformantProvider(); });

    test('is instanceof GestureInputProvider', () => expect(provider).toBeInstanceOf(GestureInputProvider));
    test('is instanceof EventEmitter',         () => expect(provider).toBeInstanceOf(EventEmitter));

    test('getConfidenceThreshold() returns TIMING.CONFIDENCE_THRESHOLD', () => {
      expect(provider.getConfidenceThreshold()).toBe(TIMING.CONFIDENCE_THRESHOLD);
    });

    test('getCooldownMs() returns TIMING.COOLDOWN_MS', () => {
      expect(provider.getCooldownMs()).toBe(TIMING.COOLDOWN_MS);
    });

    test('getModifierVelocityThreshold() returns TIMING.MODIFIER_VELOCITY_THRESHOLD_MM_S', () => {
      expect(provider.getModifierVelocityThreshold()).toBe(TIMING.MODIFIER_VELOCITY_THRESHOLD_MM_S);
    });

    test('connect() sets isConnected() to true', async () => {
      await provider.connect();
      expect(provider.isConnected()).toBe(true);
    });

    test('disconnect() sets isConnected() to false', async () => {
      await provider.connect();
      await provider.disconnect();
      expect(provider.isConnected()).toBe(false);
    });
  });
});

// =============================================================================
// SECTION 6 — Payload schemas
// =============================================================================

describe('Payload schemas', () => {

  // ---------------------------------------------------------------------------
  // hand:enter / hand:exit
  // ---------------------------------------------------------------------------

  describe('hand:enter and hand:exit', () => {
    function validatePresencePayload(p) {
      const missing = [];
      if (typeof p.handId !== 'string' || !p.handId) missing.push('handId');
      if (p.hand !== 'left' && p.hand !== 'right')   missing.push('hand');
      if (typeof p.timestamp !== 'number')            missing.push('timestamp');
      return { valid: missing.length === 0, missing };
    }

    const valid = { handId: 'hand-001', hand: 'right', timestamp: 1000 };

    test('valid payload passes', () => {
      expect(validatePresencePayload(valid).valid).toBe(true);
    });

    test('missing handId → invalid', () => {
      expect(validatePresencePayload({ ...valid, handId: undefined }).missing).toContain('handId');
    });

    test('empty handId → invalid', () => {
      expect(validatePresencePayload({ ...valid, handId: '' }).missing).toContain('handId');
    });

    test('missing hand → invalid', () => {
      expect(validatePresencePayload({ ...valid, hand: undefined }).missing).toContain('hand');
    });

    test('hand = "torso" → invalid', () => {
      expect(validatePresencePayload({ ...valid, hand: 'torso' }).missing).toContain('hand');
    });

    test('missing timestamp → invalid', () => {
      expect(validatePresencePayload({ ...valid, timestamp: undefined }).missing).toContain('timestamp');
    });

    test('timestamp as string → invalid', () => {
      expect(validatePresencePayload({ ...valid, timestamp: '1000' }).missing).toContain('timestamp');
    });

    test('hand = "left" is valid', () => {
      expect(validatePresencePayload({ ...valid, hand: 'left' }).valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // hand:update
  // ---------------------------------------------------------------------------

  describe('hand:update', () => {
    function validateVector(v) {
      return (
        v !== null &&
        typeof v === 'object' &&
        typeof v.x === 'number' &&
        typeof v.y === 'number' &&
        typeof v.z === 'number'
      );
    }

    function validateHandUpdatePayload(p) {
      const missing = [];
      if (typeof p.handId !== 'string' || !p.handId)       missing.push('handId');
      if (p.hand !== 'left' && p.hand !== 'right')          missing.push('hand');
      if (typeof p.timestamp !== 'number')                  missing.push('timestamp');
      if (!validateVector(p.position))                      missing.push('position');
      if (!validateVector(p.velocity))                      missing.push('velocity');
      if (!validateVector(p.palmNormal))                    missing.push('palmNormal');
      if (!Array.isArray(p.fingers) || p.fingers.length !== 5) missing.push('fingers');
      if (Array.isArray(p.fingers)) {
        const indices = p.fingers.map(f => f.index).sort();
        if (JSON.stringify(indices) !== JSON.stringify([0,1,2,3,4])) missing.push('fingers.indices');
        for (const f of p.fingers) {
          if (typeof f.extended !== 'boolean') { missing.push('fingers.extended'); break; }
        }
      }
      return { valid: missing.length === 0, missing };
    }

    const validFingers = [
      { index: 0, extended: false }, // thumb
      { index: 1, extended: true  }, // index
      { index: 2, extended: true  }, // middle
      { index: 3, extended: false }, // ring
      { index: 4, extended: false }, // pinky
    ];

    const valid = {
      handId: 'hand-001',
      hand: 'right',
      timestamp: 1000,
      position:   { x: 10, y: 50, z: -5 },
      velocity:   { x: 2, y: -1, z: 0.5 },
      palmNormal: { x: 0, y: -1, z: 0 },
      fingers: validFingers,
    };

    test('valid payload passes', () => {
      expect(validateHandUpdatePayload(valid).valid).toBe(true);
    });

    test('position must have x, y, z as numbers', () => {
      expect(validateHandUpdatePayload({ ...valid, position: { x: 1, y: 2 } }).missing).toContain('position');
    });

    test('velocity must have x, y, z as numbers', () => {
      expect(validateHandUpdatePayload({ ...valid, velocity: { x: 'fast', y: 0, z: 0 } }).missing).toContain('velocity');
    });

    test('palmNormal must have x, y, z as numbers', () => {
      expect(validateHandUpdatePayload({ ...valid, palmNormal: null }).missing).toContain('palmNormal');
    });

    test('missing position → invalid', () => {
      expect(validateHandUpdatePayload({ ...valid, position: undefined }).missing).toContain('position');
    });

    test('missing fingers → invalid', () => {
      expect(validateHandUpdatePayload({ ...valid, fingers: undefined }).missing).toContain('fingers');
    });

    test('fingers with 4 elements → invalid (must be exactly 5)', () => {
      expect(validateHandUpdatePayload({ ...valid, fingers: validFingers.slice(0, 4) }).missing).toContain('fingers');
    });

    test('fingers with 6 elements → invalid', () => {
      const six = [...validFingers, { index: 5, extended: false }];
      expect(validateHandUpdatePayload({ ...valid, fingers: six }).missing).toContain('fingers');
    });

    test('finger with non-boolean extended → invalid', () => {
      const bad = validFingers.map((f, i) => i === 2 ? { ...f, extended: 1 } : f);
      expect(validateHandUpdatePayload({ ...valid, fingers: bad }).missing).toContain('fingers.extended');
    });

    test('finger indices must cover 0–4 exactly', () => {
      const bad = validFingers.map((f, i) => i === 0 ? { ...f, index: 5 } : f);
      expect(validateHandUpdatePayload({ ...valid, fingers: bad }).missing).toContain('fingers.indices');
    });
  });

  // ---------------------------------------------------------------------------
  // gesture:forming
  // ---------------------------------------------------------------------------

  describe('gesture:forming', () => {
    function validateFormingPayload(p) {
      const missing = [];
      if (typeof p.gestureId !== 'string' || !p.gestureId)      missing.push('gestureId');
      if (!Object.values(GESTURE_NAMES).includes(p.gesture))    missing.push('gesture');
      if (p.hand !== 'left' && p.hand !== 'right')              missing.push('hand');
      if (typeof p.confidence !== 'number' ||
          p.confidence < 0 ||
          p.confidence >= TIMING.CONFIDENCE_THRESHOLD)          missing.push('confidence');
      if (typeof p.timestamp !== 'number')                      missing.push('timestamp');
      return { valid: missing.length === 0, missing };
    }

    const valid = {
      gestureId: 'g-001',
      gesture: GESTURE_NAMES.PINCH,
      hand: 'right',
      confidence: 0.50,
      timestamp: 1000,
    };

    test('valid payload passes', () => {
      expect(validateFormingPayload(valid).valid).toBe(true);
    });

    test('gesture must be a known GESTURE_NAMES value', () => {
      expect(validateFormingPayload({ ...valid, gesture: 'UNKNOWN_GESTURE' }).missing).toContain('gesture');
    });

    test('confidence strictly below 0.82 is valid', () => {
      expect(validateFormingPayload({ ...valid, confidence: 0.819 }).valid).toBe(true);
    });

    test('confidence === 0.82 → invalid for gesture:forming (belongs to gesture:fire)', () => {
      expect(validateFormingPayload({ ...valid, confidence: 0.82 }).missing).toContain('confidence');
    });

    test('confidence above threshold → invalid for gesture:forming', () => {
      expect(validateFormingPayload({ ...valid, confidence: 0.95 }).missing).toContain('confidence');
    });

    test('confidence = 0 is valid (just began forming)', () => {
      expect(validateFormingPayload({ ...valid, confidence: 0 }).valid).toBe(true);
    });

    test('negative confidence → invalid', () => {
      expect(validateFormingPayload({ ...valid, confidence: -0.1 }).missing).toContain('confidence');
    });

    test('missing gestureId → invalid', () => {
      expect(validateFormingPayload({ ...valid, gestureId: undefined }).missing).toContain('gestureId');
    });
  });

  // ---------------------------------------------------------------------------
  // gesture:fire
  // ---------------------------------------------------------------------------

  describe('gesture:fire', () => {
    const DIRECTIONAL_GESTURES = {
      [GESTURE_NAMES.TWO_FINGER_FLICK]:  ['up', 'down', 'left', 'right'],
      [GESTURE_NAMES.INDEX_POINT_TWIST]: ['cw', 'ccw'],
      [GESTURE_NAMES.DIAL_ROTATE]:       ['cw', 'ccw'],
    };

    function validateFirePayload(p) {
      const missing = [];
      if (typeof p.gestureId !== 'string' || !p.gestureId)      missing.push('gestureId');
      if (!Object.values(GESTURE_NAMES).includes(p.gesture))    missing.push('gesture');
      if (p.hand !== 'left' && p.hand !== 'right')              missing.push('hand');
      if (typeof p.confidence !== 'number' ||
          p.confidence < TIMING.CONFIDENCE_THRESHOLD)           missing.push('confidence');
      if (typeof p.timestamp !== 'number')                      missing.push('timestamp');

      const requiredDirections = DIRECTIONAL_GESTURES[p.gesture];
      if (requiredDirections) {
        if (!requiredDirections.includes(p.direction)) missing.push('direction');
      }
      return { valid: missing.length === 0, missing };
    }

    const valid = {
      gestureId: 'g-001',
      gesture: GESTURE_NAMES.PINCH,
      hand: 'right',
      confidence: 0.90,
      timestamp: 1000,
    };

    test('valid payload (no direction required) passes', () => {
      expect(validateFirePayload(valid).valid).toBe(true);
    });

    test('confidence must be >= 0.82', () => {
      expect(validateFirePayload({ ...valid, confidence: 0.81 }).missing).toContain('confidence');
    });

    test('confidence exactly 0.82 is valid', () => {
      expect(validateFirePayload({ ...valid, confidence: 0.82 }).valid).toBe(true);
    });

    test('TWO_FINGER_FLICK requires direction', () => {
      const flick = { ...valid, gesture: GESTURE_NAMES.TWO_FINGER_FLICK };
      expect(validateFirePayload(flick).missing).toContain('direction');
    });

    test('TWO_FINGER_FLICK with valid direction passes', () => {
      for (const dir of ['up', 'down', 'left', 'right']) {
        const payload = { ...valid, gesture: GESTURE_NAMES.TWO_FINGER_FLICK, direction: dir };
        expect(validateFirePayload(payload).valid).toBe(true);
      }
    });

    test('TWO_FINGER_FLICK with direction "diagonal" → invalid', () => {
      const payload = { ...valid, gesture: GESTURE_NAMES.TWO_FINGER_FLICK, direction: 'diagonal' };
      expect(validateFirePayload(payload).missing).toContain('direction');
    });

    test('INDEX_POINT_TWIST requires direction cw or ccw', () => {
      const twist = { ...valid, gesture: GESTURE_NAMES.INDEX_POINT_TWIST };
      expect(validateFirePayload(twist).missing).toContain('direction');
      expect(validateFirePayload({ ...twist, direction: 'cw' }).valid).toBe(true);
      expect(validateFirePayload({ ...twist, direction: 'ccw' }).valid).toBe(true);
    });

    test('DIAL_ROTATE requires direction cw or ccw', () => {
      const dial = { ...valid, gesture: GESTURE_NAMES.DIAL_ROTATE };
      expect(validateFirePayload(dial).missing).toContain('direction');
      expect(validateFirePayload({ ...dial, direction: 'cw' }).valid).toBe(true);
    });

    test('PINCH with no direction is valid', () => {
      expect(validateFirePayload({ ...valid, gesture: GESTURE_NAMES.PINCH }).valid).toBe(true);
    });

    test('direction field is absent (not just undefined) for non-directional gestures — no extraneous field required', () => {
      const payload = { gestureId: 'g', gesture: GESTURE_NAMES.THUMBS_UP, hand: 'right', confidence: 0.9, timestamp: 1 };
      expect(validateFirePayload(payload).valid).toBe(true);
      expect('direction' in payload).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // gesture:cancelled
  // ---------------------------------------------------------------------------

  describe('gesture:cancelled', () => {
    function validateCancelledPayload(p) {
      const missing = [];
      if (typeof p.gestureId !== 'string' || !p.gestureId)      missing.push('gestureId');
      if (!Object.values(GESTURE_NAMES).includes(p.gesture))    missing.push('gesture');
      if (p.hand !== 'left' && p.hand !== 'right')              missing.push('hand');
      if (typeof p.peakConfidence !== 'number')                  missing.push('peakConfidence');
      if (typeof p.timestamp !== 'number')                       missing.push('timestamp');
      if ('confidence' in p)                                     missing.push('unexpected:confidence');
      return { valid: missing.length === 0, missing };
    }

    const valid = {
      gestureId: 'g-001',
      gesture: GESTURE_NAMES.GUN_SHAPE,
      hand: 'right',
      peakConfidence: 0.65,
      timestamp: 1000,
    };

    test('valid payload passes', () => {
      expect(validateCancelledPayload(valid).valid).toBe(true);
    });

    test('field is peakConfidence, not confidence', () => {
      expect(validateCancelledPayload({ ...valid, confidence: 0.65 }).missing).toContain('unexpected:confidence');
    });

    test('missing peakConfidence → invalid', () => {
      expect(validateCancelledPayload({ ...valid, peakConfidence: undefined }).missing).toContain('peakConfidence');
    });

    test('peakConfidence = 0 is valid (cancelled immediately)', () => {
      expect(validateCancelledPayload({ ...valid, peakConfidence: 0 }).valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Hold gesture lifecycle
  // ---------------------------------------------------------------------------

  describe('hold gesture lifecycle', () => {
    function validateHoldPayload(p) {
      const missing = [];
      if (typeof p.gestureId !== 'string' || !p.gestureId)       missing.push('gestureId');
      if (!Object.values(GESTURE_NAMES).includes(p.gesture))     missing.push('gesture');
      if (p.hand !== 'left' && p.hand !== 'right')               missing.push('hand');
      if (typeof p.requiredDuration !== 'number' || p.requiredDuration <= 0) missing.push('requiredDuration');
      if (typeof p.elapsed !== 'number' || p.elapsed < 0)        missing.push('elapsed');
      if (typeof p.timestamp !== 'number')                        missing.push('timestamp');
      return { valid: missing.length === 0, missing };
    }

    const base = {
      gestureId: 'hold-001',
      gesture: GESTURE_NAMES.PINCH,
      hand: 'right',
      requiredDuration: HOLD_DURATIONS.PINCH_WINDOW_CLOSE,
      elapsed: 0,
      timestamp: 1000,
    };

    test('hold:start — elapsed === 0 is valid', () => {
      expect(validateHoldPayload({ ...base, elapsed: 0 }).valid).toBe(true);
    });

    test('hold:progress — elapsed > 0 and < requiredDuration is valid', () => {
      expect(validateHoldPayload({ ...base, elapsed: 250 }).valid).toBe(true);
    });

    test('hold:complete — elapsed >= requiredDuration is valid', () => {
      expect(validateHoldPayload({ ...base, elapsed: 500 }).valid).toBe(true);
    });

    test('hold:cancel — elapsed between 0 and requiredDuration is valid', () => {
      expect(validateHoldPayload({ ...base, elapsed: 300 }).valid).toBe(true);
    });

    test('missing requiredDuration → invalid', () => {
      expect(validateHoldPayload({ ...base, requiredDuration: undefined }).missing).toContain('requiredDuration');
    });

    test('requiredDuration = 0 → invalid (must be positive)', () => {
      expect(validateHoldPayload({ ...base, requiredDuration: 0 }).missing).toContain('requiredDuration');
    });

    test('negative elapsed → invalid', () => {
      expect(validateHoldPayload({ ...base, elapsed: -1 }).missing).toContain('elapsed');
    });

    // Pin every HOLD_DURATIONS value against the contract
    test('PINCH in Layer 1 — requiredDuration === HOLD_DURATIONS.PINCH_WINDOW_CLOSE (500)', () => {
      expect(validateHoldPayload({ ...base, requiredDuration: HOLD_DURATIONS.PINCH_WINDOW_CLOSE }).valid).toBe(true);
      expect(HOLD_DURATIONS.PINCH_WINDOW_CLOSE).toBe(500);
    });

    test('GUN_SHAPE — requiredDuration === HOLD_DURATIONS.GUN_SHAPE_OVERVIEW (300)', () => {
      const payload = { ...base, gesture: GESTURE_NAMES.GUN_SHAPE, requiredDuration: HOLD_DURATIONS.GUN_SHAPE_OVERVIEW };
      expect(validateHoldPayload(payload).valid).toBe(true);
      expect(HOLD_DURATIONS.GUN_SHAPE_OVERVIEW).toBe(300);
    });

    test('HANG_LOOSE — requiredDuration === HOLD_DURATIONS.HANG_LOOSE_CLEAR_DESK (300)', () => {
      const payload = { ...base, gesture: GESTURE_NAMES.HANG_LOOSE, requiredDuration: HOLD_DURATIONS.HANG_LOOSE_CLEAR_DESK };
      expect(validateHoldPayload(payload).valid).toBe(true);
    });

    test('PEACE_SIGN — requiredDuration === HOLD_DURATIONS.PEACE_SIGN_CHEAT_SHEET (600)', () => {
      const payload = { ...base, gesture: GESTURE_NAMES.PEACE_SIGN, requiredDuration: HOLD_DURATIONS.PEACE_SIGN_CHEAT_SHEET };
      expect(validateHoldPayload(payload).valid).toBe(true);
      expect(HOLD_DURATIONS.PEACE_SIGN_CHEAT_SHEET).toBe(600);
    });

    test('PINCH Force Quit (Layer 2) — requiredDuration === HOLD_DURATIONS.PINCH_FORCE_QUIT (800)', () => {
      const payload = { ...base, requiredDuration: HOLD_DURATIONS.PINCH_FORCE_QUIT };
      expect(validateHoldPayload(payload).valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // dial:change
  // ---------------------------------------------------------------------------

  describe('dial:change', () => {
    function validateDialPayload(p) {
      const missing = [];
      if (p.hand !== 'left' && p.hand !== 'right')                             missing.push('hand');
      if (p.direction !== 'cw' && p.direction !== 'ccw')                       missing.push('direction');
      if (typeof p.totalAngle !== 'number' || p.totalAngle <= TIMING.DIAL_DEAD_ZONE_DEGREES) missing.push('totalAngle');
      if (typeof p.angularVelocity !== 'number' || p.angularVelocity <= 0)     missing.push('angularVelocity');
      if (typeof p.timestamp !== 'number')                                      missing.push('timestamp');
      if ('gestureId' in p)                                                     missing.push('unexpected:gestureId');
      return { valid: missing.length === 0, missing };
    }

    const valid = {
      hand: 'right',
      direction: 'cw',
      totalAngle: 30,
      angularVelocity: 45,
      timestamp: 1000,
    };

    test('valid payload passes', () => {
      expect(validateDialPayload(valid).valid).toBe(true);
    });

    test('direction must be "cw" or "ccw"', () => {
      expect(validateDialPayload({ ...valid, direction: 'left' }).missing).toContain('direction');
    });

    test('totalAngle must exceed dead zone (>15°)', () => {
      expect(validateDialPayload({ ...valid, totalAngle: TIMING.DIAL_DEAD_ZONE_DEGREES }).missing).toContain('totalAngle');
    });

    test('totalAngle = 15 → invalid (dead zone not exceeded)', () => {
      expect(validateDialPayload({ ...valid, totalAngle: 15 }).missing).toContain('totalAngle');
    });

    test('totalAngle = 15.1 → valid (just past dead zone)', () => {
      expect(validateDialPayload({ ...valid, totalAngle: 15.1 }).valid).toBe(true);
    });

    test('angularVelocity = 0 → invalid', () => {
      expect(validateDialPayload({ ...valid, angularVelocity: 0 }).missing).toContain('angularVelocity');
    });

    test('angularVelocity must be positive', () => {
      expect(validateDialPayload({ ...valid, angularVelocity: -10 }).missing).toContain('angularVelocity');
    });

    test('no gestureId field — dial:change is continuous, not a discrete gesture', () => {
      expect(validateDialPayload({ ...valid, gestureId: 'g-001' }).missing).toContain('unexpected:gestureId');
    });
  });

  // ---------------------------------------------------------------------------
  // modifier:enter
  // ---------------------------------------------------------------------------

  describe('modifier:enter', () => {
    function validateModifierEnterPayload(p) {
      const missing = [];
      if (typeof p.handId !== 'string' || !p.handId)                                        missing.push('handId');
      if (p.hand !== 'left')                                                                 missing.push('hand');
      if (typeof p.entryVelocity !== 'number' || p.entryVelocity >= TIMING.MODIFIER_VELOCITY_THRESHOLD_MM_S) missing.push('entryVelocity');
      if (typeof p.timestamp !== 'number')                                                   missing.push('timestamp');
      return { valid: missing.length === 0, missing };
    }

    const valid = { handId: 'hand-002', hand: 'left', entryVelocity: 5, timestamp: 1000 };

    test('valid payload passes', () => {
      expect(validateModifierEnterPayload(valid).valid).toBe(true);
    });

    test('hand must be "left" — right hand cannot trigger modifier', () => {
      expect(validateModifierEnterPayload({ ...valid, hand: 'right' }).missing).toContain('hand');
    });

    test('entryVelocity 14.9mm/s → valid', () => {
      expect(validateModifierEnterPayload({ ...valid, entryVelocity: 14.9 }).valid).toBe(true);
    });

    test('entryVelocity = 15mm/s → invalid (threshold is exclusive)', () => {
      expect(validateModifierEnterPayload({ ...valid, entryVelocity: 15 }).missing).toContain('entryVelocity');
    });

    test('entryVelocity = 0mm/s → valid (perfectly still)', () => {
      expect(validateModifierEnterPayload({ ...valid, entryVelocity: 0 }).valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // modifier:exit
  // ---------------------------------------------------------------------------

  describe('modifier:exit', () => {
    function validateModifierExitPayload(p) {
      const missing = [];
      if (typeof p.handId !== 'string' || !p.handId)                                    missing.push('handId');
      if (p.hand !== 'left')                                                             missing.push('hand');
      if (p.reason !== 'velocity_exceeded' && p.reason !== 'hand_exited')               missing.push('reason');
      if (typeof p.exitVelocity !== 'number')                                            missing.push('exitVelocity');
      if (typeof p.timestamp !== 'number')                                               missing.push('timestamp');
      return { valid: missing.length === 0, missing };
    }

    const valid = { handId: 'hand-002', hand: 'left', reason: 'velocity_exceeded', exitVelocity: 20, timestamp: 2000 };

    test('valid payload with reason "velocity_exceeded" passes', () => {
      expect(validateModifierExitPayload(valid).valid).toBe(true);
    });

    test('valid payload with reason "hand_exited" passes', () => {
      expect(validateModifierExitPayload({ ...valid, reason: 'hand_exited', exitVelocity: 0 }).valid).toBe(true);
    });

    test('reason "timeout" → invalid (not in contract)', () => {
      expect(validateModifierExitPayload({ ...valid, reason: 'timeout' }).missing).toContain('reason');
    });

    test('hand must be "left"', () => {
      expect(validateModifierExitPayload({ ...valid, hand: 'right' }).missing).toContain('hand');
    });

    test('exitVelocity can be 0 when reason is "hand_exited"', () => {
      expect(validateModifierExitPayload({ ...valid, reason: 'hand_exited', exitVelocity: 0 }).valid).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // layer3:enter / layer3:exit
  // ---------------------------------------------------------------------------

  describe('layer3:enter and layer3:exit', () => {
    function validateLayer3Payload(p) {
      return typeof p.timestamp === 'number';
    }

    test('valid payload — timestamp only', () => {
      expect(validateLayer3Payload({ timestamp: 1000 })).toBe(true);
    });

    test('payload has no handId field', () => {
      const payload = { timestamp: 1000 };
      expect('handId' in payload).toBe(false);
    });

    test('payload has no hand field', () => {
      const payload = { timestamp: 1000 };
      expect('hand' in payload).toBe(false);
    });

    test('matches {timestamp: number} shape', () => {
      expect({ timestamp: 1000 }).toMatchObject({ timestamp: expect.any(Number) });
    });

    test('extra debug fields are tolerated', () => {
      expect(validateLayer3Payload({ timestamp: 1000, debug: 'layer3-toggle' })).toBe(true);
    });
  });
});

// =============================================================================
// SECTION 7 — Timing constraints
// =============================================================================

describe('Timing constraints', () => {

  // ---------------------------------------------------------------------------
  // Confidence threshold gate
  // ---------------------------------------------------------------------------

  describe('Confidence threshold gate — 0.82', () => {
    let provider;
    let onFire;
    let onForming;

    beforeEach(() => {
      provider  = new ConformantProvider();
      onFire    = jest.fn();
      onForming = jest.fn();
      provider.on(GESTURE_EVENTS.GESTURE_FIRE,    onFire);
      provider.on(GESTURE_EVENTS.GESTURE_FORMING, onForming);
    });

    const payload = (confidence) => ({
      gestureId: 'g-001',
      gesture: GESTURE_NAMES.PINCH,
      hand: 'right',
      confidence,
      timestamp: 1000,
    });

    test('confidence 0.50 → gesture:forming fires, gesture:fire does not', () => {
      provider._tryFireGesture(payload(0.50));
      expect(onForming).toHaveBeenCalledTimes(1);
      expect(onFire).not.toHaveBeenCalled();
    });

    test('confidence 0.81 → gesture:forming fires, gesture:fire does not', () => {
      provider._tryFireGesture(payload(0.81));
      expect(onForming).toHaveBeenCalledTimes(1);
      expect(onFire).not.toHaveBeenCalled();
    });

    test('confidence 0.82 → gesture:fire fires, gesture:forming does not', () => {
      provider._tryFireGesture(payload(0.82));
      expect(onFire).toHaveBeenCalledTimes(1);
      expect(onForming).not.toHaveBeenCalled();
    });

    test('confidence 0.95 → gesture:fire fires', () => {
      provider._tryFireGesture(payload(0.95));
      expect(onFire).toHaveBeenCalledTimes(1);
    });

    test('confidence NaN → neither event fires', () => {
      provider._tryFireGesture(payload(NaN));
      expect(onFire).not.toHaveBeenCalled();
      expect(onForming).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Cooldown — 350ms between repeated fires of the same gesture
  // ---------------------------------------------------------------------------

  describe('Cooldown — 350ms', () => {
    let provider;
    let onFire;

    beforeEach(() => {
      provider = new ConformantProvider();
      onFire   = jest.fn();
      provider.on(GESTURE_EVENTS.GESTURE_FIRE, onFire);
    });

    const fire = (provider, gesture, timestamp) => provider._tryFireGesture({
      gestureId: `g-${timestamp}`,
      gesture,
      hand: 'right',
      confidence: 0.90,
      timestamp,
    });

    test('first fire of a gesture always succeeds', () => {
      fire(provider, GESTURE_NAMES.PINCH, 1000);
      expect(onFire).toHaveBeenCalledTimes(1);
    });

    test('second fire within 349ms is suppressed', () => {
      fire(provider, GESTURE_NAMES.PINCH, 1000);
      fire(provider, GESTURE_NAMES.PINCH, 1349);
      expect(onFire).toHaveBeenCalledTimes(1);
    });

    test('second fire at exactly 350ms fires', () => {
      fire(provider, GESTURE_NAMES.PINCH, 1000);
      fire(provider, GESTURE_NAMES.PINCH, 1350);
      expect(onFire).toHaveBeenCalledTimes(2);
    });

    test('second fire at 351ms fires', () => {
      fire(provider, GESTURE_NAMES.PINCH, 1000);
      fire(provider, GESTURE_NAMES.PINCH, 1351);
      expect(onFire).toHaveBeenCalledTimes(2);
    });

    test('cooldown is per-gesture, not global', () => {
      fire(provider, GESTURE_NAMES.PINCH,     1000); // fires
      fire(provider, GESTURE_NAMES.THUMBS_UP, 1100); // fires — different gesture
      fire(provider, GESTURE_NAMES.PINCH,     1200); // suppressed — 200ms since last PINCH
      expect(onFire).toHaveBeenCalledTimes(2);
    });

    test('cooldown resets after window passes', () => {
      fire(provider, GESTURE_NAMES.PINCH, 1000); // fires
      fire(provider, GESTURE_NAMES.PINCH, 1200); // suppressed
      fire(provider, GESTURE_NAMES.PINCH, 1400); // fires — 400ms since t=1000
      expect(onFire).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Modifier entry velocity threshold
  // ---------------------------------------------------------------------------

  describe('Modifier layer entry — velocity < 15mm/s', () => {
    let provider;
    let onModifierEnter;

    beforeEach(() => {
      provider        = new ConformantProvider();
      onModifierEnter = jest.fn();
      provider.on(GESTURE_EVENTS.MODIFIER_ENTER, onModifierEnter);
    });

    const enterPayload = (hand, entryVelocity) => ({
      handId: 'hand-002',
      hand,
      entryVelocity,
      timestamp: 1000,
    });

    test('left hand at 14.9mm/s → modifier:enter fires', () => {
      provider._tryEnterModifier(enterPayload('left', 14.9));
      expect(onModifierEnter).toHaveBeenCalledTimes(1);
    });

    test('left hand at exactly 15mm/s → modifier:enter does NOT fire', () => {
      provider._tryEnterModifier(enterPayload('left', 15));
      expect(onModifierEnter).not.toHaveBeenCalled();
    });

    test('left hand at 0mm/s → modifier:enter fires (perfectly still)', () => {
      provider._tryEnterModifier(enterPayload('left', 0));
      expect(onModifierEnter).toHaveBeenCalledTimes(1);
    });

    test('right hand at any velocity → modifier:enter does NOT fire', () => {
      provider._tryEnterModifier(enterPayload('right', 5));
      expect(onModifierEnter).not.toHaveBeenCalled();
    });

    test('right hand below threshold → still does NOT fire (modifier is left-hand only)', () => {
      provider._tryEnterModifier(enterPayload('right', 0));
      expect(onModifierEnter).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Layer 3 hold — 800ms pinch toggle
  // ---------------------------------------------------------------------------

  describe('Layer 3 — pinch hold 800ms', () => {
    let provider;
    let onHoldStart;
    let onHoldComplete;
    let onHoldCancel;
    let onLayer3Enter;
    let onLayer3Exit;

    beforeEach(() => {
      jest.useFakeTimers();
      provider       = new ConformantProvider();
      onHoldStart    = jest.fn();
      onHoldComplete = jest.fn();
      onHoldCancel   = jest.fn();
      onLayer3Enter  = jest.fn();
      onLayer3Exit   = jest.fn();
      provider.on(GESTURE_EVENTS.HOLD_START,    onHoldStart);
      provider.on(GESTURE_EVENTS.HOLD_COMPLETE, onHoldComplete);
      provider.on(GESTURE_EVENTS.HOLD_CANCEL,   onHoldCancel);
      provider.on(GESTURE_EVENTS.LAYER3_ENTER,  onLayer3Enter);
      provider.on(GESTURE_EVENTS.LAYER3_EXIT,   onLayer3Exit);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('hold:start fires synchronously when hold begins', () => {
      provider._startLayer3PinchHold();
      expect(onHoldStart).toHaveBeenCalledTimes(1);
      expect(onLayer3Enter).not.toHaveBeenCalled();
    });

    test('layer3:enter does NOT fire before 800ms', () => {
      provider._startLayer3PinchHold();
      jest.advanceTimersByTime(799);
      expect(onLayer3Enter).not.toHaveBeenCalled();
    });

    test('hold:complete and layer3:enter both fire at 800ms', () => {
      provider._startLayer3PinchHold();
      jest.advanceTimersByTime(800);
      expect(onHoldComplete).toHaveBeenCalledTimes(1);
      expect(onLayer3Enter).toHaveBeenCalledTimes(1);
    });

    test('cancelling before 800ms suppresses layer3:enter', () => {
      provider._startLayer3PinchHold();
      jest.advanceTimersByTime(500);
      provider._cancelLayer3PinchHold();
      jest.advanceTimersByTime(800);
      expect(onLayer3Enter).not.toHaveBeenCalled();
      expect(onHoldCancel).toHaveBeenCalledTimes(1);
    });

    test('hold:cancel payload has elapsed < 800', () => {
      provider._startLayer3PinchHold();
      jest.advanceTimersByTime(400);
      provider._cancelLayer3PinchHold();
      const cancelPayload = onHoldCancel.mock.calls[0][0];
      expect(cancelPayload.elapsed).toBeLessThan(800);
    });

    test('second 800ms hold toggles layer3:exit after layer3:enter', () => {
      provider._startLayer3PinchHold();
      jest.advanceTimersByTime(800);
      expect(onLayer3Enter).toHaveBeenCalledTimes(1);

      provider._startLayer3PinchHold();
      jest.advanceTimersByTime(800);
      expect(onLayer3Exit).toHaveBeenCalledTimes(1);
    });

    test('_exitLayer3() (open palm) emits layer3:exit immediately without a hold', () => {
      provider._startLayer3PinchHold();
      jest.advanceTimersByTime(800); // enter layer 3

      provider._exitLayer3();
      expect(onLayer3Exit).toHaveBeenCalledTimes(1);
    });
  });
});

// =============================================================================
// Exports — other modules import constants and GestureInputProvider from here
// =============================================================================

module.exports = {
  GESTURE_NAMES,
  GESTURE_EVENTS,
  TIMING,
  HOLD_DURATIONS,
  ACTIVATION_ZONE,
  GestureInputProvider,
};
