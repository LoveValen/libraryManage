import { defineComponent, computed, type PropType } from 'vue'
import {
  ElInput,
  ElSelect,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElCheckbox,
  ElCheckboxGroup,
  ElSwitch,
  ElDatePicker,
  ElTimePicker,
  ElInputNumber,
  ElRate,
  ElSlider,
  ElUpload,
  ElButton,
  ElIcon,
  ElTreeSelect
} from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import type { ProFormTypes } from './ProForm.types'
import OverdueDaysRangeSelector from './OverdueDaysRangeSelector.vue'

export default defineComponent({
  name: 'FormFieldRender',
  props: {
    field: {
      type: Object as PropType<ProFormTypes.Field>,
      required: true
    },
    value: {
      type: [String, Number, Boolean, Array, Object] as PropType<any>,
      default: undefined
    },
    formData: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({})
    },
    onChange: {
      type: Function as PropType<(value: any) => void>,
      required: true
    }
  },
  setup(props) {
    const handleChange = (value: any) => {
      props.onChange(value)
    }

    const renderInput = () => {
      return (
        <ElInput
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          placeholder={props.field.placeholder}
          disabled={props.field.disabled}
          clearable={props.field.clearable !== false}
          show-password={props.field.valueType === 'password'}
          type={props.field.valueType === 'textarea' ? 'textarea' : 'text'}
          rows={props.field.valueType === 'textarea' ? 4 : undefined}
          maxlength={props.field.maxLength}
          show-word-limit={props.field.showWordLimit}
          onInput={handleChange}
          {...props.field.fieldProps}
        />
      )
    }

    const renderSelect = () => {
      const isMultiple = props.field.valueType === 'multipleSelect'
      
      return (
        <ElSelect
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          placeholder={props.field.placeholder}
          disabled={props.field.disabled}
          clearable={props.field.clearable !== false}
          multiple={isMultiple}
          filterable={props.field.filterable}
          remote={props.field.remote}
          remote-method={props.field.remoteMethod}
          onChange={handleChange}
          {...props.field.fieldProps}
        >
          {Array.isArray(props.field.options) && props.field.options?.map(option => (
            <ElOption
              key={option.value}
              label={option.label}
              value={option.value}
              disabled={option.disabled}
            />
          ))}
        </ElSelect>
      )
    }

    const renderRadio = () => {
      return (
        <ElRadioGroup
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          disabled={props.field.disabled}
          onChange={handleChange}
          {...props.field.fieldProps}
        >
          {Array.isArray(props.field.options) && props.field.options?.map(option => (
            <ElRadio key={option.value} label={option.value}>
              {option.label}
            </ElRadio>
          ))}
        </ElRadioGroup>
      )
    }

    const renderCheckbox = () => {
      if (Array.isArray(props.field.options) && props.field.options.length > 1) {
        return (
          <ElCheckboxGroup
            modelValue={props.value}
            onUpdate:modelValue={handleChange}
            disabled={props.field.disabled}
            onChange={handleChange}
            {...props.field.fieldProps}
          >
            {props.field.options.map(option => (
              <ElCheckbox key={option.value} label={option.value}>
                {option.label}
              </ElCheckbox>
            ))}
          </ElCheckboxGroup>
        )
      } else {
        return (
          <ElCheckbox
            modelValue={props.value}
            onUpdate:modelValue={handleChange}
            disabled={props.field.disabled}
            onChange={handleChange}
            {...props.field.fieldProps}
          >
            {Array.isArray(props.field.options) ? props.field.options?.[0]?.label : props.field.label}
          </ElCheckbox>
        )
      }
    }

    const renderSwitch = () => {
      return (
        <ElSwitch
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          disabled={props.field.disabled}
          active-text={props.field.activeText}
          inactive-text={props.field.inactiveText}
          onChange={handleChange}
          {...props.field.fieldProps}
        />
      )
    }

    const renderDatePicker = () => {
      const type = props.field.valueType === 'dateTime' ? 'datetime' :
                   props.field.valueType === 'dateRange' ? 'daterange' :
                   props.field.valueType === 'dateTimeRange' ? 'datetimerange' : 'date'

      const isRangeType = type.includes('range')
      const placeholderConfig = props.field.placeholder
      const fieldProps = props.field.fieldProps || {}

      const singlePlaceholder = !isRangeType
        ? (Array.isArray(placeholderConfig) ? placeholderConfig[0] : placeholderConfig) ?? '选择日期'
        : undefined

      const resolveRangePlaceholder = (index: number, fallback: string) => {
        if (!isRangeType) return undefined
        if (Array.isArray(placeholderConfig)) {
          const direct = placeholderConfig[index]
          if (direct !== undefined && direct !== null && direct !== '') {
            return direct
          }
          const first = placeholderConfig[0]
          if (first !== undefined && first !== null && first !== '') {
            return first
          }
        } else if (typeof placeholderConfig === 'string' && placeholderConfig !== '') {
          return placeholderConfig
        }
        return fallback
      }

      const startPlaceholder = fieldProps['start-placeholder'] ?? fieldProps.startPlaceholder ?? resolveRangePlaceholder(0, '开始日期')
      const endPlaceholder = fieldProps['end-placeholder'] ?? fieldProps.endPlaceholder ?? resolveRangePlaceholder(1, '结束日期')

      return (
        <ElDatePicker
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          type={type}
          placeholder={singlePlaceholder}
          start-placeholder={startPlaceholder}
          end-placeholder={endPlaceholder}
          disabled={props.field.disabled}
          clearable={props.field.clearable !== false}
          format={props.field.format}
          value-format={props.field.valueFormat}
          onChange={handleChange}
          {...fieldProps}
        />
      )
    }

    const renderTimePicker = () => {
      return (
        <ElTimePicker
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          placeholder={props.field.placeholder}
          disabled={props.field.disabled}
          clearable={props.field.clearable !== false}
          format={props.field.format}
          value-format={props.field.valueFormat}
          onChange={handleChange}
          {...props.field.fieldProps}
        />
      )
    }

    const renderNumber = () => {
      return (
        <ElInputNumber
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          placeholder={props.field.placeholder}
          disabled={props.field.disabled}
          min={props.field.min}
          max={props.field.max}
          step={props.field.step}
          precision={props.field.precision}
          controls-position={props.field.controlsPosition}
          onChange={handleChange}
          {...props.field.fieldProps}
        />
      )
    }

    const treeSelectData = computed(() => {
      if (props.field.fieldProps?.data) {
        return props.field.fieldProps.data
      }
      if (Array.isArray(props.field.options)) {
        return props.field.options
      }
      return []
    })

    const renderTreeSelect = () => {
      const fieldProps = { ...(props.field.fieldProps || {}) }
      const dataFromProps = fieldProps.data
      delete fieldProps.data

      return (
        <ElTreeSelect
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          data={dataFromProps ?? treeSelectData.value}
          placeholder={props.field.placeholder}
          disabled={props.field.disabled}
          clearable={props.field.clearable !== false}
          filterable={props.field.filterable}
          onChange={handleChange}
          {...fieldProps}
        />
      )
    }

    const renderRate = () => {
      return (
        <ElRate
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          disabled={props.field.disabled}
          max={props.field.max || 5}
          allow-half={props.field.allowHalf}
          show-text={props.field.showText}
          show-score={props.field.showScore}
          onChange={handleChange}
          {...props.field.fieldProps}
        />
      )
    }

    const renderSlider = () => {
      return (
        <ElSlider
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          disabled={props.field.disabled}
          min={props.field.min}
          max={props.field.max}
          step={props.field.step}
          show-stops={props.field.showStops}
          show-tooltip={props.field.showTooltip}
          range={props.field.range}
          onChange={handleChange}
          {...props.field.fieldProps}
        />
      )
    }

    const renderUpload = () => {
      const isImageUpload = props.field.valueType === 'uploadImage'
      
      return (
        <ElUpload
          action={props.field.action || '/api/upload'}
          list-type={isImageUpload ? 'picture-card' : 'text'}
          file-list={Array.isArray(props.value) ? props.value : props.value ? [props.value] : []}
          onSuccess={(response: any, file: any) => {
            const newValue = props.field.multiple ? 
              [...(Array.isArray(props.value) ? props.value : []), response.data] :
              response.data
            handleChange(newValue)
          }}
          onRemove={(file: any) => {
            if (props.field.multiple && Array.isArray(props.value)) {
              const newValue = props.value.filter((item: any) => item.uid !== file.uid)
              handleChange(newValue)
            } else {
              handleChange(undefined)
            }
          }}
          before-upload={props.field.beforeUpload}
          accept={props.field.accept}
          multiple={props.field.multiple}
          limit={props.field.limit}
          disabled={props.field.disabled}
          {...props.field.fieldProps}
        >
          {isImageUpload ? (
            <ElIcon><Upload /></ElIcon>
          ) : (
            <ElButton>
              <ElIcon><Upload /></ElIcon>
              选择文件
            </ElButton>
          )}
        </ElUpload>
      )
    }

    const renderOverdueDaysRange = () => {
      return (
        <OverdueDaysRangeSelector
          modelValue={props.value}
          onUpdate:modelValue={handleChange}
          onChange={handleChange}
          {...props.field.fieldProps}
        />
      )
    }

    const renderCustom = () => {
      if (props.field.renderFormItem) {
        return props.field.renderFormItem(props.field, props.formData)
      }

      if (props.field.render) {
        return props.field.render(props.value, props.formData)
      }

      return <span>{props.value || '-'}</span>
    }

    const renderField = () => {
      switch (props.field.valueType) {
        case 'text':
        case 'password':
        case 'textarea':
          return renderInput()
        case 'select':
        case 'multipleSelect':
          return renderSelect()
        case 'radio':
          return renderRadio()
        case 'checkbox':
          return renderCheckbox()
        case 'switch':
          return renderSwitch()
        case 'date':
        case 'dateTime':
        case 'dateRange':
        case 'dateTimeRange':
          return renderDatePicker()
        case 'time':
        case 'timeRange':
          return renderTimePicker()
        case 'number':
          return renderNumber()
        case 'rate':
          return renderRate()
        case 'slider':
          return renderSlider()
        case 'treeSelect':
          return renderTreeSelect()
        case 'upload':
        case 'uploadImage':
          return renderUpload()
        case 'overdueDaysRange':
          return renderOverdueDaysRange()
        default:
          return renderCustom()
      }
    }

    return () => renderField()
  }
})
