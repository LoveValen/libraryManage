import { defineComponent, ref, reactive, computed, watch, nextTick, type PropType } from 'vue'
import {
  ElForm,
  ElFormItem,
  ElRow,
  ElCol,
  ElCard,
  ElButton,
  ElDivider
} from 'element-plus'
import FormFieldRender from './FormFieldRender'
import type { ProFormTypes } from './ProForm.types'

export default defineComponent({
  name: 'ProForm',
  props: {
    fields: {
      type: Array as PropType<ProFormTypes.Field[]>,
      default: () => []
    },
    groups: {
      type: Array as PropType<ProFormTypes.Group[]>,
      default: () => []
    },
    initialValues: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    columns: {
      type: Number,
      default: 1
    },
    labelWidth: {
      type: String,
      default: '100px'
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    actions: {
      type: [Object, Boolean] as PropType<ProFormTypes.Actions | boolean>,
      default: () => ({})
    }
  },
  emits: ['submit', 'reset', 'values-change'],
  setup(props, { emit, expose }) {
    const formRef = ref()
    const formData = reactive<Record<string, any>>({ ...props.initialValues })

    // 计算分组字段
    const groupedFields = computed(() => {
      if (!props.groups.length) {
        return [{ 
          key: 'default', 
          title: '', 
          description: '', 
          fields: props.fields 
        }]
      }

      return props.groups.map(group => ({
        ...group,
        fields: props.fields.filter(field => field.group === group.key)
      }))
    })

    // 监听初始值变化
    watch(() => props.initialValues, (newValues) => {
      Object.assign(formData, newValues)
    }, { deep: true, immediate: true })

    // 监听表单数据变化
    watch(formData, (newValues) => {
      emit('values-change', newValues)
    }, { deep: true })

    // 获取字段值
    const getFieldValue = (fieldName: string) => {
      return formData[fieldName]
    }

    // 设置字段值
    const setFieldValue = (fieldName: string, value: any) => {
      formData[fieldName] = value
    }

    // 获取所有值
    const getValues = () => {
      return { ...formData }
    }

    // 设置所有值
    const setValues = (values: Record<string, any>) => {
      Object.assign(formData, values)
    }

    // 重置表单
    const reset = () => {
      formRef.value?.resetFields()
      Object.assign(formData, props.initialValues)
    }

    // 验证表单
    const validate = async (): Promise<boolean> => {
      try {
        await formRef.value?.validate()
        return true
      } catch {
        return false
      }
    }

    // 验证指定字段
    const validateField = async (fieldName: string): Promise<boolean> => {
      try {
        await formRef.value?.validateField(fieldName)
        return true
      } catch {
        return false
      }
    }

    // 清除验证
    const clearValidate = (fieldNames?: string[]) => {
      formRef.value?.clearValidate(fieldNames)
    }

    // 提交表单
    const handleSubmit = async () => {
      const isValid = await validate()
      if (isValid) {
        emit('submit', getValues())
      }
    }

    // 重置表单
    const handleReset = () => {
      reset()
      emit('reset')
    }

    // 渲染字段
    const renderField = (field: ProFormTypes.Field) => {
      // 检查字段条件显示
      if (field.when && !field.when(formData)) {
        return null
      }

      const span = field.span || Math.floor(24 / props.columns)

      return (
        <ElCol key={field.name} span={span}>
          <ElFormItem
            label={field.label}
            prop={field.name}
            rules={field.rules}
            required={field.required}
          >
            <FormFieldRender
              field={field}
              value={formData[field.name]}
              formData={formData}
              onChange={(value) => setFieldValue(field.name, value)}
            />
            {field.extra && (
              <div class="field-extra">{field.extra}</div>
            )}
          </ElFormItem>
        </ElCol>
      )
    }

    // 渲染分组
    const renderGroup = (group: any) => {
      if (!group.fields.length) return null

      const content = (
        <ElRow gutter={16}>
          {group.fields.map((field: ProFormTypes.Field) => renderField(field))}
        </ElRow>
      )

      if (group.key === 'default') {
        return content
      }

      if (props.groups.length === 1) {
        return (
          <div class="form-group">
            {group.title && (
              <div class="group-header">
                <h4 class="group-title">{group.title}</h4>
                {group.description && (
                  <p class="group-description">{group.description}</p>
                )}
              </div>
            )}
            {content}
          </div>
        )
      }

      return (
        <ElCard key={group.key} shadow="never" class="group-card">
          {{
            header: () => (
              <div class="group-header">
                <h4 class="group-title">{group.title}</h4>
                {group.description && (
                  <p class="group-description">{group.description}</p>
                )}
              </div>
            ),
            default: () => content
          }}
        </ElCard>
      )
    }

    // 渲染操作按钮
    const renderActions = () => {
      if (props.actions === false) return null

      const actions = props.actions || {}

      return (
        <div class="form-actions">
          <ElButton
            type="primary"
            loading={actions.submit?.loading || props.loading}
            disabled={actions.submit?.disabled || props.disabled}
            onClick={actions.submit?.onClick || handleSubmit}
          >
            {actions.submit?.text || '提交'}
          </ElButton>
          
          {actions.reset !== false && (
            <ElButton
              onClick={actions.reset?.onClick || handleReset}
              disabled={actions.reset?.disabled || props.disabled}
            >
              {actions.reset?.text || '重置'}
            </ElButton>
          )}

          {actions.extra}
        </div>
      )
    }

    // 暴露方法
    expose({
      getFieldValue,
      setFieldValue,
      getValues,
      setValues,
      reset,
      validate,
      validateField,
      clearValidate
    })

    return () => (
      <div class="pro-form">
        <ElForm
          ref={formRef}
          model={formData}
          labelWidth={props.labelWidth}
          disabled={props.disabled}
        >
          {groupedFields.value.map(group => renderGroup(group))}
          {props.actions !== false && renderActions()}
        </ElForm>
      </div>
    )
  }
})