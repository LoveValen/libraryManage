<template>
  <div class="overdue-days-range-selector">
    <el-input-number
      v-model="localValue[0]"
      :min="0"
      :max="localValue[1] || 999"
      :placeholder="minPlaceholder"
      :disabled="disabled"
      @change="handleMinChange"
      class="range-input"
    />
    <span class="range-separator">{{ separator }}</span>
    <el-input-number
      v-model="localValue[1]"
      :min="localValue[0] || 0"
      :max="999"
      :placeholder="maxPlaceholder"
      :disabled="disabled"
      @change="handleMaxChange"
      class="range-input"
    />
    <span v-if="showUnit" class="range-unit">{{ unit }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElInputNumber } from 'element-plus'

interface Props {
  modelValue?: [number | null, number | null] | null
  disabled?: boolean
  min?: number
  max?: number
  separator?: string
  minPlaceholder?: string
  maxPlaceholder?: string
  showUnit?: boolean
  unit?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [null, null],
  disabled: false,
  min: 0,
  max: 999,
  separator: '至',
  minPlaceholder: '最小天数',
  maxPlaceholder: '最大天数',
  showUnit: true,
  unit: '天'
})

const emit = defineEmits<{
  'update:modelValue': [value: [number | null, number | null]]
  'change': [value: [number | null, number | null]]
}>()

const localValue = ref<[number | null, number | null]>([null, null])

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal && Array.isArray(newVal)) {
      localValue.value = [...newVal] as [number | null, number | null]
    } else {
      localValue.value = [null, null]
    }
  },
  { immediate: true }
)

const handleMinChange = (value: number | null) => {
  const newValue: [number | null, number | null] = [value, localValue.value[1]]
  
  // Ensure min is not greater than max
  if (value !== null && localValue.value[1] !== null && value > localValue.value[1]) {
    newValue[1] = value
  }
  
  localValue.value = newValue
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

const handleMaxChange = (value: number | null) => {
  const newValue: [number | null, number | null] = [localValue.value[0], value]
  
  // Ensure max is not less than min
  if (value !== null && localValue.value[0] !== null && value < localValue.value[0]) {
    newValue[0] = value
  }
  
  localValue.value = newValue
  emit('update:modelValue', newValue)
  emit('change', newValue)
}
</script>

<style scoped lang="scss">
.overdue-days-range-selector {
  display: inline-flex;
  align-items: center;
  gap: 8px;

  .range-input {
    width: 120px;
  }

  .range-separator {
    color: #909399;
    padding: 0 4px;
  }

  .range-unit {
    color: #606266;
    margin-left: 4px;
  }
}
</style>