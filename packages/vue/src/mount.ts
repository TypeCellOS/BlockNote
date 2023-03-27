import type { Component, App, VNode } from 'vue'
import { cloneVNode, createVNode, render } from 'vue' // hydrate

/**
 * Inspiration from https://github.com/pearofducks/mount-vue-component/blob/master/index.js
 * And official `mount` Vue3 https://github.com/vuejs/core/blob/650f5c26f464505d9e865bdb0eafb24350859528/packages/runtime-core/src/apiCreateApp.ts#L294 
 */


interface Mount {
  props: any
  children?: unknown
  element?: HTMLElement
  app: App
}

const __DEV__ = process.env.NODE_ENV === 'development'

export function mount(component: Component, { props, children, element, app }: Mount): {
  vnode: VNode, destroy: () => void, el: HTMLElement
} {
  let el = element || document.createElement('div')

  let vnode: VNode | null = createVNode(component, props, children)
  if (app && app._context) vnode.appContext = app._context

  // HMR root reload
  if (__DEV__) {
    // @ts-ignore
    app._context.reload = () => {
      render(cloneVNode(vnode!), el) // , isSVG)
    }
  }

  if (el) render(vnode, el)
  else if (typeof document !== 'undefined') render(vnode, el)

  // if (isHydrate && hydrate) {
  //   hydrate(vnode as VNode<Node, Element>, el as any)
  // } else {
  //   render(vnode, el, isSVG)
  // }

  const destroy = () => {
    if (el) render(null, el)
    vnode = null
  }

  return { vnode, destroy, el: el as HTMLElement }
}