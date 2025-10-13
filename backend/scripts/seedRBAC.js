#!/usr/bin/env node
/**
 * RBAC 初始化脚本
 * 负责补充权限、角色、权限资源（路由/按钮）等基础数据
 * - 幂等执行，多次运行不会重复插入
 * - 自动为管理员账号绑定 Admin 角色
 */

const prisma = require('../src/utils/prisma');

const PERMISSIONS = [
  // 系统与导航
  { code: 'dashboard.view', name: '查看仪表盘', group_name: 'system', description: '访问仪表盘总览' },
  { code: 'ui.manage', name: '界面资源管理', group_name: 'system', description: '维护前端路由、菜单与按钮绑定' },
  { code: 'system.settings', name: '系统设置', group_name: 'system', description: '调整系统参数与配置' },

  // 图书
  { code: 'books.read', name: '查看图书', group_name: 'books', description: '查看图书列表与详情' },
  { code: 'books.create', name: '创建图书', group_name: 'books', description: '新增图书' },
  { code: 'books.update', name: '更新图书', group_name: 'books', description: '编辑图书信息' },
  { code: 'books.delete', name: '删除图书', group_name: 'books', description: '删除或下架图书' },

  // 图书分类
  { code: 'bookCategories.read', name: '查看分类', group_name: 'bookCategories', description: '查看分类树及基础信息' },
  { code: 'bookCategories.create', name: '创建分类', group_name: 'bookCategories', description: '新增图书分类' },
  { code: 'bookCategories.update', name: '更新分类', group_name: 'bookCategories', description: '编辑分类信息' },
  { code: 'bookCategories.delete', name: '删除分类', group_name: 'bookCategories', description: '删除图书分类' },

  // 图书标签
  { code: 'bookTags.read', name: '查看标签', group_name: 'bookTags', description: '查看标签列表' },
  { code: 'bookTags.create', name: '创建标签', group_name: 'bookTags', description: '新增图书标签' },
  { code: 'bookTags.update', name: '更新标签', group_name: 'bookTags', description: '编辑图书标签' },
  { code: 'bookTags.delete', name: '删除标签', group_name: 'bookTags', description: '删除图书标签' },

  // 馆藏位置
  { code: 'bookLocations.read', name: '查看馆藏位置', group_name: 'bookLocations', description: '查看书架与馆藏区域' },
  { code: 'bookLocations.create', name: '创建馆藏位置', group_name: 'bookLocations', description: '新增馆藏位置' },
  { code: 'bookLocations.update', name: '更新馆藏位置', group_name: 'bookLocations', description: '编辑馆藏位置信息' },
  { code: 'bookLocations.delete', name: '删除馆藏位置', group_name: 'bookLocations', description: '删除馆藏位置' },

  // 借阅
  { code: 'borrows.read', name: '查看借阅', group_name: 'borrows', description: '查看借阅记录与统计' },
  { code: 'borrows.create', name: '创建借阅', group_name: 'borrows', description: '办理借阅及登记' },
  { code: 'borrows.update', name: '更新借阅', group_name: 'borrows', description: '续借、归还、处理逾期' },

  // 书评
  { code: 'reviews.read', name: '查看书评', group_name: 'reviews', description: '查看书评与详情' },
  { code: 'reviews.moderate', name: '审核书评', group_name: 'reviews', description: '审核与管理书评内容' },

  // 用户
  { code: 'users.read', name: '查看用户', group_name: 'users', description: '查看用户列表与详情' },
  { code: 'users.create', name: '创建用户', group_name: 'users', description: '新增后台用户' },
  { code: 'users.update', name: '更新用户', group_name: 'users', description: '编辑用户资料与状态' },
  { code: 'users.delete', name: '删除用户', group_name: 'users', description: '删除或停用用户' },

  // 角色与权限
  { code: 'roles.manage', name: '角色管理', group_name: 'rbac', description: '创建、编辑、删除角色并分配权限' },
  { code: 'permissions.manage', name: '权限管理', group_name: 'rbac', description: '维护权限列表' },

  // 积分与通知
  { code: 'points.read', name: '查看积分', group_name: 'points', description: '查看积分看板与明细' },
  { code: 'notifications.read', name: '查看通知', group_name: 'notifications', description: '查看与管理系统通知' },
];

const ROLES = [
  {
    code: 'Admin',
    name: '管理员',
    description: '系统管理员，拥有全部权限',
    is_system: true,
    permissions: '*',
  },
  {
    code: 'Librarian',
    name: '图书管理员',
    description: '负责日常图书与借阅业务管理',
    is_system: true,
    permissions: [
      'dashboard.view',
      'books.read', 'books.create', 'books.update', 'books.delete',
      'bookCategories.read', 'bookCategories.create', 'bookCategories.update', 'bookCategories.delete',
      'bookTags.read', 'bookTags.create', 'bookTags.update', 'bookTags.delete',
      'bookLocations.read', 'bookLocations.create', 'bookLocations.update', 'bookLocations.delete',
      'borrows.read', 'borrows.create', 'borrows.update',
      'reviews.read', 'reviews.moderate',
      'users.read', 'users.update',
      'points.read',
      'notifications.read'
    ],
  },
  {
    code: 'Patron',
    name: '普通读者',
    description: '读者可访问公共内容与个人数据',
    is_system: true,
    permissions: [
      'dashboard.view',
      'books.read',
      'borrows.read',
      'reviews.read',
      'points.read',
      'notifications.read'
    ],
  },
];

const PERMISSION_RESOURCES = [
  // 仪表盘
  {
    type: 'ROUTE',
    resource_key: 'menu.dashboard',
    resource_name: '仪表盘',
    permission_code: 'dashboard.view',
    route_path: '/dashboard',
    route_name: 'Dashboard',
    component: 'views/dashboard/index.vue',
    parent_key: null,
    sort_order: 10,
    meta: { icon: 'DataBoard', affix: true },
  },

  // 图书模块
  {
    type: 'ROUTE',
    resource_key: 'menu.books',
    resource_name: '图书管理',
    permission_code: 'books.read',
    route_path: '/books',
    route_name: null,
    component: 'layout/index.vue',
    parent_key: null,
    sort_order: 20,
    meta: { icon: 'Reading' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.books.list',
    resource_name: '图书列表',
    permission_code: 'books.read',
    route_path: '/books/list',
    route_name: 'BookList',
    component: 'views/books/list.vue',
    parent_key: 'menu.books',
    sort_order: 21,
    meta: { icon: 'List' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.books.create',
    resource_name: '新增图书',
    permission_code: 'books.create',
    route_path: '/books/create',
    route_name: 'BookCreate',
    component: 'views/books/form.vue',
    parent_key: 'menu.books',
    sort_order: 22,
    meta: { icon: 'Plus', hidden: true },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.books.edit',
    resource_name: '编辑图书',
    permission_code: 'books.update',
    route_path: '/books/edit/:id',
    route_name: 'BookEdit',
    component: 'views/books/form.vue',
    parent_key: 'menu.books',
    sort_order: 23,
    meta: { icon: 'Edit', hidden: true },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.books.detail',
    resource_name: '图书详情',
    permission_code: 'books.read',
    route_path: '/books/detail/:id',
    route_name: 'BookDetail',
    component: 'views/books/detail.vue',
    parent_key: 'menu.books',
    sort_order: 24,
    meta: { icon: 'View', hidden: true },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.books.categories',
    resource_name: '图书分类',
    permission_code: 'bookCategories.read',
    route_path: '/books/categories',
    route_name: 'BookCategories',
    component: 'views/books/categories.vue',
    parent_key: 'menu.books',
    sort_order: 25,
    meta: { icon: 'Menu' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.books.tags',
    resource_name: '图书标签',
    permission_code: 'bookTags.read',
    route_path: '/books/tags',
    route_name: 'BookTags',
    component: 'views/books/tags.vue',
    parent_key: 'menu.books',
    sort_order: 26,
    meta: { icon: 'PriceTag' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.books.locations',
    resource_name: '馆藏位置',
    permission_code: 'bookLocations.read',
    route_path: '/books/locations',
    route_name: 'BookLocations',
    component: 'views/books/locations.vue',
    parent_key: 'menu.books',
    sort_order: 27,
    meta: { icon: 'Location' },
  },

  // 借阅模块
  {
    type: 'ROUTE',
    resource_key: 'menu.borrows',
    resource_name: '借阅管理',
    permission_code: 'borrows.read',
    route_path: '/borrows',
    route_name: null,
    component: 'layout/index.vue',
    parent_key: null,
    sort_order: 30,
    meta: { icon: 'Document' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.borrows.list',
    resource_name: '借阅列表',
    permission_code: 'borrows.read',
    route_path: '/borrows/list',
    route_name: 'BorrowList',
    component: 'views/borrows/list.vue',
    parent_key: 'menu.borrows',
    sort_order: 31,
    meta: { icon: 'List' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.borrows.create',
    resource_name: '发起借阅',
    permission_code: 'borrows.create',
    route_path: '/borrows/create',
    route_name: 'BorrowCreate',
    component: 'views/borrows/create.vue',
    parent_key: 'menu.borrows',
    sort_order: 32,
    meta: { icon: 'Plus' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.borrows.detail',
    resource_name: '借阅详情',
    permission_code: 'borrows.read',
    route_path: '/borrows/detail/:id',
    route_name: 'BorrowDetail',
    component: 'views/borrows/detail.vue',
    parent_key: 'menu.borrows',
    sort_order: 33,
    meta: { icon: 'View', hidden: true },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.borrows.overdue',
    resource_name: '逾期管理',
    permission_code: 'borrows.update',
    route_path: '/borrows/overdue',
    route_name: 'BorrowOverdue',
    component: 'views/borrows/overdue.vue',
    parent_key: 'menu.borrows',
    sort_order: 34,
    meta: { icon: 'Warning' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.borrows.statistics',
    resource_name: '借阅统计',
    permission_code: 'borrows.read',
    route_path: '/borrows/statistics',
    route_name: 'BorrowStatistics',
    component: 'views/borrows/statistics.vue',
    parent_key: 'menu.borrows',
    sort_order: 35,
    meta: { icon: 'DataLine' },
  },

  // 书评模块
  {
    type: 'ROUTE',
    resource_key: 'menu.reviews',
    resource_name: '书评管理',
    permission_code: 'reviews.read',
    route_path: '/reviews',
    route_name: null,
    component: 'layout/index.vue',
    parent_key: null,
    sort_order: 40,
    meta: { icon: 'Star' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.reviews.list',
    resource_name: '书评列表',
    permission_code: 'reviews.read',
    route_path: '/reviews/list',
    route_name: 'ReviewList',
    component: 'views/reviews/list.vue',
    parent_key: 'menu.reviews',
    sort_order: 41,
    meta: { icon: 'List' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.reviews.detail',
    resource_name: '书评详情',
    permission_code: 'reviews.read',
    route_path: '/reviews/detail/:id',
    route_name: 'ReviewDetail',
    component: 'views/reviews/detail.vue',
    parent_key: 'menu.reviews',
    sort_order: 42,
    meta: { icon: 'View', hidden: true },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.reviews.moderate',
    resource_name: '书评审核',
    permission_code: 'reviews.moderate',
    route_path: '/reviews/moderate',
    route_name: 'ReviewModerate',
    component: 'views/reviews/moderate.vue',
    parent_key: 'menu.reviews',
    sort_order: 43,
    meta: { icon: 'Check' },
  },

  // 积分模块
  {
    type: 'ROUTE',
    resource_key: 'menu.points',
    resource_name: '积分系统',
    permission_code: 'points.read',
    route_path: '/points',
    route_name: null,
    component: 'layout/index.vue',
    parent_key: null,
    sort_order: 50,
    meta: { icon: 'TrophyBase' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.points.overview',
    resource_name: '积分概览',
    permission_code: 'points.read',
    route_path: '/points/overview',
    route_name: 'PointsOverview',
    component: 'views/points/overview.vue',
    parent_key: 'menu.points',
    sort_order: 51,
    meta: { icon: 'DataBoard' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.points.transactions',
    resource_name: '积分记录',
    permission_code: 'points.read',
    route_path: '/points/transactions',
    route_name: 'PointsTransactions',
    component: 'views/points/transactions.vue',
    parent_key: 'menu.points',
    sort_order: 52,
    meta: { icon: 'List' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.points.leaderboard',
    resource_name: '积分排行',
    permission_code: 'points.read',
    route_path: '/points/leaderboard',
    route_name: 'PointsLeaderboard',
    component: 'views/points/leaderboard.vue',
    parent_key: 'menu.points',
    sort_order: 53,
    meta: { icon: 'Trophy' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.points.badges',
    resource_name: '徽章管理',
    permission_code: 'points.read',
    route_path: '/points/badges',
    route_name: 'PointsBadges',
    component: 'views/points/badges.vue',
    parent_key: 'menu.points',
    sort_order: 54,
    meta: { icon: 'Medal' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.points.rewards',
    resource_name: '奖励配置',
    permission_code: 'points.read',
    route_path: '/points/rewards',
    route_name: 'PointsRewards',
    component: 'views/points/rewards.vue',
    parent_key: 'menu.points',
    sort_order: 55,
    meta: { icon: 'Gift' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.points.rules',
    resource_name: '积分规则',
    permission_code: 'points.read',
    route_path: '/points/rules',
    route_name: 'PointsRules',
    component: 'views/points/rules.vue',
    parent_key: 'menu.points',
    sort_order: 56,
    meta: { icon: 'Collection' },
  },

  // 系统管理
  {
    type: 'ROUTE',
    resource_key: 'menu.system',
    resource_name: '系统管理',
    permission_code: null,
    route_path: '/system',
    route_name: null,
    component: 'layout/index.vue',
    parent_key: null,
    sort_order: 60,
    meta: { icon: 'Setting' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.system.roles',
    resource_name: '角色管理',
    permission_code: 'roles.manage',
    route_path: '/system/roles',
    route_name: 'SystemRoles',
    component: 'views/system/roles.vue',
    parent_key: 'menu.system',
    sort_order: 61,
    meta: { icon: 'User' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.system.permissions',
    resource_name: '权限管理',
    permission_code: 'permissions.manage',
    route_path: '/system/permissions',
    route_name: 'SystemPermissions',
    component: 'views/system/permissions.vue',
    parent_key: 'menu.system',
    sort_order: 62,
    meta: { icon: 'Lock' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.system.settings',
    resource_name: '系统设置',
    permission_code: 'system.settings',
    route_path: '/system/settings',
    route_name: 'SystemSettings',
    component: 'views/system/settings.vue',
    parent_key: 'menu.system',
    sort_order: 63,
    meta: { icon: 'Tools' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.system.users',
    resource_name: '用户列表',
    permission_code: 'users.read',
    route_path: '/system/users',
    route_name: 'SystemUsers',
    component: 'views/users/list.vue',
    parent_key: 'menu.system',
    sort_order: 64,
    meta: { icon: 'UserFilled' },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.system.user.create',
    resource_name: '新增用户',
    permission_code: 'users.create',
    route_path: '/system/users/create',
    route_name: 'SystemUserCreate',
    component: 'views/users/form.vue',
    parent_key: 'menu.system',
    sort_order: 65,
    meta: { icon: 'Plus', hidden: true },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.system.user.edit',
    resource_name: '编辑用户',
    permission_code: 'users.update',
    route_path: '/system/users/edit/:id',
    route_name: 'SystemUserEdit',
    component: 'views/users/form.vue',
    parent_key: 'menu.system',
    sort_order: 66,
    meta: { icon: 'Edit', hidden: true },
  },
  {
    type: 'ROUTE',
    resource_key: 'route.system.user.detail',
    resource_name: '用户详情',
    permission_code: 'users.read',
    route_path: '/system/users/detail/:id',
    route_name: 'SystemUserDetail',
    component: 'views/users/detail.vue',
    parent_key: 'menu.system',
    sort_order: 67,
    meta: { icon: 'View', hidden: true },
  },

  // 按钮资源示例
  { type: 'BUTTON', resource_key: 'button.books.create', resource_name: '图书-新增', permission_code: 'books.create', parent_key: 'route.books.list', sort_order: 10, meta: { action: 'create', text: '新增图书' } },
  { type: 'BUTTON', resource_key: 'button.books.edit', resource_name: '图书-编辑', permission_code: 'books.update', parent_key: 'route.books.list', sort_order: 20, meta: { action: 'edit' } },
  { type: 'BUTTON', resource_key: 'button.books.delete', resource_name: '图书-删除', permission_code: 'books.delete', parent_key: 'route.books.list', sort_order: 30, meta: { action: 'delete' } },
  { type: 'BUTTON', resource_key: 'button.bookCategories.create', resource_name: '分类-新增', permission_code: 'bookCategories.create', parent_key: 'route.books.categories', sort_order: 10, meta: { action: 'create' } },
  { type: 'BUTTON', resource_key: 'button.bookCategories.update', resource_name: '分类-编辑', permission_code: 'bookCategories.update', parent_key: 'route.books.categories', sort_order: 20, meta: { action: 'edit' } },
  { type: 'BUTTON', resource_key: 'button.bookCategories.delete', resource_name: '分类-删除', permission_code: 'bookCategories.delete', parent_key: 'route.books.categories', sort_order: 30, meta: { action: 'delete' } },
  { type: 'BUTTON', resource_key: 'button.bookLocations.create', resource_name: '馆藏-新增', permission_code: 'bookLocations.create', parent_key: 'route.books.locations', sort_order: 10, meta: { action: 'create' } },
  { type: 'BUTTON', resource_key: 'button.bookLocations.update', resource_name: '馆藏-编辑', permission_code: 'bookLocations.update', parent_key: 'route.books.locations', sort_order: 20, meta: { action: 'edit' } },
  { type: 'BUTTON', resource_key: 'button.bookLocations.delete', resource_name: '馆藏-删除', permission_code: 'bookLocations.delete', parent_key: 'route.books.locations', sort_order: 30, meta: { action: 'delete' } },
  { type: 'BUTTON', resource_key: 'button.borrows.create', resource_name: '借阅-发起', permission_code: 'borrows.create', parent_key: 'route.borrows.list', sort_order: 10, meta: { action: 'create' } },
  { type: 'BUTTON', resource_key: 'button.borrows.update', resource_name: '借阅-更新', permission_code: 'borrows.update', parent_key: 'route.borrows.list', sort_order: 20, meta: { action: 'update' } },
  { type: 'BUTTON', resource_key: 'button.reviews.approve', resource_name: '书评-审核通过', permission_code: 'reviews.moderate', parent_key: 'route.reviews.moderate', sort_order: 10, meta: { action: 'approve' } },
  { type: 'BUTTON', resource_key: 'button.reviews.reject', resource_name: '书评-驳回', permission_code: 'reviews.moderate', parent_key: 'route.reviews.moderate', sort_order: 20, meta: { action: 'reject' } },
  { type: 'BUTTON', resource_key: 'button.roles.create', resource_name: '角色-新增', permission_code: 'roles.manage', parent_key: 'route.system.roles', sort_order: 10, meta: { action: 'create' } },
  { type: 'BUTTON', resource_key: 'button.roles.update', resource_name: '角色-编辑', permission_code: 'roles.manage', parent_key: 'route.system.roles', sort_order: 20, meta: { action: 'edit' } },
  { type: 'BUTTON', resource_key: 'button.roles.delete', resource_name: '角色-删除', permission_code: 'roles.manage', parent_key: 'route.system.roles', sort_order: 30, meta: { action: 'delete' } },
  { type: 'BUTTON', resource_key: 'button.permissions.create', resource_name: '权限-新增', permission_code: 'permissions.manage', parent_key: 'route.system.permissions', sort_order: 10, meta: { action: 'create' } },
  { type: 'BUTTON', resource_key: 'button.permissions.delete', resource_name: '权限-删除', permission_code: 'permissions.manage', parent_key: 'route.system.permissions', sort_order: 20, meta: { action: 'delete' } },
  { type: 'BUTTON', resource_key: 'button.users.create', resource_name: '用户-新增', permission_code: 'users.create', parent_key: 'route.system.users', sort_order: 10, meta: { action: 'create' } },
  { type: 'BUTTON', resource_key: 'button.users.update', resource_name: '用户-编辑', permission_code: 'users.update', parent_key: 'route.system.users', sort_order: 20, meta: { action: 'edit' } },
  { type: 'BUTTON', resource_key: 'button.users.delete', resource_name: '用户-删除', permission_code: 'users.delete', parent_key: 'route.system.users', sort_order: 30, meta: { action: 'delete' } },
];

async function upsertPermissions() {
  console.log('🌱 Seeding permissions...');
  const map = new Map();
  for (const p of PERMISSIONS) {
    const perm = await prisma.permissions.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        group_name: p.group_name,
        description: p.description,
        updated_at: new Date(),
      },
      create: {
        code: p.code,
        name: p.name,
        group_name: p.group_name,
        description: p.description,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    map.set(p.code, perm);
  }
  return map;
}

async function upsertRoles(permissionMap) {
  console.log('🌱 Seeding roles...');
  const roleMap = new Map();
  for (const r of ROLES) {
    const role = await prisma.roles.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        description: r.description,
        is_system: r.is_system,
        updated_at: new Date(),
      },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        is_system: r.is_system,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    roleMap.set(r.code, role);

    const permissionCodes = r.permissions === '*'
      ? Array.from(permissionMap.keys())
      : r.permissions;

    await prisma.role_permissions.deleteMany({ where: { role_id: role.id } });

    for (const code of permissionCodes) {
      const perm = permissionMap.get(code);
      if (!perm) continue;
      await prisma.role_permissions.create({
        data: {
          role_id: role.id,
          permission_id: perm.id,
          created_at: new Date(),
        },
      });
    }
  }
  return roleMap;
}

async function upsertPermissionResources(permissionMap) {
  console.log('🌱 Seeding permission resources...');
  for (const item of PERMISSION_RESOURCES) {
    const permission = item.permission_code ? permissionMap.get(item.permission_code) : null;

    await prisma.permission_resources.upsert({
      where: {
        type_resource_key: {
          type: item.type,
          resource_key: item.resource_key,
        },
      },
      update: {
        resource_name: item.resource_name,
        route_path: item.route_path || null,
        route_name: item.route_name || null,
        component: item.component || null,
        parent_key: item.parent_key || null,
        meta: item.meta || null,
        sort_order: item.sort_order || 0,
        is_active: item.is_active !== false,
        permission_id: permission ? permission.id : null,
        updated_at: new Date(),
      },
      create: {
        type: item.type,
        resource_key: item.resource_key,
        resource_name: item.resource_name,
        route_path: item.route_path || null,
        route_name: item.route_name || null,
        component: item.component || null,
        parent_key: item.parent_key || null,
        meta: item.meta || null,
        sort_order: item.sort_order || 0,
        is_active: item.is_active !== false,
        permission_id: permission ? permission.id : null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
}

async function assignAdminRole(roleMap) {
  console.log('🔗 Assigning Admin role to existing admin users...');
  const adminRole = roleMap.get('Admin');
  if (!adminRole) return;
  const admins = await prisma.users.findMany({
    where: { role: 'admin', is_deleted: false },
    select: { id: true },
  });

  for (const u of admins) {
    await prisma.user_roles.upsert({
      where: {
        user_id_role_id: {
          user_id: u.id,
          role_id: adminRole.id,
        },
      },
      update: {},
      create: {
        user_id: u.id,
        role_id: adminRole.id,
        created_at: new Date(),
      },
    });
  }
}

async function main() {
  try {
    const permMap = await upsertPermissions();
    const roleMap = await upsertRoles(permMap);
    await upsertPermissionResources(permMap);
    await assignAdminRole(roleMap);
    console.log('✅ RBAC seed completed');
  } catch (e) {
    console.error('❌ RBAC seed failed:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
