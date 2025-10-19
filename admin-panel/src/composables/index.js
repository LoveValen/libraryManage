/**
 * Composables 统一导出
 * 方便组件中统一导入使用
 */

// 列设置
export { useColumnSettings } from './useColumnSettings'

// 表格高度管理
export { useTableHeight, TABLE_HEIGHT_PRESETS, getTableHeightPreset } from './useTableHeight'

// 主题管理
export { useTheme } from './useTheme'

// 搜索过滤器
export { useSearchFilter, SEARCH_FILTER_PRESETS } from './useSearchFilter'

// 表格请求
export { useTableRequest } from './useTableRequest'

// 菜单搜索
export { useMenuSearch } from './useMenuSearch'

// API 请求封装
export {
  useRequest,
  useListRequest,
  useMutationRequest,
  useDetailRequest
} from './useRequest'

// 表单处理
export {
  useForm,
  useEditForm,
  useSearchForm
} from './useForm'

// 对话框管理
export {
  useDialog,
  useFormDialog,
  useDetailDialog,
  useConfirmDialog,
  useStepDialog,
  useDrawer
} from './useDialog'

// LocalStorage 工具
export { useLocalStorage, deepClone } from './useLocalStorage'
