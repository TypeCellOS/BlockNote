import type { SuggestionsMenu, SuggestionsMenuFactory, BaseSlashMenuItem } from "@blocknote/core" // BlockSideMenuStaticParams

import type { ComponentInternalInstance } from 'vue'
import { reactive } from 'vue'

import { mount } from '../mount'

import SlashMenu from './SlashMenu.vue'
// import type { ReactSlashMenuItem } from "./ReactSlashMenuItem"

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

  const slashMenuFactory = (staticParams: any) => {
    // const slashMenuFactory: SuggestionsMenuFactory<ReactSlashMenuItem> = (staticParams): SuggestionsMenu<ReactSlashMenuItem> => {
    // Mount component
    const reactiveParams = reactive(staticParams)

    const { el } = mount(SlashMenu, {
      app: component.appContext.app,
      children: component.slots, // Pass all slots or filter for slashMenu ?
      props: { reactiveParams }
    })
    el.classList.add('slash-menu')
    document.body.appendChild(el)

    return {
      element: el,
      render: (params: any, isActive: boolean) => {
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
