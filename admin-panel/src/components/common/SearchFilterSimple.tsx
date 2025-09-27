import { defineComponent, ref, reactive, computed, watch, onMounted, PropType } from 'vue'
import { ElCard, ElForm, ElRow, ElCol, ElFormItem, ElButton, ElAlert, ElMessage, FormInstance } from 'element-plus'
import { Search, Refresh, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import FormFieldRender from './FormFieldRender'
import styles from './SearchFilterSimple.module.scss'

// 类型定义
export interface SearchField {
  name: string
  label: string
  valueType: string
  span?: number
  initialValue?: any
  [key: string]: any
}

export interface SearchActions {
  search?: {
    text?: string
  }
  reset?: {
    text?: string
  }
}

export interface FormData {
  [key: string]: any
}

const SearchFilterSimple = defineComponent({
  name: 'SearchFilterSimple',
  props: {
    // 搜索字段配置，类似 ProForm 的 fields
    fields: {
      type: Array as PropType<SearchField[]>,
      default: () => [],
      validator: (fields: SearchField[]) => fields.every(field => field.name && field.valueType)
    },
    // 表单数据
    modelValue: {
      type: Object as PropType<FormData>,
      default: () => ({})
    },
    // 每行显示的列数
    columns: {
      type: Number,
      default: 5
    },
    // 是否支持折叠
    collapsible: {
      type: Boolean,
      default: true
    },
    // 默认是否折叠
    defaultCollapsed: {
      type: Boolean,
      default: true
    },
    // 折叠时显示的行数
    collapsedRows: {
      type: Number,
      default: 1
    },
    // 是否显示字段标签
    showLabels: {
      type: Boolean,
      default: false
    },
    // 操作按钮配置
    actions: {
      type: Object as PropType<SearchActions>,
      default: () => ({})
    },
    // 加载状态
    loading: {
      type: Boolean,
      default: false
    }
  },
  emits: {
    search: (data: FormData) => true,
    reset: (data: FormData) => true,
    'update:modelValue': (data: FormData) => true,

  },
  setup(props, { emit, expose }) {
    // Refs
    const formRef = ref<FormInstance>()
    const collapsed = ref<boolean>(props.defaultCollapsed)

    // 本地字段配置，支持运行时更新
    const internalFields = ref<SearchField[]>([])

    const syncFields = (fields: SearchField[]) => {
      internalFields.value = (fields || []).map(field => ({ ...field }))
    }

    syncFields(props.fields)

    // Reactive data
    const formData = reactive<FormData>({ ...props.modelValue })

    // Computed properties
    const collapsedFieldCount = computed((): number => {
      return 5 * props.collapsedRows  // 固定5列
    })

    const visibleFields = computed((): SearchField[] => {
      if (!props.collapsible || !collapsed.value) {
        return internalFields.value
      }
      return internalFields.value.slice(0, collapsedFieldCount.value)
    })

    const hiddenFieldsCount = computed((): number => {
      if (!props.collapsible || !collapsed.value) return 0
      return Math.max(0, internalFields.value.length - collapsedFieldCount.value)
    })

    const hasAdvancedFields = computed((): boolean => {
      return props.collapsible && internalFields.value.length > collapsedFieldCount.value
    })

    const showCollapseButton = computed((): boolean => {
      return props.collapsible && hasAdvancedFields.value
    })

    const getFieldSpan = (field: SearchField, index: number): number => {
      // 计算字段占用的栅格数
      if (field.span) return field.span
      
      // 为了让5个字段均匀分布在24栅格中
      // 采用 5+5+5+5+4 = 24 的分配方案
      const positionInRow = index % 5
      return positionInRow < 4 ? 5 : 4
    }

    const actionSpan = computed((): number => {
      // 计算搜索按钮占用的栅格数
      const visibleFieldCount = visibleFields.value.length
      
      if (visibleFieldCount < 5) {
        // 如果字段不满5个，计算已使用的栅格数
        let usedSpan = 0
        for (let i = 0; i < visibleFieldCount; i++) {
          usedSpan += i < 4 ? 5 : 4
        }
        // 搜索按钮占据剩余位置
        return 24 - usedSpan
      } else {
        // 如果字段满5个或更多，搜索按钮占整行
        return 24
      }
    })

    // 判断是否需要搜索按钮换行
    const shouldActionNewRow = computed((): boolean => {
      return visibleFields.value.length >= 5
    })

    // 判断是否只有一行
    const isSingleRow = computed((): boolean => {
      // 只有一行的条件：
      // 1. 没有折叠功能或不需要展开收起
      // 2. 操作按钮不需要换行（字段数 < 5）
      const noCollapse = !props.collapsible || !hasAdvancedFields.value
      const actionInSameRow = !shouldActionNewRow.value
      return noCollapse && actionInSameRow
    })

    // Methods
    const createFieldChangeHandler = (fieldName: string) => (value: any): void => {
      formData[fieldName] = value
    }

    const handleSearch = (): void => {
      emit('update:modelValue', { ...formData })

      // 清理空值
      const searchData: FormData = Object.keys(formData).reduce((acc, key) => {
        const value = formData[key]
        if (value !== '' && value !== null && value !== undefined) {
          // 处理数组值
          if (Array.isArray(value) && value.length > 0) {
            acc[key] = value
          } else if (!Array.isArray(value)) {
            acc[key] = value
          }
        }
        return acc
      }, {} as FormData)
      
      emit('search', searchData)
    }

    const handleReset = (): void => {
      const fieldNames = new Set(internalFields.value.map(field => field.name))
      Object.keys(formData).forEach(key => {
        if (!fieldNames.has(key)) {
          delete formData[key]
          return
        }
        const field = internalFields.value.find(f => f.name === key)
        formData[key] = field?.initialValue ?? ''
      })

      formRef.value?.resetFields()

      const resetData: FormData = { ...formData }
      emit('reset', resetData)
      emit('update:modelValue', resetData)
    }

    const toggleCollapse = (): void => {
      collapsed.value = !collapsed.value
    }

    // 初始化表单数据
    const initFormData = (): void => {
      const fieldNames = new Set(internalFields.value.map(field => field.name))

      Object.keys(formData).forEach(key => {
        if (!fieldNames.has(key)) {
          delete formData[key]
        }
      })

      internalFields.value.forEach(field => {
        if (formData[field.name] === undefined) {
          formData[field.name] = field.initialValue ?? ''
        }
      })
    }

    const setFieldProps = (fieldName: string, updater: Partial<SearchField> | ((field: SearchField) => SearchField)) => {
      const index = internalFields.value.findIndex(field => field.name === fieldName)
      if (index === -1) return
      const currentField = internalFields.value[index]
      const nextField = typeof updater === 'function'
        ? (updater as (field: SearchField) => SearchField)({ ...currentField })
        : { ...currentField, ...updater }
      internalFields.value.splice(index, 1, nextField)
      initFormData()
    }

    const setFields = (fieldsOrUpdater: SearchField[] | ((fields: SearchField[]) => SearchField[])) => {
      const next = typeof fieldsOrUpdater === 'function'
        ? (fieldsOrUpdater as (fields: SearchField[]) => SearchField[])(internalFields.value.map(field => ({ ...field })))
        : fieldsOrUpdater

      if (Array.isArray(next)) {
        syncFields(next)
        initFormData()
      }
    }

    // 监听外部数据变化
    watch(() => props.modelValue, (newValue: FormData) => {
      if (newValue) {
        Object.assign(formData, newValue)
      }
    }, { deep: true })

    watch(() => props.fields, (newFields) => {
      syncFields(newFields)
      initFormData()
    }, { immediate: true, deep: true })

    // 生命周期
    onMounted(() => {
      initFormData()
    })

    expose({
      setFieldProps,
      setFields
    })

    return {
      formRef,
      collapsed,
      formData,
      collapsedFieldCount,
      visibleFields,
      hiddenFieldsCount,
      hasAdvancedFields,
      showCollapseButton,
      getFieldSpan,
      actionSpan,
      shouldActionNewRow,
      isSingleRow,
      createFieldChangeHandler,
      handleSearch,
      handleReset,
      toggleCollapse,
      initFormData
    }
  },
  render() {
    return (
      <div class={styles.proSearchFilter}>
        <ElCard shadow="never" class={styles.searchCard}>
          <ElForm 
            ref="formRef"
            model={this.formData}
            inline={true}
            class={styles.searchForm}
            onSubmit={(e: Event) => {
              e.preventDefault()
              this.handleSearch()
            }}
          >
            {/* 搜索字段区域 */}
            <div class={[styles.searchFields, this.isSingleRow && styles.singleRow]}>
              {/* 搜索字段和操作按钮行 */}
              <ElRow gutter={16}>
                {this.visibleFields.map((field: SearchField, index: number) => (
                  <ElCol
                    key={field.name}
                    span={this.getFieldSpan(field, index)}
                    class={styles.fieldCol}
                  >
                    <ElFormItem 
                      label={this.showLabels ? field.label : ''} 
                      prop={field.name}
                      class={styles.searchFormItem}
                    >
                      <FormFieldRender
                        field={field}
                        value={this.formData[field.name]}
                        formData={this.formData}
                        onChange={this.createFieldChangeHandler(field.name)}
                      />
                    </ElFormItem>
                  </ElCol>
                ))}
                
                {/* 操作按钮在同一行（当字段数小于5时） */}
                {!this.shouldActionNewRow && (
                  <ElCol span={this.actionSpan} class={[styles.fieldCol, styles.actionCol]}>
                    <ElFormItem class={[styles.searchFormItem, styles.actionFormItem]}>
                      <div class={styles.actionButtons}>
                        <ElButton 
                          type="primary" 
                          icon={Search} 
                          loading={this.loading}
                          nativeType="button"
                          onClick={this.handleSearch}
                        >
                          {this.actions.search?.text || '搜索'}
                        </ElButton>
                        
                        <ElButton 
                          icon={Refresh} 
                          nativeType="button"
                          onClick={this.handleReset}
                          disabled={this.loading}
                        >
                          {this.actions.reset?.text || '重置'}
                        </ElButton>
                        
                        {/* 折叠/展开按钮 */}
                        {this.showCollapseButton && (
                          <ElButton
                            text
                            type="primary"
                            icon={this.collapsed ? ArrowDown : ArrowUp}
                            nativeType="button"
                            onClick={this.toggleCollapse}
                            class={styles.collapseBtn}
                          >
                            {this.collapsed ? `展开(${this.hiddenFieldsCount})` : '收起'}
                          </ElButton>
                        )}
                      </div>
                    </ElFormItem>
                  </ElCol>
                )}
              </ElRow>
              
              {/* 操作按钮单独行（当字段数大于等于5时） */}
              {this.shouldActionNewRow && (
                <ElRow gutter={16} class={styles.actionRow}>
                  <ElCol span={this.actionSpan} class={[styles.fieldCol, styles.actionCol]}>
                    <ElFormItem class={[styles.searchFormItem, styles.actionFormItem]}>
                      <div class={styles.actionButtons}>
                        <ElButton 
                          type="primary" 
                          icon={Search} 
                          loading={this.loading}
                          nativeType="button"
                          onClick={this.handleSearch}
                        >
                          {this.actions.search?.text || '搜索'}
                        </ElButton>
                        
                        <ElButton 
                          icon={Refresh} 
                          nativeType="button"
                          onClick={this.handleReset}
                          disabled={this.loading}
                        >
                          {this.actions.reset?.text || '重置'}
                        </ElButton>
                        
                        {/* 折叠/展开按钮 */}
                        {this.showCollapseButton && (
                          <ElButton
                            text
                            type="primary"
                            icon={this.collapsed ? ArrowDown : ArrowUp}
                            nativeType="button"
                            onClick={this.toggleCollapse}
                            class={styles.collapseBtn}
                          >
                            {this.collapsed ? `展开(${this.hiddenFieldsCount})` : '收起'}
                          </ElButton>
                        )}
                      </div>
                    </ElFormItem>
                  </ElCol>
                </ElRow>
              )}
            </div>
            
          </ElForm>
        </ElCard>
      </div>
    )
  }
})

export default SearchFilterSimple