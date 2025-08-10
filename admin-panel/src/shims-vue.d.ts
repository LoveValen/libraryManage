declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.tsx' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string }
  export default classes
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

// Element Plus auto-import
declare module '@element-plus/icons-vue'

// Vue JSX/TSX support
declare namespace JSX {
  interface Element extends VNode {}
  interface ElementClass extends ComponentRenderProxy {}
  interface ElementAttributesProperty {
    $props: any
  }
  interface IntrinsicElements {
    [elem: string]: any
  }
  interface IntrinsicAttributes {
    key?: string | number
  }
}