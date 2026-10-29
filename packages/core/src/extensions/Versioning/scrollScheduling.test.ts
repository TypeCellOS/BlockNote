// @vitest-environment node
import { afterEach, expect, it, vi } from "vite-plus/test";
import {
  scheduleScrollToFirstChange,
  SCROLL_TO_FIRST_CHANGE_DELAY_MS,
} from "./scrollToFirstChange.js";

afterEach(() => {
  vi.useRealTimers();
});

it("owns a cancellable timer and releases it before resolving the root", () => {
  vi.useFakeTimers();
  const getRoot = vi.fn(() => undefined);
  const cancel = scheduleScrollToFirstChange(getRoot);
  expect(typeof cancel).toBe("function");
  expect(vi.getTimerCount()).toBe(1);
  cancel?.();
  cancel?.();
  expect(vi.getTimerCount()).toBe(0);
  vi.advanceTimersByTime(SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  expect(getRoot).not.toHaveBeenCalled();
});

it("resolves the root only after the preview layout delay", () => {
  vi.useFakeTimers();
  const getRoot = vi.fn(() => undefined);
  scheduleScrollToFirstChange(getRoot);
  expect(getRoot).not.toHaveBeenCalled();
  vi.advanceTimersByTime(SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  expect(getRoot).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it("skips a superseded preview without resolving its root", () => {
  vi.useFakeTimers();
  const getRoot = vi.fn(() => undefined);
  let current = true;
  scheduleScrollToFirstChange(getRoot, { isCurrent: () => current });
  current = false;
  vi.advanceTimersByTime(SCROLL_TO_FIRST_CHANGE_DELAY_MS);
  expect(getRoot).not.toHaveBeenCalled();
});

it("does not schedule disabled scrolling", () => {
  vi.useFakeTimers();
  const getRoot = vi.fn(() => undefined);
  scheduleScrollToFirstChange(getRoot, { enabled: false });
  expect(vi.getTimerCount()).toBe(0);
  expect(getRoot).not.toHaveBeenCalled();
});
