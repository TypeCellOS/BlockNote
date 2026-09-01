/**
 * The app server under test: where the *host* reaches it (`targetOrigin`) and
 * the port the *devices* reach it on (they see it as `127.0.0.1` — the
 * emulator via `adb reverse`, the simulator via the shared host network).
 */
export function targetOrigin(): string {
  return process.env.DEVICE_TEST_TARGET ?? "http://127.0.0.1:5173";
}

export function targetPort(): string {
  return new URL(targetOrigin()).port || "80";
}
