// from https://raw.githubusercontent.com/ueberdosis/tiptap/develop/packages/core/src/EventEmitter.ts (MIT)

type StringKeyOf<T> = Extract<keyof T, string>;
type CallbackType<
  T extends Record<string, any>,
  EventName extends StringKeyOf<T>
> = T[EventName] extends any[] ? T[EventName] : [T[EventName]];
type CallbackFunction<
  T extends Record<string, any>,
  EventName extends StringKeyOf<T>
> = (...props: CallbackType<T, EventName>) => any;

export class EventEmitter<T extends Record<string, any>> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  private callbacks: { [key: string]: Function[] } = {};

  public on<EventName extends StringKeyOf<T>>(
    event: EventName,
    fn: CallbackFunction<T, EventName>
  ) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }

    this.callbacks[event].push(fn);

    return () => this.off(event, fn);
  }

  protected emit<EventName extends StringKeyOf<T>>(
    event: EventName,
    ...args: CallbackType<T, EventName>
  ) {
    const callbacks = this.callbacks[event];

    if (callbacks) {
      callbacks.forEach((callback) => callback.apply(this, args));
    }
  }

  public off<EventName extends StringKeyOf<T>>(
    event: EventName,
    fn?: CallbackFunction<T, EventName>
  ) {
    const callbacks = this.callbacks[event];

    if (callbacks) {
      if (fn) {
        this.callbacks[event] = callbacks.filter((callback) => callback !== fn);
      } else {
        delete this.callbacks[event];
      }
    }
  }

  protected removeAllListeners(): void {
    this.callbacks = {};
  }
}
