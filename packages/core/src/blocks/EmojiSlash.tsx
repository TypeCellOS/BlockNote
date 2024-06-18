import {  createReactInlineContentSpec, createReactBlockSpec } from "@blocknote/react";
 
// The Mention inline content.
export const EmojiSlash =  createReactInlineContentSpec(
  {
    type: "emojiSlash",
    propSchema: {
      editor: {
        default: 'none'
      }
    },
    content: "inline",
  },
  {
    render: (props) => {
// Create a new KeyboardEvent
// const keyboardEvent = new KeyboardEvent('keydown', {
//   key: ':',          // key identifier (DOMString), optional
//   code: 'Colon',     // key code identifier (DOMString), optional
//   keyCode: 186,      // key code value (unsigned long), optional
//   which: 186,        // legacy keyCode, optional
//   charCode: 0,       // character code value (unsigned long), optional
//   bubbles: false,    // bubbles flag (boolean), optional
//   cancelable: false, // cancelable flag (boolean), optional
//   composed: false,   // composed flag (boolean), optional
//   ctrlKey: false,    // control key flag (boolean), optional
//   altKey: false,     // alt key flag (boolean), optional
//   shiftKey: false,   // shift key flag (boolean), optional
//   metaKey: false     // meta key flag (boolean), optional
// });

// Dispatch the event on the document
// props.inlineContent.props.editor.domElement.dispatchEvent(keyboardEvent);
 
      return(
        <span>:</span>
    
    )},
  }
);