import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'

// 样式文件
import 'element-plus/dist/index.css'
import './styles/index.scss'

// NProgress 进度条
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

// 全局配置
import { setupGlobalProperties } from './utils/global'

// 主题系统
import { useTheme } from './composables/useTheme'

// 全局组件
import SvgIcon from './components/common/SvgIcon.vue'

// 创建应用实例
const app = createApp(App)

// 创建 Pinia 实例
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 注册全局组件
app.component('svg-icon', SvgIcon)

// 配置 NProgress
NProgress.configure({
  showSpinner: false,
  trickleRate: 0.02,
  trickleSpeed: 800,
  easing: 'ease',
  speed: 500
})

// 注册插件
app.use(pinia)
app.use(router)
app.use(ElementPlus, {
  size: 'default',
  zIndex: 3000,
  locale: zhCn
})

// 设置全局属性
setupGlobalProperties(app)

// 初始化主题系统
const { currentTheme } = useTheme()
console.log('当前主题:', currentTheme.value)

// 挂载应用
app.mount('#app')

// 开发环境调试信息
if (import.meta.env.DEV) {
  console.log('%c图书馆管理系统', 'color: #409EFF; font-size: 16px; font-weight: bold;')
  console.log('开发环境已启动')
  console.log('API地址:', import.meta.env.VITE_API_BASE_URL)
}
