<template>
  <div class="borrow-detail-container">
    <!-- 图书信息 -->
    <div class="book-section">
      <h3 class="section-title">图书信息</h3>
      <div class="book-info">
        <img :src="borrow.book.cover" :alt="borrow.book.title" class="book-cover" />
        <div class="book-details">
          <h4 class="book-title">{{ borrow.book.title }}</h4>
          <div class="book-meta">
            <div class="meta-item">
              <label>作者：</label>
              <span>{{ borrow.book.author }}</span>
            </div>
            <div class="meta-item">
              <label>ISBN：</label>
              <span>{{ borrow.book.isbn }}</span>
            </div>
            <div class="meta-item">
              <label>出版社：</label>
              <span>{{ borrow.book.publisher }}</span>
            </div>
            <div class="meta-item">
              <label>分类：</label>
              <el-tag size="small" :type="getCategoryTagType(borrow.book.category)">
                {{ borrow.book.category }}
              </el-tag>
            </div>
            <div class="meta-item">
              <label>位置：</label>
              <span>{{ borrow.book.location }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 借阅信息 -->
    <div class="borrow-section">
      <h3 class="section-title">借阅信息</h3>
      <div class="detail-grid">
        <div class="detail-item">
          <label>借阅状态：</label>
          <el-tag :type="getStatusTagType(borrow.status)" size="small">
            {{ getStatusText(borrow.status) }}
          </el-tag>
        </div>
        <div class="detail-item">
          <label>借阅时间：</label>
          <span>{{ formatDateTime(borrow.borrowedAt) }}</span>
        </div>
        <div class="detail-item">
          <label>应还时间：</label>
          <span :class="{ overdue: isOverdue(borrow.dueDate) }">
            {{ formatDateTime(borrow.dueDate) }}
          </span>
        </div>
        <div class="detail-item" v-if="borrow.returnedAt">
          <label>归还时间：</label>
          <span>{{ formatDateTime(borrow.returnedAt) }}</span>
        </div>
        <div class="detail-item">
          <label>续借次数：</label>
          <span>{{ borrow.renewalCount || 0 }}次</span>
        </div>
        <div class="detail-item" v-if="borrow.overdueDays > 0">
          <label>逾期天数：</label>
          <span class="overdue-text">{{ borrow.overdueDays }}天</span>
        </div>
        <div class="detail-item" v-if="borrow.fine > 0">
          <label>罚金：</label>
          <span class="fine-text">¥{{ borrow.fine.toFixed(2) }}</span>
        </div>
        <div class="detail-item" v-if="borrow.operator">
          <label>操作员：</label>
          <span>{{ borrow.operator.name }}</span>
        </div>
      </div>
    </div>

    <!-- 续借记录 -->
    <div class="renewal-section" v-if="borrow.renewalHistory && borrow.renewalHistory.length > 0">
      <h3 class="section-title">续借记录</h3>
      <el-table :data="borrow.renewalHistory" size="small" border>
        <el-table-column label="续借时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.renewedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="原到期时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.originalDueDate) }}
          </template>
        </el-table-column>
        <el-table-column label="新到期时间" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.newDueDate) }}
          </template>
        </el-table-column>
        <el-table-column label="操作员">
          <template #default="{ row }">
            {{ row.operator?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="备注">
          <template #default="{ row }">
            {{ row.note || '-' }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 操作记录 -->
    <div class="operation-section" v-if="borrow.operationHistory && borrow.operationHistory.length > 0">
      <h3 class="section-title">操作记录</h3>
      <el-timeline>
        <el-timeline-item
          v-for="operation in borrow.operationHistory"
          :key="operation.id"
          :timestamp="formatDateTime(operation.createdAt)"
          :type="getOperationTimelineType(operation.type)"
        >
          <div class="operation-content">
            <div class="operation-title">{{ getOperationText(operation.type) }}</div>
            <div class="operation-detail" v-if="operation.detail">{{ operation.detail }}</div>
            <div class="operation-operator">操作员: {{ operation.operator?.name || '系统' }}</div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>

    <!-- 备注信息 -->
    <div class="note-section" v-if="borrow.note">
      <h3 class="section-title">备注信息</h3>
      <div class="note-content">
        {{ borrow.note }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { formatDateTime } from '@/utils/date'

// 属性定义
const props = defineProps({
  borrow: {
    type: Object,
    required: true
  }
})

// 方法
const getStatusText = status => {
  const statusMap = {
    borrowed: '已借出',
    returned: '已归还',
    overdue: '已逾期',
    reserved: '已预约'
  }
  return statusMap[status] || status
}

const getStatusTagType = status => {
  const typeMap = {
    borrowed: 'primary',
    returned: 'success',
    overdue: 'danger',
    reserved: 'warning'
  }
  return typeMap[status] || 'info'
}

const getCategoryTagType = category => {
  const typeMap = {
    computer: 'primary',
    literature: 'success',
    history: 'warning',
    science: 'info',
    art: 'danger'
  }
  return typeMap[category] || 'info'
}

const isOverdue = dueDate => {
  return new Date(dueDate) < new Date()
}

const getOperationTimelineType = type => {
  const typeMap = {
    borrow: 'primary',
    renew: 'warning',
    return: 'success',
    overdue: 'danger'
  }
  return typeMap[type] || 'info'
}

const getOperationText = type => {
  const textMap = {
    borrow: '借阅图书',
    renew: '续借图书',
    return: '归还图书',
    overdue: '标记逾期',
    fine: '产生罚金',
    paid: '缴纳罚金'
  }
  return textMap[type] || type
}
</script>

<style lang="scss" scoped>
.borrow-detail-container {
  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin: 0 0 16px 0;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }
}

.book-section {
  margin-bottom: 20px;

  .book-info {
    display: flex;
    gap: 16px;

    .book-cover {
      width: 80px;
      height: 112px;
      object-fit: cover;
      border-radius: 4px;
      border: 1px solid var(--el-border-color-light);
      flex-shrink: 0;
    }

    .book-details {
      flex: 1;

      .book-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin: 0 0 16px 0;
        line-height: 1.4;
      }

      .book-meta {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        .meta-item {
          display: flex;
          align-items: center;

          label {
            font-weight: 500;
            color: var(--el-text-color-secondary);
            margin-right: 8px;
            min-width: 60px;
          }

          span {
            color: var(--el-text-color-primary);
          }
        }
      }
    }
  }
}

.borrow-section {
  margin-bottom: 20px;

  .detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;

    .detail-item {
      display: flex;
      align-items: center;

      label {
        font-weight: 500;
        color: var(--el-text-color-secondary);
        margin-right: 12px;
        min-width: 80px;
      }

      span {
        color: var(--el-text-color-primary);

        &.overdue {
          color: var(--el-color-danger);
          font-weight: 600;
        }

        &.overdue-text {
          color: var(--el-color-danger);
          font-weight: 600;
        }

        &.fine-text {
          color: var(--el-color-danger);
          font-weight: 600;
        }
      }
    }
  }
}

.renewal-section,
.operation-section {
  margin-bottom: 20px;
}

.operation-content {
  .operation-title {
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 4px;
  }

  .operation-detail {
    color: var(--el-text-color-regular);
    margin-bottom: 4px;
    line-height: 1.4;
  }

  .operation-operator {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.note-section {
  .note-content {
    background: var(--el-fill-color-lighter);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--el-border-color-light);
    line-height: 1.6;
    color: var(--el-text-color-regular);
  }
}

// 响应式设计
@include respond-to(mobile) {
  .book-info {
    flex-direction: column;
    align-items: center;
    text-align: center;

    .book-details {
      .book-meta {
        grid-template-columns: 1fr !important;

        .meta-item {
          justify-content: center;
        }
      }
    }
  }

  .detail-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
