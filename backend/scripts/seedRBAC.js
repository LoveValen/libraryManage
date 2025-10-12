#!/usr/bin/env node
/**
 * Seed RBAC base data: permissions, roles, and role-permission mappings.
 * - Idempotent upserts
 * - Assign Admin role to existing admin users
 */

const prisma = require('../src/utils/prisma');

const PERMISSIONS = [
  // Books
  { code: 'books.read', name: '查看图书', group_name: 'books', description: '查看图书与详情' },
  { code: 'books.create', name: '创建图书', group_name: 'books', description: '新增图书' },
  { code: 'books.update', name: '更新图书', group_name: 'books', description: '编辑图书' },
  { code: 'books.delete', name: '删除图书', group_name: 'books', description: '删除或下架图书' },
  // Borrows
  { code: 'borrows.read', name: '查看借阅', group_name: 'borrows', description: '查看借阅记录与统计' },
  { code: 'borrows.create', name: '创建借阅', group_name: 'borrows', description: '办理借阅' },
  { code: 'borrows.update', name: '更新借阅', group_name: 'borrows', description: '续借、归还、处理逾期' },
  // Users
  { code: 'users.read', name: '查看用户', group_name: 'users', description: '查看用户列表与详情' },
  { code: 'users.update', name: '更新用户', group_name: 'users', description: '编辑用户资料与状态' },
  // RBAC
  { code: 'roles.manage', name: '角色管理', group_name: 'rbac', description: '创建/编辑/删除角色、分配权限' },
  { code: 'permissions.manage', name: '权限管理', group_name: 'rbac', description: '创建/编辑/删除权限项' },
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
    description: '日常图书与借阅业务管理',
    is_system: true,
    permissions: [
      'books.read','books.create','books.update','books.delete',
      'borrows.read','borrows.create','borrows.update',
      'users.read','users.update'
    ],
  },
  {
    code: 'Patron',
    name: '普通读者',
    description: '读者只能查看公共信息与个人数据',
    is_system: true,
    permissions: [
      'books.read','borrows.read'
    ],
  },
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

    // Link role-permissions
    const permissionCodes = r.permissions === '*' ? Array.from(permissionMap.keys()) : r.permissions;
    for (const code of permissionCodes) {
      const perm = permissionMap.get(code);
      if (!perm) continue;
      await prisma.role_permissions.upsert({
        where: {
          role_id_permission_id: {
            role_id: role.id,
            permission_id: perm.id,
          },
        },
        update: {},
        create: {
          role_id: role.id,
          permission_id: perm.id,
          created_at: new Date(),
        },
      });
    }
  }
  return roleMap;
}

async function assignAdminRole(roleMap) {
  console.log('🔗 Assigning Admin role to existing admin users...');
  const adminRole = roleMap.get('Admin');
  if (!adminRole) return;
  const admins = await prisma.users.findMany({ where: { role: 'admin', is_deleted: false }, select: { id: true } });
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


