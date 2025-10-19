# Pro Components TSX 版本使用指南

## 📦 已转换的组件

### ✅ 已完成 TSX 转换

1. **ProTable.tsx** - 企业级数据表格
2. **ProForm.tsx** - 动态表单组件  
3. **FormFieldRender.tsx** - 表单字段渲染器

### 🔧 配置更新

#### 1. TypeScript 配置
- ✅ `tsconfig.json` - 主要 TS 配置
- ✅ `tsconfig.node.json` - Node.js 配置
- ✅ `src/shims-vue.d.ts` - Vue 类型声明

#### 2. Vite 配置
```javascript
vue({
  // 启用JSX/TSX支持
  script: {
    defineModel: true,
    propsDestructure: true
  }
})
```

#### 3. CSS 模块支持
- ✅ `*.module.scss` 文件支持
- ✅ 类型声明已添加

## 🚀 TSX 组件特性

### 1. 更好的 TypeScript 支持
```tsx
// 完整的类型推导
interface ProTableProps<T = any> {
  request: RequestFunction<T>
  columns: ProTableColumn[]
  // ... 其他属性
}

export default defineComponent<ProTableProps>({
  // 组件实现
})
```

### 2. 灵活的动态渲染
```tsx
// 条件渲染更加直观
return () => (
  <div class={styles.proTable}>
    {props.search !== false && renderSearchForm()}
    {renderToolBar()}
    <div class={styles.proTableContent}>
      {renderTable()}
    </div>
  </div>
)
```

### 3. 更好的 IDE 支持
- 自动补全
- 类型检查
- 重构支持
- 错误提示

## 📝 使用示例

### ProForm TSX 用法
```vue
<template>
  <ProForm
    :fields="formFields"
    :initialValues="initialValues"
    @submit="handleSubmit"
  />
</template>

<script setup>
import { ProForm } from '@/components/common'

const formFields = [
  {
    name: 'username',
    label: '用户名',
    valueType: 'text',
    required: true
  },
  {
    name: 'email',
    label: '邮箱',
    valueType: 'text',
    required: true,
    rules: [
      { type: 'email', message: '请输入正确的邮箱格式' }
    ]
  }
]

const handleSubmit = (values) => {
  console.log('提交数据:', values)
}
</script>
```

### ProTable TSX 用法
```vue
<template>
  <ProTable
    :request="loadData"
    :columns="columns"
    :batch-actions="batchActions"
    :actions="rowActions"
    row-key="id"
  />
</template>

<script setup>
import { ProTable } from '@/components/common'

const columns = [
  {
    key: 'name',
    title: '姓名',
    search: true
  },
  {
    key: 'status',
    title: '状态',
    valueType: 'option',
    valueEnum: [
      { value: 'active', label: '活跃', type: 'success' },
      { value: 'inactive', label: '非活跃', type: 'danger' }
    ]
  }
]

const loadData = async (params) => {
  const response = await api.getUsers(params)
  return {
    success: true,
    data: response.data,
    total: response.total
  }
}
</script>
```

## 🔄 迁移指南

### 从 Vue SFC 迁移到 TSX

1. **保持原有 API 不变** - 所有 props 和 events 完全兼容
2. **样式使用 CSS 模块** - 更好的样式隔离
3. **更强的类型安全** - TypeScript 全面支持

### 兼容性说明

- ✅ 完全向后兼容现有用法
- ✅ 支持所有原有功能
- ✅ 性能与 Vue SFC 相当
- ✅ 支持 Vue 3 Composition API

## 🛠 开发工具

### 推荐 VSCode 插件
- Vetur 或 Volar (Vue 支持)
- TypeScript Importer
- Auto Rename Tag
- Bracket Pair Colorizer

### 调试支持
- Vue DevTools 完全支持
- 浏览器开发者工具正常工作
- Hot Reload 正常工作

## ⚡ 性能优化

### TSX 特有优化
1. **编译时优化** - 更好的 Tree Shaking
2. **类型擦除** - 生产环境无类型开销
3. **静态提升** - Vite 自动优化

### 最佳实践
```tsx
// 使用 computed 缓存复杂计算
const expensiveData = computed(() => {
  return heavyComputation(props.data)
})

// 使用 memo 优化子组件渲染
const OptimizedChild = memo(() => {
  return <ChildComponent {...props} />
})
```

## 🔮 未来规划

### 计划新增组件
- [ ] **ProLayout** - 企业级布局组件
- [ ] **ProCard** - 高级卡片组件  
- [ ] **ProList** - 列表组件
- [ ] **ProDescriptions** - 描述列表
- [ ] **ProSkeleton** - 骨架屏组件

### 功能增强
- [ ] 虚拟滚动支持
- [ ] 国际化完善
- [ ] 主题定制增强
- [ ] 性能监控集成

---

## 📞 技术支持

如果在使用过程中遇到问题，请：

1. 查看控制台错误信息
2. 检查 TypeScript 类型错误
3. 确认 CSS 模块路径正确
4. 验证组件 props 类型匹配

TSX 版本提供了更强大的开发体验，同时保持了与现有代码的完全兼容性！