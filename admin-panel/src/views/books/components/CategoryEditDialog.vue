<template>
  <el-dialog 
    v-model="visible" 
    :title="dialogTitle" 
    width="500px" 
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form ref="formRef" :model="form" :rules="formRules" label-width="80px">
      <el-form-item v-if="isSubCategory" label="父分类" prop="parentName">
        <el-input 
          :value="props.categoryData.parentCategory?.name" 
          disabled 
          placeholder="父分类名称"
        />
      </el-form-item>
      <el-form-item label="分类名称" prop="name">
        <el-input 
          v-model="form.name" 
          placeholder="请输入分类名称" 
          maxlength="50" 
          show-word-limit 
          :disabled="isEdit"
        />
      </el-form-item>
      <el-form-item label="分类描述" prop="description">
        <el-input
          v-model="form.description"
          type="textarea"
          placeholder="请输入分类描述"
          :rows="3"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">
          {{ isEdit ? '保存' : '创建' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  categoryData: {
    type: Object,
    default: () => ({})
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emits = defineEmits(['update:modelValue', 'confirm', 'cancel'])

// Refs
const formRef = ref()

// Computed
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emits('update:modelValue', value)
})

const isEdit = computed(() => {
  return props.categoryData && props.categoryData.name && !props.categoryData.isSubCategory
})

const isSubCategory = computed(() => {
  return props.categoryData && props.categoryData.isSubCategory
})

const dialogTitle = computed(() => {
  if (isEdit.value) return '编辑分类'
  if (isSubCategory.value) return `新增子分类 - ${props.categoryData.parentCategory?.name}`
  return '新增分类'
})

// Form data
const form = reactive({
  name: '',
  description: ''
})

// Form rules
const formRules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 1, max: 50, message: '分类名称长度在 1 到 50 个字符', trigger: 'blur' }
  ]
}

// Watch for category data changes
watch(() => props.categoryData, (newData) => {
  if (newData) {
    form.name = newData.name || ''
    form.description = newData.description || ''
  } else {
    // Reset form for new category
    form.name = ''
    form.description = ''
  }
}, { immediate: true, deep: true })

// Watch for dialog visibility
watch(visible, async (newVisible) => {
  if (newVisible) {
    await nextTick()
    // Clear validation when dialog opens
    if (formRef.value) {
      formRef.value.clearValidate()
    }
  }
})

// Methods
const handleClose = () => {
  visible.value = false
}

const handleCancel = () => {
  emits('cancel')
  handleClose()
}

const handleConfirm = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    const formData = {
      name: form.name,
      description: form.description,
      isEdit: isEdit.value,
      isSubCategory: isSubCategory.value,
      parentCategory: props.categoryData?.parentCategory || null,
      originalName: props.categoryData?.name || ''
    }
    
    emits('confirm', formData)
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

// Reset form
const resetForm = () => {
  form.name = ''
  form.description = ''
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// Expose methods
defineExpose({
  resetForm
})
</script>

<style lang="scss" scoped>
.dialog-footer {
  text-align: right;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--el-border-color-extra-light);
  margin-top: 8px;

  .el-button {
    border-radius: 8px;
    font-weight: 500;
    padding: 10px 20px;
  }
}

:deep(.el-dialog) {
  border-radius: 16px;
  overflow: hidden;

  .el-dialog__header {
    background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
    color: white;
    padding: 20px 20px;
    margin: 0;

    .el-dialog__title {
      color: white;
      font-weight: 600;
    }

    .el-dialog__headerbtn {
      top: 20px;
      right: 20px;

      .el-dialog__close {
        color: white;
        font-size: 18px;

        &:hover {
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
  }

  .el-dialog__body {
    padding: 20px;
  }
}
</style>