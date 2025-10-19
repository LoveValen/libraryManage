/**
 * 路由过渡动画配置
 * 为所有路由添加默认的过渡动画
 */

// 默认过渡动画名称
export const DEFAULT_TRANSITION = 'fade-slide'

// 特殊路由的动画配置
export const transitionConfig = {
  // 登录页使用淡入淡出
  '/login': 'fade',
  // 错误页面使用缩放动画
  '/404': 'zoom',
  '/403': 'zoom',
  // 表单页面使用向上滑动
  '/users/create': 'slide-up',
  '/users/edit': 'slide-up',
  '/books/create': 'slide-up',
  '/books/edit': 'slide-up',
  '/borrows/create': 'slide-up',
}

/**
 * 为路由添加过渡动画配置
 * @param {Array} routes - 路由配置数组
 * @returns {Array} - 添加了过渡动画的路由配置
 */
export function addTransitionToRoutes(routes) {
  return routes.map(route => {
    // 如果路由已经有过渡配置，保留它
    if (route.meta?.transition) {
      return route
    }
    
    // 检查是否有特殊配置
    const specialTransition = transitionConfig[route.path]
    
    // 添加过渡动画到 meta
    if (!route.meta) {
      route.meta = {}
    }
    
    route.meta.transition = specialTransition || DEFAULT_TRANSITION
    
    // 递归处理子路由
    if (route.children && route.children.length > 0) {
      route.children = addTransitionToRoutes(route.children)
    }
    
    return route
  })
}

/**
 * 根据路由方向决定动画类型
 * @param {String} to - 目标路由
 * @param {String} from - 来源路由
 * @returns {String} - 动画名称
 */
export function getTransitionName(to, from) {
  // 如果是从详情页返回列表页，使用反向动画
  if (from?.includes('/detail') && to?.includes('/list')) {
    return 'fade-slide-reverse'
  }
  
  // 如果是从编辑页返回列表页
  if ((from?.includes('/edit') || from?.includes('/create')) && to?.includes('/list')) {
    return 'slide-down'
  }
  
  // 使用路由配置的动画
  return DEFAULT_TRANSITION
}