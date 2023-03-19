import type { SuggestionsMenuFactory, BaseSlashMenuItem, BlockSideMenuStaticParams } from "@blocknote/core"
import { BlockNoteEditor } from "@blocknote/core"

import type { ComponentInternalInstance, Slots, VNodeProps } from 'vue'
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

  function createMenu(menu: BaseSlashMenuItem, selected: boolean, onClick: () => void) {
    const { el } = mount(SlashMenuItem, {
      app: component.appContext.app,
      children: component.slots,
      props: { menu, selected, onClick }
    })

    return el
  }

  const slashMenuFactory: SuggestionsMenuFactory<BaseSlashMenuItem> = (staticParams: SlashMenuProps) => {
    // Mount component
    // https://github.com/pearofducks/mount-vue-component/blob/master/index.js

    const { el } = mount(SlashMenu, {
      app: component.appContext.app,
      children: component.slots, // Pass all slots or filter for slashMenu ?
      props: { staticParams }
    })
    el.classList.add('slash-menu')
    document.body.appendChild(el)

    function updateItems(
      items: BaseSlashMenuItem[],
      onClick: (item: BaseSlashMenuItem) => void,
      selected: number
    ) {
      el.innerHTML = ""
      const domItems = items.map((val, i) => createMenu(val, selected === i, () => onClick(val)))
      el.append(...domItems)
      return domItems
    }

    // Mount component as a new instance
    // const container = document.createElement("div")
    // const instance = createApp(BlockSideMenu, {
    //   staticParams
    // }).mount(container)
    // document.body.appendChild(el)

    return {
      element: el,
      render: (params, isHidden) => {
        updateItems(
          params.items,
          staticParams.itemCallback,
          params.keyboardHoveredItemIndex
        )

        if (isHidden) {
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
