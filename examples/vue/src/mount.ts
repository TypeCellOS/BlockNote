import type { Component, App, VNode } from 'vue'
import { createVNode, render } from 'vue'

interface Mount {
  props: any
  children: unknown
  element?: HTMLElement
  app: App
}

export function mount(component: Component, { props, children, element, app }: Mount): {
  vNode: VNode, destroy: () => void, el: HTMLElement
} {
  let el = element

  let vNode: VNode | null = createVNode(component, props, children)
  if (app && app._context) vNode.appContext = app._context
  if (el) render(vNode, el)
  else if (typeof document !== 'undefined') render(vNode, el = document.createElement('div'))

  const destroy = () => {
    if (el) render(null, el)
    vNode = null
  }

  return { vNode, destroy, el: el as HTMLElement }
}