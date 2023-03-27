import type { App } from 'vue'
import BlockNoteView from "./BlockNoteView.vue"

export default {
  install: (app: App) => {
    app.component('BlockNoteView', BlockNoteView)
  }
}

export { BlockNoteView }