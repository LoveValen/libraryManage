<template>
  <el-tag
    :type="computedType"
    :size="size"
    :effect="effect"
    :round="round"
    :closable="closable"
    :disable-transitions="disableTransitions"
    :hit="hit"
    :color="customColor"
    :class="['status-tag', `status-tag--${status}`, { 'status-tag--with-icon': showIcon }]"
    @close="handleClose"
    @click="handleClick"
  >
    <!-- 图标 -->
    <el-icon v-if="showIcon" class="status-icon">
      <component :is="computedIcon" />
    </el-icon>

    <!-- 状态点 -->
    <span v-if="showDot" class="status-dot" :style="dotStyle"></span>

    <!-- 文本内容 -->
    <span class="status-text">{{ computedText }}</span>

    <!-- 自定义插槽 -->
    <slot />
  </el-tag>
</template>

<script setup>
import { computed } from 'vue'

// Props 定义
const props = defineProps({
  // 状态值
  status: {
    type: [String, Number],
    required: true
  },

  // 显示文本（如果不提供则从状态映射中获取）
  text: String,

  // Element Plus Tag 原生属性
  type: String, // 如果提供则覆盖自动计算的类型
  size: {
    type: String,
    default: 'default'
  },
  effect: {
    type: String,
    default: 'light'
  },
  round: {
    type: Boolean,
    default: false
  },
  closable: {
    type: Boolean,
    default: false
  },
  disableTransitions: {
    type: Boolean,
    default: false
  },
  hit: {
    type: Boolean,
    default: false
  },
  color: String,

  // 图标
  showIcon: {
    type: Boolean,
    default: false
  },
  icon: String, // 自定义图标

  // 状态点
  showDot: {
    type: Boolean,
    default: false
  },
  dotColor: String,

  // 状态映射配置
  statusMap: {
    type: Object,
    default: () => ({})
  },

  // 预设状态类型
  preset: {
    type: String,
    default: 'default',
    validator: value => ['default', 'book', 'user', 'borrow', 'order', 'payment', 'audit'].includes(value)
  },

  // 点击事件
  clickable: {
    type: Boolean,
    default: false
  }
})

// 事件定义
const emit = defineEmits(['close', 'click'])

// 预设状态映射
const presetMaps = {
  default: {
    active: { text: '激活', type: 'success', icon: 'Check' },
    inactive: { text: '未激活', type: 'info', icon: 'Close' },
    pending: { text: '待处理', type: 'warning', icon: 'Clock' },
    processing: { text: '处理中', type: 'primary', icon: 'Loading' },
    completed: { text: '已完成', type: 'success', icon: 'Check' },
    failed: { text: '失败', type: 'danger', icon: 'Close' },
    cancelled: { text: '已取消', type: 'info', icon: 'Close' }
  },

  book: {
    available: { text: '可借', type: 'success', icon: 'Check' },
    borrowed: { text: '已借出', type: 'warning', icon: 'Reading' },
    reserved: { text: '已预约', type: 'primary', icon: 'Clock' },
    maintenance: { text: '维修中', type: 'info', icon: 'Tools' },
    offline: { text: '已下架', type: 'danger', icon: 'Close' }
  },

  user: {
    active: { text: '正常', type: 'success', icon: 'User' },
    inactive: { text: '未激活', type: 'info', icon: 'User' },
    locked: { text: '已锁定', type: 'danger', icon: 'Lock' },
    suspended: { text: '已暂停', type: 'warning', icon: 'Warning' }
  },

  borrow: {
    borrowed: { text: '借阅中', type: 'primary', icon: 'Reading' },
    returned: { text: '已归还', type: 'success', icon: 'Check' },
    overdue: { text: '逾期', type: 'danger', icon: 'Warning' },
    renewed: { text: '已续借', type: 'warning', icon: 'Refresh' }
  },

  order: {
    pending: { text: '待付款', type: 'warning', icon: 'Clock' },
    paid: { text: '已付款', type: 'success', icon: 'Check' },
    shipping: { text: '配送中', type: 'primary', icon: 'Truck' },
    delivered: { text: '已送达', type: 'success', icon: 'Check' },
    cancelled: { text: '已取消', type: 'info', icon: 'Close' },
    refunded: { text: '已退款', type: 'danger', icon: 'RefreshLeft' }
  },

  payment: {
    pending: { text: '待支付', type: 'warning', icon: 'Clock' },
    processing: { text: '支付中', type: 'primary', icon: 'Loading' },
    success: { text: '支付成功', type: 'success', icon: 'Check' },
    failed: { text: '支付失败', type: 'danger', icon: 'Close' },
    refunded: { text: '已退款', type: 'info', icon: 'RefreshLeft' }
  },

  audit: {
    pending: { text: '待审核', type: 'warning', icon: 'Clock' },
    approved: { text: '已通过', type: 'success', icon: 'Check' },
    rejected: { text: '已拒绝', type: 'danger', icon: 'Close' },
    revoked: { text: '已撤销', type: 'info', icon: 'RefreshLeft' }
  }
}

// 计算属性
const mergedStatusMap = computed(() => {
  const presetMap = presetMaps[props.preset] || {}
  return { ...presetMap, ...props.statusMap }
})

const statusConfig = computed(() => {
  return mergedStatusMap.value[props.status] || {}
})

const computedText = computed(() => {
  return props.text || statusConfig.value.text || String(props.status)
})

const computedType = computed(() => {
  return props.type || statusConfig.value.type || 'info'
})

const computedIcon = computed(() => {
  return props.icon || statusConfig.value.icon || 'InfoFilled'
})

const customColor = computed(() => {
  return props.color || statusConfig.value.color
})

const dotStyle = computed(() => {
  const color = props.dotColor || statusConfig.value.dotColor || getTypeColor(computedType.value)
  return {
    backgroundColor: color
  }
})

// 方法
const getTypeColor = type => {
  const colorMap = {
    primary: '#409eff',
    success: '#67c23a',
    warning: '#e6a23c',
    danger: '#f56c6c',
    info: '#909399'
  }
  return colorMap[type] || colorMap.info
}

const handleClose = event => {
  emit('close', event)
}

const handleClick = event => {
  if (props.clickable) {
    emit('click', event, props.status)
  }
}
</script>

<style lang="scss" scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;

  &--with-icon {
    .status-icon {
      font-size: 0.8em;
    }
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
  }

  .status-text {
    line-height: 1;
  }

  // 自定义状态样式
  &--available {
    --el-tag-bg-color: #f0f9ff;
    --el-tag-border-color: #67c23a;
    --el-tag-text-color: #67c23a;
  }

  &--borrowed {
    --el-tag-bg-color: #fdf6ec;
    --el-tag-border-color: #e6a23c;
    --el-tag-text-color: #e6a23c;
  }

  &--overdue {
    --el-tag-bg-color: #fef0f0;
    --el-tag-border-color: #f56c6c;
    --el-tag-text-color: #f56c6c;
  }

  &--returned {
    --el-tag-bg-color: #f0f9ff;
    --el-tag-border-color: #67c23a;
    --el-tag-text-color: #67c23a;
  }

  &--maintenance {
    --el-tag-bg-color: #f4f4f5;
    --el-tag-border-color: #909399;
    --el-tag-text-color: #909399;
  }

  &--offline {
    --el-tag-bg-color: #fef0f0;
    --el-tag-border-color: #f56c6c;
    --el-tag-text-color: #f56c6c;
  }

  &--pending {
    --el-tag-bg-color: #fdf6ec;
    --el-tag-border-color: #e6a23c;
    --el-tag-text-color: #e6a23c;
  }

  &--processing {
    --el-tag-bg-color: #ecf5ff;
    --el-tag-border-color: #409eff;
    --el-tag-text-color: #409eff;
  }

  &--completed {
    --el-tag-bg-color: #f0f9ff;
    --el-tag-border-color: #67c23a;
    --el-tag-text-color: #67c23a;
  }

  &--failed {
    --el-tag-bg-color: #fef0f0;
    --el-tag-border-color: #f56c6c;
    --el-tag-text-color: #f56c6c;
  }

  &--cancelled {
    --el-tag-bg-color: #f4f4f5;
    --el-tag-border-color: #909399;
    --el-tag-text-color: #909399;
  }

  &--active {
    --el-tag-bg-color: #f0f9ff;
    --el-tag-border-color: #67c23a;
    --el-tag-text-color: #67c23a;
  }

  &--inactive {
    --el-tag-bg-color: #f4f4f5;
    --el-tag-border-color: #909399;
    --el-tag-text-color: #909399;
  }

  &--locked {
    --el-tag-bg-color: #fef0f0;
    --el-tag-border-color: #f56c6c;
    --el-tag-text-color: #f56c6c;
  }

  &--suspended {
    --el-tag-bg-color: #fdf6ec;
    --el-tag-border-color: #e6a23c;
    --el-tag-text-color: #e6a23c;
  }

  // 可点击样式
  &.el-tag--clickable {
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      opacity: 0.8;
      transform: translateY(-1px);
    }
  }
}

// 动画效果
.status-tag {
  .status-icon {
    animation: none;
  }

  // 加载中动画
  &--processing {
    .status-icon {
      animation: rotate 2s linear infinite;
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 尺寸变体
.status-tag {
  &.el-tag--small {
    .status-dot {
      width: 4px;
      height: 4px;
    }
  }

  &.el-tag--large {
    .status-dot {
      width: 8px;
      height: 8px;
    }
  }
}
</style>
