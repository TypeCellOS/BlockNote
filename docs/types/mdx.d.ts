declare module '*.mdx' {
  import type { ComponentType } from 'react'
  const component: ComponentType<any>
  export default component
}