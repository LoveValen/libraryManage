<template>
  <div class="system-settings-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="header-title">系统设置</h1>
        </div>
        <div class="header-actions">
          <el-button @click="resetSettings">
            重置设置
          </el-button>
          <el-button type="primary" @click="saveSettings" :loading="saving">
            保存设置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- 基础设置 -->
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Setting /></el-icon>
              基础设置
            </div>
          </div>
        </template>

        <el-form :model="basicSettings" label-width="120px" size="default">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="系统名称">
                <el-input v-model="basicSettings.systemName" placeholder="请输入系统名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="图书馆名称">
                <el-input v-model="basicSettings.libraryName" placeholder="请输入图书馆名称" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="联系邮箱">
                <el-input v-model="basicSettings.contactEmail" placeholder="请输入联系邮箱" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系电话">
                <el-input v-model="basicSettings.contactPhone" placeholder="请输入联系电话" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="容量上限">
                <InputNumber
                  v-model="basicSettings.capacity"
                  :min="100"
                  :max="100000"
                  :step="100"
                  unit="本"
                  text-align="right"
                  placeholder="输入图书容量上限"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="年费标准">
                <InputNumber
                  v-model="basicSettings.annualFee"
                  :min="0"
                  :max="1000"
                  :step="10"
                  :precision="2"
                  unit="元"
                  placeholder="输入年费标准"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-form-item label="开放时间">
            <el-time-picker
              v-model="basicSettings.openTime"
              format="HH:mm"
              placeholder="开放时间"
              style="width: 140px; margin-right: 10px"
            />
            <span style="margin: 0 8px">至</span>
            <el-time-picker
              v-model="basicSettings.closeTime"
              format="HH:mm"
              placeholder="关闭时间"
              style="width: 140px"
            />
          </el-form-item>

        </el-form>
      </el-card>

      <!-- 借阅规则 -->
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Reading /></el-icon>
              借阅规则
            </div>
          </div>
        </template>

        <el-form :model="borrowSettings" label-width="120px" size="default">
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="最大借阅数">
                <InputNumber
                  v-model="borrowSettings.maxBooksPerUser"
                  :min="1"
                  :max="20"
                  :step="1"
                  unit="本"
                  text-align="center"
                  placeholder="输入最大借阅数"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="借阅天数">
                <InputNumber
                  v-model="borrowSettings.defaultBorrowDays"
                  :min="1"
                  :max="90"
                  :step="1"
                  unit="天"
                  text-align="center"
                  placeholder="输入借阅天数"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="续借次数">
                <InputNumber
                  v-model="borrowSettings.maxRenewalTimes"
                  :min="0"
                  :max="5"
                  :step="1"
                  unit="次"
                  text-align="center"
                  placeholder="输入续借次数"
                />
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="逾期罚金">
                <InputNumber
                  v-model="borrowSettings.overdueFineDailyRate"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="1"
                  unit="元/天"
                  text-align="center"
                  placeholder="输入罚金费率"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="允许预约">
                <el-switch 
                  v-model="borrowSettings.allowReservation"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
            </el-col>
          </el-row>

        </el-form>
      </el-card>

      <!-- 系统信息 -->
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Monitor /></el-icon>
              系统信息
            </div>
          </div>
        </template>

        <div class="system-info">
          <el-row :gutter="20">
            <el-col :span="12">
              <div class="info-item">
                <div class="info-label">系统版本</div>
                <div class="info-value">v1.0.0</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <div class="info-label">数据库版本</div>
                <div class="info-value">MySQL 8.0</div>
              </div>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <div class="info-item">
                <div class="info-label">总用户数</div>
                <div class="info-value">{{ systemInfo.totalUsers }}</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <div class="info-label">总图书数</div>
                <div class="info-value">{{ systemInfo.totalBooks }}</div>
              </div>
            </el-col>
          </el-row>

          <el-row :gutter="20">
            <el-col :span="12">
              <div class="info-item">
                <div class="info-label">活跃借阅</div>
                <div class="info-value">{{ systemInfo.activeBorrows }}</div>
              </div>
            </el-col>
            <el-col :span="12">
              <div class="info-item">
                <div class="info-label">服务器时间</div>
                <div class="info-value">{{ currentTime }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>

      <!-- 系统维护 -->
      <el-card shadow="never" class="settings-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Tools /></el-icon>
              系统维护
            </div>
          </div>
        </template>

        <div class="maintenance-actions">
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="maintenance-item">
                <div class="item-icon">
                  <el-icon><FolderOpened /></el-icon>
                </div>
                <div class="item-content">
                  <div class="item-title">数据备份</div>
                  <div class="item-description">备份系统数据</div>
                </div>
                <el-button type="primary" size="small" @click="createBackup" :loading="backupLoading">
                  备份
                </el-button>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="maintenance-item">
                <div class="item-icon">
                  <el-icon><Document /></el-icon>
                </div>
                <div class="item-content">
                  <div class="item-title">清理日志</div>
                  <div class="item-description">清理过期日志</div>
                </div>
                <el-button type="warning" size="small" @click="cleanLogs" :loading="cleaningLogs">
                  清理
                </el-button>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="maintenance-item">
                <div class="item-icon">
                  <el-icon><Delete /></el-icon>
                </div>
                <div class="item-content">
                  <div class="item-title">清理缓存</div>
                  <div class="item-description">清理临时文件</div>
                </div>
                <el-button type="warning" size="small" @click="cleanCache" :loading="cleaningCache">
                  清理
                </el-button>
              </div>
            </el-col>
          </el-row>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import { 
  Setting, 
  Reading, 
  Monitor, 
  Tools, 
  Check, 
  RefreshLeft, 
  FolderOpened, 
  Document, 
  Delete 
} from '@element-plus/icons-vue'
import InputNumber from '@/components/InputNumber.vue'

// 响应式数据
const saving = ref(false)
const backupLoading = ref(false)
const cleaningLogs = ref(false)
const cleaningCache = ref(false)
const currentTime = ref('')

// 系统信息
const systemInfo = reactive({
  totalUsers: 1234,
  totalBooks: 5678,
  activeBorrows: 234
})

// 基础设置
const basicSettings = reactive({
  systemName: '图书馆管理系统',
  libraryName: '示例图书馆',
  contactEmail: 'admin@library.com',
  contactPhone: '010-12345678',
  capacity: 10000,
  annualFee: 50.00,
  openTime: '08:00',
  closeTime: '20:00'
})

// 借阅规则设置
const borrowSettings = reactive({
  maxBooksPerUser: 5,
  defaultBorrowDays: 30,
  maxRenewalTimes: 2,
  overdueFineDailyRate: 0.5,
  allowReservation: true
})

// 保存设置
const saveSettings = async () => {
  saving.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElNotification.success({
      title: '保存成功',
      message: '系统设置已保存'
    })
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 重置设置
const resetSettings = () => {
  ElMessageBox.confirm('确定要重置为默认设置吗？', '重置设置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 重置为默认值
    Object.assign(basicSettings, {
      systemName: '图书馆管理系统',
      libraryName: '示例图书馆',
      contactEmail: 'admin@library.com',
      contactPhone: '010-12345678',
      capacity: 10000,
      annualFee: 50.00,
      openTime: '08:00',
      closeTime: '20:00'
    })
    
    Object.assign(borrowSettings, {
      maxBooksPerUser: 5,
      defaultBorrowDays: 30,
      maxRenewalTimes: 2,
      overdueFineDailyRate: 0.5,
      allowReservation: true
    })
    
    ElMessage.success('已重置为默认设置')
  }).catch(() => {})
}

// 系统维护操作
const createBackup = async () => {
  try {
    await ElMessageBox.confirm('确定要创建数据备份吗？', '创建备份', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })

    backupLoading.value = true
    await new Promise(resolve => setTimeout(resolve, 2000))

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
    await ElMessageBox.confirm('确定要清理过期日志吗？', '清理日志', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    cleaningLogs.value = true
    await new Promise(resolve => setTimeout(resolve, 1500))

    ElNotification.success({
      title: '清理完成',
      message: '过期日志已清理完成'
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清理失败')
    }
  } finally {
    cleaningLogs.value = false
  }
}

const cleanCache = async () => {
  try {
    await ElMessageBox.confirm('确定要清理系统缓存吗？', '清理缓存', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    cleaningCache.value = true
    await new Promise(resolve => setTimeout(resolve, 1500))

    ElNotification.success({
      title: '清理完成',
      message: '系统缓存已清理完成'
    })
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('清理失败')
    }
  } finally {
    cleaningCache.value = false
  }
}

// 更新时间
const updateCurrentTime = () => {
  currentTime.value = new Date().toLocaleString()
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
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  padding: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
}

.header-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.header-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
      margin: 0;
    }
  }
}


.system-info {
  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 6px;
    margin-bottom: 12px;

    .info-label {
      font-size: 14px;
      color: var(--el-text-color-regular);
    }

    .info-value {
      font-weight: 500;
      color: var(--el-text-color-primary);
    }
  }
}

.maintenance-actions {
  .maintenance-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-blank);
    transition: all 0.3s ease;

    &:hover {
      border-color: var(--el-color-primary-light-7);
      background: var(--el-color-primary-light-9);
    }

    .item-icon {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--el-color-primary-light-9);
      border-radius: 50%;
      color: var(--el-color-primary);
      
      .el-icon {
        font-size: 18px;
      }
    }

    .item-content {
      flex: 1;

      .item-title {
        font-weight: 500;
        color: var(--el-text-color-primary);
        margin-bottom: 2px;
      }

      .item-description {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .system-settings-container {
    padding: 10px;
  }

  .header-content {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-actions {
    justify-content: center;
  }

  .maintenance-actions {
    .el-col {
      margin-bottom: 16px;
    }
    
    .maintenance-item {
      flex-direction: column;
      text-align: center;
      gap: 8px;
    }
  }

  .system-info {
    .info-item {
      flex-direction: column;
      align-items: stretch;
      text-align: center;
      gap: 4px;
    }
  }
}
</style>