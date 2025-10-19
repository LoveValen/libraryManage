import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import NProgress from 'nprogress'

// 路由组件
import Layout from '@/layout/index.vue'

// 静态路由（不需要权限验证）
export const constantRoutes = [
  {
    path: '/login',
    component: () => import('@/views/login/index.vue'),
    hidden: true,
    meta: {
      title: '登录',
      noAuth: true
    }
  },
  {
    path: '/redirect/:path(.*)',
    component: () => import('@/views/redirect/index.vue'),
    hidden: true,
    meta: {
      title: '重定向'
    }
  },
  {
    path: '/404',
    component: () => import('@/views/error/404.vue'),
    hidden: true,
    meta: {
      title: '页面不存在'
    }
  },
  {
    path: '/403',
    component: () => import('@/views/error/403.vue'),
    hidden: true,
    meta: {
      title: '权限不足'
    }
  }
]

// 异步路由（需要权限验证）
export const asyncRoutes = [
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: {
          title: '仪表板',
          icon: 'DataBoard',
          permission: 'dashboard.view',
          affix: true,
          transition: 'fade-slide' // 默认动画
        }
      }
    ]
  },
  {
    path: '/books',
    component: Layout,
    redirect: '/books/list',
    meta: {
      title: '图书管理',
      icon: 'Reading'
    },
    children: [
      {
        path: 'list',
        name: 'BookList',
        component: () => import('@/views/books/list.vue'),
        meta: {
          title: '图书列表',
          icon: 'List',
          permission: 'books.read'
        }
      },
      {
        path: 'create',
        name: 'BookCreate',
        component: () => import('@/views/books/form.vue'),
        meta: {
          title: '新增图书',
          icon: 'Plus',
          hidden: true
        }
      },
      {
        path: 'edit/:id',
        name: 'BookEdit',
        component: () => import('@/views/books/form.vue'),
        meta: {
          title: '编辑图书',
          icon: 'Edit',
          hidden: true
        }
      },
      {
        path: 'detail/:id',
        name: 'BookDetail',
        component: () => import('@/views/books/detail.vue'),
        meta: {
          title: '图书详情',
          icon: 'View',
          hidden: true
        }
      },
      {
        path: 'categories',
        name: 'BookCategories',
        component: () => import('@/views/books/categories.vue'),
        meta: {
          title: '图书分类',
          icon: 'Menu'
        }
      },
      {
        path: 'tags',
        name: 'BookTags',
        component: () => import('@/views/books/tags.vue'),
        meta: {
          title: '图书标签',
          icon: 'PriceTag'
        }
      },
      {
        path: 'locations',
        name: 'BookLocations',
        component: () => import('@/views/books/locations.vue'),
        meta: {
          title: '图书存放位置',
          icon: 'Location'
        }
      }
    ]
  },
  {
    path: '/borrows',
    component: Layout,
    redirect: '/borrows/list',
    meta: {
      title: '借阅管理',
      icon: 'DocumentCopy'
    },
    children: [
      {
        path: 'list',
        name: 'BorrowList',
        component: () => import('@/views/borrows/list.vue'),
        meta: {
          title: '借阅记录',
          icon: 'List'
        }
      },
      {
        path: 'create',
        name: 'BorrowCreate',
        component: () => import('@/views/borrows/form.vue'),
        meta: {
          title: '新增借阅',
          icon: 'Plus',
          hidden: true
        }
      },
      {
        path: 'detail/:id',
        name: 'BorrowDetail',
        component: () => import('@/views/borrows/detail.vue'),
        meta: {
          title: '借阅详情',
          icon: 'View',
          hidden: true
        }
      },
      {
        path: 'overdue',
        name: 'BorrowOverdue',
        component: () => import('@/views/borrows/overdue-pro.vue'),
        meta: {
          title: '逾期管理',
          icon: 'Warning'
        }
      },
      {
        path: 'statistics',
        name: 'BorrowStatistics',
        component: () => import('@/views/borrows/statistics.vue'),
        meta: {
          title: '借阅统计',
          icon: 'DataAnalysis'
        }
      }
    ]
  },
  {
    path: '/reviews',
    component: Layout,
    redirect: '/reviews/list',
    meta: {
      title: '书评管理',
      icon: 'Star'
    },
    children: [
      {
        path: 'list',
        name: 'ReviewList',
        component: () => import('@/views/reviews/list.vue'),
        meta: {
          title: '书评列表',
          icon: 'List'
        }
      },
      {
        path: 'detail/:id',
        name: 'ReviewDetail',
        component: () => import('@/views/reviews/detail.vue'),
        meta: {
          title: '书评详情',
          icon: 'View',
          hidden: true
        }
      },
      {
        path: 'moderate',
        name: 'ReviewModerate',
        component: () => import('@/views/reviews/moderate.vue'),
        meta: {
          title: '书评审核',
          icon: 'Check'
        }
      }
    ]
  },
  {
    path: '/points',
    component: Layout,
    redirect: '/points/overview',
    meta: {
      title: '积分系统',
      icon: 'TrophyBase'
    },
    children: [
      {
        path: 'overview',
        name: 'PointsOverview',
        component: () => import('@/views/points/overview.vue'),
        meta: {
          title: '积分概览',
          icon: 'DataBoard'
        }
      },
      {
        path: 'transactions',
        name: 'PointsTransactions',
        component: () => import('@/views/points/transactions.vue'),
        meta: {
          title: '积分记录',
          icon: 'List'
        }
      },
      {
        path: 'leaderboard',
        name: 'PointsLeaderboard',
        component: () => import('@/views/points/leaderboard.vue'),
        meta: {
          title: '排行榜',
          icon: 'Trophy'
        }
      },
      {
        path: 'badges',
        name: 'PointsBadges',
        component: () => import('@/views/points/badges.vue'),
        meta: {
          title: '徽章管理',
          icon: 'Medal'
        }
      },
      {
        path: 'rewards',
        name: 'PointsRewards',
        component: () => import('@/views/points/rewards.vue'),
        meta: {
          title: '奖励商城',
          icon: 'Present'
        }
      },
      {
        path: 'rules',
        name: 'PointsRules',
        component: () => import('@/views/points/rules.vue'),
        meta: {
          title: '积分规则',
          icon: 'Setting'
        }
      }
    ]
  },

  {
    path: '/system',
    component: Layout,
    redirect: '/system/settings',
    meta: {
      title: '系统管理',
      icon: 'Setting',
      roles: ['admin']
    },
    children: [
      {
        path: 'roles',
        name: 'SystemRoles',
        component: () => import('@/views/system/roles.vue'),
        meta: {
          title: '角色管理',
          icon: 'User',
          permission: 'roles.manage'
        }
      },
      {
        path: 'permissions',
        name: 'SystemPermissions',
        component: () => import('@/views/system/permissions.vue'),
        meta: {
          title: '权限管理',
          icon: 'Lock',
          permission: 'permissions.manage'
        }
      },
      {
        path: 'settings',
        name: 'SystemSettings',
        component: () => import('@/views/system/settings.vue'),
        meta: {
          title: '系统设置',
          icon: 'Tools'
        }
      },
      {
        path: 'users',
        name: 'SystemUsers',
        component: () => import('@/views/users/list.vue'),
        meta: {
          title: '用户列表',
          icon: 'UserFilled',
          roles: ['admin']
        }
      },
      {
        path: 'users/create',
        name: 'SystemUserCreate',
        component: () => import('@/views/users/form.vue'),
        meta: {
          title: '新增用户',
          icon: 'Plus',
          hidden: true,
          roles: ['admin']
        }
      },
      {
        path: 'users/edit/:id',
        name: 'SystemUserEdit',
        component: () => import('@/views/users/form.vue'),
        meta: {
          title: '编辑用户',
          icon: 'Edit',
          hidden: true,
          roles: ['admin']
        }
      },
      {
        path: 'users/detail/:id',
        name: 'SystemUserDetail',
        component: () => import('@/views/users/detail.vue'),
        meta: {
          title: '用户详情',
          icon: 'View',
          hidden: true,
          roles: ['admin']
        }
      }
    ]
  },
  // 404页面必须放在最后
  {
    path: '/:pathMatch(.*)*',
    redirect: '/404',
    hidden: true
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: constantRoutes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 配置是否启用路由进度条 (设置为 false 完全禁用进度条)
// 选项：
// - true: 显示微妙的顶部进度条
// - false: 完全禁用进度条，实现瞬间页面切换
const ENABLE_ROUTE_PROGRESS = true

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 开始进度条（可选）
  if (ENABLE_ROUTE_PROGRESS) {
    NProgress.start()
  }

  const authStore = useAuthStore()
  const appStore = useAppStore()

  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 图书馆管理系统` : '图书馆管理系统'

  // 不需要认证的页面
  if (to.meta.noAuth) {
    // 如果已登录且访问登录页，重定向到首页
    if (to.path === '/login' && authStore.isAuthenticated) {
      next({ path: '/' })
      return
    }
    next()
    return
  }

  // 检查是否已登录
  if (!authStore.isAuthenticated) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
    return
  }

  // 检查是否已获取用户信息
  if (!authStore.user) {
    try {
      await authStore.getCurrentUser()
    } catch (error) {
      console.error('获取用户信息失败:', error)
      authStore.logout()
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
      return
    }
  }

  // 检查是否已生成路由
  if (!appStore.routesGenerated) {
    try {
      // 根据权限上下文生成可访问的路由
      const accessRoutes = generateRoutes(authStore)

      // 动态添加路由
      accessRoutes.forEach(route => {
        router.addRoute(route)
      })

      appStore.setRoutesGenerated(true)
      appStore.setRoutes(accessRoutes)

      // 重新导航到当前路由
      next({ ...to, replace: true })
      return
    } catch (error) {
      console.error('生成路由失败:', error)
      next('/403')
      return
    }
  }

  // 检查路由权限
  if (to.meta.roles && !authStore.hasAnyRole(to.meta.roles)) {
    next('/403')
    return
  }

  if (to.name && !authStore.hasRouteAccess(to.name)) {
    next('/403')
    return
  }

  // 细粒度权限校验（若配置了 meta.permission）
  if (to.meta.permission) {
    if (!authStore.hasPermission(to.meta.permission)) {
      next('/403')
      return
    }
  }

  next()
})

router.afterEach(() => {
  // 结束进度条（可选）
  if (ENABLE_ROUTE_PROGRESS) {
    NProgress.done()
  }
})

// 生成可访问的路由
function generateRoutes(authStore) {
  const normalizedRoles = normalizeRoles(authStore.allRoles)
  const permissionArray = Array.isArray(authStore.permissions) ? authStore.permissions : (authStore.permissions?.value || [])
  const permissionSet = new Set(permissionArray.map(code => (typeof code === 'string' ? code.trim() : '')).filter(Boolean))
  const rawRouteNameSet = authStore.accessibleRouteNameSet && typeof authStore.accessibleRouteNameSet === 'object' && 'value' in authStore.accessibleRouteNameSet
    ? authStore.accessibleRouteNameSet.value
    : authStore.accessibleRouteNameSet
  const routeNameSet = rawRouteNameSet instanceof Set ? rawRouteNameSet : new Set()
  return filterAsyncRoutes(asyncRoutes, normalizedRoles, permissionSet, routeNameSet)
}

function filterAsyncRoutes(routes, normalizedRoles, permissionSet, routeNameSet) {
  const res = []

  routes.forEach(route => {
    const tmp = { ...route }

    if (tmp.children) {
      tmp.children = filterAsyncRoutes(tmp.children, normalizedRoles, permissionSet, routeNameSet)
    }

    if (matchesRouteAccess(tmp, normalizedRoles, permissionSet, routeNameSet)) {
      if (!tmp.children || tmp.children.length > 0) {
        res.push(tmp)
      }
    }
  })

  return res
}

function matchesRouteAccess(route, normalizedRoles, permissionSet, routeNameSet) {
  if (!matchesRouteRole(route, normalizedRoles)) {
    return false
  }

  const requiredPermission = route.meta?.permission
  if (requiredPermission && !(permissionSet.has('*') || permissionSet.has(requiredPermission))) {
    return false
  }

  if (route.name) {
    const name = String(route.name).trim()
    if (name && routeNameSet instanceof Set && routeNameSet.size > 0 && !route.meta?.ignoreResourceCheck) {
      if (!routeNameSet.has(name)) {
        return false
      }
    }
  }

  return true
}

function matchesRouteRole(route, normalizedRoles) {
  if (route.meta && route.meta.roles) {
    const requiredRoles = normalizeRoles(route.meta.roles)
    if (requiredRoles.size === 0) {
      return true
    }
    for (const role of requiredRoles) {
      if (normalizedRoles.has(role)) {
        return true
      }
    }
    return false
  }
  return true
}

function normalizeRoles(roles) {
  const source = roles && typeof roles === 'object' && 'value' in roles ? roles.value : roles
  const list = Array.isArray(source) ? source : [source]
  const set = new Set()
  list.forEach(role => {
    if (typeof role === 'string') {
      const code = role.trim().toLowerCase()
      if (code) {
        set.add(code)
      }
    }
  })
  return set
}

export default router
