import {
  BrowserStackSession,
  browserStackCredentials,
} from "./lib/browserstack.js";
import {
  LocalAndroidSession,
  localAndroidAvailable,
} from "./lib/localAndroid.js";
import { LocalIosSession, localIosAvailable } from "./lib/localIos.js";
import type { DeviceSession, Platform, TargetKind } from "./lib/session.js";

export type DeviceTarget = {
  /** Stable id, used in test names and `DEVICE_FILTER` matching. */
  id: string;
  platform: Platform;
  kind: TargetKind;
  /** Whether this machine/environment can drive the target right now. */
  available: () => Promise<boolean>;
  createSession: () => Promise<DeviceSession>;
};

/** Identifier tying BrowserStack sessions to the tunnel from the setup. */
export const LOCAL_TUNNEL_ID = "bn-device-tests";

function browserStackCapabilities(
  platform: Platform,
  deviceName: string,
  osVersion: string,
): Record<string, unknown> {
  const auth = browserStackCredentials();
  return {
    browserName: platform === "ios" ? "safari" : "chrome",
    "bstack:options": {
      userName: auth?.userName,
      accessKey: auth?.accessKey,
      deviceName,
      osVersion,
      realMobile: "true",
      local: "true",
      localIdentifier: LOCAL_TUNNEL_ID,
      projectName: "BlockNote device tests",
      idleTimeout: 60,
    },
  };
}

const browserStackAvailable = async () => !!browserStackCredentials();

/**
 * All targets. Local emulator/simulator targets are the per-PR layer — free,
 * deterministic, and with input channels the cloud lacks (the Android IME
 * action key). BrowserStack real hardware remains for what only hardware has:
 * OEM keyboards (the Samsung ships Samsung Keyboard, the second-biggest
 * Android IME family). Every BrowserStack entry costs one real-device session
 * per test file per run.
 */
export const DEVICE_TARGETS: DeviceTarget[] = [
  {
    id: "local-android-emulator",
    platform: "android",
    kind: "local-android",
    available: localAndroidAvailable,
    createSession: () => LocalAndroidSession.create(),
  },
  {
    id: "local-ios-simulator",
    platform: "ios",
    kind: "local-ios",
    available: localIosAvailable,
    createSession: () => LocalIosSession.create(),
  },
  {
    id: "bs-android-samsung-galaxy-s22",
    platform: "android",
    kind: "browserstack",
    available: browserStackAvailable,
    createSession: () =>
      BrowserStackSession.create(
        "android",
        browserStackCapabilities("android", "Samsung Galaxy S22", "12.0"),
      ),
  },
  {
    id: "bs-ios-iphone-16e",
    platform: "ios",
    kind: "browserstack",
    available: browserStackAvailable,
    createSession: () =>
      BrowserStackSession.create(
        "ios",
        browserStackCapabilities("ios", "iPhone 16e", "18"),
      ),
  },
];

/**
 * Targets selected for this run: reachable ones, narrowed by
 * `DEVICE_FILTER=<id substring>`. Unreachable targets are skipped so the
 * suite runs whatever a machine can drive — CI's Android job sees only the
 * emulator, the macOS job only the simulator, a laptop with credentials all
 * four.
 */
export async function activeDevices(): Promise<DeviceTarget[]> {
  const filter = process.env.DEVICE_FILTER;
  const candidates = filter
    ? DEVICE_TARGETS.filter((d) => d.id.includes(filter))
    : DEVICE_TARGETS;
  const flags = await Promise.all(candidates.map((d) => d.available()));
  return candidates.filter((_, i) => flags[i]);
}
