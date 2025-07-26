<script>
// 注册组件 - 必须在单独的script标签中，不能在script setup中引用局部变量
const CountUpComponent = {
  props: ['endVal', 'options'],
  data() {
    return {
      currentVal: 0
    }
  },
  mounted() {
    this.animate()
  },
  methods: {
    animate() {
      const duration = this.options?.duration || 2
      const increment = this.endVal / (duration * 60) // 60fps

      const timer = setInterval(() => {
        this.currentVal += increment
        if (this.currentVal >= this.endVal) {
          this.currentVal = this.endVal
          clearInterval(timer)
        }
      }, 1000 / 60)
    }
  },
  template: '<span>{{ Math.floor(currentVal).toLocaleString() }}</span>'
}

export default {
  components: {
    CountUp: CountUpComponent
  }
}
</script>

<template>
  <el-card
    :shadow="shadow"
    :body-style="{ padding: '0' }"
    class="stat-card"
    :class="[`stat-card--${type}`, `stat-card--${size}`, { 'stat-card--clickable': clickable }]"
    @click="handleClick"
  >
    <div class="stat-content">
      <!-- 图标区域 -->
      <div class="stat-icon" :style="iconStyle">
        <el-icon :size="iconSize">
          <component :is="icon" v-if="icon" />
          <slot name="icon" v-else />
        </el-icon>
      </div>

      <!-- 内容区域 -->
      <div class="stat-info">
        <!-- 数值 -->
        <div class="stat-value">
          <span v-if="prefix" class="stat-prefix">{{ prefix }}</span>
          <span class="stat-number">
            <CountUp v-if="countUp && !loading" :end-val="numericValue" :options="countUpOptions" />
            <span v-else>{{ formattedValue }}</span>
          </span>
          <span v-if="suffix" class="stat-suffix">{{ suffix }}</span>
        </div>

        <!-- 标题 -->
        <div class="stat-title">{{ title }}</div>

        <!-- 描述 -->
        <div v-if="description" class="stat-description">{{ description }}</div>

        <!-- 趋势 -->
        <div v-if="showTrend && trend !== undefined" class="stat-trend">
          <el-icon :class="trendClass">
            <component :is="trendIcon" />
          </el-icon>
          <span :class="trendClass">{{ trendText }}</span>
        </div>

        <!-- 额外信息 -->
        <div v-if="extra" class="stat-extra">{{ extra }}</div>

        <!-- 自定义插槽 -->
        <div v-if="$slots.extra" class="stat-custom">
          <slot name="extra" />
        </div>
      </div>

      <!-- 操作区域 -->
      <div v-if="actions.length > 0 || $slots.actions" class="stat-actions">
        <slot name="actions">
          <el-dropdown v-if="actions.length > 1" @command="handleAction">
            <el-button :size="actionSize" text>
              <el-icon><MoreFilled /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="action in actions"
                  :key="action.key"
                  :command="action.key"
                  :disabled="action.disabled"
                >
                  <el-icon v-if="action.icon">
                    <component :is="action.icon" />
                  </el-icon>
                  {{ action.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-button v-else-if="actions.length === 1" :size="actionSize" text @click="handleAction(actions[0].key)">
            <el-icon v-if="actions[0].icon">
              <component :is="actions[0].icon" />
            </el-icon>
            {{ actions[0].label }}
          </el-button>
        </slot>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="stat-loading">
      <el-skeleton animated>
        <template #template>
          <div class="stat-skeleton">
            <el-skeleton-item variant="circle" style="width: 60px; height: 60px" />
            <div class="skeleton-content">
              <el-skeleton-item variant="text" style="width: 60px; height: 32px" />
              <el-skeleton-item variant="text" style="width: 80px; height: 16px; margin-top: 8px" />
            </div>
          </div>
        </template>
      </el-skeleton>
    </div>

    <!-- 进度条 -->
    <div v-if="showProgress && progress !== undefined" class="stat-progress">
      <el-progress
        :percentage="progress"
        :color="progressColor"
        :show-text="showProgressText"
        :stroke-width="progressHeight"
        :status="progressStatus"
      />
    </div>

    <!-- 迷你图表 -->
    <div v-if="chartData" class="stat-chart">
      <slot name="chart" :data="chartData">
        <!-- 这里可以集成图表组件 -->
      </slot>
    </div>
  </el-card>
</template>

<script setup>
import { computed } from 'vue'

// Props 定义
const props = defineProps({
  // 基本信息
  title: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  description: String,
  extra: String,

  // 样式
  type: {
    type: String,
    default: 'default',
    validator: value => ['default', 'primary', 'success', 'warning', 'danger', 'info'].includes(value)
  },
  size: {
    type: String,
    default: 'default',
    validator: value => ['small', 'default', 'large'].includes(value)
  },
  shadow: {
    type: String,
    default: 'hover',
    validator: value => ['always', 'hover', 'never'].includes(value)
  },

  // 图标
  icon: String,
  iconSize: {
    type: [String, Number],
    default: 32
  },
  iconColor: String,
  iconBackground: String,

  // 数值格式化
  prefix: String,
  suffix: String,
  precision: {
    type: Number,
    default: 0
  },
  separator: {
    type: String,
    default: ','
  },

  // 动画
  countUp: {
    type: Boolean,
    default: false
  },
  countUpOptions: {
    type: Object,
    default: () => ({
      duration: 2,
      useEasing: true,
      useGrouping: true,
      separator: ','
    })
  },

  // 趋势
  showTrend: {
    type: Boolean,
    default: false
  },
  trend: Number,
  trendSuffix: {
    type: String,
    default: '%'
  },

  // 进度条
  showProgress: {
    type: Boolean,
    default: false
  },
  progress: Number,
  progressColor: String,
  progressHeight: {
    type: Number,
    default: 6
  },
  showProgressText: {
    type: Boolean,
    default: false
  },
  progressStatus: String,

  // 图表
  chartData: [Object, Array],

  // 操作
  actions: {
    type: Array,
    default: () => []
  },
  actionSize: {
    type: String,
    default: 'small'
  },
  clickable: {
    type: Boolean,
    default: false
  },

  // 状态
  loading: {
    type: Boolean,
    default: false
  }
})

// 事件定义
const emit = defineEmits(['click', 'action'])

// 计算属性
const numericValue = computed(() => {
  const num = parseFloat(props.value)
  return isNaN(num) ? 0 : num
})

const formattedValue = computed(() => {
  if (typeof props.value === 'string') return props.value

  const num = numericValue.value
  if (props.separator && num >= 1000) {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: props.precision,
      maximumFractionDigits: props.precision
    })
  }

  return num.toFixed(props.precision)
})

const iconStyle = computed(() => {
  const style = {}

  if (props.iconColor) {
    style.color = props.iconColor
  }

  if (props.iconBackground) {
    style.background = props.iconBackground
  } else {
    // 默认渐变背景
    const gradients = {
      primary: 'linear-gradient(135deg, #409EFF, #5d73e7)',
      success: 'linear-gradient(135deg, #67C23A, #85ce61)',
      warning: 'linear-gradient(135deg, #E6A23C, #f0a020)',
      danger: 'linear-gradient(135deg, #F56C6C, #f78989)',
      info: 'linear-gradient(135deg, #909399, #b1b3b8)',
      default: 'linear-gradient(135deg, #409EFF, #5d73e7)'
    }
    style.background = gradients[props.type]
  }

  return style
})

const trendClass = computed(() => {
  if (props.trend === undefined) return ''

  return {
    'trend-positive': props.trend > 0,
    'trend-negative': props.trend < 0,
    'trend-neutral': props.trend === 0
  }
})

const trendIcon = computed(() => {
  if (props.trend === undefined) return ''

  if (props.trend > 0) return 'CaretTop'
  if (props.trend < 0) return 'CaretBottom'
  return 'Minus'
})

const trendText = computed(() => {
  if (props.trend === undefined) return ''

  const absValue = Math.abs(props.trend)
  return `${absValue}${props.trendSuffix}`
})

// 方法
const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}

const handleAction = actionKey => {
  emit('action', actionKey)
}

// CountUp组件已在上面的script标签中定义和注册
</script>

<style lang="scss" scoped>
.stat-card {
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &--clickable {
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
  }

  &--small {
    .stat-content {
      padding: 16px;

      .stat-icon {
        width: 40px;
        height: 40px;

        .el-icon {
          font-size: 20px;
        }
      }

      .stat-value {
        font-size: 20px;
      }

      .stat-title {
        font-size: 13px;
      }
    }
  }

  &--default {
    .stat-content {
      padding: 20px;
    }
  }

  &--large {
    .stat-content {
      padding: 24px;

      .stat-icon {
        width: 70px;
        height: 70px;

        .el-icon {
          font-size: 36px;
        }
      }

      .stat-value {
        font-size: 32px;
      }

      .stat-title {
        font-size: 16px;
      }
    }
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
    position: relative;

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .el-icon {
        color: white;
      }
    }

    .stat-info {
      flex: 1;
      min-width: 0;

      .stat-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--el-text-color-primary);
        line-height: 1;
        margin-bottom: 4px;
        display: flex;
        align-items: baseline;
        gap: 2px;

        .stat-prefix,
        .stat-suffix {
          font-size: 0.6em;
          font-weight: 500;
          color: var(--el-text-color-secondary);
        }

        .stat-number {
          font-variant-numeric: tabular-nums;
        }
      }

      .stat-title {
        font-size: 14px;
        color: var(--el-text-color-secondary);
        margin-bottom: 4px;
        line-height: 1.2;
      }

      .stat-description {
        font-size: 12px;
        color: var(--el-text-color-placeholder);
        line-height: 1.3;
        margin-bottom: 6px;
      }

      .stat-trend {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 4px;

        .trend-positive {
          color: var(--el-color-success);
        }

        .trend-negative {
          color: var(--el-color-danger);
        }

        .trend-neutral {
          color: var(--el-text-color-secondary);
        }
      }

      .stat-extra {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        line-height: 1.3;
      }

      .stat-custom {
        margin-top: 8px;
      }
    }

    .stat-actions {
      position: absolute;
      top: 8px;
      right: 8px;
      opacity: 0;
      transition: opacity 0.3s;
    }

    &:hover .stat-actions {
      opacity: 1;
    }
  }

  .stat-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;

    .stat-skeleton {
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
      padding: 20px;

      .skeleton-content {
        flex: 1;
      }
    }
  }

  .stat-progress {
    margin: 12px 20px 0;
  }

  .stat-chart {
    margin-top: 12px;
    height: 60px;
  }
}

// 主题色变体
.stat-card--primary {
  border-left: 4px solid var(--el-color-primary);
}

.stat-card--success {
  border-left: 4px solid var(--el-color-success);
}

.stat-card--warning {
  border-left: 4px solid var(--el-color-warning);
}

.stat-card--danger {
  border-left: 4px solid var(--el-color-danger);
}

.stat-card--info {
  border-left: 4px solid var(--el-color-info);
}

// 响应式设计
@media (max-width: 768px) {
  .stat-card {
    .stat-content {
      flex-direction: column;
      text-align: center;
      gap: 12px;

      .stat-icon {
        align-self: center;
      }

      .stat-actions {
        position: relative;
        top: auto;
        right: auto;
        opacity: 1;
        margin-top: 8px;
      }
    }
  }
}
</style>
