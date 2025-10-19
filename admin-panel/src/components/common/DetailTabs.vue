<template>
  <div class="detail-tabs">
    <el-tabs
      v-model="activeTab"
      :type="type"
      :tab-position="tabPosition"
      :stretch="stretch"
      :before-leave="handleBeforeLeave"
      @tab-click="handleTabClick"
      @tab-change="handleTabChange"
      @tab-remove="handleTabRemove"
      :class="['detail-tabs-container', { 'detail-tabs--card': type === 'card' }]"
    >
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.name"
        :name="tab.name"
        :label="tab.label"
        :disabled="tab.disabled"
        :closable="tab.closable"
        :lazy="tab.lazy !== false"
      >
        <!-- 标签头部自定义内容 -->
        <template #label v-if="tab.labelSlot || tab.icon || tab.badge">
          <div class="tab-label">
            <el-icon v-if="tab.icon" class="tab-icon">
              <component :is="tab.icon" />
            </el-icon>
            <span class="tab-text">
              <slot v-if="tab.labelSlot" :name="tab.labelSlot" :tab="tab" />
              <template v-else>{{ tab.label }}</template>
            </span>
            <el-badge
              v-if="tab.badge !== undefined"
              :value="tab.badge"
              :max="tab.badgeMax || 99"
              :hidden="tab.badge === 0 && tab.hiddenZeroBadge"
              :type="tab.badgeType"
              class="tab-badge"
            />
          </div>
        </template>

        <!-- 标签页内容 -->
        <div class="tab-content" :class="`tab-content--${tab.name}`">
          <!-- 加载状态 -->
          <div v-if="tab.loading" class="tab-loading">
            <el-skeleton animated>
              <template #template>
                <div class="loading-skeleton">
                  <el-skeleton-item variant="text" style="width: 60%; height: 20px" />
                  <el-skeleton-item variant="text" style="width: 80%; height: 16px; margin-top: 16px" />
                  <el-skeleton-item variant="text" style="width: 40%; height: 16px; margin-top: 8px" />
                  <div style="margin-top: 20px">
                    <el-skeleton-item variant="rect" style="width: 100%; height: 200px" />
                  </div>
                </div>
              </template>
            </el-skeleton>
          </div>

          <!-- 错误状态 -->
          <div v-else-if="tab.error" class="tab-error">
            <el-empty image-size="80" :description="tab.errorMessage || '加载失败'">
              <template #image>
                <el-icon size="80" color="var(--el-color-danger)">
                  <WarningFilled />
                </el-icon>
              </template>
              <el-button type="primary" @click="handleRetry(tab)">重新加载</el-button>
            </el-empty>
          </div>

          <!-- 空数据状态 -->
          <div v-else-if="tab.empty" class="tab-empty">
            <el-empty :image-size="tab.emptyImageSize || 100" :description="tab.emptyText || '暂无数据'">
              <template #image v-if="tab.emptyIcon">
                <el-icon :size="tab.emptyImageSize || 100" color="var(--el-text-color-placeholder)">
                  <component :is="tab.emptyIcon" />
                </el-icon>
              </template>
              <el-button
                v-if="tab.emptyAction"
                :type="tab.emptyActionType || 'primary'"
                @click="handleEmptyAction(tab)"
              >
                {{ tab.emptyActionText || '立即添加' }}
              </el-button>
            </el-empty>
          </div>

          <!-- 正常内容 -->
          <div v-else class="tab-normal-content">
            <!-- 标签页工具栏 -->
            <div v-if="tab.toolbar || $slots[`${tab.name}-toolbar`]" class="tab-toolbar">
              <slot :name="`${tab.name}-toolbar`" :tab="tab">
                <div v-if="tab.toolbar" class="toolbar-content">
                  <div class="toolbar-left">
                    <template v-for="action in tab.toolbar.left" :key="action.key">
                      <el-button
                        :type="action.type"
                        :size="action.size || 'small'"
                        :icon="action.icon"
                        :loading="action.loading"
                        :disabled="action.disabled"
                        @click="handleToolbarAction(action, tab)"
                      >
                        {{ action.label }}
                      </el-button>
                    </template>
                  </div>

                  <div class="toolbar-right">
                    <template v-for="action in tab.toolbar.right" :key="action.key">
                      <el-button
                        :type="action.type"
                        :size="action.size || 'small'"
                        :icon="action.icon"
                        :loading="action.loading"
                        :disabled="action.disabled"
                        @click="handleToolbarAction(action, tab)"
                      >
                        {{ action.label }}
                      </el-button>
                    </template>
                  </div>
                </div>
              </slot>
            </div>

            <!-- 标签页主要内容 -->
            <div class="tab-main-content">
              <slot :name="tab.name" :tab="tab" :data="tab.data">
                <div v-if="tab.content" v-html="tab.content"></div>
              </slot>
            </div>

            <!-- 标签页底部 -->
            <div v-if="tab.footer || $slots[`${tab.name}-footer`]" class="tab-footer">
              <slot :name="`${tab.name}-footer`" :tab="tab">
                <div v-if="tab.footer" class="footer-content">
                  {{ tab.footer }}
                </div>
              </slot>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- 自定义标签页 -->
      <slot />
    </el-tabs>

    <!-- 浮动操作按钮 -->
    <div v-if="floatingActions.length > 0" class="floating-actions">
      <el-button
        v-for="action in floatingActions"
        :key="action.key"
        :type="action.type || 'primary'"
        :size="action.size || 'default'"
        :icon="action.icon"
        :loading="action.loading"
        :disabled="action.disabled"
        :circle="action.circle"
        :round="action.round"
        @click="handleFloatingAction(action)"
        class="floating-action-btn"
      >
        {{ action.circle ? '' : action.label }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

// Props 定义
const props = defineProps({
  // 基本配置
  modelValue: {
    type: String,
    default: ''
  },
  tabs: {
    type: Array,
    default: () => []
  },

  // Element Plus Tabs 属性
  type: {
    type: String,
    default: 'border-card',
    validator: value => ['card', 'border-card', ''].includes(value)
  },
  tabPosition: {
    type: String,
    default: 'top',
    validator: value => ['top', 'right', 'bottom', 'left'].includes(value)
  },
  stretch: {
    type: Boolean,
    default: false
  },

  // 行为配置
  beforeLeave: Function,
  lazy: {
    type: Boolean,
    default: true
  },

  // 浮动操作
  floatingActions: {
    type: Array,
    default: () => []
  },

  // 自动加载
  autoLoad: {
    type: Boolean,
    default: true
  }
})

// 事件定义
const emit = defineEmits([
  'update:modelValue',
  'tab-click',
  'tab-change',
  'tab-remove',
  'before-leave',
  'toolbar-action',
  'empty-action',
  'floating-action',
  'retry',
  'load'
])

// 响应式数据
const activeTab = ref(props.modelValue || props.tabs[0]?.name || '')

// 计算属性
const currentTab = computed(() => {
  return props.tabs.find(tab => tab.name === activeTab.value)
})

// 方法
const handleBeforeLeave = (activeName, oldActiveName) => {
  if (props.beforeLeave) {
    return props.beforeLeave(activeName, oldActiveName)
  }

  const result = emit('before-leave', activeName, oldActiveName)
  return result !== false
}

const handleTabClick = (tab, event) => {
  emit('tab-click', tab, event)

  // 自动加载标签页数据
  if (props.autoLoad && tab.props?.name) {
    const tabConfig = props.tabs.find(t => t.name === tab.props.name)
    if (tabConfig && !tabConfig.loaded && !tabConfig.loading) {
      loadTabData(tabConfig)
    }
  }
}

const handleTabChange = name => {
  activeTab.value = name
  emit('update:modelValue', name)
  emit('tab-change', name)
}

const handleTabRemove = name => {
  emit('tab-remove', name)
}

const handleToolbarAction = (action, tab) => {
  emit('toolbar-action', { action: action.key, tab: tab.name, data: action })
}

const handleEmptyAction = tab => {
  emit('empty-action', tab.name, tab)
}

const handleFloatingAction = action => {
  emit('floating-action', action.key, action)
}

const handleRetry = tab => {
  loadTabData(tab)
  emit('retry', tab.name, tab)
}

const loadTabData = tab => {
  emit('load', tab.name, tab)
}

// 公开方法
const setActiveTab = name => {
  activeTab.value = name
}

const getActiveTab = () => {
  return activeTab.value
}

const updateTab = (name, updates) => {
  const tab = props.tabs.find(t => t.name === name)
  if (tab) {
    Object.assign(tab, updates)
  }
}

const setTabLoading = (name, loading = true) => {
  updateTab(name, { loading })
}

const setTabError = (name, error = true, message = '') => {
  updateTab(name, {
    error,
    errorMessage: message,
    loading: false
  })
}

const setTabEmpty = (name, empty = true) => {
  updateTab(name, {
    empty,
    loading: false,
    error: false
  })
}

const setTabData = (name, data) => {
  updateTab(name, {
    data,
    loaded: true,
    loading: false,
    error: false,
    empty: false
  })
}

const refreshTab = name => {
  const tab = props.tabs.find(t => t.name === name)
  if (tab) {
    tab.loaded = false
    loadTabData(tab)
  }
}

const refreshCurrentTab = () => {
  if (activeTab.value) {
    refreshTab(activeTab.value)
  }
}

// 监听器
watch(
  () => props.modelValue,
  newValue => {
    if (newValue && newValue !== activeTab.value) {
      activeTab.value = newValue
    }
  }
)

watch(activeTab, newValue => {
  emit('update:modelValue', newValue)
})

// 初始化
nextTick(() => {
  if (props.autoLoad && currentTab.value && !currentTab.value.loaded) {
    loadTabData(currentTab.value)
  }
})

// 暴露方法
defineExpose({
  setActiveTab,
  getActiveTab,
  updateTab,
  setTabLoading,
  setTabError,
  setTabEmpty,
  setTabData,
  refreshTab,
  refreshCurrentTab
})
</script>

<style lang="scss" scoped>
.detail-tabs {
  position: relative;

  .detail-tabs-container {
    :deep(.el-tabs__content) {
      padding: 0;
    }

    &.detail-tabs--card {
      :deep(.el-tabs__item) {
        border-radius: 8px 8px 0 0;
      }
    }
  }

  .tab-label {
    display: flex;
    align-items: center;
    gap: 6px;

    .tab-icon {
      font-size: 14px;
    }

    .tab-text {
      line-height: 1;
    }

    .tab-badge {
      :deep(.el-badge__content) {
        transform: translateY(-50%) translateX(50%);
        right: -6px;
      }
    }
  }

  .tab-content {
    min-height: 200px;

    .tab-loading,
    .tab-error,
    .tab-empty {
      padding: 40px 20px;

      .loading-skeleton {
        max-width: 600px;
        margin: 0 auto;
      }
    }

    .tab-normal-content {
      .tab-toolbar {
        margin-bottom: 16px;
        padding: 16px 20px;
        background: var(--el-fill-color-lighter);
        border-radius: 8px;

        .toolbar-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;

          .toolbar-left,
          .toolbar-right {
            display: flex;
            gap: 8px;
            align-items: center;
          }
        }
      }

      .tab-main-content {
        padding: 20px;
        min-height: 300px;
      }

      .tab-footer {
        padding: 16px 20px;
        border-top: 1px solid var(--el-border-color-lighter);
        background: var(--el-fill-color-lighter);

        .footer-content {
          color: var(--el-text-color-secondary);
          font-size: 14px;
          text-align: center;
        }
      }
    }
  }

  .floating-actions {
    position: fixed;
    right: 20px;
    bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 1000;

    .floating-action-btn {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      }
    }
  }
}

// 标签页位置样式
.detail-tabs {
  :deep(.el-tabs--left),
  :deep(.el-tabs--right) {
    .el-tabs__content {
      padding-left: 20px;
    }
  }

  :deep(.el-tabs--bottom) {
    .tab-content {
      order: -1;
    }
  }
}

// 不同类型的标签页样式
.detail-tabs {
  &.detail-tabs--card {
    :deep(.el-tabs__header) {
      margin-bottom: 0;
    }

    :deep(.el-tabs__content) {
      border: 1px solid var(--el-border-color-light);
      border-top: none;
      border-radius: 0 0 8px 8px;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .detail-tabs {
    .tab-content {
      .tab-normal-content {
        .tab-toolbar {
          padding: 12px 16px;

          .toolbar-content {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;

            .toolbar-left,
            .toolbar-right {
              justify-content: center;
              flex-wrap: wrap;
            }
          }
        }

        .tab-main-content {
          padding: 16px;
        }
      }

      .tab-loading,
      .tab-error,
      .tab-empty {
        padding: 20px 16px;
      }
    }

    .floating-actions {
      right: 16px;
      bottom: 16px;
    }
  }
}

@media (max-width: 480px) {
  .detail-tabs {
    :deep(.el-tabs__nav-scroll) {
      overflow-x: auto;
    }

    :deep(.el-tabs__nav) {
      white-space: nowrap;
    }

    :deep(.el-tabs__item) {
      padding: 0 12px;

      .tab-text {
        font-size: 13px;
      }
    }

    .tab-content {
      .tab-normal-content {
        .tab-main-content {
          padding: 12px;
        }
      }
    }
  }
}
</style>
