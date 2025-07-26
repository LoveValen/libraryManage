<template>
  <div class="page-header" :class="{ 'page-header--compact': compact }">
    <!-- 左侧区域 -->
    <div class="header-left">
      <!-- 返回按钮 -->
      <el-button v-if="showBack" @click="handleBack" :size="size" :icon="backIcon">
        {{ backText }}
      </el-button>

      <!-- 面包屑导航 -->
      <div v-if="breadcrumb.length > 0" class="breadcrumb-wrapper">
        <el-breadcrumb :separator="breadcrumbSeparator">
          <el-breadcrumb-item v-for="(item, index) in breadcrumb" :key="index" :to="item.to" :replace="item.replace">
            <el-icon v-if="item.icon" class="breadcrumb-icon">
              <component :is="item.icon" />
            </el-icon>
            {{ item.title }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>

      <!-- 标题区域 -->
      <div class="title-section">
        <div class="title-wrapper">
          <el-icon v-if="icon" class="title-icon">
            <component :is="icon" />
          </el-icon>
          <h1 class="page-title">{{ title }}</h1>
          <el-tag v-if="status" :type="statusType" :size="tagSize" class="title-status">
            {{ status }}
          </el-tag>
        </div>

        <p v-if="description" class="page-description">{{ description }}</p>

        <!-- 额外信息 -->
        <div v-if="extra || $slots.extra" class="page-extra">
          <slot name="extra">
            <span class="extra-text">{{ extra }}</span>
          </slot>
        </div>
      </div>
    </div>

    <!-- 右侧操作区域 -->
    <div class="header-right">
      <slot name="actions">
        <div v-if="actions.length > 0" class="header-actions">
          <template v-for="action in actions" :key="action.key">
            <!-- 普通按钮 -->
            <el-button
              v-if="!action.dropdown"
              :type="action.type || 'default'"
              :size="action.size || size"
              :icon="action.icon"
              :loading="action.loading"
              :disabled="action.disabled"
              :link="action.link"
              @click="handleAction(action)"
            >
              {{ action.label }}
            </el-button>

            <!-- 下拉按钮 -->
            <el-dropdown
              v-else
              :size="action.size || size"
              :split-button="action.splitButton"
              :type="action.type || 'default'"
              @click="action.splitButton && handleAction(action)"
              @command="command => handleDropdownAction(command, action)"
            >
              <el-button :type="action.type || 'default'" :size="action.size || size">
                <el-icon v-if="action.icon">
                  <component :is="action.icon" />
                </el-icon>
                {{ action.label }}
                <el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>

              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    v-for="item in action.items"
                    :key="item.key"
                    :command="item.key"
                    :disabled="item.disabled"
                    :divided="item.divided"
                  >
                    <el-icon v-if="item.icon">
                      <component :is="item.icon" />
                    </el-icon>
                    {{ item.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

// Props 定义
const props = defineProps({
  // 标题
  title: {
    type: String,
    required: true
  },
  description: String,
  extra: String,

  // 图标和状态
  icon: String,
  status: String,
  statusType: {
    type: String,
    default: 'info',
    validator: value => ['success', 'info', 'warning', 'danger'].includes(value)
  },

  // 返回按钮
  showBack: {
    type: Boolean,
    default: false
  },
  backText: {
    type: String,
    default: '返回'
  },
  backIcon: {
    type: String,
    default: 'ArrowLeft'
  },
  backTo: [String, Object],

  // 面包屑
  breadcrumb: {
    type: Array,
    default: () => []
  },
  breadcrumbSeparator: {
    type: String,
    default: '/'
  },

  // 操作按钮
  actions: {
    type: Array,
    default: () => []
  },

  // 样式
  compact: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'default'
  },
  tagSize: {
    type: String,
    default: 'default'
  }
})

// 事件定义
const emit = defineEmits(['back', 'action'])

// 路由
const router = useRouter()

// 方法
const handleBack = () => {
  if (props.backTo) {
    router.push(props.backTo)
  } else {
    router.go(-1)
  }
  emit('back')
}

const handleAction = action => {
  emit('action', action.key, action)
}

const handleDropdownAction = (command, action) => {
  emit('action', command, action)
}
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  gap: 24px;

  &--compact {
    padding: 16px 20px;
    margin-bottom: 16px;

    .page-title {
      font-size: 20px;
    }
  }

  .header-left {
    flex: 1;
    min-width: 0;

    .breadcrumb-wrapper {
      margin-bottom: 8px;

      .breadcrumb-icon {
        margin-right: 4px;
        font-size: 14px;
      }

      :deep(.el-breadcrumb) {
        font-size: 14px;

        .el-breadcrumb__item {
          .el-breadcrumb__inner {
            display: flex;
            align-items: center;
            color: var(--el-text-color-secondary);

            &.is-link {
              color: var(--el-color-primary);

              &:hover {
                color: var(--el-color-primary-light-3);
              }
            }
          }

          &:last-child .el-breadcrumb__inner {
            color: var(--el-text-color-primary);
            font-weight: 500;
          }
        }
      }
    }

    .title-section {
      .title-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;

        .title-icon {
          font-size: 24px;
          color: var(--el-color-primary);
        }

        .page-title {
          font-size: 24px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          margin: 0;
          line-height: 1.2;
        }

        .title-status {
          margin-left: auto;
        }
      }

      .page-description {
        color: var(--el-text-color-secondary);
        margin: 0 0 8px 0;
        line-height: 1.5;
        font-size: 14px;
      }

      .page-extra {
        .extra-text {
          color: var(--el-text-color-placeholder);
          font-size: 13px;
        }
      }
    }
  }

  .header-right {
    flex-shrink: 0;

    .header-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 16px 20px;

    .header-left {
      .title-wrapper {
        flex-wrap: wrap;
        gap: 8px;

        .page-title {
          font-size: 20px;
        }

        .title-status {
          margin-left: 0;
        }
      }
    }

    .header-right {
      .header-actions {
        justify-content: flex-start;
        gap: 8px;

        .el-button {
          flex: 1;
          min-width: 0;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .page-header {
    .header-left {
      .breadcrumb-wrapper {
        :deep(.el-breadcrumb) {
          .el-breadcrumb__item {
            .el-breadcrumb__inner {
              max-width: 80px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
          }
        }
      }

      .title-wrapper {
        .page-title {
          font-size: 18px;
        }
      }
    }

    .header-right {
      .header-actions {
        flex-direction: column;
        width: 100%;

        .el-button {
          width: 100%;
        }
      }
    }
  }
}
</style>
