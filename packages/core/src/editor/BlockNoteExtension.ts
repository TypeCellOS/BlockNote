import { Plugin } from "prosemirror-state";
import { EventEmitter } from "../util/EventEmitter.js";

export abstract class BlockNoteExtension extends EventEmitter<any> {
  public static name(): string {
    throw new Error("You must implement the name method in your extension");
  }

  protected addProsemirrorPlugin(plugin: Plugin) {
    this.plugins.push(plugin);
  }

  public readonly plugins: Plugin[] = [];
  public get priority(): number | undefined {
    return undefined;
  }

  // eslint-disable-next-line
  constructor(..._args: any[]) {
    super();
    // Allow subclasses to have constructors with parameters
    // without this, we can't easily implement BlockNoteEditor.extension(MyExtension) pattern
  }
}
