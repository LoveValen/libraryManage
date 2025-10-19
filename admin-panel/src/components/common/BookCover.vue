<template>
  <div 
    class="book-cover" 
    :style="containerStyle"
  >
    <!-- 图书封面图片 -->
    <el-image
      v-if="src && !imageError"
      :src="src"
      :alt="alt || title"
      :style="imageStyle"
      fit="cover"
      @error="handleImageError"
      class="cover-image"
    >
      <template #placeholder>
        <div class="image-placeholder">
          <el-icon class="loading-icon"><Loading /></el-icon>
        </div>
      </template>
      <template #error>
        <div class="image-error" @click="handleImageError">
          <el-icon class="error-icon"><Picture /></el-icon>
          <span class="error-text">加载失败</span>
        </div>
      </template>
    </el-image>

    <!-- 无封面时显示标题 -->
    <div 
      v-if="(!src || imageError) && showTitle" 
      class="title-placeholder"
      :style="placeholderStyle"
    >
      <div class="placeholder-content">
        <el-icon class="book-icon"><Reading /></el-icon>
        <div class="book-title-text">{{ title }}</div>
      </div>
    </div>

    <!-- 无封面且不显示标题时的默认占位符 -->
    <div 
      v-if="(!src || imageError) && !showTitle" 
      class="default-placeholder"
      :style="placeholderStyle"
    >
      <el-icon class="default-icon"><Reading /></el-icon>
    </div>

    <!-- 悬停遮罩层 -->
    <div v-if="hoverable" class="hover-overlay">
      <slot name="overlay">
        <el-icon class="view-icon"><View /></el-icon>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Loading, Picture, Reading, View } from '@element-plus/icons-vue'

// Props 定义
const props = defineProps({
  // 图片源地址
  src: {
    type: String,
    default: ''
  },
  // 图书标题
  title: {
    type: String,
    default: '未知图书'
  },
  // 图片alt属性
  alt: {
    type: String,
    default: ''
  },
  // 容器宽度
  width: {
    type: [String, Number],
    default: '100%'
  },
  // 容器高度
  height: {
    type: [String, Number],
    default: '240'
  },
  // 是否显示标题（当无封面时）
  showTitle: {
    type: Boolean,
    default: true
  },
  // 圆角大小
  radius: {
    type: [String, Number],
    default: 4
  },
  // 是否可悬停
  hoverable: {
    type: Boolean,
    default: false
  },
  // 背景色
  backgroundColor: {
    type: String,
    default: '#f5f7fa'
  }
})

// 响应式数据
const imageError = ref(false)

// 计算属性
const containerStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  borderRadius: typeof props.radius === 'number' ? `${props.radius}px` : props.radius,
  backgroundColor: props.backgroundColor
}))

const imageStyle = computed(() => ({
  width: '100%',
  height: '100%',
  borderRadius: typeof props.radius === 'number' ? `${props.radius}px` : props.radius
}))

const placeholderStyle = computed(() => ({
  width: '100%',
  height: '100%',
  borderRadius: typeof props.radius === 'number' ? `${props.radius}px` : props.radius,
  backgroundColor: props.backgroundColor
}))

// 方法
const handleImageError = () => {
  imageError.value = true
}

// 重置错误状态（当src改变时）
const resetError = () => {
  imageError.value = false
}

// 监听src变化
import { watch } from 'vue'
watch(() => props.src, () => {
  resetError()
})
</script>

<style scoped>
.book-cover {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.book-cover:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.cover-image {
  width: 100%;
  height: 100%;
}

.image-placeholder,
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #909399;
  background-color: #f5f7fa;
}

.loading-icon {
  font-size: 20px;
  animation: rotate 2s linear infinite;
}

.error-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.error-text {
  font-size: 12px;
}

.title-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  text-align: center;
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.book-icon {
  font-size: 32px;
  color: #909399;
}

.book-title-text {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  line-height: 1.4;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.default-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}

.default-icon {
  font-size: 48px;
  color: #c0c4cc;
}

.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.book-cover:hover .hover-overlay {
  opacity: 1;
}

.view-icon {
  font-size: 20px;
  color: white;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .book-title-text {
    font-size: 12px;
  }
  
  .book-icon {
    font-size: 20px;
  }
  
  .default-icon {
    font-size: 36px;
  }
}
</style>
