import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import App from './App.vue'
import router from './router'
import permissionDirective from './directives/permission'

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
app.directive('permission', permissionDirective)

// 配置 NProgress - 更快速、更微妙的加载指示器
NProgress.configure({
  showSpinner: false,     // 不显示旋转图标
  trickleRate: 0.02,      
  trickleSpeed: 200,      // 加快涓流速度
  easing: 'ease',
  speed: 200,             // 加快动画速度
  minimum: 0.08           // 最小百分比
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

// 隐藏初始加载动画
const loader = document.getElementById('app-loader')
if (loader) {
  // 添加淡出效果
  loader.classList.add('fade-out')
  // 延迟移除DOM元素，确保动画完成
  setTimeout(() => {
    loader.remove()
  }, 300)
}

// 开发环境调试信息
if (import.meta.env.DEV) {
  console.log('%c图书馆管理系统', 'color: #409EFF; font-size: 16px; font-weight: bold;')
  console.log('开发环境已启动')
  console.log('API地址:', import.meta.env.VITE_API_BASE_URL)
}
