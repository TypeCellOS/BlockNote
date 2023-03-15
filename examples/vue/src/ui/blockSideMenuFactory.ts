import type { BlockSideMenuFactory } from "@blocknote/core";
import { createApp } from 'vue';

import BlockSideMenu from '@/components/BlockSideMenu.vue'

/**
 * This menu is drawn next to a block, when it's hovered over
 * It renders a drag handle and + button to create a new block
 */
export const blockSideMenuFactory: BlockSideMenuFactory = (staticParams) => {
  
    const container = document.createElement("div");
    const instance = createApp(BlockSideMenu, {
      staticParams
    }).mount(container);
    document.body.appendChild(instance.$el);

    return {
      element: instance.$el,
      render: (params, isHidden) => {
        if (isHidden) {
          instance.$el.style.display = "block";
        }

        instance.$el.style.top = params.referenceRect.y + "px";
        instance.$el.style.left = params.referenceRect.x - instance.$el.offsetWidth + "px";
      },
      hide: () => {
        instance.$el.style.display = "none";
      },
    };
  }
