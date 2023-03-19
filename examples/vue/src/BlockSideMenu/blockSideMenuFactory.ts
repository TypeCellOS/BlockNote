import type { BlockSideMenuFactory, BlockSideMenuStaticParams } from "@blocknote/core"
import type { ComponentInternalInstance, Slots, VNodeProps } from 'vue'
import { mount } from '../mount'

import BlockSideMenu from './BlockSideMenu.vue'

/**
 * This menu is drawn next to a block, when it's hovered over
 * It renders a drag handle and + button to create a new block
 */
export function blockSideMenuFactory(component: ComponentInternalInstance) {

  const blockSideMenuFactory: BlockSideMenuFactory = (staticParams: BlockSideMenuStaticParams) => {

    // Mount component
    // https://github.com/pearofducks/mount-vue-component/blob/master/index.js
    const { el } = mount(BlockSideMenu, {
      app: component.appContext.app,
      children: component.slots,
      props: {
        staticParams
      }
    })
    el.classList.add('block-side-menu')
    document.body.appendChild(el)

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
