import { VNode, Component, Ref } from 'vue'
import { FormRules } from 'element-plus'

/**
 * 表单字段值类型
 */
export type FormValueType = 
  | 'text'
  | 'password'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multipleSelect'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'slider'
  | 'rate'
  | 'date'
  | 'dateTime'
  | 'dateRange'
  | 'dateTimeRange'
  | 'time'
  | 'timeRange'
  | 'upload'
  | 'uploadImage'
  | 'uploadFile'
  | 'editor'
  | 'treeSelect'
  | 'cascader'
  | 'colorPicker'
  | 'custom'

/**
 * 表单布局类型
 */
export type FormLayoutType = 'horizontal' | 'vertical' | 'inline'

/**
 * 表单大小
 */
export type FormSize = 'large' | 'default' | 'small'

/**
 * 选项配置
 */
export interface FormOptionItem {
  /** 选项标签 */
  label: string
  /** 选项值 */
  value: string | number | boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 子选项（用于级联选择） */
  children?: FormOptionItem[]
  /** 其他属性 */
  [key: string]: any
}

/**
 * 表单字段配置
 */
export interface ProFormField {
  /** 字段名 */
  name: string
  /** 字段标签 */
  label: string
  /** 字段类型 */
  valueType?: FormValueType
  /** 初始值 */
  initialValue?: any
  /** 占位符 */
  placeholder?: string
  /** 是否必填 */
  required?: boolean
  /** 是否禁用 */
  disabled?: boolean | ((formData: any) => boolean)
  /** 是否只读 */
  readonly?: boolean
  /** 是否隐藏 */
  hidden?: boolean | ((formData: any) => boolean)
  /** 字段宽度 */
  width?: string | number
  /** 列占比（24栅格） */
  span?: number
  /** 列偏移 */
  offset?: number
  /** 标签宽度 */
  labelWidth?: string | number
  /** 选项配置 */
  options?: FormOptionItem[] | (() => Promise<FormOptionItem[]>)
  /** 验证规则 */
  rules?: FormRules[string]
  /** 提示信息 */
  tooltip?: string | VNode
  /** 额外信息 */
  extra?: string | VNode
  /** 字段属性 */
  fieldProps?: Record<string, any>
  /** 表单项属性 */
  formItemProps?: Record<string, any>
  /** 自定义渲染 */
  render?: (value: any, formData: any) => VNode | string
  /** 自定义渲染表单项 */
  renderFormItem?: (field: ProFormField, formData: any) => VNode
  /** 值变化事件 */
  onChange?: (value: any, formData: any) => void
  /** 字段依赖 */
  dependencies?: string[]
  /** 条件渲染 */
  when?: (values: Record<string, any>) => boolean
  /** 字段组 */
  group?: string
  /** 字段排序 */
  order?: number
  /** 是否可搜索（用于select等） */
  filterable?: boolean
  /** 是否允许创建新项（用于select等） */
  allowCreate?: boolean
  /** 最小值（用于number等） */
  min?: number
  /** 最大值（用于number等） */
  max?: number
  /** 步长（用于number等） */
  step?: number
  /** 最小长度 */
  minLength?: number
  /** 最大长度 */
  maxLength?: number
  /** 文件类型限制（用于upload） */
  accept?: string
  /** 文件大小限制（用于upload，单位MB） */
  maxSize?: number
  /** 自定义样式类 */
  className?: string
  /** 自定义样式 */
  style?: Record<string, any>
}

/**
 * 表单分组配置
 */
export interface FormGroupConfig {
  /** 分组标题 */
  title: string
  /** 分组key */
  key: string
  /** 是否可折叠 */
  collapsible?: boolean
  /** 默认是否展开 */
  defaultExpanded?: boolean
  /** 分组描述 */
  description?: string
  /** 分组样式 */
  className?: string
  /** 字段列表 */
  fields?: ProFormField[]
}

/**
 * 表单提交配置
 */
export interface SubmitConfig {
  /** 提交按钮文本 */
  text?: string
  /** 按钮类型 */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  /** 按钮大小 */
  size?: FormSize
  /** 是否显示加载状态 */
  loading?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 自定义图标 */
  icon?: Component
  /** 按钮宽度 */
  width?: string | number
  /** 点击事件 */
  onClick?: (formData: any) => void | Promise<void>
}

/**
 * 重置配置
 */
export interface ResetConfig {
  /** 重置按钮文本 */
  text?: string
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  /** 按钮大小 */
  size?: FormSize
  /** 是否显示 */
  show?: boolean
  /** 自定义图标 */
  icon?: Component
  /** 点击事件 */
  onClick?: (formData: any) => void
}

/**
 * 操作按钮配置
 */
export interface FormActionConfig {
  /** 提交配置 */
  submit?: SubmitConfig | false
  /** 重置配置 */
  reset?: ResetConfig | false
  /** 自定义操作按钮 */
  render?: (formData: any, actions: { submit: () => void; reset: () => void }) => VNode | VNode[]
  /** 按钮对齐方式 */
  align?: 'left' | 'center' | 'right'
  /** 是否固定到底部 */
  fixed?: boolean
}

/**
 * ProForm 组件属性
 */
export interface ProFormProps {
  /** 表单字段配置 */
  fields: ProFormField[]
  /** 表单初始值 */
  initialValues?: Record<string, any>
  /** 表单布局 */
  layout?: FormLayoutType
  /** 表单尺寸 */
  size?: FormSize
  /** 标签宽度 */
  labelWidth?: string | number
  /** 标签位置 */
  labelPosition?: 'left' | 'right' | 'top'
  /** 是否显示必填星号 */
  requireAsteriskPosition?: 'left' | 'right'
  /** 是否隐藏必填星号 */
  hideRequiredAsterisk?: boolean
  /** 栅格间距 */
  gutter?: number
  /** 每行列数 */
  columns?: number
  /** 是否禁用整个表单 */
  disabled?: boolean
  /** 是否只读 */
  readonly?: boolean
  /** 提交函数 */
  onSubmit?: (values: Record<string, any>) => void | Promise<void>
  /** 值变化事件 */
  onValuesChange?: (changedValues: Record<string, any>, allValues: Record<string, any>) => void
  /** 表单验证失败事件 */
  onValidateFail?: (errors: any) => void
  /** 操作按钮配置 */
  actions?: FormActionConfig
  /** 分组配置 */
  groups?: FormGroupConfig[]
  /** 是否显示折叠功能 */
  collapsible?: boolean
  /** 默认折叠状态 */
  defaultCollapsed?: boolean
  /** 自动滚动到错误字段 */
  scrollToError?: boolean
  /** 保留字段值（切换时不清空） */
  preserve?: boolean
  /** 自定义样式类 */
  className?: string
  /** 加载状态 */
  loading?: boolean
  /** 表单模式 */
  mode?: 'create' | 'edit' | 'view'
}

/**
 * 表单实例方法
 */
export interface ProFormInstance {
  /** 提交表单 */
  submit: () => Promise<any>
  /** 验证表单 */
  validate: () => Promise<boolean>
  /** 验证指定字段 */
  validateField: (field: string | string[]) => Promise<boolean>
  /** 重置表单 */
  reset: () => void
  /** 重置指定字段 */
  resetField: (field: string | string[]) => void
  /** 清空验证 */
  clearValidate: (field?: string | string[]) => void
  /** 获取表单值 */
  getValues: () => Record<string, any>
  /** 设置表单值 */
  setValues: (values: Record<string, any>) => void
  /** 获取字段值 */
  getFieldValue: (field: string) => any
  /** 设置字段值 */
  setFieldValue: (field: string, value: any) => void
  /** 设置字段属性 */
  setFieldProps: (field: string, props: Record<string, any>) => void
  /** 获取字段实例 */
  getFieldInstance: (field: string) => any
  /** 滚动到指定字段 */
  scrollToField: (field: string) => void
}

/**
 * 表单验证结果
 */
export interface FormValidateResult {
  /** 是否验证通过 */
  valid: boolean
  /** 验证错误信息 */
  errors?: Record<string, string[]>
  /** 表单值 */
  values?: Record<string, any>
}

/**
 * 字段渲染上下文
 */
export interface FieldRenderContext {
  /** 字段配置 */
  field: ProFormField
  /** 字段值 */
  value: any
  /** 表单数据 */
  formData: Record<string, any>
  /** 更新字段值 */
  onChange: (value: any) => void
  /** 表单实例 */
  formInstance: ProFormInstance
  /** 是否禁用 */
  disabled: boolean
  /** 是否只读 */
  readonly: boolean
}

/**
 * 表单字段构建器
 */
export class ProFormFieldBuilder {
  private field: ProFormField

  constructor(name: string, label: string) {
    this.field = { name, label }
  }

  valueType(type: FormValueType): this {
    this.field.valueType = type
    return this
  }

  placeholder(text: string): this {
    this.field.placeholder = text
    return this
  }

  required(required = true): this {
    this.field.required = required
    return this
  }

  disabled(disabled: boolean | ((formData: any) => boolean) = true): this {
    this.field.disabled = disabled
    return this
  }

  readonly(readonly = true): this {
    this.field.readonly = readonly
    return this
  }

  hidden(hidden: boolean | ((formData: any) => boolean) = true): this {
    this.field.hidden = hidden
    return this
  }

  span(span: number): this {
    this.field.span = span
    return this
  }

  width(width: string | number): this {
    this.field.width = width
    return this
  }

  options(options: FormOptionItem[] | (() => Promise<FormOptionItem[]>)): this {
    this.field.options = options
    return this
  }

  rules(rules: FormRules[string]): this {
    this.field.rules = rules
    return this
  }

  tooltip(tooltip: string | VNode): this {
    this.field.tooltip = tooltip
    return this
  }

  extra(extra: string | VNode): this {
    this.field.extra = extra
    return this
  }

  initialValue(value: any): this {
    this.field.initialValue = value
    return this
  }

  onChange(handler: (value: any, formData: any) => void): this {
    this.field.onChange = handler
    return this
  }

  dependencies(deps: string[]): this {
    this.field.dependencies = deps
    return this
  }

  when(condition: (values: Record<string, any>) => boolean): this {
    this.field.when = condition
    return this
  }

  group(groupKey: string): this {
    this.field.group = groupKey
    return this
  }

  render(renderFn: ProFormField['render']): this {
    this.field.render = renderFn
    return this
  }

  renderFormItem(renderFn: ProFormField['renderFormItem']): this {
    this.field.renderFormItem = renderFn
    return this
  }

  fieldProps(props: Record<string, any>): this {
    this.field.fieldProps = props
    return this
  }

  formItemProps(props: Record<string, any>): this {
    this.field.formItemProps = props
    return this
  }

  build(): ProFormField {
    return { ...this.field }
  }
}

/**
 * 创建表单字段的辅助函数
 */
export const createFormField = (name: string, label: string): ProFormFieldBuilder => {
  return new ProFormFieldBuilder(name, label)
}

/**
 * 常用表单字段预设
 */
export const commonFormFields = {
  /** 文本输入框 */
  input: (name: string, label: string, options?: Partial<ProFormField>): ProFormField => ({
    name,
    label,
    valueType: 'text',
    ...options
  }),

  /** 密码输入框 */
  password: (name: string, label: string, options?: Partial<ProFormField>): ProFormField => ({
    name,
    label,
    valueType: 'password',
    ...options
  }),

  /** 文本域 */
  textarea: (name: string, label: string, options?: Partial<ProFormField>): ProFormField => ({
    name,
    label,
    valueType: 'textarea',
    fieldProps: {
      rows: 4,
      showWordLimit: true
    },
    ...options
  }),

  /** 数字输入框 */
  number: (name: string, label: string, options?: Partial<ProFormField>): ProFormField => ({
    name,
    label,
    valueType: 'number',
    fieldProps: {
      precision: 2,
      step: 1
    },
    ...options
  }),

  /** 选择器 */
  select: (name: string, label: string, options: FormOptionItem[], fieldOptions?: Partial<ProFormField>): ProFormField => ({
    name,
    label,
    valueType: 'select',
    options,
    fieldProps: {
      placeholder: `请选择${label}`,
      clearable: true,
      filterable: true
    },
    ...fieldOptions
  }),

  /** 日期选择器 */
  date: (name: string, label: string, options?: Partial<ProFormField>): ProFormField => ({
    name,
    label,
    valueType: 'date',
    fieldProps: {
      placeholder: `请选择${label}`,
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD'
    },
    ...options
  }),

  /** 开关 */
  switch: (name: string, label: string, options?: Partial<ProFormField>): ProFormField => ({
    name,
    label,
    valueType: 'switch',
    initialValue: false,
    ...options
  }),

  /** 隐藏字段 */
  hidden: (name: string, initialValue?: any): ProFormField => ({
    name,
    label: '',
    hidden: true,
    initialValue
  })
}