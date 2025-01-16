export class TiptapThreadStore {
  constructor(private readonly editor: BlockNoteEditor<any, any, any>) {}

  public async createThread() {
    this.editor._tiptapEditor.commands.setMark(this.markType, { threadId: id });
  }
}
