<template>
  <el-dialog v-model="visible" title="备份设置" width="800px" :before-close="handleClose">
    <div class="backup-settings-dialog">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="备份类型" prop="type">
              <el-select v-model="form.type" placeholder="请选择备份类型">
                <el-option label="完整备份" value="full" />
                <el-option label="增量备份" value="incremental" />
                <el-option label="差异备份" value="differential" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="备份频率" prop="frequency">
              <el-select v-model="form.frequency" placeholder="请选择备份频率">
                <el-option label="每日" value="daily" />
                <el-option label="每周" value="weekly" />
                <el-option label="每月" value="monthly" />
                <el-option label="自定义" value="custom" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="保留天数" prop="retentionDays">
              <el-input-number v-model="form.retentionDays" :min="1" :max="365" placeholder="天" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="压缩格式" prop="compression">
              <el-select v-model="form.compression" placeholder="请选择压缩格式">
                <el-option label="ZIP" value="zip" />
                <el-option label="TAR.GZ" value="tar.gz" />
                <el-option label="7Z" value="7z" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备份路径" prop="path">
          <el-input v-model="form.path" placeholder="请输入备份存储路径" clearable>
            <template #append>
              <el-button icon="Folder" @click="selectPath">选择</el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item label="备份内容" prop="content">
          <el-checkbox-group v-model="form.content">
            <el-checkbox label="database" border>数据库</el-checkbox>
            <el-checkbox label="files" border>文件</el-checkbox>
            <el-checkbox label="config" border>配置</el-checkbox>
            <el-checkbox label="logs" border>日志</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="邮件通知" prop="emailNotification">
          <el-switch v-model="form.emailNotification" />
          <span class="ml-2 text-gray-500">备份完成后发送邮件通知</span>
        </el-form-item>

        <el-form-item label="通知邮箱" prop="notificationEmail" v-if="form.emailNotification">
          <el-input v-model="form.notificationEmail" placeholder="请输入通知邮箱地址" type="email" />
        </el-form-item>
      </el-form>
    </div>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm" :loading="loading">保存设置</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  settings: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue', 'success'])

// 响应式数据
const visible = ref(props.modelValue)
const loading = ref(false)
const formRef = ref(null)

const form = reactive({
  type: 'full',
  frequency: 'daily',
  retentionDays: 30,
  compression: 'zip',
  path: '/backup',
  content: ['database', 'files'],
  emailNotification: false,
  notificationEmail: ''
})

const rules = {
  type: [{ required: true, message: '请选择备份类型', trigger: 'change' }],
  frequency: [{ required: true, message: '请选择备份频率', trigger: 'change' }],
  retentionDays: [{ required: true, message: '请输入保留天数', trigger: 'blur' }],
  path: [{ required: true, message: '请输入备份路径', trigger: 'blur' }],
  content: [{ required: true, message: '请选择备份内容', trigger: 'change' }],
  notificationEmail: [
    {
      required: true,
      message: '请输入通知邮箱',
      trigger: 'blur',
      validator: (rule, value, callback) => {
        if (form.emailNotification && !value) {
          callback(new Error('请输入通知邮箱'))
        } else {
          callback()
        }
      }
    }
  ]
}

// 监听visible变化
watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val && props.settings) {
      Object.assign(form, props.settings)
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

// 方法
const handleClose = () => {
  visible.value = false
  resetForm()
}

const resetForm = () => {
  formRef.value?.clearValidate()
}

const selectPath = () => {
  // 这里可以实现文件路径选择器
  ElMessage.info('文件路径选择功能待实现')
}

const handleConfirm = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    // 这里应该调用API保存备份设置
    // await systemApi.saveBackupSettings(form)

    ElMessage.success('备份设置保存成功')
    emit('success', { ...form })
    handleClose()
  } catch (error) {
    console.error('保存备份设置失败:', error)
    ElMessage.error('保存备份设置失败')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.backup-settings-dialog {
  padding: 20px 0;

  .ml-2 {
    margin-left: 8px;
  }

  .text-gray-500 {
    color: #6b7280;
  }
}
</style>
