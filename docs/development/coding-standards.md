# 📝 编码规范指南

本文档定义了图书馆管理系统项目的编码规范和最佳实践，确保代码质量、可维护性和团队协作效率。

## 🎯 总体原则

### 代码质量原则
- **可读性优先**: 代码首先是给人读的，其次才是给机器执行的
- **一致性**: 保持编码风格的一致性
- **简洁性**: 避免不必要的复杂性
- **可维护性**: 易于理解、修改和扩展
- **性能考虑**: 在保证可读性的前提下优化性能

### 命名原则
- **清晰表意**: 名称应该清楚地表达其用途
- **避免缩写**: 除非是广泛认知的缩写
- **保持一致**: 相同概念使用相同的命名
- **遵循约定**: 按照语言和框架的约定

## 🌐 通用规范

### 文件命名
```
✅ 好的命名
user.model.js          // 模型文件
auth.controller.js     // 控制器文件
database.config.js     // 配置文件
user-profile.vue       // Vue组件
api-client.js          // 工具类

❌ 避免的命名
UserModel.js           // 避免大驼峰
auth_controller.js     // 后端避免下划线
DatabaseConfig.js      // 避免大驼峰
userprofile.vue        // 避免无分隔符
apiclient.js           // 避免无分隔符
```

### 目录结构
```
📁 项目根目录/
├── 📁 backend/          # 后端代码
│   ├── 📁 src/
│   │   ├── 📁 controllers/    # 控制器
│   │   ├── 📁 models/         # 数据模型
│   │   ├── 📁 services/       # 业务逻辑
│   │   ├── 📁 middlewares/    # 中间件
│   │   ├── 📁 routes/         # 路由
│   │   ├── 📁 utils/          # 工具函数
│   │   └── 📁 config/         # 配置文件
│   ├── 📁 tests/              # 测试文件
│   └── 📁 docs/               # 后端文档
├── 📁 admin-panel/      # 前端管理平台
│   ├── 📁 src/
│   │   ├── 📁 components/     # 组件
│   │   ├── 📁 views/          # 页面
│   │   ├── 📁 stores/         # 状态管理
│   │   ├── 📁 composables/    # 组合式函数
│   │   ├── 📁 utils/          # 工具函数
│   │   └── 📁 assets/         # 静态资源
│   └── 📁 tests/              # 前端测试
└── 📁 docs/             # 项目文档
```

## 🎛️ 后端规范 (Node.js/Express)

### 1. 文件组织

#### 模型文件 (models/)
```javascript
// user.model.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const User = (sequelize) => {
  const model = sequelize.define('User', {
    // 字段定义按字母顺序排列
    email: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'password_hash'
    },
    
    username: {
      type: DataTypes.STRING(50),
      unique: true,
      allowNull: false,
      validate: {
        len: [3, 50],
        isAlphanumeric: true
      }
    }
  }, {
    // 模型选项
    tableName: 'users',
    underscored: true,
    paranoid: true, // 软删除
    
    // 实例方法
    instanceMethods: {
      // 验证密码
      async validatePassword(password) {
        return bcrypt.compare(password, this.passwordHash);
      },
      
      // 转换为安全JSON（不包含敏感信息）
      toSafeJSON() {
        const { passwordHash, deletedAt, ...safeUser } = this.toJSON();
        return safeUser;
      }
    },
    
    // 钩子
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.passwordHash = await bcrypt.hash(user.password, 12);
          delete user.password;
        }
      }
    }
  });
  
  return model;
};

module.exports = User;
```

#### 控制器文件 (controllers/)
```javascript
// auth.controller.js
const { validationResult } = require('express-validator');
const authService = require('../services/auth.service');
const { AppError } = require('../utils/errors');
const { successResponse } = require('../utils/response');

class AuthController {
  /**
   * 用户注册
   * @route POST /api/v1/auth/register
   * @access Public
   */
  async register(req, res, next) {
    try {
      // 1. 验证输入数据
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Validation failed', 400, errors.array());
      }
      
      // 2. 调用服务层
      const result = await authService.register(req.body);
      
      // 3. 返回响应
      return successResponse(res, 201, 'User registered successfully', result);
      
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * 用户登录
   * @route POST /api/v1/auth/login
   * @access Public
   */
  async login(req, res, next) {
    try {
      const { identifier, password } = req.body;
      
      const result = await authService.login(identifier, password);
      
      return successResponse(res, 200, 'Login successful', result);
      
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
```

#### 服务文件 (services/)
```javascript
// auth.service.js
const { User, UserPoints } = require('../models');
const { generateTokens } = require('../utils/jwt');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');

class AuthService {
  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 注册结果
   */
  async register(userData) {
    const { username, email, password, realName } = userData;
    
    try {
      // 1. 检查用户是否已存在
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            { username },
            { email: email || null }
          ]
        }
      });
      
      if (existingUser) {
        throw new AppError('Username or email already exists', 409);
      }
      
      // 2. 创建用户（使用事务）
      const user = await sequelize.transaction(async (t) => {
        const newUser = await User.create({
          username,
          email,
          password, // 将在模型钩子中加密
          realName
        }, { transaction: t });
        
        // 3. 初始化用户积分
        await UserPoints.create({
          userId: newUser.id,
          balance: 0,
          level: 'NEWCOMER',
          levelName: '新手读者'
        }, { transaction: t });
        
        return newUser;
      });
      
      logger.info(`User registered: ${username}`, { userId: user.id });
      
      return {
        user: user.toSafeJSON()
      };
      
    } catch (error) {
      logger.error('Registration failed', { username, error: error.message });
      throw error;
    }
  }
  
  /**
   * 用户登录
   * @param {string} identifier - 用户名或邮箱
   * @param {string} password - 密码
   * @returns {Promise<Object>} 登录结果
   */
  async login(identifier, password) {
    try {
      // 1. 查找用户
      const user = await User.findOne({
        where: {
          [Op.or]: [
            { username: identifier },
            { email: identifier }
          ],
          status: 'active'
        },
        include: [{
          model: UserPoints,
          as: 'points'
        }]
      });
      
      if (!user || !(await user.validatePassword(password))) {
        throw new AppError('Invalid credentials', 401);
      }
      
      // 2. 生成令牌
      const tokens = generateTokens({
        userId: user.id,
        username: user.username,
        role: user.role
      });
      
      // 3. 更新登录信息
      await user.update({
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
        loginCount: user.loginCount + 1
      });
      
      logger.info(`User logged in: ${user.username}`, { userId: user.id });
      
      return {
        user: user.toSafeJSON(),
        tokens
      };
      
    } catch (error) {
      logger.error('Login failed', { identifier, error: error.message });
      throw error;
    }
  }
}

module.exports = new AuthService();
```

### 2. 命名约定

#### 变量和函数
```javascript
// ✅ 使用camelCase
const userId = 123;
const currentUser = getCurrentUser();
const isAuthenticated = checkAuth();

// ✅ 布尔值使用is/has/can等前缀
const isActive = true;
const hasPermission = false;
const canEdit = true;

// ✅ 常量使用UPPER_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;
const DEFAULT_PAGE_SIZE = 20;
const JWT_EXPIRES_IN = '7d';

// ❌ 避免
const user_id = 123;           // 避免下划线
const User_Name = 'john';      // 避免混合命名
const CURRENTUSER = getUser(); // 避免全大写变量
```

#### 类和构造函数
```javascript
// ✅ 使用PascalCase
class UserService {
  constructor() {}
}

class BookController {
  async getBooks() {}
}

// ✅ 错误类
class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}
```

### 3. 错误处理

#### 统一错误类
```javascript
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors) {
    super(message, 400, errors);
    this.name = 'ValidationError';
  }
}

module.exports = {
  AppError,
  ValidationError
};
```

#### 错误处理中间件
```javascript
// middlewares/error.middleware.js
const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // 记录错误日志
  logger.error(err.message, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  });
  
  // Sequelize错误处理
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
      value: e.value
    }));
    error = new ValidationError('Validation failed', errors);
  }
  
  // 数据库唯一约束错误
  if (err.name === 'SequelizeUniqueConstraintError') {
    error = new AppError('Resource already exists', 409);
  }
  
  return errorResponse(res, 
    error.statusCode || 500,
    error.message || 'Internal Server Error',
    error.errors
  );
};

module.exports = errorHandler;
```

### 4. 日志规范

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'library-management' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// 开发环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;

// 使用示例
logger.info('User action', { 
  userId: 123, 
  action: 'login', 
  ip: '192.168.1.1' 
});

logger.error('Database error', { 
  error: error.message, 
  stack: error.stack 
});
```

## 🎨 前端规范 (Vue 3)

### 1. 组件规范

#### 单文件组件结构
```vue
<template>
  <!-- 模板内容 -->
  <div class="user-profile">
    <div class="user-profile__header">
      <h2 class="user-profile__title">{{ title }}</h2>
    </div>
    
    <div class="user-profile__content">
      <UserForm 
        v-model="form"
        :loading="isLoading"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>

<script setup>
// 导入依赖 - 按以下顺序
// 1. Vue相关
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// 2. 第三方库
import { ElMessage } from 'element-plus'

// 3. 项目内部依赖
import UserForm from '@/components/UserForm.vue'
import { useUserStore } from '@/stores/user'
import { validateForm } from '@/utils/validation'

// Props定义
const props = defineProps({
  userId: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    default: '用户资料'
  }
})

// Emits定义
const emit = defineEmits(['update', 'delete'])

// Store和Router
const userStore = useUserStore()
const router = useRouter()

// 响应式数据
const form = ref({
  name: '',
  email: '',
  phone: ''
})
const isLoading = ref(false)

// 计算属性
const isFormValid = computed(() => {
  return form.value.name && form.value.email
})

// 方法
const handleSubmit = async () => {
  if (!isFormValid.value) {
    ElMessage.error('请填写必填字段')
    return
  }
  
  try {
    isLoading.value = true
    await userStore.updateUser(props.userId, form.value)
    ElMessage.success('更新成功')
    emit('update', form.value)
  } catch (error) {
    ElMessage.error(error.message)
  } finally {
    isLoading.value = false
  }
}

const handleDelete = () => {
  // 删除逻辑
}

// 生命周期
onMounted(async () => {
  await loadUserData()
})

// 私有方法
const loadUserData = async () => {
  try {
    const user = await userStore.getUser(props.userId)
    form.value = { ...user }
  } catch (error) {
    ElMessage.error('加载用户数据失败')
  }
}
</script>

<style scoped>
.user-profile {
  padding: 20px;
}

.user-profile__header {
  margin-bottom: 24px;
}

.user-profile__title {
  font-size: 24px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.user-profile__content {
  background: var(--color-background-soft);
  border-radius: 8px;
  padding: 24px;
}
</style>
```

### 2. 命名约定

#### 组件命名
```javascript
// ✅ PascalCase用于组件名
UserProfile.vue
BookList.vue
ReviewCard.vue
SearchInput.vue

// ✅ 复合词使用完整单词
UserProfileEdit.vue  // 而不是UserProfileEdt.vue
BookDetailView.vue   // 而不是BookDetView.vue

// ✅ 页面组件使用View后缀
UserListView.vue
BookDetailView.vue
```

#### CSS类命名
```scss
// ✅ 使用BEM方法论
.book-card {              // 块(Block)
  &__header {             // 元素(Element)
    &--featured {         // 修饰符(Modifier)
      background: #gold;
    }
  }
  
  &__content {}
  &__actions {}
  
  &--loading {            // 块修饰符
    opacity: 0.6;
  }
}

// ✅ 状态类使用is-前缀
.is-active {}
.is-disabled {}
.is-loading {}

// ✅ 工具类使用简短描述
.text-center {}
.mt-4 {}        // margin-top: 1rem
.p-2 {}         // padding: 0.5rem
```

### 3. Store规范 (Pinia)

```javascript
// stores/user.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as userApi from '@/api/user'

export const useUserStore = defineStore('user', () => {
  // State
  const currentUser = ref(null)
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // Getters
  const isAuthenticated = computed(() => {
    return !!currentUser.value
  })
  
  const userById = computed(() => {
    return (id) => users.value.find(user => user.id === id)
  })
  
  // Actions
  const setCurrentUser = (user) => {
    currentUser.value = user
  }
  
  const fetchUsers = async (params = {}) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await userApi.getUsers(params)
      users.value = response.data
      
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const updateUser = async (id, userData) => {
    try {
      loading.value = true
      error.value = null
      
      const response = await userApi.updateUser(id, userData)
      
      // 更新本地状态
      const index = users.value.findIndex(user => user.id === id)
      if (index !== -1) {
        users.value[index] = response.data
      }
      
      // 如果是当前用户，更新currentUser
      if (currentUser.value?.id === id) {
        currentUser.value = response.data
      }
      
      return response
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }
  
  const clearError = () => {
    error.value = null
  }
  
  return {
    // State
    currentUser,
    users,
    loading,
    error,
    
    // Getters
    isAuthenticated,
    userById,
    
    // Actions
    setCurrentUser,
    fetchUsers,
    updateUser,
    clearError
  }
})
```

### 4. API客户端规范

```javascript
// api/client.js
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// 创建axios实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    
    // 添加认证token
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    
    // 添加请求ID用于追踪
    config.headers['X-Request-ID'] = crypto.randomUUID()
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const { response } = error
    
    if (response) {
      const { status, data } = response
      
      switch (status) {
        case 401:
          // 未授权，跳转到登录页
          const authStore = useAuthStore()
          authStore.logout()
          router.push('/login')
          ElMessage.error('登录已过期，请重新登录')
          break
          
        case 403:
          ElMessage.error('权限不足')
          break
          
        case 404:
          ElMessage.error('请求的资源不存在')
          break
          
        case 429:
          ElMessage.error('请求过于频繁，请稍后再试')
          break
          
        case 500:
          ElMessage.error('服务器内部错误')
          break
          
        default:
          ElMessage.error(data.message || '请求失败')
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }
    
    return Promise.reject(error)
  }
)

export default apiClient
```

## 🧪 测试规范

### 后端测试
```javascript
// tests/auth.test.js
const request = require('supertest')
const app = require('../src/app')
const { User } = require('../src/models')

describe('Authentication', () => {
  beforeEach(async () => {
    // 清理测试数据
    await User.destroy({ where: {}, force: true })
  })
  
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201)
      
      expect(response.body.success).toBe(true)
      expect(response.body.data.user.username).toBe(userData.username)
      expect(response.body.data.user.passwordHash).toBeUndefined()
    })
    
    it('should return error for duplicate username', async () => {
      // 先创建一个用户
      await User.create({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123'
      })
      
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          username: 'existinguser',
          email: 'new@example.com',
          password: 'password123'
        })
        .expect(409)
      
      expect(response.body.success).toBe(false)
    })
  })
})
```

### 前端测试
```javascript
// tests/UserProfile.test.js
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import UserProfile from '@/components/UserProfile.vue'

describe('UserProfile', () => {
  let wrapper
  let pinia
  
  beforeEach(() => {
    pinia = createPinia()
    wrapper = mount(UserProfile, {
      global: {
        plugins: [pinia]
      },
      props: {
        userId: 1,
        title: 'Test Profile'
      }
    })
  })
  
  afterEach(() => {
    wrapper.unmount()
  })
  
  it('renders correctly', () => {
    expect(wrapper.find('.user-profile__title').text()).toBe('Test Profile')
  })
  
  it('validates form before submission', async () => {
    // 模拟表单提交
    await wrapper.find('form').trigger('submit.prevent')
    
    // 验证错误消息
    expect(wrapper.emitted('update')).toBeFalsy()
  })
})
```

## 📦 依赖管理

### package.json规范
```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    "format:check": "prettier --check src/"
  },
  "dependencies": {
    // 按字母顺序排列
  },
  "devDependencies": {
    // 按字母顺序排列
  }
}
```

### 导入顺序
```javascript
// 1. Node.js内置模块
const path = require('path')
const fs = require('fs')

// 2. 第三方库 (按字母顺序)
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// 3. 本地模块 (按相对路径层级)
const config = require('./config')
const { User } = require('../models')
const logger = require('../utils/logger')
```

## 🔍 代码审查清单

### 提交前检查
- [ ] 代码遵循项目编码规范
- [ ] 所有测试通过
- [ ] 代码通过lint检查
- [ ] 添加了必要的注释和文档
- [ ] 没有硬编码的敏感信息
- [ ] 错误处理完善
- [ ] 性能考虑合理

### 审查要点
- [ ] 代码逻辑清晰
- [ ] 命名恰当
- [ ] 函数职责单一
- [ ] 代码重复性低
- [ ] 边界条件处理
- [ ] 安全性考虑
- [ ] 可维护性良好

---

📝 **注意**: 本规范是活文档，会根据项目发展和团队经验持续更新。请定期查看最新版本。