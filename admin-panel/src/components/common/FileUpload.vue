<template>
  <div class="file-upload" :class="{ 'file-upload--disabled': disabled }">
    <!-- 拖拽上传 -->
    <el-upload
      v-if="uploadType === 'drag'"
      ref="uploadRef"
      :action="action"
      :headers="headers"
      :data="data"
      :name="name"
      :with-credentials="withCredentials"
      :multiple="multiple"
      :accept="accept"
      :file-list="fileList"
      :auto-upload="autoUpload"
      :disabled="disabled"
      :limit="limit"
      :show-file-list="showFileList"
      :drag="true"
      :before-upload="handleBeforeUpload"
      :on-progress="handleProgress"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-remove="handleRemove"
      :on-exceed="handleExceed"
      :on-change="handleChange"
      class="upload-dragger"
    >
      <div class="upload-content">
        <el-icon class="upload-icon" :size="iconSize">
          <component :is="uploadIcon" />
        </el-icon>
        <div class="upload-text">
          <p class="upload-title">{{ uploadTitle }}</p>
          <p class="upload-hint">{{ uploadHint }}</p>
        </div>
      </div>
    </el-upload>

    <!-- 按钮上传 -->
    <el-upload
      v-else-if="uploadType === 'button'"
      ref="uploadRef"
      :action="action"
      :headers="headers"
      :data="data"
      :name="name"
      :with-credentials="withCredentials"
      :multiple="multiple"
      :accept="accept"
      :file-list="fileList"
      :auto-upload="autoUpload"
      :disabled="disabled"
      :limit="limit"
      :show-file-list="showFileList"
      :before-upload="handleBeforeUpload"
      :on-progress="handleProgress"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-remove="handleRemove"
      :on-exceed="handleExceed"
      :on-change="handleChange"
      class="upload-button"
    >
      <template #trigger>
        <el-button :type="buttonType" :size="buttonSize" :icon="buttonIcon" :loading="uploading" :disabled="disabled">
          {{ buttonText }}
        </el-button>
      </template>

      <template #tip v-if="uploadHint">
        <div class="el-upload__tip">{{ uploadHint }}</div>
      </template>
    </el-upload>

    <!-- 头像上传 -->
    <el-upload
      v-else-if="uploadType === 'avatar'"
      ref="uploadRef"
      :action="action"
      :headers="headers"
      :data="data"
      :name="name"
      :with-credentials="withCredentials"
      :accept="accept"
      :auto-upload="autoUpload"
      :disabled="disabled"
      :show-file-list="false"
      :before-upload="handleBeforeUpload"
      :on-progress="handleProgress"
      :on-success="handleAvatarSuccess"
      :on-error="handleError"
      class="upload-avatar"
    >
      <div class="avatar-container" :style="avatarStyle">
        <img v-if="avatarUrl" :src="avatarUrl" class="avatar-image" :alt="avatarAlt" />
        <div v-else class="avatar-placeholder">
          <el-icon :size="avatarIconSize">
            <component :is="avatarIcon" />
          </el-icon>
        </div>

        <div class="avatar-overlay">
          <el-icon :size="20">
            <Camera />
          </el-icon>
        </div>

        <div v-if="uploading" class="avatar-loading">
          <el-progress type="circle" :percentage="uploadProgress" :width="60" :show-text="false" />
        </div>
      </div>
    </el-upload>

    <!-- 卡片上传 -->
    <el-upload
      v-else-if="uploadType === 'card'"
      ref="uploadRef"
      :action="action"
      :headers="headers"
      :data="data"
      :name="name"
      :with-credentials="withCredentials"
      :multiple="multiple"
      :accept="accept"
      :file-list="fileList"
      :auto-upload="autoUpload"
      :disabled="disabled"
      :limit="limit"
      :list-type="'picture-card'"
      :before-upload="handleBeforeUpload"
      :on-progress="handleProgress"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-remove="handleRemove"
      :on-exceed="handleExceed"
      :on-change="handleChange"
      :on-preview="handlePreview"
      class="upload-card"
    >
      <el-icon :size="28">
        <Plus />
      </el-icon>
    </el-upload>

    <!-- 自定义上传区域 -->
    <div v-else-if="uploadType === 'custom'" class="upload-custom">
      <slot
        name="upload"
        :upload="uploadFiles"
        :uploading="uploading"
        :progress="uploadProgress"
        :file-list="fileList"
      />
    </div>

    <!-- 上传进度 -->
    <div v-if="showProgress && uploading && uploadType !== 'avatar'" class="upload-progress">
      <el-progress :percentage="uploadProgress" :status="progressStatus" :stroke-width="progressStrokeWidth" />
    </div>

    <!-- 文件列表（自定义） -->
    <div v-if="customFileList && fileList.length > 0" class="custom-file-list">
      <div
        v-for="(file, index) in fileList"
        :key="file.uid || index"
        class="file-item"
        :class="{ 'file-item--error': file.status === 'fail' }"
      >
        <div class="file-info">
          <el-icon class="file-icon">
            <component :is="getFileIcon(file)" />
          </el-icon>
          <div class="file-details">
            <div class="file-name" :title="file.name">{{ file.name }}</div>
            <div class="file-meta">
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
              <span v-if="file.status === 'uploading'" class="file-progress">{{ file.percentage }}%</span>
              <span v-else-if="file.status === 'success'" class="file-status success">上传成功</span>
              <span v-else-if="file.status === 'fail'" class="file-status error">上传失败</span>
            </div>
          </div>
        </div>

        <div class="file-actions">
          <el-button v-if="file.url" type="primary" link size="small" @click="handlePreview(file)">预览</el-button>
          <el-button v-if="file.url" type="primary" link size="small" @click="handleDownload(file)">下载</el-button>
          <el-button type="danger" link size="small" @click="handleRemove(file)">删除</el-button>
        </div>
      </div>
    </div>

    <!-- 图片预览对话框 -->
    <el-dialog v-model="previewVisible" title="图片预览" width="800px">
      <img :src="previewUrl" alt="预览图片" style="width: 100%; height: auto" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { showError, showSuccess, showWarning } from '@/utils/message'

// Props 定义
const props = defineProps({
  // 上传类型
  uploadType: {
    type: String,
    default: 'drag',
    validator: value => ['drag', 'button', 'avatar', 'card', 'custom'].includes(value)
  },

  // 上传配置
  action: String,
  headers: Object,
  data: Object,
  name: {
    type: String,
    default: 'file'
  },
  withCredentials: Boolean,
  multiple: Boolean,
  accept: String,
  autoUpload: {
    type: Boolean,
    default: true
  },
  disabled: Boolean,
  limit: Number,

  // 文件列表
  fileList: {
    type: Array,
    default: () => []
  },
  showFileList: {
    type: Boolean,
    default: true
  },
  customFileList: Boolean,

  // 文件大小限制（MB）
  maxSize: {
    type: Number,
    default: 10
  },

  // 允许的文件类型
  allowedTypes: Array,

  // 拖拽上传样式
  uploadTitle: {
    type: String,
    default: '点击或拖拽文件到此区域上传'
  },
  uploadHint: {
    type: String,
    default: '支持单个或批量上传'
  },
  uploadIcon: {
    type: String,
    default: 'Upload'
  },
  iconSize: {
    type: Number,
    default: 64
  },

  // 按钮上传样式
  buttonText: {
    type: String,
    default: '选择文件'
  },
  buttonType: {
    type: String,
    default: 'primary'
  },
  buttonSize: {
    type: String,
    default: 'default'
  },
  buttonIcon: String,

  // 头像上传
  avatarUrl: String,
  avatarSize: {
    type: Number,
    default: 120
  },
  avatarShape: {
    type: String,
    default: 'circle',
    validator: value => ['circle', 'square'].includes(value)
  },
  avatarIcon: {
    type: String,
    default: 'User'
  },
  avatarIconSize: {
    type: Number,
    default: 40
  },
  avatarAlt: {
    type: String,
    default: '头像'
  },

  // 进度显示
  showProgress: {
    type: Boolean,
    default: true
  },
  progressStrokeWidth: {
    type: Number,
    default: 6
  },

  // 预处理
  beforeUpload: Function,

  // 响应式数据绑定
  modelValue: [String, Array]
})

// 事件定义
const emit = defineEmits(['update:modelValue', 'success', 'error', 'progress', 'change', 'remove', 'exceed', 'preview'])

// 响应式数据
const uploadRef = ref()
const uploading = ref(false)
const uploadProgress = ref(0)
const previewVisible = ref(false)
const previewUrl = ref('')

// 计算属性
const avatarStyle = computed(() => ({
  width: `${props.avatarSize}px`,
  height: `${props.avatarSize}px`,
  borderRadius: props.avatarShape === 'circle' ? '50%' : '8px'
}))

const progressStatus = computed(() => {
  if (uploadProgress.value === 100) return 'success'
  if (uploadProgress.value > 0) return undefined
  return undefined
})

// 方法
const handleBeforeUpload = file => {
  // 文件大小检查
  if (props.maxSize && file.size / 1024 / 1024 > props.maxSize) {
    showError(`文件大小不能超过 ${props.maxSize}MB`)
    return false
  }

  // 文件类型检查
  if (props.allowedTypes && props.allowedTypes.length > 0) {
    const fileType = file.type
    const fileName = file.name
    const fileExt = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase()

    const isAllowed = props.allowedTypes.some(type => {
      if (type.includes('/')) {
        return fileType === type
      } else {
        return fileExt === type
      }
    })

    if (!isAllowed) {
      showError(`只支持 ${props.allowedTypes.join(', ')} 格式的文件`)
      return false
    }
  }

  // 自定义验证
  if (props.beforeUpload) {
    const result = props.beforeUpload(file)
    if (result === false) return false
  }

  uploading.value = true
  uploadProgress.value = 0

  return true
}

const handleProgress = (event, file, fileList) => {
  uploadProgress.value = Math.round(event.percent)
  emit('progress', event, file, fileList)
}

const handleSuccess = (response, file, fileList) => {
  uploading.value = false
  uploadProgress.value = 100

  // 更新模型值
  if (props.multiple) {
    const urls = fileList.filter(f => f.status === 'success').map(f => f.response?.url || f.url)
    emit('update:modelValue', urls)
  } else {
    emit('update:modelValue', response?.url || file.url)
  }

  emit('success', response, file, fileList)
  showSuccess('文件上传成功')
}

const handleAvatarSuccess = (response, file) => {
  uploading.value = false
  uploadProgress.value = 100

  const url = response?.url || file.url
  emit('update:modelValue', url)
  emit('success', response, file)
  showSuccess('头像上传成功')
}

const handleError = (error, file, fileList) => {
  uploading.value = false
  uploadProgress.value = 0

  emit('error', error, file, fileList)
  showError('文件上传失败')
}

const handleRemove = (file, fileList) => {
  emit('remove', file, fileList)

  // 更新模型值
  if (props.multiple && fileList) {
    const urls = fileList.filter(f => f.status === 'success').map(f => f.response?.url || f.url)
    emit('update:modelValue', urls)
  } else if (!props.multiple) {
    emit('update:modelValue', '')
  }
}

const handleExceed = (files, fileList) => {
  emit('exceed', files, fileList)
  showWarning(`最多只能上传 ${props.limit} 个文件`)
}

const handleChange = (file, fileList) => {
  emit('change', file, fileList)
}

const handlePreview = file => {
  if (isImageFile(file)) {
    previewUrl.value = file.url
    previewVisible.value = true
  } else {
    window.open(file.url, '_blank')
  }
  emit('preview', file)
}

const handleDownload = file => {
  const link = document.createElement('a')
  link.href = file.url
  link.download = file.name
  link.click()
}

// 工具方法
const isImageFile = file => {
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
  const fileName = file.name || ''
  const fileType = file.type || ''
  const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase()

  return imageTypes.includes(ext) || fileType.startsWith('image/')
}

const getFileIcon = file => {
  const fileName = file.name || ''
  const ext = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase()

  const iconMap = {
    // 图片
    jpg: 'Picture',
    jpeg: 'Picture',
    png: 'Picture',
    gif: 'Picture',
    bmp: 'Picture',
    webp: 'Picture',
    // 文档
    pdf: 'Document',
    doc: 'Document',
    docx: 'Document',
    txt: 'Document',
    // 表格
    xls: 'Tickets',
    xlsx: 'Tickets',
    csv: 'Tickets',
    // 演示文稿
    ppt: 'Monitor',
    pptx: 'Monitor',
    // 压缩包
    zip: 'Folder',
    rar: 'Folder',
    '7z': 'Folder',
    // 音频
    mp3: 'Headphone',
    wav: 'Headphone',
    flac: 'Headphone',
    // 视频
    mp4: 'VideoCamera',
    avi: 'VideoCamera',
    mov: 'VideoCamera'
  }

  return iconMap[ext] || 'Document'
}

const formatFileSize = size => {
  if (!size) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB']
  let index = 0
  let fileSize = size

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }

  return `${fileSize.toFixed(1)} ${units[index]}`
}

// 公开方法
const uploadFiles = () => {
  uploadRef.value?.submit()
}

const clearFiles = () => {
  uploadRef.value?.clearFiles()
}

const abort = () => {
  uploadRef.value?.abort()
}

// 监听器
watch(
  () => props.modelValue,
  newValue => {
    if (props.uploadType === 'avatar' && newValue) {
      // 头像模式下同步 URL
    }
  }
)

// 暴露方法
defineExpose({
  upload: uploadFiles,
  clear: clearFiles,
  abort,
  uploadRef
})
</script>

<style lang="scss" scoped>
.file-upload {
  &--disabled {
    opacity: 0.6;
    pointer-events: none;
  }

  .upload-dragger {
    :deep(.el-upload-dragger) {
      width: 100%;
      height: auto;
      min-height: 180px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        border-color: var(--el-color-primary);
      }
    }

    .upload-content {
      text-align: center;

      .upload-icon {
        color: var(--el-text-color-secondary);
        margin-bottom: 16px;
      }

      .upload-text {
        .upload-title {
          color: var(--el-text-color-primary);
          font-size: 16px;
          margin: 0 0 8px 0;
        }

        .upload-hint {
          color: var(--el-text-color-secondary);
          font-size: 14px;
          margin: 0;
        }
      }
    }
  }

  .upload-button {
    :deep(.el-upload__tip) {
      margin-top: 8px;
      color: var(--el-text-color-secondary);
      font-size: 12px;
    }
  }

  .upload-avatar {
    .avatar-container {
      position: relative;
      overflow: hidden;
      border: 2px dashed var(--el-border-color);
      cursor: pointer;
      transition: all 0.3s;

      &:hover {
        border-color: var(--el-color-primary);

        .avatar-overlay {
          opacity: 1;
        }
      }

      .avatar-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--el-fill-color-light);
        color: var(--el-text-color-placeholder);
      }

      .avatar-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        opacity: 0;
        transition: opacity 0.3s;
      }

      .avatar-loading {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 255, 255, 0.9);
        border-radius: 50%;
        padding: 10px;
      }
    }
  }

  .upload-card {
    :deep(.el-upload--picture-card) {
      width: 120px;
      height: 120px;
      border-radius: 8px;
    }
  }

  .upload-progress {
    margin-top: 16px;
  }

  .custom-file-list {
    margin-top: 16px;

    .file-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border: 1px solid var(--el-border-color-light);
      border-radius: 6px;
      margin-bottom: 8px;
      transition: all 0.3s;

      &:hover {
        border-color: var(--el-color-primary);
        background: var(--el-fill-color-light);
      }

      &--error {
        border-color: var(--el-color-danger);
        background: var(--el-color-danger-light-9);
      }

      .file-info {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;

        .file-icon {
          font-size: 20px;
          color: var(--el-color-primary);
        }

        .file-details {
          flex: 1;
          min-width: 0;

          .file-name {
            font-weight: 500;
            color: var(--el-text-color-primary);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-bottom: 4px;
          }

          .file-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: var(--el-text-color-secondary);

            .file-status {
              &.success {
                color: var(--el-color-success);
              }

              &.error {
                color: var(--el-color-danger);
              }
            }
          }
        }
      }

      .file-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .file-upload {
    .upload-dragger {
      :deep(.el-upload-dragger) {
        min-height: 120px;
      }

      .upload-content {
        .upload-icon {
          font-size: 40px;
        }

        .upload-text {
          .upload-title {
            font-size: 14px;
          }

          .upload-hint {
            font-size: 12px;
          }
        }
      }
    }

    .custom-file-list {
      .file-item {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;

        .file-actions {
          justify-content: center;
        }
      }
    }
  }
}
</style>
