import { browserStackCredentials, type Platform } from "./lib/webdriver.js";

export type DeviceTarget = {
  /** Stable id, used in test names and `DEVICE_FILTER` matching. */
  id: string;
  platform: Platform;
  capabilities: Record<string, unknown>;
};

/** Identifier tying sessions to the tunnel started by the global setup. */
export const LOCAL_TUNNEL_ID = "bn-device-tests";

function capabilities(
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

/**
 * The device matrix. Chosen to cover both platforms and both major Android IME
 * families (this Samsung ships Samsung Keyboard; add a Pixel for Gboard when
 * widening the matrix). Every entry costs one real-device session per test
 * file per run.
 */
export const DEVICE_TARGETS: DeviceTarget[] = [
  {
    id: "android-samsung-galaxy-s22",
    platform: "android",
    capabilities: capabilities("android", "Samsung Galaxy S22", "12.0"),
  },
  {
    id: "ios-iphone-16e",
    platform: "ios",
    capabilities: capabilities("ios", "iPhone 16e", "18"),
  },
];

/** Devices selected for this run; narrow with DEVICE_FILTER=<id substring>. */
export function activeDevices(): DeviceTarget[] {
  const filter = process.env.DEVICE_FILTER;
  return filter
    ? DEVICE_TARGETS.filter((d) => d.id.includes(filter))
    : DEVICE_TARGETS;
}
