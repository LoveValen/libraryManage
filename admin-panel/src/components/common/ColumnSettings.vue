<template>
  <el-dialog 
    :model-value="modelValue"
    title="列设置" 
    width="500px"
    @update:model-value="$emit('update:modelValue', $event)"
    @open="handleOpen"
    @close="handleClose"
  >
    <div class="column-settings-container">
      <div class="column-settings-list">
        <div 
          v-for="(column, index) in tempColumnOptions" 
          :key="column.value"
          class="column-item"
          :class="{ 'is-disabled': column.required }"
          draggable="true"
          @dragstart="handleDragStart(index)"
          @dragover.prevent="handleDragOver(index)"
          @drop="handleDrop(index)"
          @dragend="handleDragEnd"
        >
          <!-- 拖拽手柄 -->
          <el-icon class="drag-handle" v-if="!column.required">
            <Rank />
          </el-icon>
          <div class="drag-handle-placeholder" v-else></div>
          
          <!-- 复选框 -->
          <el-checkbox
            v-model="tempVisibleColumns"
            :label="column.value"
            :disabled="column.required"
            style="flex: 1; margin: 0;"
          >
            {{ column.label }}
          </el-checkbox>
          
          <!-- 排序按钮 -->
          <div class="sort-buttons" v-if="!column.required">
            <el-button
              :icon="ArrowUp"
              size="small"
              circle
              :disabled="index === 0"
              @click="moveColumn(index, -1)"
            />
            <el-button
              :icon="ArrowDown"
              size="small"
              circle
              :disabled="index === tempColumnOptions.length - 1"
              @click="moveColumn(index, 1)"
            />
          </div>
        </div>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button @click="handleReset">重置</el-button>
      <el-button type="primary" @click="handleApply">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { ArrowUp, ArrowDown, Rank } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  columnOptions: {
    type: Array,
    required: true
  },
  visibleColumns: {
    type: Array,
    required: true
  },
  defaultColumnOptions: {
    type: Array,
    required: true
  },
  defaultVisibleColumns: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:modelValue', 'apply', 'reset'])

// 临时数据
const tempColumnOptions = ref([])
const tempVisibleColumns = ref([])
const draggedIndex = ref(null)

// 监听props变化，同步临时数据
watch(() => props.columnOptions, (newVal) => {
  tempColumnOptions.value = JSON.parse(JSON.stringify(newVal))
}, { immediate: true, deep: true })

watch(() => props.visibleColumns, (newVal) => {
  tempVisibleColumns.value = [...newVal]
}, { immediate: true })

// 对话框打开
const handleOpen = () => {
  tempColumnOptions.value = JSON.parse(JSON.stringify(props.columnOptions))
  tempVisibleColumns.value = [...props.visibleColumns]
}

// 对话框关闭
const handleClose = () => {
  emit('update:modelValue', false)
}

// 应用设置
const handleApply = () => {
  emit('apply', {
    columnOptions: JSON.parse(JSON.stringify(tempColumnOptions.value)),
    visibleColumns: [...tempVisibleColumns.value]
  })
}

// 重置设置
const handleReset = () => {
  tempColumnOptions.value = JSON.parse(JSON.stringify(props.defaultColumnOptions))
  tempVisibleColumns.value = [...props.defaultVisibleColumns]
  emit('reset')
}

// 拖拽开始
const handleDragStart = (index) => {
  draggedIndex.value = index
}

// 拖拽经过
const handleDragOver = (index) => {
  // 防止默认行为
}

// 拖拽放下
const handleDrop = (targetIndex) => {
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) return
  
  const draggedItem = tempColumnOptions.value[draggedIndex.value]
  
  // 移除拖拽的元素
  tempColumnOptions.value.splice(draggedIndex.value, 1)
  
  // 在目标位置插入
  if (draggedIndex.value < targetIndex) {
    tempColumnOptions.value.splice(targetIndex - 1, 0, draggedItem)
  } else {
    tempColumnOptions.value.splice(targetIndex, 0, draggedItem)
  }
  
  draggedIndex.value = null
}

// 拖拽结束
const handleDragEnd = () => {
  draggedIndex.value = null
}

// 移动列（上下按钮）
const moveColumn = (index, direction) => {
  const newIndex = index + direction
  if (newIndex < 0 || newIndex >= tempColumnOptions.value.length) return
  
  // 创建新数组避免响应性问题
  const newOptions = [...tempColumnOptions.value]
  const temp = newOptions[index]
  newOptions[index] = newOptions[newIndex]
  newOptions[newIndex] = temp
  tempColumnOptions.value = newOptions
}
</script>

<style lang="scss" scoped>
// 列设置对话框样式
.column-settings-container {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.column-settings-list {
  display: flex;
  flex-direction: column;
}

.column-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #ffffff;
  border-bottom: 1px solid #ebeef5;
  transition: all 0.2s;
  cursor: move;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background: #f5f7fa;
  }
  
  &.is-disabled {
    cursor: default;
    background: #fafafa;
  }
  
  &[draggable="true"]:active {
    background: #ecf5ff;
    box-shadow: 0 2px 12px rgba(64, 158, 255, 0.15);
    z-index: 10;
    position: relative;
  }
}

.drag-handle {
  margin-right: 12px;
  color: #c0c4cc;
  cursor: move;
  font-size: 14px;
  
  &:hover {
    color: #909399;
  }
}

.drag-handle-placeholder {
  width: 26px;
}

.sort-buttons {
  display: flex;
  gap: 4px;
  margin-left: auto;
  
  .el-button {
    padding: 4px;
    background: transparent;
    border-color: #dcdfe6;
    
    &:hover:not(:disabled) {
      background: #f5f7fa;
      border-color: #c0c4cc;
      color: #409eff;
    }
    
    &:disabled {
      opacity: 0.4;
    }
  }
}
</style>
