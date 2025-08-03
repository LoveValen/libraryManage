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
          affix: true
        }
      }
    ]
  },
  {
    path: '/users',
    component: Layout,
    redirect: '/users/list',
    meta: {
      title: '用户管理',
      icon: 'User',
      roles: ['admin']
    },
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: () => import('@/views/users/list.vue'),
        meta: {
          title: '用户列表',
          icon: 'UserFilled'
        }
      },
      {
        path: 'create',
        name: 'UserCreate',
        component: () => import('@/views/users/form.vue'),
        meta: {
          title: '新增用户',
          icon: 'Plus',
          hidden: true
        }
      },
      {
        path: 'edit/:id',
        name: 'UserEdit',
        component: () => import('@/views/users/form.vue'),
        meta: {
          title: '编辑用户',
          icon: 'Edit',
          hidden: true
        }
      },
      {
        path: 'detail/:id',
        name: 'UserDetail',
        component: () => import('@/views/users/detail.vue'),
        meta: {
          title: '用户详情',
          icon: 'View',
          hidden: true
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
          icon: 'List'
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
        path: 'import',
        name: 'BookImport',
        component: () => import('@/views/books/import.vue'),
        meta: {
          title: '批量导入',
          icon: 'Upload'
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
        component: () => import('@/views/borrows/overdue.vue'),
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
        path: 'settings',
        name: 'SystemSettings',
        component: () => import('@/views/system/settings.vue'),
        meta: {
          title: '系统设置',
          icon: 'Tools'
        }
      },
      {
        path: 'logs',
        name: 'SystemLogs',
        component: () => import('@/views/system/logs.vue'),
        meta: {
          title: '系统日志',
          icon: 'Document'
        }
      },
      {
        path: 'backup',
        name: 'SystemBackup',
        component: () => import('@/views/system/backup.vue'),
        meta: {
          title: '数据备份',
          icon: 'FolderOpened'
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

// 路由守卫
router.beforeEach(async (to, from, next) => {
  // 开始进度条
  NProgress.start()

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
      // 根据用户角色生成可访问的路由
      const accessRoutes = generateRoutes(authStore.user.role)

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
  if (to.meta.roles && !to.meta.roles.includes(authStore.user.role)) {
    next('/403')
    return
  }

  next()
})

router.afterEach(() => {
  // 结束进度条
  NProgress.done()
})

// 生成可访问的路由
function generateRoutes(userRole) {
  const accessedRoutes = filterAsyncRoutes(asyncRoutes, userRole)
  return accessedRoutes
}

// 过滤异步路由
function filterAsyncRoutes(routes, role) {
  const res = []

  routes.forEach(route => {
    const tmp = { ...route }

    if (hasPermission(role, tmp)) {
      if (tmp.children) {
        tmp.children = filterAsyncRoutes(tmp.children, role)
      }
      res.push(tmp)
    }
  })

  return res
}

// 检查权限
function hasPermission(role, route) {
  if (route.meta && route.meta.roles) {
    return route.meta.roles.includes(role)
  } else {
    return true
  }
}

export default router
