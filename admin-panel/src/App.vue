<template>
  <div id="app" class="library-admin">
    <RouterView />
    <!-- 主题管理器 -->
    <ThemeManager />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import ThemeManager from '@/components/common/ThemeManager.vue'

const authStore = useAuthStore()
const appStore = useAppStore()

onMounted(async () => {
  // 应用初始化
  await appStore.initialize()

  // 如果有token，尝试获取用户信息
  if (authStore.token) {
    try {
      await authStore.getCurrentUser()
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果token失效，清除本地存储
      authStore.logout()
    }
  }
})
</script>

<style lang="scss">
// 重置样式和全局样式在 styles/index.scss 中定义
.library-admin {
  width: 100%;
  min-height: 100vh;
  background-color: var(--el-bg-color-page, #f2f3f5);
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  // 防止页面刷新时的背景闪烁
  will-change: auto;
  transition: background-color 0.3s ease;
}


// Element Plus 全局样式覆盖
.el-message {
  min-width: 300px;

  &.el-message--success {
    border-left: 4px solid var(--el-color-success);
  }

  &.el-message--warning {
    border-left: 4px solid var(--el-color-warning);
  }

  &.el-message--error {
    border-left: 4px solid var(--el-color-danger);
  }

  &.el-message--info {
    border-left: 4px solid var(--el-color-info);
  }
}

// 自定义滚动条
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-thumb {
  background-color: var(--el-border-color-lighter);
  border-radius: 4px;

  &:hover {
    background-color: var(--el-border-color-light);
  }
}

::-webkit-scrollbar-track {
  background-color: transparent;
}

// 卡片阴影增强
.el-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);

  &:hover {
    box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.12);
    transition: box-shadow 0.3s ease;
  }
}

// 表格样式优化
.el-table {
  .el-table__header {
    th {
      background-color: var(--el-fill-color-light);
      color: var(--el-text-color-primary);
      font-weight: 600;
    }
  }

  .el-table__row {
    &:hover {
      background-color: var(--el-fill-color-lighter);
    }
  }
}

// 按钮组样式
.el-button-group {
  .el-button + .el-button {
    margin-left: 0;
  }
}

// 表单样式优化
.el-form {
  .el-form-item__label {
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .el-input__wrapper,
  .el-textarea__inner,
  .el-select .el-input__wrapper {
    border-radius: 6px;
  }
}

// 页面头部样式
.page-header {
  margin-bottom: 20px;

  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 8px;
  }

  .page-description {
    color: var(--el-text-color-regular);
    font-size: 14px;
  }
}

// 统计卡片样式
.stat-card {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--el-color-primary) 0%, var(--el-color-primary-light-3) 100%);
  color: white;

  .stat-number {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .stat-label {
    font-size: 14px;
    opacity: 0.9;
  }

  &.warning {
    background: linear-gradient(135deg, var(--el-color-warning) 0%, var(--el-color-warning-light-3) 100%);
  }

  &.success {
    background: linear-gradient(135deg, var(--el-color-success) 0%, var(--el-color-success-light-3) 100%);
  }

  &.danger {
    background: linear-gradient(135deg, var(--el-color-danger) 0%, var(--el-color-danger-light-3) 100%);
  }
}

// Element Plus 按钮主题色覆盖
.el-button--primary {
  --el-button-bg-color: var(--el-color-primary);
  --el-button-border-color: var(--el-color-primary);
  --el-button-hover-bg-color: var(--el-color-primary-light-3);
  --el-button-hover-border-color: var(--el-color-primary-light-3);
  --el-button-active-bg-color: var(--el-color-primary-dark-2);
  --el-button-active-border-color: var(--el-color-primary-dark-2);
}

// Element Plus 链接主题色
.el-link--primary {
  --el-link-text-color: var(--el-color-primary);
  --el-link-hover-text-color: var(--el-color-primary-light-3);
}

// Element Plus 标签主题色
.el-tag--primary {
  --el-tag-bg-color: var(--el-color-primary-light-9);
  --el-tag-border-color: var(--el-color-primary-light-7);
  --el-tag-text-color: var(--el-color-primary);
}

// Element Plus 输入框聚焦色
.el-input__wrapper.is-focus {
  --el-input-focus-border-color: var(--el-color-primary);
}

// Element Plus 选择器下拉选中项
.el-select-dropdown__item.is-selected {
  color: var(--el-color-primary);
}

// Element Plus 复选框
.el-checkbox__input.is-checked .el-checkbox__inner {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
}

// Element Plus 单选按钮
.el-radio__input.is-checked .el-radio__inner {
  border-color: var(--el-color-primary);
  
  &::after {
    background-color: var(--el-color-primary);
  }
}

// Element Plus 开关
.el-switch.is-checked .el-switch__core {
  background-color: var(--el-color-primary);
}

// Element Plus 分页器
.el-pagination .el-pager li.is-active {
  background-color: var(--el-color-primary);
}

.el-pagination button:hover {
  color: var(--el-color-primary);
}

// Element Plus 进度条
.el-progress-bar__inner {
  background-color: var(--el-color-primary);
}

// Element Plus 滑块
.el-slider__runway .el-slider__bar {
  background-color: var(--el-color-primary);
}

.el-slider__button {
  border-color: var(--el-color-primary);
}
</style>
