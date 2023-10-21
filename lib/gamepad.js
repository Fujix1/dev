/**
 * Gamepad クラス
 */

class Gamepad {
  constructor() {
    this.gamepads = {};
    window.addEventListener(
      "gamepadconnected",
      (e) => {
        this.gamepadHandler(e, true);
      },
      false
    );
    window.addEventListener(
      "gamepadconnected",
      (e) => {
        this.gamepadHandler(e, false);
      },
      false
    );
  }

  gamepadHandler(event, connected) {
    const gamepad = event.gamepad;
    // Note:
    // gamepad === navigator.getGamepads()[gamepad.idnex]

    if (connected) {
      this.gamepads[gamepad.index] = gamepad;
    } else {
      delete this.gamepads[gamepad.index];
    }
  }
}
