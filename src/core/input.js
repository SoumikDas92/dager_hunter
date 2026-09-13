const ACTIONS = ['light', 'heavy', 'special', 'block', 'dash', 'interact', 'pause'];

export class InputManager {
  constructor({ onFirstInput } = {}) {
    this.onFirstInput = onFirstInput;
    this.firstInputSent = false;
    this.move = { x: 0, y: 0, strength: 0 };
    this.actions = {};
    ACTIONS.forEach((action) => {
      this.actions[action] = { down: false, presses: 0, releases: 0 };
    });
    this.keys = new Set();
    this.joystickPointerId = null;
    this.joystickCenter = { x: 0, y: 0 };
    this.joystickRadius = 58;
    this.setupDomControls();
    this.setupKeyboard();
    window.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  setupDomControls() {
    this.zone = document.getElementById('joystick-zone');
    this.knob = document.getElementById('joystick-knob');
    if (this.zone) {
      this.zone.addEventListener('pointerdown', (event) => {
        this.unlockOnce();
        this.joystickPointerId = event.pointerId;
        this.zone.setPointerCapture(event.pointerId);
        const rect = this.zone.getBoundingClientRect();
        this.joystickCenter.x = rect.left + rect.width / 2;
        this.joystickCenter.y = rect.top + rect.height / 2;
        this.updateJoystick(event.clientX, event.clientY);
      });
      this.zone.addEventListener('pointermove', (event) => {
        if (event.pointerId !== this.joystickPointerId) return;
        this.updateJoystick(event.clientX, event.clientY);
      });
      const end = (event) => {
        if (event.pointerId !== this.joystickPointerId) return;
        this.joystickPointerId = null;
        this.move.x = 0;
        this.move.y = 0;
        this.move.strength = 0;
        this.updateKnob(0, 0);
      };
      this.zone.addEventListener('pointerup', end);
      this.zone.addEventListener('pointercancel', end);
    }

    document.querySelectorAll('[data-action]').forEach((button) => {
      const action = button.dataset.action;
      if (!this.actions[action]) return;
      button.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.unlockOnce();
        button.setPointerCapture(event.pointerId);
        this.setAction(action, true);
      });
      const release = (event) => {
        event.preventDefault();
        this.setAction(action, false);
      };
      button.addEventListener('pointerup', release);
      button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', () => this.setAction(action, false));
    });
  }

  setupKeyboard() {
    window.addEventListener('keydown', (event) => {
      this.unlockOnce();
      if (event.repeat) return;
      const mapped = this.mapKey(event.code);
      if (mapped) {
        event.preventDefault();
        this.setAction(mapped, true);
      }
      this.keys.add(event.code);
      this.updateKeyboardMove();
    });
    window.addEventListener('keyup', (event) => {
      const mapped = this.mapKey(event.code);
      if (mapped) {
        event.preventDefault();
        this.setAction(mapped, false);
      }
      this.keys.delete(event.code);
      this.updateKeyboardMove();
    });
    window.addEventListener('blur', () => {
      for (const action of ACTIONS) this.setAction(action, false);
      this.keys.clear();
      this.updateKeyboardMove();
    });
  }

  mapKey(code) {
    switch (code) {
      case 'KeyJ':
      case 'Numpad1':
        return 'light';
      case 'KeyK':
      case 'Numpad2':
        return 'heavy';
      case 'KeyL':
      case 'Numpad3':
        return 'special';
      case 'ShiftLeft':
      case 'ShiftRight':
        return 'block';
      case 'Space':
        return 'dash';
      case 'KeyE':
      case 'Enter':
        return 'interact';
      case 'Escape':
      case 'KeyP':
        return 'pause';
      default:
        return null;
    }
  }

  updateKeyboardMove() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    if (x !== 0 || y !== 0) {
      const length = Math.hypot(x, y);
      this.move.x = x / length;
      this.move.y = y / length;
      this.move.strength = 1;
    } else if (this.joystickPointerId === null) {
      this.move.x = 0;
      this.move.y = 0;
      this.move.strength = 0;
    }
  }

  unlockOnce() {
    if (this.firstInputSent) return;
    this.firstInputSent = true;
    if (this.onFirstInput) this.onFirstInput();
  }

  updateJoystick(clientX, clientY) {
    const dx = clientX - this.joystickCenter.x;
    const dy = clientY - this.joystickCenter.y;
    const length = Math.hypot(dx, dy);
    const clamped = Math.min(length, this.joystickRadius);
    const nx = length > 0 ? dx / length : 0;
    const ny = length > 0 ? dy / length : 0;
    this.move.x = nx;
    this.move.y = ny;
    this.move.strength = clamped / this.joystickRadius;
    this.updateKnob(nx * clamped, ny * clamped);
  }

  updateKnob(x, y) {
    if (!this.knob) return;
    this.knob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  setAction(action, down) {
    const state = this.actions[action];
    if (!state) return;
    if (down && !state.down) state.presses += 1;
    if (!down && state.down) state.releases += 1;
    state.down = down;
  }

  consume(action) {
    const state = this.actions[action];
    if (!state || state.presses <= 0) return false;
    state.presses -= 1;
    return true;
  }

  isDown(action) {
    return Boolean(this.actions[action] && this.actions[action].down);
  }

  endFrame() {
    for (const action of ACTIONS) {
      this.actions[action].presses = 0;
      this.actions[action].releases = 0;
    }
  }
}
