<template>
  <el-drawer
    v-model="visible"
    title="系统设置"
    direction="rtl"
    size="300px"
    :modal="false"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
  >
    <div class="settings-container">
      <!-- 主题设置 -->
      <div class="setting-group">
        <h4 class="setting-title">
          <el-icon><Sunny /></el-icon>
          主题设置
        </h4>

        <div class="setting-item">
          <span class="setting-label">主题模式</span>
          <el-switch
            v-model="isDarkMode"
            inline-prompt
            active-text="暗黑"
            inactive-text="明亮"
            @change="handleThemeChange"
          />
        </div>

        <div class="setting-item">
          <span class="setting-label">主题色</span>
          <div class="color-picker-wrapper">
            <div
              v-for="color in themeColors"
              :key="color.value"
              class="color-item"
              :class="{ active: currentTheme === color.value }"
              :style="{ backgroundColor: color.color }"
              @click="handleThemeColorChange(color.value)"
            >
              <el-icon v-if="currentTheme === color.value" class="check-icon">
                <Check />
              </el-icon>
            </div>
          </div>
        </div>
      </div>

      <!-- 布局设置 -->
      <div class="setting-group">
        <h4 class="setting-title">
          <el-icon><Grid /></el-icon>
          布局设置
        </h4>

        <div class="setting-item">
          <span class="setting-label">固定头部</span>
          <el-switch v-model="fixedHeader" @change="handleFixedHeaderChange" />
        </div>

        <div class="setting-item">
          <span class="setting-label">显示标签页</span>
          <el-switch v-model="showTagsView" @change="handleTagsViewChange" />
        </div>

        <div class="setting-item">
          <span class="setting-label">侧边栏Logo</span>
          <el-switch v-model="showSidebarLogo" @change="handleSidebarLogoChange" />
        </div>
      </div>

      <!-- 界面设置 -->
      <div class="setting-group">
        <h4 class="setting-title">
          <el-icon><Monitor /></el-icon>
          界面设置
        </h4>

        <div class="setting-item">
          <span class="setting-label">页面动画</span>
          <el-switch v-model="pageAnimation" @change="handlePageAnimationChange" />
        </div>

        <div class="setting-item">
          <span class="setting-label">灰色模式</span>
          <el-switch v-model="grayMode" @change="handleGrayModeChange" />
        </div>

        <div class="setting-item">
          <span class="setting-label">色弱模式</span>
          <el-switch v-model="colorWeakMode" @change="handleColorWeakModeChange" />
        </div>
      </div>

      <!-- 其他设置 -->
      <div class="setting-group">
        <h4 class="setting-title">
          <el-icon><Setting /></el-icon>
          其他设置
        </h4>

        <div class="setting-item">
          <span class="setting-label">语言</span>
          <el-select v-model="language" size="small" style="width: 100px" @change="handleLanguageChange">
            <el-option v-for="lang in languages" :key="lang.value" :label="lang.label" :value="lang.value" />
          </el-select>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="setting-actions">
        <el-button type="primary" @click="saveSettings">
          <el-icon><Check /></el-icon>
          保存设置
        </el-button>
        <el-button @click="resetSettings">
          <el-icon><RefreshLeft /></el-icon>
          重置设置
        </el-button>
        <el-button @click="copySettings">
          <el-icon><CopyDocument /></el-icon>
          复制设置
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { useTheme } from '@/composables/useTheme'

const appStore = useAppStore()
const { setTheme, currentTheme, getAvailableThemes } = useTheme()

// 响应式数据
const visible = computed({
  get: () => appStore.showSettings,
  set: value => appStore.toggleSettings(value)
})

// 主题设置
const isDarkMode = ref(appStore.theme === 'dark')
const currentThemeColor = ref(currentTheme.value || 'blue')

// 布局设置
const fixedHeader = ref(appStore.fixedHeader)
const showTagsView = ref(appStore.showTagsView)
const showSidebarLogo = ref(appStore.showSidebarLogo)

// 界面设置
const pageAnimation = ref(appStore.pageAnimation)
const grayMode = ref(appStore.grayMode)
const colorWeakMode = ref(appStore.colorWeakMode)

// 其他设置
const language = ref(appStore.language)

// 主题色选项 - 从 useTheme 获取
const themeColors = computed(() =>
  getAvailableThemes().map(theme => ({
    name: theme.name,
    value: theme.key,
    color: theme.primary
  }))
)

// 语言选项
const languages = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

// 方法
const handleThemeChange = value => {
  const theme = value ? 'dark' : 'light'
  appStore.setTheme(theme)
}

const handleThemeColorChange = themeKey => {
  currentThemeColor.value = themeKey
  setTheme(themeKey) // 使用 useTheme 的 setTheme 方法
  appStore.setThemeColor(themeKey)

  ElMessage.success('主题色已更换')
}

const handleFixedHeaderChange = value => {
  appStore.setFixedHeader(value)
}

const handleTagsViewChange = value => {
  appStore.setTagsView(value)
}

const handleSidebarLogoChange = value => {
  appStore.setSidebarLogo(value)
}

const handlePageAnimationChange = value => {
  appStore.setPageAnimation(value)
}

const handleGrayModeChange = value => {
  appStore.setGrayMode(value)

  // 添加灰色滤镜
  if (value) {
    document.documentElement.style.filter = 'grayscale(1)'
  } else {
    document.documentElement.style.filter = ''
  }
}

const handleColorWeakModeChange = value => {
  appStore.setColorWeakMode(value)

  // 添加色弱滤镜
  if (value) {
    document.documentElement.style.filter = 'invert(80%)'
  } else {
    document.documentElement.style.filter = ''
  }
}

const handleLanguageChange = lang => {
  appStore.setLanguage(lang)
  ElMessage.success('语言已切换')
}

const saveSettings = () => {
  // 保存所有设置到localStorage
  const settings = {
    theme: appStore.theme,
    themeColor: currentThemeColor.value,
    fixedHeader: fixedHeader.value,
    showTagsView: showTagsView.value,
    showSidebarLogo: showSidebarLogo.value,
    pageAnimation: pageAnimation.value,
    grayMode: grayMode.value,
    colorWeakMode: colorWeakMode.value,
    language: language.value
  }

  localStorage.setItem('app-settings', JSON.stringify(settings))
  ElMessage.success('设置已保存')
}

const resetSettings = async () => {
  try {
    await ElMessageBox.confirm('确定要重置所有设置吗？', '重置设置', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 重置为默认值
    appStore.resetSettings()
    isDarkMode.value = false
    currentThemeColor.value = '#409EFF'
    fixedHeader.value = true
    showTagsView.value = true
    showSidebarLogo.value = true
    pageAnimation.value = true
    grayMode.value = false
    colorWeakMode.value = false
    language.value = 'zh-CN'

    // 清除CSS样式
    document.documentElement.style.filter = ''
    document.documentElement.style.setProperty('--el-color-primary', '#409EFF')

    ElMessage.success('设置已重置')
  } catch (error) {
    // 用户取消
  }
}

const copySettings = async () => {
  try {
    const settings = {
      theme: appStore.theme,
      themeColor: currentThemeColor.value,
      fixedHeader: fixedHeader.value,
      showTagsView: showTagsView.value,
      showSidebarLogo: showSidebarLogo.value,
      pageAnimation: pageAnimation.value,
      grayMode: grayMode.value,
      colorWeakMode: colorWeakMode.value,
      language: language.value
    }

    await navigator.clipboard.writeText(JSON.stringify(settings, null, 2))
    ElMessage.success('设置已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
    console.error('Copy failed:', error)
  }
}

// 监听主题变化
watch(
  () => appStore.theme,
  newTheme => {
    isDarkMode.value = newTheme === 'dark'
  }
)
</script>

<style lang="scss" scoped>
.settings-container {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.setting-group {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
}

.setting-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.setting-label {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.color-picker-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.color-item {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    transform: scale(1.1);
  }

  &.active {
    border-color: var(--el-color-primary);

    .check-icon {
      color: #fff;
      font-size: 12px;
    }
  }
}

.setting-actions {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .el-button {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
}

// 深色模式适配
:deep(.el-drawer__header) {
  margin-bottom: 0;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

:deep(.el-drawer__body) {
  padding: 0;
}

// 滚动条样式
.settings-container::-webkit-scrollbar {
  width: 4px;
}

.settings-container::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter);
}

.settings-container::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 2px;

  &:hover {
    background: var(--el-border-color-dark);
  }
}
</style>
