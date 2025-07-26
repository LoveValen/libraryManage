<template>
  <div class="system-settings-container">
    <!-- 页面头部 -->
    <PageHeader
      title="系统设置"
      description="配置图书馆管理系统的各项参数和规则"
      icon="Setting"
      :actions="headerActions"
      @action="handleHeaderAction"
    />

    <!-- 设置导航 -->
    <el-card shadow="never" class="settings-nav-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="基础设置" name="basic">
          <el-icon><Setting /></el-icon>
        </el-tab-pane>
        <el-tab-pane label="借阅规则" name="borrow">
          <el-icon><Reading /></el-icon>
        </el-tab-pane>
        <el-tab-pane label="积分规则" name="points">
          <el-icon><Medal /></el-icon>
        </el-tab-pane>
        <el-tab-pane label="通知设置" name="notifications">
          <el-icon><Bell /></el-icon>
        </el-tab-pane>
        <el-tab-pane label="安全设置" name="security">
          <el-icon><Lock /></el-icon>
        </el-tab-pane>
        <el-tab-pane label="系统维护" name="maintenance">
          <el-icon><Tools /></el-icon>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 基础设置 -->
    <div v-show="activeTab === 'basic'">
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Setting /></el-icon>
              基础设置
            </div>
          </div>
        </template>

        <el-form :model="basicSettings" label-width="150px" size="default">
          <el-form-item label="系统名称">
            <el-input v-model="basicSettings.systemName" placeholder="请输入系统名称" style="width: 400px" />
          </el-form-item>

          <el-form-item label="图书馆名称">
            <el-input v-model="basicSettings.libraryName" placeholder="请输入图书馆名称" style="width: 400px" />
          </el-form-item>

          <el-form-item label="联系邮箱">
            <el-input v-model="basicSettings.contactEmail" placeholder="请输入联系邮箱" style="width: 400px" />
          </el-form-item>

          <el-form-item label="联系电话">
            <el-input v-model="basicSettings.contactPhone" placeholder="请输入联系电话" style="width: 400px" />
          </el-form-item>

          <el-form-item label="地址">
            <el-input
              v-model="basicSettings.address"
              type="textarea"
              :rows="3"
              placeholder="请输入图书馆地址"
              style="width: 400px"
            />
          </el-form-item>

          <el-form-item label="开放时间">
            <el-time-picker
              v-model="basicSettings.openTime"
              format="HH:mm"
              placeholder="开放时间"
              style="width: 150px; margin-right: 10px"
            />
            至
            <el-time-picker
              v-model="basicSettings.closeTime"
              format="HH:mm"
              placeholder="关闭时间"
              style="width: 150px; margin-left: 10px"
            />
          </el-form-item>

          <el-form-item label="休息日">
            <el-checkbox-group v-model="basicSettings.closedDays">
              <el-checkbox label="1">周一</el-checkbox>
              <el-checkbox label="2">周二</el-checkbox>
              <el-checkbox label="3">周三</el-checkbox>
              <el-checkbox label="4">周四</el-checkbox>
              <el-checkbox label="5">周五</el-checkbox>
              <el-checkbox label="6">周六</el-checkbox>
              <el-checkbox label="0">周日</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveBasicSettings" :loading="saving">保存设置</el-button>
            <el-button @click="resetBasicSettings">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 借阅规则 -->
    <div v-show="activeTab === 'borrow'">
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Reading /></el-icon>
              借阅规则设置
            </div>
          </div>
        </template>

        <el-form :model="borrowSettings" label-width="200px" size="default">
          <el-form-item label="每人最大借阅数量">
            <el-input-number v-model="borrowSettings.maxBooksPerUser" :min="1" :max="20" style="width: 150px" />
            <span class="form-help">本</span>
          </el-form-item>

          <el-form-item label="默认借阅天数">
            <el-input-number v-model="borrowSettings.defaultBorrowDays" :min="1" :max="365" style="width: 150px" />
            <span class="form-help">天</span>
          </el-form-item>

          <el-form-item label="最大续借次数">
            <el-input-number v-model="borrowSettings.maxRenewalTimes" :min="0" :max="10" style="width: 150px" />
            <span class="form-help">次</span>
          </el-form-item>

          <el-form-item label="每次续借天数">
            <el-input-number v-model="borrowSettings.renewalDays" :min="1" :max="90" style="width: 150px" />
            <span class="form-help">天</span>
          </el-form-item>

          <el-form-item label="逾期宽限天数">
            <el-input-number v-model="borrowSettings.overdueGraceDays" :min="0" :max="30" style="width: 150px" />
            <span class="form-help">天</span>
          </el-form-item>

          <el-form-item label="逾期罚金（每天）">
            <el-input-number
              v-model="borrowSettings.overdueFineDailyRate"
              :min="0"
              :step="0.1"
              :precision="2"
              style="width: 150px"
            />
            <span class="form-help">元</span>
          </el-form-item>

          <el-form-item label="损坏赔偿倍数">
            <el-input-number
              v-model="borrowSettings.damageCompensationRate"
              :min="1"
              :step="0.1"
              :precision="1"
              style="width: 150px"
            />
            <span class="form-help">倍</span>
          </el-form-item>

          <el-form-item label="允许预约">
            <el-switch v-model="borrowSettings.allowReservation" />
          </el-form-item>

          <el-form-item label="预约保留天数">
            <el-input-number
              v-model="borrowSettings.reservationHoldDays"
              :min="1"
              :max="30"
              :disabled="!borrowSettings.allowReservation"
              style="width: 150px"
            />
            <span class="form-help">天</span>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveBorrowSettings" :loading="saving">保存设置</el-button>
            <el-button @click="resetBorrowSettings">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 积分规则 -->
    <div v-show="activeTab === 'points'">
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Medal /></el-icon>
              积分规则设置
            </div>
          </div>
        </template>

        <el-form :model="pointsSettings" label-width="200px" size="default">
          <el-form-item label="启用积分系统">
            <el-switch v-model="pointsSettings.enabled" />
          </el-form-item>

          <div v-show="pointsSettings.enabled">
            <h4>获得积分</h4>
            <el-form-item label="借阅图书">
              <el-input-number v-model="pointsSettings.borrowBookPoints" :min="0" style="width: 150px" />
              <span class="form-help">积分/次</span>
            </el-form-item>

            <el-form-item label="按时归还">
              <el-input-number v-model="pointsSettings.returnOnTimePoints" :min="0" style="width: 150px" />
              <span class="form-help">积分/次</span>
            </el-form-item>

            <el-form-item label="撰写评价">
              <el-input-number v-model="pointsSettings.writeReviewPoints" :min="0" style="width: 150px" />
              <span class="form-help">积分/次</span>
            </el-form-item>

            <el-form-item label="完成教程">
              <el-input-number v-model="pointsSettings.completeTutorialPoints" :min="0" style="width: 150px" />
              <span class="form-help">积分/次</span>
            </el-form-item>

            <h4>扣除积分</h4>
            <el-form-item label="逾期归还">
              <el-input-number v-model="pointsSettings.overduePenalty" :min="0" style="width: 150px" />
              <span class="form-help">积分/次</span>
            </el-form-item>

            <el-form-item label="损坏图书">
              <el-input-number v-model="pointsSettings.damagePenalty" :min="0" style="width: 150px" />
              <span class="form-help">积分/次</span>
            </el-form-item>

            <el-form-item label="丢失图书">
              <el-input-number v-model="pointsSettings.lostPenalty" :min="0" style="width: 150px" />
              <span class="form-help">积分/次</span>
            </el-form-item>
          </div>

          <el-form-item>
            <el-button type="primary" @click="savePointsSettings" :loading="saving">保存设置</el-button>
            <el-button @click="resetPointsSettings">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 通知设置 -->
    <div v-show="activeTab === 'notifications'">
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Bell /></el-icon>
              通知设置
            </div>
          </div>
        </template>

        <el-form :model="notificationSettings" label-width="200px" size="default">
          <el-form-item label="邮件通知">
            <el-switch v-model="notificationSettings.emailEnabled" />
          </el-form-item>

          <div v-show="notificationSettings.emailEnabled">
            <el-form-item label="SMTP服务器">
              <el-input v-model="notificationSettings.smtpHost" placeholder="smtp.example.com" style="width: 300px" />
            </el-form-item>

            <el-form-item label="SMTP端口">
              <el-input-number v-model="notificationSettings.smtpPort" :min="1" :max="65535" style="width: 150px" />
            </el-form-item>

            <el-form-item label="发件人邮箱">
              <el-input
                v-model="notificationSettings.senderEmail"
                placeholder="noreply@library.com"
                style="width: 300px"
              />
            </el-form-item>

            <el-form-item label="发件人密码">
              <el-input
                v-model="notificationSettings.senderPassword"
                type="password"
                placeholder="请输入SMTP密码"
                style="width: 300px"
                show-password
              />
            </el-form-item>
          </div>

          <el-form-item label="短信通知">
            <el-switch v-model="notificationSettings.smsEnabled" />
          </el-form-item>

          <div v-show="notificationSettings.smsEnabled">
            <el-form-item label="短信服务商">
              <el-select v-model="notificationSettings.smsProvider" style="width: 200px">
                <el-option label="阿里云" value="aliyun" />
                <el-option label="腾讯云" value="tencent" />
                <el-option label="华为云" value="huawei" />
              </el-select>
            </el-form-item>

            <el-form-item label="AccessKey ID">
              <el-input
                v-model="notificationSettings.smsAccessKey"
                placeholder="请输入AccessKey ID"
                style="width: 300px"
              />
            </el-form-item>

            <el-form-item label="AccessKey Secret">
              <el-input
                v-model="notificationSettings.smsAccessSecret"
                type="password"
                placeholder="请输入AccessKey Secret"
                style="width: 300px"
                show-password
              />
            </el-form-item>
          </div>

          <h4>通知时机</h4>
          <el-form-item label="借阅成功通知">
            <el-checkbox v-model="notificationSettings.borrowSuccessNotify">发送通知</el-checkbox>
          </el-form-item>

          <el-form-item label="到期提醒">
            <el-checkbox v-model="notificationSettings.dueDateReminder">发送提醒</el-checkbox>
            <el-input-number
              v-model="notificationSettings.dueDateReminderDays"
              :min="1"
              :max="30"
              :disabled="!notificationSettings.dueDateReminder"
              style="width: 100px; margin-left: 10px"
            />
            <span class="form-help">天前提醒</span>
          </el-form-item>

          <el-form-item label="逾期通知">
            <el-checkbox v-model="notificationSettings.overdueNotify">发送通知</el-checkbox>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveNotificationSettings" :loading="saving">保存设置</el-button>
            <el-button @click="resetNotificationSettings">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 安全设置 -->
    <div v-show="activeTab === 'security'">
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Lock /></el-icon>
              安全设置
            </div>
          </div>
        </template>

        <el-form :model="securitySettings" label-width="200px" size="default">
          <el-form-item label="密码最小长度">
            <el-input-number v-model="securitySettings.minPasswordLength" :min="6" :max="32" style="width: 150px" />
            <span class="form-help">位</span>
          </el-form-item>

          <el-form-item label="密码复杂度要求">
            <el-checkbox-group v-model="securitySettings.passwordRequirements">
              <el-checkbox label="uppercase">包含大写字母</el-checkbox>
              <el-checkbox label="lowercase">包含小写字母</el-checkbox>
              <el-checkbox label="numbers">包含数字</el-checkbox>
              <el-checkbox label="symbols">包含特殊符号</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="登录失败锁定">
            <el-switch v-model="securitySettings.loginLockEnabled" />
          </el-form-item>

          <div v-show="securitySettings.loginLockEnabled">
            <el-form-item label="最大失败次数">
              <el-input-number v-model="securitySettings.maxLoginAttempts" :min="3" :max="10" style="width: 150px" />
              <span class="form-help">次</span>
            </el-form-item>

            <el-form-item label="锁定时间">
              <el-input-number v-model="securitySettings.lockDuration" :min="5" :max="1440" style="width: 150px" />
              <span class="form-help">分钟</span>
            </el-form-item>
          </div>

          <el-form-item label="Token有效期">
            <el-input-number v-model="securitySettings.tokenExpiration" :min="1" :max="168" style="width: 150px" />
            <span class="form-help">小时</span>
          </el-form-item>

          <el-form-item label="启用两步验证">
            <el-switch v-model="securitySettings.twoFactorEnabled" />
          </el-form-item>

          <el-form-item label="IP白名单">
            <el-input
              v-model="securitySettings.ipWhitelist"
              type="textarea"
              :rows="3"
              placeholder="每行一个IP地址，留空表示不限制"
              style="width: 400px"
            />
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="saveSecuritySettings" :loading="saving">保存设置</el-button>
            <el-button @click="resetSecuritySettings">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 系统维护 -->
    <div v-show="activeTab === 'maintenance'">
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Tools /></el-icon>
              系统维护
            </div>
          </div>
        </template>

        <div class="maintenance-section">
          <h4>数据备份</h4>
          <div class="maintenance-item">
            <div class="item-info">
              <div class="item-title">创建数据备份</div>
              <div class="item-description">备份当前系统数据，包括用户、图书、借阅记录等</div>
            </div>
            <el-button type="primary" @click="createBackup" :loading="backupLoading">创建备份</el-button>
          </div>

          <div class="maintenance-item">
            <div class="item-info">
              <div class="item-title">自动备份设置</div>
              <div class="item-description">配置系统自动备份的频率和保留策略</div>
            </div>
            <el-button type="default" @click="showBackupSettings = true">配置自动备份</el-button>
          </div>

          <h4>数据清理</h4>
          <div class="maintenance-item">
            <div class="item-info">
              <div class="item-title">清理日志文件</div>
              <div class="item-description">清理超过30天的系统日志文件</div>
            </div>
            <el-button type="warning" @click="cleanLogs" :loading="cleaningLogs">清理日志</el-button>
          </div>

          <div class="maintenance-item">
            <div class="item-info">
              <div class="item-title">清理临时文件</div>
              <div class="item-description">清理系统产生的临时文件和缓存</div>
            </div>
            <el-button type="warning" @click="cleanTempFiles" :loading="cleaningTemp">清理临时文件</el-button>
          </div>

          <h4>系统信息</h4>
          <div class="system-info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
              <el-descriptions-item label="数据库版本">MySQL 8.0</el-descriptions-item>
              <el-descriptions-item label="服务器时间">{{ currentTime }}</el-descriptions-item>
              <el-descriptions-item label="运行时间">{{ uptime }}</el-descriptions-item>
              <el-descriptions-item label="总用户数">{{ systemInfo.totalUsers }}</el-descriptions-item>
              <el-descriptions-item label="总图书数">{{ systemInfo.totalBooks }}</el-descriptions-item>
              <el-descriptions-item label="活跃借阅">{{ systemInfo.activeBorrows }}</el-descriptions-item>
              <el-descriptions-item label="存储空间">{{ systemInfo.diskUsage }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 自动备份设置对话框 -->
    <el-dialog v-model="showBackupSettings" title="自动备份设置" width="500px">
      <BackupSettingsDialog v-if="showBackupSettings" @close="showBackupSettings = false" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { Setting, Reading, Medal, Bell, Lock, Tools } from '@element-plus/icons-vue'
import { PageHeader } from '@/components/common'
import BackupSettingsDialog from './components/BackupSettingsDialog.vue'

// 响应式数据
const activeTab = ref('basic')
const saving = ref(false)
const backupLoading = ref(false)
const cleaningLogs = ref(false)
const cleaningTemp = ref(false)
const showBackupSettings = ref(false)

const currentTime = ref('')
const uptime = ref('')

// 系统信息
const systemInfo = reactive({
  totalUsers: 1234,
  totalBooks: 5678,
  activeBorrows: 234,
  diskUsage: '45.2GB / 100GB'
})

// 基础设置
const basicSettings = reactive({
  systemName: '图书馆管理系统',
  libraryName: '示例图书馆',
  contactEmail: 'admin@library.com',
  contactPhone: '010-12345678',
  address: '北京市朝阳区示例街道123号',
  openTime: '08:00',
  closeTime: '20:00',
  closedDays: ['0'] // 周日休息
})

// 借阅规则设置
const borrowSettings = reactive({
  maxBooksPerUser: 5,
  defaultBorrowDays: 30,
  maxRenewalTimes: 2,
  renewalDays: 15,
  overdueGraceDays: 3,
  overdueFineDailyRate: 0.5,
  damageCompensationRate: 1.5,
  allowReservation: true,
  reservationHoldDays: 7
})

// 积分规则设置
const pointsSettings = reactive({
  enabled: true,
  borrowBookPoints: 10,
  returnOnTimePoints: 5,
  writeReviewPoints: 25,
  completeTutorialPoints: 50,
  overduePenalty: 10,
  damagePenalty: 50,
  lostPenalty: 100
})

// 通知设置
const notificationSettings = reactive({
  emailEnabled: true,
  smtpHost: 'smtp.qq.com',
  smtpPort: 587,
  senderEmail: 'noreply@library.com',
  senderPassword: '',
  smsEnabled: false,
  smsProvider: 'aliyun',
  smsAccessKey: '',
  smsAccessSecret: '',
  borrowSuccessNotify: true,
  dueDateReminder: true,
  dueDateReminderDays: 3,
  overdueNotify: true
})

// 安全设置
const securitySettings = reactive({
  minPasswordLength: 8,
  passwordRequirements: ['lowercase', 'numbers'],
  loginLockEnabled: true,
  maxLoginAttempts: 5,
  lockDuration: 30,
  tokenExpiration: 24,
  twoFactorEnabled: false,
  ipWhitelist: ''
})

// 头部操作按钮
const headerActions = [
  {
    key: 'export',
    label: '导出配置',
    type: 'default',
    icon: 'Download'
  },
  {
    key: 'import',
    label: '导入配置',
    type: 'default',
    icon: 'Upload'
  }
]

// 方法
const handleHeaderAction = action => {
  switch (action.key) {
    case 'export':
      exportSettings()
      break
    case 'import':
      importSettings()
      break
  }
}

const handleTabChange = tab => {
  console.log('切换到标签页:', tab)
}

// 保存各项设置
const saveBasicSettings = async () => {
  saving.value = true
  try {
    // 这里应该调用API保存设置
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElNotification.success({
      title: '保存成功',
      message: '基础设置已保存'
    })
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const saveBorrowSettings = async () => {
  saving.value = true
  try {
    // 这里应该调用API保存设置
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElNotification.success({
      title: '保存成功',
      message: '借阅规则已保存'
    })
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const savePointsSettings = async () => {
  saving.value = true
  try {
    // 这里应该调用API保存设置
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElNotification.success({
      title: '保存成功',
      message: '积分规则已保存'
    })
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const saveNotificationSettings = async () => {
  saving.value = true
  try {
    // 这里应该调用API保存设置
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElNotification.success({
      title: '保存成功',
      message: '通知设置已保存'
    })
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const saveSecuritySettings = async () => {
  saving.value = true
  try {
    // 这里应该调用API保存设置
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElNotification.success({
      title: '保存成功',
      message: '安全设置已保存'
    })
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 重置设置
const resetBasicSettings = () => {
  // 重置为默认值
  ElMessage.info('已重置为默认设置')
}

const resetBorrowSettings = () => {
  ElMessage.info('已重置为默认设置')
}

const resetPointsSettings = () => {
  ElMessage.info('已重置为默认设置')
}

const resetNotificationSettings = () => {
  ElMessage.info('已重置为默认设置')
}

const resetSecuritySettings = () => {
  ElMessage.info('已重置为默认设置')
}

// 系统维护操作
const createBackup = async () => {
  try {
    await ElMessageBox.confirm('确定要创建数据备份吗？此操作可能需要几分钟时间。', '创建备份', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    backupLoading.value = true

    // 模拟备份过程
    await new Promise(resolve => setTimeout(resolve, 3000))

    ElNotification.success({
      title: '备份成功',
      message: '数据备份已创建完成'
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('备份失败')
    }
  } finally {
    backupLoading.value = false
  }
}

const cleanLogs = async () => {
  try {
    await ElMessageBox.confirm('确定要清理日志文件吗？此操作不可恢复。', '清理日志', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    cleaningLogs.value = true

    // 模拟清理过程
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElNotification.success({
      title: '清理完成',
      message: '日志文件已清理完成'
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清理失败')
    }
  } finally {
    cleaningLogs.value = false
  }
}

const cleanTempFiles = async () => {
  try {
    await ElMessageBox.confirm('确定要清理临时文件吗？此操作不可恢复。', '清理临时文件', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    cleaningTemp.value = true

    // 模拟清理过程
    await new Promise(resolve => setTimeout(resolve, 2000))

    ElNotification.success({
      title: '清理完成',
      message: '临时文件已清理完成'
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清理失败')
    }
  } finally {
    cleaningTemp.value = false
  }
}

// 导入导出配置
const exportSettings = () => {
  ElMessage.info('导出配置功能待实现')
}

const importSettings = () => {
  ElMessage.info('导入配置功能待实现')
}

// 更新时间
const updateCurrentTime = () => {
  currentTime.value = new Date().toLocaleString()

  // 计算运行时间（模拟）
  const startTime = new Date('2024-01-01')
  const now = new Date()
  const diff = now - startTime
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  uptime.value = `${days}天${hours}小时`
}

let timeInterval = null

// 生命周期
onMounted(() => {
  updateCurrentTime()
  timeInterval = setInterval(updateCurrentTime, 1000)
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})
</script>

<style lang="scss" scoped>
.system-settings-container {
  padding: 20px;
}

.settings-nav-card {
  margin-bottom: 20px;
}

.settings-card {
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

.form-help {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-regular);
}

.maintenance-section {
  h4 {
    margin: 24px 0 16px 0;
    color: var(--el-text-color-primary);
    font-size: 16px;

    &:first-child {
      margin-top: 0;
    }
  }

  .maintenance-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    margin-bottom: 12px;

    .item-info {
      .item-title {
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
      }

      .item-description {
        font-size: 14px;
        color: var(--el-text-color-regular);
      }
    }
  }

  .system-info {
    margin-top: 16px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .system-settings-container {
    padding: 10px;
  }

  .maintenance-item {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;

    .item-info {
      text-align: center;
    }
  }
}
</style>
