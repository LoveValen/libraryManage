# SearchFilterSimple 迁移指南

## 🎉 改进概述

基于 **ProForm** 设计理念，SearchFilterSimple 组件已完全重构，提供更强大的配置能力和更好的用户体验。

### ✨ 新特性

- 🔧 **统一字段渲染**：使用 FormFieldRender 组件，支持所有 ProForm 字段类型
- 🎯 **配置化开发**：字段定义更加灵活和强大
- 📱 **响应式设计**：更好的移动端适配
- 🔍 **智能搜索**：自动过滤空值，提供搜索提示
- 🎨 **现代UI**：更美观的界面设计和交互体验

## 📋 API 对比

### 旧版本 API
```vue
<SearchFilterSimple
  :fields="[
    { key: 'name', type: 'input', label: '姓名' },
    { key: 'role', type: 'select', label: '角色', options: roleOptions },
    { key: 'createdAt', type: 'date', label: '创建时间' }
  ]"
  v-model="searchData"
  @search="handleSearch"
  @reset="handleReset"
/>
```

### 新版本 API
```vue
<SearchFilterSimple
  :fields="[
    { name: 'name', valueType: 'text', label: '姓名', placeholder: '输入用户姓名' },
    { name: 'role', valueType: 'select', label: '角色', options: roleOptions },
    { name: 'createdAt', valueType: 'dateRange', label: '创建时间' }
  ]"
  v-model="searchData"
  :columns="4"
  :collapsible="true"
  @search="handleSearch"
  @reset="handleReset"
/>
```

## 🔄 字段配置迁移

### 1. 基本字段类型映射

| 旧版本 | 新版本 | 说明 |
|--------|--------|------|
| `type: 'input'` | `valueType: 'text'` | 文本输入框 |
| `type: 'select'` | `valueType: 'select'` | 下拉选择 |
| `type: 'date'` | `valueType: 'date'` | 日期选择 |
| N/A | `valueType: 'dateRange'` | 日期范围选择 ✨ |
| N/A | `valueType: 'number'` | 数字输入 ✨ |
| N/A | `valueType: 'switch'` | 开关 ✨ |

### 2. 字段属性映射

| 旧版本 | 新版本 | 说明 |
|--------|--------|------|
| `key` | `name` | 字段标识 |
| `type` | `valueType` | 字段类型 |
| `label` | `label` | 字段标签 |
| `options` | `options` | 选择项 |
| `placeholder` | `placeholder` | 占位符 |
| N/A | `span` | 栅格占用 ✨ |
| N/A | `initialValue` | 初始值 ✨ |

## 📝 迁移示例

### 示例1：用户搜索迁移

#### 旧版本
```vue
<template>
  <SearchFilterSimple
    :fields="[
      {
        key: 'username',
        type: 'input',
        label: '用户名'
      },
      {
        key: 'role',
        type: 'select',
        label: '角色',
        options: [
          { label: '管理员', value: 'admin' },
          { label: '用户', value: 'user' }
        ]
      },
      {
        key: 'createdDate',
        type: 'date',
        label: '创建日期',
        dateType: 'daterange'
      }
    ]"
    v-model="searchForm"
    @search="handleSearch"
    @reset="handleReset"
  />
</template>
```

#### 新版本
```vue
<template>
  <SearchFilterSimple
    :fields="[
      {
        name: 'username',
        valueType: 'text',
        label: '用户名',
        placeholder: '输入用户名进行搜索',
        clearable: true
      },
      {
        name: 'role',
        valueType: 'select',
        label: '角色',
        placeholder: '选择用户角色',
        options: [
          { label: '管理员', value: 'admin' },
          { label: '用户', value: 'user' }
        ]
      },
      {
        name: 'createdDate',
        valueType: 'dateRange',
        label: '创建日期',
        placeholder: ['开始日期', '结束日期']
      }
    ]"
    v-model="searchForm"
    :columns="3"
    :actions="{
      search: { text: '搜索用户' },
      reset: { text: '重置条件' }
    }"
    @search="handleSearch"
    @reset="handleReset"
  />
</template>
```

### 示例2：复杂搜索表单迁移

#### 旧版本
```javascript
const fields = [
  { key: 'title', type: 'input', label: '标题' },
  { key: 'category', type: 'select', label: '分类', options: categoryOptions },
  { key: 'status', type: 'select', label: '状态', options: statusOptions },
  { key: 'publishDate', type: 'date', label: '发布日期' }
]
```

#### 新版本
```javascript
const fields = [
  {
    name: 'title',
    valueType: 'text',
    label: '标题',
    placeholder: '输入文章标题',
    span: 8  // 占用8个栅格
  },
  {
    name: 'category',
    valueType: 'select',
    label: '分类',
    placeholder: '选择文章分类',
    options: categoryOptions,
    span: 8
  },
  {
    name: 'status',
    valueType: 'select',
    label: '状态',
    placeholder: '选择发布状态',
    options: statusOptions,
    span: 8
  },
  {
    name: 'publishDate',
    valueType: 'dateRange',
    label: '发布日期',
    placeholder: ['开始日期', '结束日期'],
    span: 12  // 日期范围占更大空间
  },
  {
    name: 'featured',
    valueType: 'switch',
    label: '是否推荐',
    span: 6
  },
  {
    name: 'minViews',
    valueType: 'number',
    label: '最低浏览量',
    placeholder: '输入最低浏览量',
    min: 0,
    span: 6
  }
]
```

## ⚙️ 新配置选项

### 1. 布局配置

```vue
<SearchFilterSimple
  :fields="searchFields"
  :columns="4"          <!-- 每行显示4个字段 -->
  :collapsed-rows="1"   <!-- 折叠时显示1行 -->
  :show-labels="false"  <!-- 是否显示字段标签 -->
  :collapsible="true"   <!-- 是否支持折叠 -->
  :default-collapsed="true"  <!-- 默认折叠状态 -->
/>
```

### 2. 操作按钮配置

```vue
<SearchFilterSimple
  :fields="searchFields"
  :actions="{
    search: {
      text: '立即搜索',
      loading: searchLoading
    },
    reset: {
      text: '清空筛选'
    }
  }"
  :loading="globalLoading"
/>
```

### 3. 事件处理

```vue
<SearchFilterSimple
  :fields="searchFields"
  v-model="searchData"
  @search="handleSearch"
  @reset="handleReset"
  @field-change="handleFieldChange"  <!-- 新增：字段变化事件 -->
/>
```

## 🚀 高级功能

### 1. 字段依赖和动态显示

```javascript
const fields = [
  {
    name: 'type',
    valueType: 'select',
    label: '类型',
    options: typeOptions
  },
  {
    name: 'subType',
    valueType: 'select',
    label: '子类型',
    options: [],
    when: (formData) => formData.type === 'advanced'  // 条件显示
  }
]
```

### 2. 自定义字段渲染

```javascript
const fields = [
  {
    name: 'customField',
    valueType: 'custom',
    label: '自定义字段',
    renderFormItem: (field, formData) => {
      return <CustomComponent value={formData[field.name]} />
    }
  }
]
```

### 3. 字段验证

```javascript
const fields = [
  {
    name: 'email',
    valueType: 'text',
    label: '邮箱',
    rules: [
      { type: 'email', message: '请输入正确的邮箱格式' }
    ]
  }
]
```

## 🔍 使用建议

### 1. 字段数量规划
- **1-4个字段**：不需要折叠功能
- **5-8个字段**：建议开启折叠，默认显示1-2行
- **9+个字段**：强烈建议分组或使用高级搜索模式

### 2. 响应式布局
```vue
<!-- 大屏显示5列，中屏4列，小屏2列 -->
<SearchFilterSimple
  :fields="fields"
  :columns="5"
  responsive
/>
```

### 3. 性能优化
```javascript
// 使用 computed 缓存字段配置
const searchFields = computed(() => [
  // ... 字段配置
])
```

## 📚 完整示例

查看 `SearchFilterSimple.example.vue` 文件获取完整的使用示例。

## ❓ 常见问题

### Q: 如何保持向后兼容？
A: 新版本支持大部分旧版本的API，只需要将 `key` 改为 `name`，`type` 改为 `valueType` 即可。

### Q: 如何自定义字段类型？
A: 使用 `valueType: 'custom'` 并提供 `renderFormItem` 函数。

### Q: 如何处理异步选项加载？
A: 在 `options` 中传入异步函数，FormFieldRender 会自动处理加载状态。

---

## 🎯 迁移检查清单

- [ ] 将 `key` 属性改为 `name`
- [ ] 将 `type` 属性改为 `valueType`
- [ ] 更新字段类型名称（如 `input` → `text`）
- [ ] 添加 `placeholder` 增强用户体验
- [ ] 考虑使用 `span` 优化布局
- [ ] 配置 `columns` 和 `collapsible` 参数
- [ ] 测试所有搜索功能是否正常工作
- [ ] 验证响应式布局在不同屏幕尺寸下的表现

迁移完成后，你的搜索组件将具有更强大的功能和更好的用户体验！ 🎉