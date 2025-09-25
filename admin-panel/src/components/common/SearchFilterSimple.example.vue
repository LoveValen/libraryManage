<template>
  <div class="search-example-container">
    <h2>SearchFilterSimple 使用示例</h2>
    
    <!-- 示例1：基础使用 -->
    <div class="example-section">
      <h3>1. 基础搜索（用户管理）</h3>
      <SearchFilterSimple
        v-model="userSearchData"
        :fields="userSearchFields"
        :columns="4"
        :loading="loading"
        @search="handleUserSearch"
        @reset="handleUserReset"
      />
    </div>

    <!-- 示例2：图书搜索 -->
    <div class="example-section">
      <h3>2. 高级搜索（图书管理）</h3>
      <SearchFilterSimple
        v-model="bookSearchData"
        :fields="bookSearchFields"
        :columns="3"
        :collapsed-rows="2"
        :show-labels="true"
        :actions="{
          search: { text: '查询图书' },
          reset: { text: '清空条件' }
        }"
        @search="handleBookSearch"
        @reset="handleBookReset"
      />
    </div>

    <!-- 示例3：借阅记录搜索 -->
    <div class="example-section">
      <h3>3. 紧凑模式（借阅记录）</h3>
      <SearchFilterSimple
        v-model="borrowSearchData"
        :fields="borrowSearchFields"
        :columns="5"
        :collapsible="false"
        @search="handleBorrowSearch"
        @reset="handleBorrowReset"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import SearchFilterSimple from './SearchFilterSimple.tsx'

// 用户搜索数据和配置
const userSearchData = reactive({})
const userSearchFields = [
  {
    name: 'keyword',
    label: '关键词',
    valueType: 'text',
    placeholder: '用户名、姓名或邮箱',
    clearable: true
  },
  {
    name: 'role',
    label: '用户角色',
    valueType: 'select',
    placeholder: '请选择角色',
    options: [
      { label: '普通用户', value: 'user' },
      { label: '图书管理员', value: 'librarian' },
      { label: '系统管理员', value: 'admin' }
    ]
  },
  {
    name: 'status',
    label: '账户状态',
    valueType: 'select',
    placeholder: '请选择状态',
    options: [
      { label: '正常', value: 'active' },
      { label: '禁用', value: 'inactive' },
      { label: '暂停', value: 'suspended' }
    ]
  },
  {
    name: 'createdAt',
    label: '注册时间',
    valueType: 'dateRange',
    placeholder: ['开始日期', '结束日期']
  }
]

// 图书搜索数据和配置
const bookSearchData = reactive({})
const bookSearchFields = [
  {
    name: 'title',
    label: '书名',
    valueType: 'text',
    placeholder: '输入图书标题',
    span: 8
  },
  {
    name: 'author',
    label: '作者',
    valueType: 'text',
    placeholder: '输入作者姓名',
    span: 8
  },
  {
    name: 'isbn',
    label: 'ISBN',
    valueType: 'text',
    placeholder: '输入ISBN号',
    span: 8
  },
  {
    name: 'category',
    label: '分类',
    valueType: 'select',
    placeholder: '选择图书分类',
    span: 8,
    options: [
      { label: '计算机科学', value: 'computer' },
      { label: '文学艺术', value: 'literature' },
      { label: '历史哲学', value: 'history' },
      { label: '自然科学', value: 'science' },
      { label: '社会科学', value: 'social' }
    ]
  },
  {
    name: 'status',
    label: '图书状态',
    valueType: 'select',
    placeholder: '选择图书状态',
    span: 8,
    options: [
      { label: '可借阅', value: 'available' },
      { label: '已借出', value: 'borrowed' },
      { label: '维护中', value: 'maintenance' },
      { label: '丢失', value: 'lost' }
    ]
  },
  {
    name: 'publishYear',
    label: '出版年份',
    valueType: 'dateRange',
    placeholder: ['开始年份', '结束年份'],
    span: 8
  },
  {
    name: 'language',
    label: '语言',
    valueType: 'select',
    placeholder: '选择语言',
    span: 8,
    options: [
      { label: '中文', value: 'zh' },
      { label: '英文', value: 'en' },
      { label: '其他', value: 'other' }
    ]
  },
  {
    name: 'minRating',
    label: '最低评分',
    valueType: 'number',
    placeholder: '输入最低评分',
    span: 8,
    min: 0,
    max: 5,
    step: 0.1
  }
]

// 借阅记录搜索数据和配置
const borrowSearchData = reactive({})
const borrowSearchFields = [
  {
    name: 'userKeyword',
    label: '用户',
    valueType: 'text',
    placeholder: '用户姓名或学号'
  },
  {
    name: 'bookKeyword',
    label: '图书',
    valueType: 'text',
    placeholder: '图书标题'
  },
  {
    name: 'status',
    label: '借阅状态',
    valueType: 'select',
    placeholder: '选择状态',
    options: [
      { label: '借阅中', value: 'borrowed' },
      { label: '已归还', value: 'returned' },
      { label: '逾期', value: 'overdue' },
      { label: '丢失', value: 'lost' }
    ]
  },
  {
    name: 'borrowDate',
    label: '借阅日期',
    valueType: 'dateRange',
    placeholder: ['开始', '结束']
  },
  {
    name: 'isOverdue',
    label: '逾期状态',
    valueType: 'select',
    placeholder: '是否逾期',
    options: [
      { label: '正常', value: false },
      { label: '逾期', value: true }
    ]
  }
]

const loading = ref(false)

// 搜索处理函数
const handleUserSearch = (searchData) => {
  console.log('用户搜索:', searchData)
  // 这里调用用户搜索 API
}

const handleUserReset = () => {
  console.log('重置用户搜索条件')
}

const handleBookSearch = (searchData) => {
  console.log('图书搜索:', searchData)
  // 这里调用图书搜索 API
}

const handleBookReset = () => {
  console.log('重置图书搜索条件')
}

const handleBorrowSearch = (searchData) => {
  console.log('借阅记录搜索:', searchData)
  // 这里调用借阅记录搜索 API
}

const handleBorrowReset = () => {
  console.log('重置借阅记录搜索条件')
}
</script>

<style lang="scss" scoped>
.search-example-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;

  h2 {
    color: var(--el-text-color-primary);
    margin-bottom: 32px;
    font-size: 20px;
    font-weight: 600;
  }

  h3 {
    color: var(--el-text-color-primary);
    margin-bottom: 16px;
    font-size: 18px;
    font-weight: 500;
  }

  .example-section {
    margin-bottom: 40px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid var(--el-border-color-extra-light);
  }
}
</style>