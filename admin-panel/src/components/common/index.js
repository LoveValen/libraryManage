// 通用组件统一导出

// 数据展示组件 (TSX版本)
export { default as ProTable } from './ProTable.tsx'
export { default as StatusTag } from './StatusTag.vue'
export { default as DetailTabs } from './DetailTabs.vue'
export { default as SvgIcon } from './SvgIcon.vue'
export { default as BookCover } from './BookCover.vue'

// 表单组件 (TSX版本)
export { default as ProForm } from './ProForm.tsx'
export { default as FormFieldRender } from './FormFieldRender.tsx'
export { default as SearchFilterSimple } from './SearchFilterSimple.tsx'
export { default as FormCard } from './FormCard.vue'
export { default as FileUpload } from './FileUpload.vue'

// 交互组件
export { default as ConfirmDialog } from './ConfirmDialog.vue'

// 主题管理
export { default as ThemeManager } from './ThemeManager.vue'

// 列设置组件
export { default as ColumnSettings } from './ColumnSettings.vue'

// 批量注册函数
export function registerCommonComponents(app) {
  // 数据展示组件 (TSX版本)
  app.component('ProTable', () => import('./ProTable.tsx'))
  app.component('StatusTag', () => import('./StatusTag.vue'))
  app.component('DetailTabs', () => import('./DetailTabs.vue'))
  app.component('SvgIcon', () => import('./SvgIcon.vue'))
  app.component('BookCover', () => import('./BookCover.vue'))

  // 表单组件 (TSX版本)
  app.component('ProForm', () => import('./ProForm.tsx'))
  app.component('FormFieldRender', () => import('./FormFieldRender.tsx'))
  app.component('SearchFilterSimple', () => import('./SearchFilterSimple.tsx'))
  app.component('FormCard', () => import('./FormCard.vue'))
  app.component('FileUpload', () => import('./FileUpload.vue'))

  // 交互组件
  app.component('ConfirmDialog', () => import('./ConfirmDialog.vue'))

  // 主题管理
  app.component('ThemeManager', () => import('./ThemeManager.vue'))

  // 列设置组件
  app.component('ColumnSettings', () => import('./ColumnSettings.vue'))
}

// 组件配置常量
export const COMPONENT_CONFIGS = {
  // 数据表格默认配置
  DATA_TABLE: {
    stripe: true,
    border: true,
    size: 'default',
    pagination: true,
    pageSize: 20,
    pageSizes: [10, 20, 50, 100],
    showToolbar: true,
    columnSettings: true
  },


  // 状态标签默认配置
  STATUS_TAG: {
    size: 'default',
    effect: 'light',
    preset: 'default',
    showIcon: false,
    showDot: false
  },

  // 图书状态标签配置
  BOOK_STATUS_TAG: {
    available: { type: 'success', text: '可借' },
    borrowed: { type: 'warning', text: '已借出' },
    maintenance: { type: 'info', text: '维修中' },
    offline: { type: 'danger', text: '已下架' }
  },

  // 分类标签配置
  CATEGORY_TAG: {
    0: { type: 'primary' },
    1: { type: 'success' },
    2: { type: 'warning' },
    3: { type: 'danger' },
    4: { type: 'info' }
  },

  // 搜索过滤默认配置
  SEARCH_FILTER: {
    inline: true,
    labelWidth: '80px',
    size: 'default',
    autoSearch: false,
    showActiveFilters: true,
    persist: false
  },


  // 文件上传默认配置
  FILE_UPLOAD: {
    uploadType: 'drag',
    maxSize: 10,
    autoUpload: true,
    showProgress: true,
    customFileList: false
  },

  // 确认对话框默认配置
  CONFIRM_DIALOG: {
    type: 'warning',
    width: '400px',
    center: false,
    closeOnClickModal: false,
    showInput: false,
    autoClose: true
  },

  // 详情标签页默认配置
  DETAIL_TABS: {
    type: 'border-card',
    tabPosition: 'top',
    lazy: true,
    autoLoad: true
  },

  // 表单卡片默认配置
  FORM_CARD: {
    shadow: 'hover',
    size: 'default',
    labelWidth: '120px',
    labelPosition: 'right',
    showActions: true,
    showSubmit: true,
    showReset: true
  }
}

// 工具函数
export const COMPONENT_UTILS = {
  // 格式化文件大小
  formatFileSize(size) {
    if (!size) return '0 B'

    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let index = 0
    let fileSize = size

    while (fileSize >= 1024 && index < units.length - 1) {
      fileSize /= 1024
      index++
    }

    return `${fileSize.toFixed(1)} ${units[index]}`
  },

  // 格式化数字
  formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'w'
    }
    return num.toLocaleString()
  },

  // 生成唯一ID
  generateId() {
    return Math.random().toString(36).substr(2, 9)
  },

  // 深拷贝
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj)
    if (obj instanceof Array) return obj.map(item => this.deepClone(item))
    if (typeof obj === 'object') {
      const clonedObj = {}
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key])
        }
      }
      return clonedObj
    }
    return obj
  },

  // 防抖
  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  },

  // 节流
  throttle(func, limit) {
    let inThrottle
    return function () {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => (inThrottle = false), limit)
      }
    }
  }
}

// 预设配置
export const PRESETS = {
  // 用户表格列配置
  USER_TABLE_COLUMNS: [
    {
      prop: 'avatar',
      label: '头像',
      width: 80,
      slot: 'avatar'
    },
    {
      prop: 'realName',
      label: '姓名',
      minWidth: 120,
      sortable: true
    },
    {
      prop: 'username',
      label: '用户名',
      minWidth: 120,
      sortable: true
    },
    {
      prop: 'email',
      label: '邮箱',
      minWidth: 180,
      showOverflowTooltip: true
    },
    {
      prop: 'role',
      label: '角色',
      width: 100,
      slot: 'role'
    },
    {
      prop: 'status',
      label: '状态',
      width: 100,
      slot: 'status'
    },
    {
      prop: 'createdAt',
      label: '创建时间',
      width: 160,
      sortable: true,
      slot: 'date'
    }
  ],

  // 图书表格列配置
  BOOK_TABLE_COLUMNS: [
    {
      prop: 'cover',
      label: '封面',
      width: 80,
      slot: 'cover'
    },
    {
      prop: 'title',
      label: '书名',
      minWidth: 200,
      sortable: true
    },
    {
      prop: 'author',
      label: '作者',
      minWidth: 120,
      sortable: true
    },
    {
      prop: 'isbn',
      label: 'ISBN',
      width: 140,
      showOverflowTooltip: true
    },
    {
      prop: 'categoryId',
      label: '分类',
      width: 120,
      slot: 'category'
    },
    {
      prop: 'status',
      label: '状态',
      width: 100,
      slot: 'status'
    },
    {
      prop: 'stock',
      label: '库存',
      width: 80,
      align: 'center'
    },
    {
      prop: 'borrowCount',
      label: '借阅次数',
      width: 100,
      align: 'center',
      sortable: true
    },
    {
      prop: 'createdAt',
      label: '添加时间',
      width: 160,
      sortable: true,
      slot: 'date'
    }
  ],

  // 借阅表格列配置
  BORROW_TABLE_COLUMNS: [
    {
      prop: 'user',
      label: '借阅用户',
      minWidth: 150,
      slot: 'user'
    },
    {
      prop: 'book',
      label: '图书信息',
      minWidth: 200,
      slot: 'book'
    },
    {
      prop: 'borrowDate',
      label: '借阅时间',
      width: 160,
      sortable: true,
      slot: 'date'
    },
    {
      prop: 'dueDate',
      label: '应还时间',
      width: 160,
      sortable: true,
      slot: 'dueDate'
    },
    {
      prop: 'returnDate',
      label: '归还时间',
      width: 160,
      slot: 'returnDate'
    },
    {
      prop: 'status',
      label: '状态',
      width: 100,
      slot: 'status'
    },
    {
      prop: 'renewalCount',
      label: '续借次数',
      width: 100,
      align: 'center'
    }
  ],

  // 搜索过滤字段配置
  SEARCH_FILTER_FIELDS: {
    // 用户搜索字段
    USER: [
      {
        key: 'keyword',
        type: 'input',
        label: '关键词',
        placeholder: '搜索姓名、用户名、邮箱',
        inputWidth: '300px',
        clearTrigger: true
      },
      {
        key: 'role',
        type: 'select',
        label: '角色',
        placeholder: '选择角色',
        options: [
          { label: '学生', value: 'student' },
          { label: '教师', value: 'teacher' },
          { label: '管理员', value: 'admin' }
        ],
        changeTrigger: true
      },
      {
        key: 'status',
        type: 'select',
        label: '状态',
        placeholder: '选择状态',
        options: [
          { label: '正常', value: 'active' },
          { label: '已锁定', value: 'locked' },
          { label: '未激活', value: 'inactive' }
        ],
        changeTrigger: true
      },
      {
        key: 'dateRange',
        type: 'date',
        label: '注册时间',
        dateType: 'daterange',
        startPlaceholder: '开始日期',
        endPlaceholder: '结束日期',
        changeTrigger: true
      }
    ],

    // 图书搜索字段
    BOOK: [
      {
        key: 'keyword',
        type: 'input',
        label: '关键词',
        placeholder: '搜索书名、作者、ISBN',
        inputWidth: '300px',
        clearTrigger: true
      },
      {
        key: 'categoryId',
        type: 'select',
        label: '分类',
        placeholder: '选择分类',
        options: [], // 动态加载
        changeTrigger: true
      },
      {
        key: 'status',
        type: 'select',
        label: '状态',
        placeholder: '选择状态',
        options: [
          { label: '可借', value: 'available' },
          { label: '已借出', value: 'borrowed' },
          { label: '维修中', value: 'maintenance' },
          { label: '已下架', value: 'offline' }
        ],
        changeTrigger: true
      },
      {
        key: 'location',
        type: 'select',
        label: '位置',
        placeholder: '选择位置',
        options: [
          { label: 'A区', value: 'A区' },
          { label: 'B区', value: 'B区' },
          { label: 'C区', value: 'C区' },
          { label: 'D区', value: 'D区' }
        ],
        changeTrigger: true
      }
    ],

    // 借阅搜索字段
    BORROW: [
      {
        key: 'keyword',
        type: 'input',
        label: '关键词',
        placeholder: '搜索用户姓名、学号、图书名称',
        inputWidth: '300px',
        clearTrigger: true
      },
      {
        key: 'status',
        type: 'select',
        label: '状态',
        placeholder: '选择状态',
        options: [
          { label: '借阅中', value: 'borrowed' },
          { label: '已归还', value: 'returned' },
          { label: '逾期', value: 'overdue' },
          { label: '已续借', value: 'renewed' }
        ],
        changeTrigger: true
      },
      {
        key: 'dateRange',
        type: 'date',
        label: '借阅时间',
        dateType: 'daterange',
        startPlaceholder: '开始日期',
        endPlaceholder: '结束日期',
        changeTrigger: true
      }
    ]
  }
}

// 导入组件用于默认导出 (TSX版本)
import ProTable from './ProTable.tsx'
import ProForm from './ProForm.tsx'
import FormFieldRender from './FormFieldRender.tsx'
import SearchFilterSimple from './SearchFilterSimple.tsx'
import StatusTag from './StatusTag.vue'
import DetailTabs from './DetailTabs.vue'
import FormCard from './FormCard.vue'
import FileUpload from './FileUpload.vue'
import ConfirmDialog from './ConfirmDialog.vue'
import ThemeManager from './ThemeManager.vue'
import SvgIcon from './SvgIcon.vue'
import ColumnSettings from './ColumnSettings.vue'
import BookCover from './BookCover.vue'

export default {
  ProTable,
  ProForm,
  FormFieldRender,
  SearchFilterSimple,
  StatusTag,
  DetailTabs,
  FormCard,
  FileUpload,
  ConfirmDialog,
  ThemeManager,
  SvgIcon,
  ColumnSettings,
  BookCover,
  registerCommonComponents,
  COMPONENT_CONFIGS,
  COMPONENT_UTILS,
  PRESETS
}
