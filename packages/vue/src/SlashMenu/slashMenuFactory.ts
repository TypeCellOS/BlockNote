import type { SuggestionsMenuFactory, BaseSlashMenuItem, BlockSideMenuStaticParams } from "@blocknote/core"
import { BlockNoteEditor } from "@blocknote/core"

import type { ComponentInternalInstance, Slots, VNodeProps } from 'vue'
import { reactive, ref, watch } from 'vue'

import { mount } from '../mount'

import SlashMenu from './SlashMenu.vue'
import SlashMenuItem from './SlashMenuItem.vue'

export type SlashMenuProps = {
  items: BaseSlashMenuItem[]
  keyboardHoveredItemIndex: number
  itemCallback: (item: BaseSlashMenuItem) => void
}

/**
 * This menu is drawn next to a block, when it's hovered over
 * It renders a drag handle and + button to create a new block
*/
export function slashMenuFactory(component: ComponentInternalInstance) {

  const slashMenuFactory: SuggestionsMenuFactory<BaseSlashMenuItem> = (staticParams: SlashMenuProps) => {
    // Mount component
    const reactiveParams = reactive<SlashMenuProps>(staticParams)

    const { el } = mount(SlashMenu, {
      app: component.appContext.app,
      children: component.slots, // Pass all slots or filter for slashMenu ?
      props: { reactiveParams }
    })
    el.classList.add('slash-menu')
    document.body.appendChild(el)

    return {
      element: el,
      render: (params, isActive) => {
        Object.assign(reactiveParams, params)

        if (isActive) {
          el.style.display = "block"
        }

        el.style.top = params.referenceRect.y + "px"
        el.style.left = params.referenceRect.x - el.offsetWidth + "px"
      },
      hide: () => {
        el.style.display = "none"
      },
    }
  }

  return slashMenuFactory
}
