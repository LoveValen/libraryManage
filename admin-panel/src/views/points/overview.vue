<template>
  <div class="points-overview-container">


    <!-- 快速操作区域 -->
    <el-card shadow="never" class="quick-actions-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><Lightning /></el-icon>
            快速操作
          </div>
        </div>
      </template>

      <div class="quick-actions">
        <el-button type="success" :icon="Plus" @click="showAddPointsDialog = true" size="large">发放积分</el-button>
        <el-button type="warning" :icon="Minus" @click="showDeductPointsDialog = true" size="large">扣除积分</el-button>
        <el-button type="info" :icon="Switch" @click="showTransferDialog = true" size="large">积分转移</el-button>
        <el-button type="primary" :icon="TrendCharts" @click="showStatisticsDialog = true" size="large">
          统计分析
        </el-button>
      </div>
    </el-card>

    <!-- 积分排行榜 -->
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card shadow="never" class="leaderboard-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><Trophy /></el-icon>
                积分排行榜
              </div>
              <div class="header-actions">
                <el-select v-model="leaderboardPeriod" @change="loadLeaderboard" size="small">
                  <el-option label="总积分" value="all" />
                  <el-option label="本月" value="monthly" />
                  <el-option label="本周" value="weekly" />
                </el-select>
              </div>
            </div>
          </template>

          <div v-loading="leaderboardLoading" class="leaderboard-content">
            <div
              v-for="(item, index) in leaderboard"
              :key="item.user.id"
              class="leaderboard-item"
              :class="getRankClass(item.rank)"
            >
              <div class="rank-badge">
                <el-icon v-if="item.rank <= 3" class="rank-icon">
                  <Trophy />
                </el-icon>
                <span v-else class="rank-number">{{ item.rank }}</span>
              </div>

              <el-avatar :src="item.user.avatar" :size="40" class="user-avatar">
                {{ item.user.realName?.charAt(0) || item.user.username?.charAt(0) }}
              </el-avatar>

              <div class="user-info">
                <div class="user-name">{{ item.user.realName || item.user.username }}</div>
                <div class="user-level">{{ item.level.name }}</div>
              </div>

              <div class="points-info">
                <div class="points-value">{{ item.points }}</div>
                <div class="points-label">积分</div>
              </div>
            </div>

            <el-empty v-if="!leaderboardLoading && leaderboard.length === 0" description="暂无数据" image-size="120" />
          </div>
        </el-card>
      </el-col>

      <el-col :span="12">
        <!-- 最近交易记录 -->
        <el-card shadow="never" class="recent-transactions-card">
          <template #header>
            <div class="card-header">
              <div class="header-title">
                <el-icon><DocumentCopy /></el-icon>
                最近交易记录
              </div>
              <div class="header-actions">
                <el-button
                  link
                  :icon="Refresh"
                  @click="loadRecentTransactions"
                  :loading="transactionsLoading"
                  size="small"
                >
                  刷新
                </el-button>
              </div>
            </div>
          </template>

          <div v-loading="transactionsLoading" class="transactions-content">
            <div v-for="transaction in recentTransactions" :key="transaction.id" class="transaction-item">
              <div class="transaction-icon">
                <el-icon :class="getTransactionIconClass(transaction.type)">
                  <component :is="getTransactionIcon(transaction.type)" />
                </el-icon>
              </div>

              <div class="transaction-info">
                <div class="transaction-description">{{ transaction.description }}</div>
                <div class="transaction-meta">
                  {{ formatRelativeTime(transaction.createdAt) }}
                </div>
              </div>

              <div class="transaction-amount" :class="getAmountClass(transaction.amount)">
                {{ transaction.amount > 0 ? '+' : '' }}{{ transaction.amount }}
              </div>
            </div>

            <el-empty
              v-if="!transactionsLoading && recentTransactions.length === 0"
              description="暂无交易记录"
              image-size="120"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 积分规则说明 -->
    <el-card shadow="never" class="rules-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <el-icon><InfoFilled /></el-icon>
            积分规则说明
          </div>
          <div class="header-actions">
            <el-button link :icon="Edit" @click="showRulesDialog = true" size="small">编辑规则</el-button>
          </div>
        </div>
      </template>

      <div class="rules-content">
        <el-row :gutter="20">
          <el-col :span="12">
            <h4>获得积分</h4>
            <ul class="rules-list">
              <li>借阅图书：+{{ pointsRules.BORROW_BOOK }} 积分</li>
              <li>按时归还：+{{ pointsRules.RETURN_ON_TIME }} 积分</li>
              <li>撰写评价：+{{ pointsRules.WRITE_REVIEW }} 积分</li>
              <li>完成教程：+{{ pointsRules.COMPLETE_TUTORIAL }} 积分</li>
            </ul>
          </el-col>
          <el-col :span="12">
            <h4>扣除积分</h4>
            <ul class="rules-list">
              <li>逾期归还：{{ pointsRules.OVERDUE_PENALTY }} 积分</li>
              <li>损坏图书：{{ pointsRules.DAMAGE_PENALTY }} 积分</li>
              <li>丢失图书：{{ pointsRules.LOST_PENALTY }} 积分</li>
            </ul>
          </el-col>
        </el-row>

        <div class="user-levels-section">
          <h4>用户等级</h4>
          <div class="levels-grid">
            <div v-for="(level, key) in userLevels" :key="key" class="level-item">
              <div class="level-name">{{ level.name }}</div>
              <div class="level-range">{{ level.min }} - {{ level.max === Infinity ? '∞' : level.max }} 积分</div>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 发放积分对话框 -->
    <PointsOperationDialog
      v-model="showAddPointsDialog"
      title="发放积分"
      operation="add"
      @success="handleOperationSuccess"
    />

    <!-- 扣除积分对话框 -->
    <PointsOperationDialog
      v-model="showDeductPointsDialog"
      title="扣除积分"
      operation="deduct"
      @success="handleOperationSuccess"
    />

    <!-- 积分转移对话框 -->
    <PointsTransferDialog v-model="showTransferDialog" @success="handleOperationSuccess" />

    <!-- 统计分析对话框 -->
    <!-- <PointsStatisticsDialog v-model="showStatisticsDialog" /> -->

    <!-- 积分规则编辑对话框 -->
    <!-- <PointsRulesDialog v-model="showRulesDialog" @success="loadPointsRules" /> -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showError, notifySuccess } from '@/utils/message'
import {
  Lightning,
  Plus,
  Minus,
  Switch,
  TrendCharts,
  Trophy,
  DocumentCopy,
  Refresh,
  InfoFilled,
  Edit,
  Present,
  Coin,
  Reading,
  Check,
  EditPen,
  Setting,
  Warning
} from '@element-plus/icons-vue'
import PointsOperationDialog from './components/PointsOperationDialog.vue'
import PointsTransferDialog from './components/PointsTransferDialog.vue'
// import PointsStatisticsDialog from './components/PointsStatisticsDialog.vue'
// import PointsRulesDialog from './components/PointsRulesDialog.vue'
import { getPointsStatistics, getPointsLeaderboard, getPointsHistory, getPointsRules } from '@/api/points'
import { formatRelativeTime } from '@/utils/date'

// 响应式数据
const loading = ref(false)
const leaderboardLoading = ref(false)
const transactionsLoading = ref(false)

const showAddPointsDialog = ref(false)
const showDeductPointsDialog = ref(false)
const showTransferDialog = ref(false)
const showStatisticsDialog = ref(false)
const showRulesDialog = ref(false)

const leaderboard = ref([])
const recentTransactions = ref([])
const leaderboardPeriod = ref('all')

const pointsRules = ref({})
const userLevels = ref({})



// 方法

const loadLeaderboard = async () => {
  leaderboardLoading.value = true
  try {
    const response = await getPointsLeaderboard({
      period: leaderboardPeriod.value,
      limit: 10
    })

    leaderboard.value = response.data
  } catch (error) {
    console.error('加载排行榜失败:', error)
    showError('加载排行榜失败')
  } finally {
    leaderboardLoading.value = false
  }
}

const loadRecentTransactions = async () => {
  transactionsLoading.value = true
  try {
    const response = await getPointsHistory({
      limit: 10
    })

    recentTransactions.value = response.data.transactions
  } catch (error) {
    console.error('加载交易记录失败:', error)
    showError('加载交易记录失败')
  } finally {
    transactionsLoading.value = false
  }
}

const loadPointsRules = async () => {
  try {
    const response = await getPointsRules()
    const rules = response.data

    pointsRules.value = rules.pointsRules
    userLevels.value = rules.userLevels
  } catch (error) {
    console.error('加载积分规则失败:', error)
    showError('加载积分规则失败')
  }
}



const handleOperationSuccess = () => {
  notifySuccess('积分操作已完成', '操作成功')

  // 刷新数据
  loadAllData()
}

const loadAllData = () => {
  loadLeaderboard()
  loadRecentTransactions()
}

const exportReport = () => {
  showInfo('导出功能待实现')
}

// 工具函数
const getRankClass = rank => {
  if (rank === 1) return 'rank-first'
  if (rank === 2) return 'rank-second'
  if (rank === 3) return 'rank-third'
  return ''
}

const getTransactionIcon = type => {
  const iconMap = {
    BORROW_BOOK: Reading,
    RETURN_ON_TIME: Check,
    WRITE_REVIEW: EditPen,
    ADMIN_ADJUSTMENT: Setting,
    BONUS_REWARD: Present,
    PENALTY_DEDUCTION: Warning
  }
  return iconMap[type] || Coin
}

const getTransactionIconClass = type => {
  const classMap = {
    BORROW_BOOK: 'transaction-icon-success',
    RETURN_ON_TIME: 'transaction-icon-success',
    WRITE_REVIEW: 'transaction-icon-success',
    ADMIN_ADJUSTMENT: 'transaction-icon-info',
    BONUS_REWARD: 'transaction-icon-success',
    PENALTY_DEDUCTION: 'transaction-icon-danger'
  }
  return classMap[type] || 'transaction-icon-default'
}

const getAmountClass = amount => {
  return amount > 0 ? 'amount-positive' : 'amount-negative'
}

// 生命周期
onMounted(() => {
  loadAllData()
  loadPointsRules()
})
</script>

<style lang="scss" scoped>
.points-overview-container {
  padding: 20px;
}


.quick-actions-card {
  margin-bottom: 20px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }
  }

  .quick-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
}

.leaderboard-card,
.recent-transactions-card {
  height: 500px;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 16px;
    }
  }
}

.leaderboard-content {
  max-height: 420px;
  overflow-y: auto;

  .leaderboard-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 8px;
    transition: all 0.3s ease;

    &:hover {
      background: var(--el-fill-color-extra-light);
    }

    &.rank-first {
      background: linear-gradient(135deg, #ffd700, #ffed4e);
      color: #8b4513;
    }

    &.rank-second {
      background: linear-gradient(135deg, #c0c0c0, #e6e6e6);
      color: #555;
    }

    &.rank-third {
      background: linear-gradient(135deg, #cd7f32, #daa520);
      color: #fff;
    }

    .rank-badge {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: var(--el-color-primary-light-9);

      .rank-icon {
        font-size: 20px;
        color: var(--el-color-primary);
      }

      .rank-number {
        font-weight: 600;
        font-size: 16px;
        color: var(--el-text-color-primary);
      }
    }

    .user-avatar {
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;

      .user-name {
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 2px;
      }

      .user-level {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }

    .points-info {
      text-align: right;

      .points-value {
        font-weight: 600;
        font-size: 18px;
        color: var(--el-color-primary);
      }

      .points-label {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }
  }
}

.transactions-content {
  max-height: 420px;
  overflow-y: auto;

  .transaction-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid var(--el-border-color-extra-light);

    &:last-child {
      border-bottom: none;
    }

    .transaction-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      flex-shrink: 0;

      &.transaction-icon-success {
        background: var(--el-color-success-light-9);
        color: var(--el-color-success);
      }

      &.transaction-icon-danger {
        background: var(--el-color-danger-light-9);
        color: var(--el-color-danger);
      }

      &.transaction-icon-info {
        background: var(--el-color-info-light-9);
        color: var(--el-color-info);
      }

      &.transaction-icon-default {
        background: var(--el-fill-color-light);
        color: var(--el-text-color-regular);
      }
    }

    .transaction-info {
      flex: 1;

      .transaction-description {
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 2px;
      }

      .transaction-meta {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }

    .transaction-amount {
      font-weight: 600;
      font-size: 16px;

      &.amount-positive {
        color: var(--el-color-success);
      }

      &.amount-negative {
        color: var(--el-color-danger);
      }
    }
  }
}

.rules-card {
  .rules-content {
    h4 {
      margin-bottom: 16px;
      color: var(--el-text-color-primary);
      font-size: 16px;
    }

    .rules-list {
      margin: 0 0 20px 0;
      padding-left: 20px;

      li {
        margin-bottom: 8px;
        color: var(--el-text-color-regular);
        line-height: 1.6;
      }
    }

    .user-levels-section {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid var(--el-border-color-lighter);

      .levels-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 12px;

        .level-item {
          padding: 12px;
          border: 1px solid var(--el-border-color-lighter);
          border-radius: 8px;
          background: var(--el-fill-color-extra-light);
          text-align: center;

          .level-name {
            font-weight: 600;
            color: var(--el-text-color-primary);
            margin-bottom: 4px;
          }

          .level-range {
            font-size: 12px;
            color: var(--el-text-color-regular);
          }
        }
      }
    }
  }
}

.cursor-pointer {
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    transition: transform 0.3s ease;
  }
}

// 响应式设计
@media (max-width: 768px) {

  .quick-actions {
    justify-content: center;
  }

  .leaderboard-item,
  .transaction-item {
    padding: 8px;
  }

  .levels-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
