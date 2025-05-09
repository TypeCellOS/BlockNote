import { Plugin } from "prosemirror-state";

export abstract class BlockNoteExtension {
  public static name(): string {
    throw new Error("You must implement the name method in your extension");
  }

  public plugin?: Plugin;
  public plugins?: Plugin[];
  public priority?: number;
  
  // eslint-disable-next-line
  constructor(..._args: any[]) {
    // Allow subclasses to have constructors with parameters
    // without this, we can't easily implement BlockNoteEditor.extension(MyExtension) pattern
  }
}
