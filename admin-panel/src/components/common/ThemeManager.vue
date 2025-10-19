<template>
  <div class="theme-manager">
    <!-- 主题切换触发器 -->
    <el-tooltip content="切换主题" placement="bottom">
      <el-button 
        circle 
        size="large"
        class="theme-trigger"
        @click="drawerVisible = true"
      >
        <el-icon>
          <Brush />
        </el-icon>
      </el-button>
    </el-tooltip>

    <!-- 主题配置抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      title="主题配置"
      size="320px"
      direction="rtl"
      class="theme-drawer"
    >
      <div class="theme-content">
        <!-- 当前主题显示 -->
        <div class="current-theme">
          <h3 class="section-title">当前主题</h3>
          <div class="current-theme-card">
            <div 
              class="theme-preview"
              :style="{ background: themeConfig.gradient }"
            ></div>
            <div class="theme-info">
              <span class="theme-name">{{ themeConfig.name }}</span>
              <span class="theme-key">{{ currentTheme }}</span>
            </div>
          </div>
        </div>

        <!-- 主题选择 -->
        <div class="theme-selector">
          <h3 class="section-title">选择主题</h3>
          <div class="themes-grid">
            <div
              v-for="theme in availableThemes"
              :key="theme.key"
              class="theme-item"
              :class="{ active: currentTheme === theme.key }"
              @click="handleThemeChange(theme.key)"
            >
              <div 
                class="theme-color"
                :style="{ background: theme.gradient }"
              >
                <el-icon v-if="currentTheme === theme.key" class="check-icon">
                  <Check />
                </el-icon>
              </div>
              <span class="theme-label">{{ theme.name }}</span>
            </div>
          </div>
        </div>

        <!-- 预览区域 -->
        <div class="theme-preview-section">
          <h3 class="section-title">主题预览</h3>
          <div class="preview-cards">
            <!-- 按钮预览 -->
            <div class="preview-card">
              <span class="preview-label">按钮样式</span>
              <div class="preview-buttons">
                <el-button type="primary" size="small">主要按钮</el-button>
                <el-button size="small">次要按钮</el-button>
              </div>
            </div>

            <!-- 标签预览 -->
            <div class="preview-card">
              <span class="preview-label">标签样式</span>
              <div class="preview-tags">
                <el-tag type="primary" size="small">主要标签</el-tag>
                <el-tag size="small">次要标签</el-tag>
              </div>
            </div>

            <!-- 链接预览 -->
            <div class="preview-card">
              <span class="preview-label">链接样式</span>
              <div class="preview-links">
                <el-link type="primary">主题链接</el-link>
                <el-link>普通链接</el-link>
              </div>
            </div>
          </div>
        </div>

        <!-- 重置选项 -->
        <div class="theme-actions">
          <el-button @click="resetTheme" size="small" class="reset-btn">
            <el-icon><RefreshLeft /></el-icon>
            重置为默认
          </el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { showSuccess, showInfo } from '@/utils/message'

const { currentTheme, themeConfig, setTheme, getAvailableThemes } = useTheme()

const drawerVisible = ref(false)
const availableThemes = ref([])

// 处理主题切换
const handleThemeChange = (themeKey) => {
  setTheme(themeKey)
  showSuccess(`已切换到${themeConfig.value.name}主题`)
}

// 重置主题
const resetTheme = () => {
  setTheme('blue')
  showInfo('已重置为默认主题')
}

// 初始化
onMounted(() => {
  availableThemes.value = getAvailableThemes()
})
</script>

<style lang="scss" scoped>
.theme-manager {
  .theme-trigger {
    position: fixed;
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    z-index: 1000;
    @apply bg-primary-500 border-primary-500 text-white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
    border-radius: 20px 0 0 20px;
    width: 48px;
    height: 48px;
    transition: all 0.3s ease;

    &:hover {
      @apply bg-primary-600 border-primary-600;
      transform: translateY(-50%) translateX(-4px);
    }
  }
}

:deep(.theme-drawer) {
  .el-drawer__body {
    padding: 0;
  }
}

.theme-content {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  @apply text-gray-800;
  display: flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    width: 4px;
    height: 16px;
    background: var(--color-primary, #3b82f6);
    border-radius: 2px;
  }
}

.current-theme {
  margin-bottom: 32px;

  .current-theme-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    @apply bg-gray-50 border-2 border-primary-200;
    border-radius: 8px;

    .theme-preview {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      flex-shrink: 0;
    }

    .theme-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .theme-name {
        font-weight: 600;
        @apply text-gray-800;
      }

      .theme-key {
        font-size: 12px;
        @apply text-gray-500;
        text-transform: uppercase;
      }
    }
  }
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.theme-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  @apply hover:bg-gray-50;

  &:hover {
    transform: translateY(-2px);
  }

  &.active {
    @apply border-primary-500 bg-primary-50;
  }

  .theme-color {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

    .check-icon {
      color: white;
      font-size: 20px;
      font-weight: bold;
    }
  }

  .theme-label {
    font-size: 14px;
    font-weight: 500;
    @apply text-gray-800;
    text-align: center;
  }
}

.theme-preview-section {
  margin-bottom: 32px;
}

.preview-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-card {
  padding: 16px;
  @apply bg-gray-50 border border-gray-200;
  border-radius: 8px;

  .preview-label {
    display: block;
    font-size: 12px;
    @apply text-gray-500;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .preview-buttons,
  .preview-tags,
  .preview-links {
    display: flex;
    gap: 8px;
    align-items: center;
  }

}

.theme-actions {
  padding-top: 16px;
  @apply border-t border-gray-200;

  .reset-btn {
    width: 100%;
    @apply bg-gray-100 text-gray-600 border-gray-300;

    &:hover {
      @apply bg-gray-200 border-gray-400;
    }
  }
}

// 暗色主题支持
@media (prefers-color-scheme: dark) {
  .theme-content {
    @apply bg-gray-800;
  }

  .section-title {
    @apply text-gray-200;
  }

  .current-theme-card {
    @apply bg-gray-700 border-gray-600;

    .theme-name {
      @apply text-gray-200;
    }

    .theme-key {
      @apply text-gray-400;
    }
  }

  .theme-item {
    @apply hover:bg-gray-600;

    &.active {
      @apply bg-gray-700;
    }

    .theme-label {
      @apply text-gray-200;
    }
  }

  .preview-card {
    @apply bg-gray-700 border-gray-600;

    .preview-label {
      @apply text-gray-400;
    }

    .btn-secondary {
      @apply bg-gray-600 text-gray-200;

      &:hover {
        @apply bg-gray-500;
      }
    }

    .tag-secondary {
      @apply bg-gray-600 text-gray-200;
    }

    .link-normal {
      @apply text-gray-300;

      &:hover {
        @apply text-gray-100;
      }
    }
  }

  .theme-actions {
    @apply border-gray-600;

    .reset-btn {
      @apply bg-gray-700 text-gray-300 border-gray-600;

      &:hover {
        @apply bg-gray-600 border-gray-500;
      }
    }
  }
}
</style>