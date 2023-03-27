import type { BlockSideMenuFactory, BlockSideMenuStaticParams } from "@blocknote/core"
import type { ComponentInternalInstance } from 'vue'
import { mount } from '../mount'

import BlockSideMenu from './BlockSideMenu.vue'

/**
 * This menu is drawn next to a block, when it's hovered over
 * It renders a drag handle and + button to create a new block
 */
export function blockSideMenuFactory(component: ComponentInternalInstance) {

  let isMounted = false

  const blockSideMenuFactory: BlockSideMenuFactory = (staticParams: BlockSideMenuStaticParams) => {

    // Mount component
    const { el } = mount(BlockSideMenu, {
      app: component.appContext.app,
      children: component.slots, // Pass all slots or filter for SideMenu ?
      props: {
        staticParams
      }
    })

    if (!isMounted) {
      el.classList.add('block-side-menu')
      document.body.appendChild(el)
      isMounted = true
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

  return blockSideMenuFactory
}
