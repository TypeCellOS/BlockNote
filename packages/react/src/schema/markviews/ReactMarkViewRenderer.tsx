import { CoreMarkView } from "./CoreMarkView.js";
import type { MarkViewContext } from "./markViewContext.js";
import type { ReactMarkViewComponent } from "./ReactMarkViewOptions.js";

/* eslint-disable curly */

export class ReactMarkView extends CoreMarkView<ReactMarkViewComponent> {
  // implements ReactRenderer<MarkViewContext>
  // key: string = nanoid();
  id = Math.floor(Math.random() * 0xffffffff).toString();

  context: MarkViewContext = {
    contentRef: (element) => {
      if (element && this.contentDOM && element.firstChild !== this.contentDOM)
        element.appendChild(this.contentDOM);
    },
    view: this.view,

    mark: this.mark,
  };

  updateContext = () => {
    Object.assign(this.context, {
      mark: this.mark,
    });
  };

  // render = () => {
  //   const UserComponent = this.component;

  //   return createPortal(
  //     <markViewContext.Provider value={this.context}>
  //       <UserComponent />
  //     </markViewContext.Provider>,
  //     this.dom,
  //     this.key
  //   );
  // };

  render = () => {
    this.editor._tiptapEditor.contentComponent.setRenderer(
      this.id,
      this.renderer()
    );
  };

  destroy = () => {
    super.destroy();
    this.editor._tiptapEditor.contentComponent.removeRenderer(this.id);
  };

  renderer = () => {
    const UserComponent = this.component;

    const props: any = {};

    if (this.mark.attrs.stringValue) {
      props.value = this.mark.attrs.stringValue;
    }

    return {
      reactElement: (
        // <markViewContext.Provider value={this.context}>
        <UserComponent contentRef={this.context.contentRef} {...props} />
        // </markViewContext.Provider>
      ),
      element: this.dom,
    };
  };
}
