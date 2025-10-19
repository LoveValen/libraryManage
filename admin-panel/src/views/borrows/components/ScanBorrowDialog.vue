<template>
  <div class="scan-borrow-dialog">
    <div class="scan-container">
      <!-- 扫码区域 -->
      <div class="scan-area">
        <el-tabs v-model="activeTab" class="scan-tabs">
          <el-tab-pane label="用户扫码" name="user">
            <div class="scan-section">
              <div class="scan-camera" ref="userCameraRef">
                <div class="camera-placeholder">
                  <el-icon class="camera-icon"><Camera /></el-icon>
                  <p>请将用户证件放在摄像头前</p>
                  <p class="scan-tip">支持学生证、身份证、二维码等</p>
                </div>
              </div>

              <div v-if="scannedUser" class="scan-result">
                <el-card shadow="never" class="result-card success">
                  <div class="result-content">
                    <el-icon class="result-icon success"><SuccessFilled /></el-icon>
                    <div class="result-info">
                      <h4>用户识别成功</h4>
                      <p>{{ scannedUser.realName || scannedUser.username }}</p>
                      <p class="result-meta">{{ scannedUser.email }}</p>
                    </div>
                  </div>
                </el-card>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="图书扫码" name="book" :disabled="!scannedUser">
            <div class="scan-section">
              <div class="scan-camera" ref="bookCameraRef">
                <div class="camera-placeholder">
                  <el-icon class="camera-icon"><Reading /></el-icon>
                  <p>请将图书条码放在摄像头前</p>
                  <p class="scan-tip">支持ISBN条码、二维码等</p>
                </div>
              </div>

              <div v-if="scannedBook" class="scan-result">
                <el-card shadow="never" class="result-card success">
                  <div class="result-content">
                    <el-icon class="result-icon success"><SuccessFilled /></el-icon>
                    <div class="result-info">
                      <h4>图书识别成功</h4>
                      <p>{{ scannedBook.title }}</p>
                      <p class="result-meta">{{ scannedBook.authors?.join?.(', ') || scannedBook.authors }}</p>
                    </div>
                  </div>
                </el-card>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 手动输入备选 -->
      <div class="manual-input">
        <el-divider>
          <span class="divider-text">或手动输入</span>
        </el-divider>

        <el-form :model="manualForm" label-width="80px" size="default">
          <el-form-item label="用户ID" v-if="activeTab === 'user'">
            <el-input
              v-model="manualForm.userIdentifier"
              placeholder="输入用户学号、邮箱或用户名"
              clearable
              @keyup.enter="searchUser"
            >
              <template #append>
                <el-button :icon="Search" @click="searchUser" :loading="searchingUser">搜索</el-button>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="图书码" v-if="activeTab === 'book'">
            <el-input
              v-model="manualForm.bookIdentifier"
              placeholder="输入ISBN或图书ID"
              clearable
              @keyup.enter="searchBook"
            >
              <template #append>
                <el-button :icon="Search" @click="searchBook" :loading="searchingBook">搜索</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-form>
      </div>

      <!-- 扫码结果汇总 -->
      <div v-if="scannedUser && scannedBook" class="scan-summary">
        <el-card shadow="never" class="summary-card">
          <template #header>
            <div class="summary-header">
              <el-icon><DocumentAdd /></el-icon>
              <span>借阅信息确认</span>
            </div>
          </template>

          <div class="summary-content">
            <div class="summary-row">
              <div class="summary-label">借阅用户：</div>
              <div class="summary-value">
                {{ scannedUser.realName || scannedUser.username }}
                <el-tag type="success" size="small" class="ml-2">已识别</el-tag>
              </div>
            </div>

            <div class="summary-row">
              <div class="summary-label">借阅图书：</div>
              <div class="summary-value">
                {{ scannedBook.title }}
                <el-tag type="success" size="small" class="ml-2">已识别</el-tag>
              </div>
            </div>

            <div class="summary-row">
              <div class="summary-label">借阅天数：</div>
              <div class="summary-value">
                <el-input-number v-model="borrowDays" :min="1" :max="90" size="small" style="width: 120px" />
                <span class="ml-2 text-muted">天</span>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 对话框操作按钮 -->
    <div class="dialog-actions">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" :disabled="!canConfirm" :loading="confirming" @click="handleConfirm">
        {{ confirming ? '创建中...' : '确认借阅' }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Camera, Reading, SuccessFilled, DocumentAdd, Search } from '@element-plus/icons-vue'
import { createBorrow } from '@/api/borrows'
import { bookApi } from '@/api/book'

// Emits
const emit = defineEmits(['success', 'cancel'])

// 响应式数据
const activeTab = ref('user')
const userCameraRef = ref()
const bookCameraRef = ref()
const confirming = ref(false)
const searchingUser = ref(false)
const searchingBook = ref(false)

const scannedUser = ref(null)
const scannedBook = ref(null)
const borrowDays = ref(30)

// 手动输入表单
const manualForm = reactive({
  userIdentifier: '',
  bookIdentifier: ''
})

// 计算属性
const canConfirm = computed(() => {
  return scannedUser.value && scannedBook.value && borrowDays.value >= 1 && borrowDays.value <= 90
})

// 方法
const initCamera = () => {
  // 这里应该初始化摄像头
  // 实际项目中需要使用 getUserMedia API 或相关的扫码库
  console.log('初始化摄像头（待实现）')

  // 模拟扫码功能的提示
  ElMessage.info({
    message: '扫码功能需要接入摄像头设备和扫码识别库',
    duration: 3000
  })
}

const searchUser = async () => {
  const identifier = manualForm.userIdentifier.trim()
  if (!identifier) {
    ElMessage.warning('请输入用户标识')
    return
  }

  searchingUser.value = true
  try {
    // 这里应该调用用户搜索API
    // 模拟搜索结果
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 模拟找到用户
    scannedUser.value = {
      id: 1,
      username: 'student001',
      realName: '张三',
      email: 'zhangsan@example.com'
    }

    ElMessage.success('用户识别成功')
    activeTab.value = 'book'
  } catch (error) {
    console.error('搜索用户失败:', error)
    ElMessage.error('用户搜索失败，请检查输入的信息')
  } finally {
    searchingUser.value = false
  }
}

const searchBook = async () => {
  const identifier = manualForm.bookIdentifier.trim()
  if (!identifier) {
    ElMessage.warning('请输入图书标识')
    return
  }

  searchingBook.value = true
  try {
    let book = null

    // 尝试按ISBN或ID搜索
    if (/^\d+$/.test(identifier)) {
      // 纯数字，可能是ID
      try {
        const response = await bookApi.getBookDetail(identifier)
        book = response.data
      } catch (error) {
        // ID搜索失败，尝试作为ISBN搜索
        const searchResponse = await bookApi.searchBooks(identifier, 1)
        if (searchResponse.data && searchResponse.data.length > 0) {
          book = searchResponse.data[0]
        }
      }
    } else if (/^[\d-X]+$/.test(identifier)) {
      // ISBN格式
      const response = await bookApi.searchBooks(identifier, 1)
      if (response.data && response.data.length > 0) {
        book = response.data[0]
      }
    } else {
      ElMessage.warning('请输入有效的ISBN或图书ID')
      return
    }

    if (book) {
      scannedBook.value = book
      ElMessage.success('图书识别成功')
    } else {
      ElMessage.error('未找到对应的图书')
    }
  } catch (error) {
    console.error('搜索图书失败:', error)
    ElMessage.error('图书搜索失败，请检查输入的信息')
  } finally {
    searchingBook.value = false
  }
}

const simulateScan = type => {
  // 模拟扫码结果（开发调试用）
  if (type === 'user') {
    scannedUser.value = {
      id: 1,
      username: 'student001',
      realName: '张三',
      email: 'zhangsan@example.com'
    }
    activeTab.value = 'book'
    ElMessage.success('模拟用户扫码成功')
  } else if (type === 'book') {
    scannedBook.value = {
      id: 1,
      title: '计算机网络原理',
      authors: ['谢希仁'],
      isbn: '9787121301234',
      availableStock: 5
    }
    ElMessage.success('模拟图书扫码成功')
  }
}

const handleConfirm = async () => {
  if (!canConfirm.value) {
    ElMessage.warning('请完成用户和图书的识别')
    return
  }

  confirming.value = true
  try {
    const borrowData = {
      userId: scannedUser.value.id,
      bookId: scannedBook.value.id,
      borrowDays: borrowDays.value
    }

    await createBorrow(borrowData)

    ElMessage.success('扫码借阅成功')
    emit('success', {
      userId: scannedUser.value.id,
      bookId: scannedBook.value.id
    })
  } catch (error) {
    console.error('扫码借阅失败:', error)
    ElMessage.error(error.response?.data?.message || '扫码借阅失败')
  } finally {
    confirming.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

const stopCamera = () => {
  // 停止摄像头
  console.log('停止摄像头（待实现）')
}

// 生命周期
onMounted(() => {
  initCamera()

  // 开发调试：双击可以模拟扫码
  const handleDoubleClick = event => {
    if (event.detail === 2) {
      if (activeTab.value === 'user' && !scannedUser.value) {
        simulateScan('user')
      } else if (activeTab.value === 'book' && !scannedBook.value) {
        simulateScan('book')
      }
    }
  }

  document.addEventListener('click', handleDoubleClick)
})

onUnmounted(() => {
  stopCamera()
})
</script>

<style lang="scss" scoped>
.scan-borrow-dialog {
  .scan-container {
    .scan-area {
      margin-bottom: 20px;

      .scan-tabs {
        .scan-section {
          .scan-camera {
            height: 300px;
            border: 2px dashed var(--el-border-color-light);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--el-fill-color-extra-light);
            margin-bottom: 16px;

            .camera-placeholder {
              text-align: center;
              color: var(--el-text-color-regular);

              .camera-icon {
                font-size: 48px;
                color: var(--el-color-primary);
                margin-bottom: 16px;
              }

              p {
                margin: 8px 0;
                font-size: 16px;

                &.scan-tip {
                  font-size: 14px;
                  color: var(--el-text-color-placeholder);
                }
              }
            }
          }

          .scan-result {
            .result-card {
              border: 1px solid var(--el-color-success-light-5);
              background: var(--el-color-success-light-9);

              .result-content {
                display: flex;
                align-items: center;
                gap: 12px;

                .result-icon {
                  font-size: 20px;

                  &.success {
                    color: var(--el-color-success);
                  }
                }

                .result-info {
                  flex: 1;

                  h4 {
                    margin: 0 0 4px 0;
                    color: var(--el-text-color-primary);
                    font-size: 16px;
                  }

                  p {
                    margin: 2px 0;
                    color: var(--el-text-color-primary);

                    &.result-meta {
                      color: var(--el-text-color-regular);
                      font-size: 14px;
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    .manual-input {
      margin-bottom: 20px;

      .divider-text {
        color: var(--el-text-color-regular);
        font-size: 14px;
      }
    }

    .scan-summary {
      .summary-card {
        border: 1px solid var(--el-color-primary-light-5);

        .summary-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .summary-content {
          .summary-row {
            display: flex;
            align-items: center;
            margin-bottom: 16px;

            &:last-child {
              margin-bottom: 0;
            }

            .summary-label {
              width: 80px;
              font-weight: 500;
              color: var(--el-text-color-primary);
            }

            .summary-value {
              flex: 1;
              display: flex;
              align-items: center;
              color: var(--el-text-color-primary);
            }
          }
        }
      }
    }
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}

.ml-2 {
  margin-left: 8px;
}

.text-muted {
  color: var(--el-text-color-regular);
}

// 响应式设计
@media (max-width: 768px) {
  .scan-borrow-dialog {
    .scan-container {
      .scan-area {
        .scan-section {
          .scan-camera {
            height: 200px;

            .camera-placeholder {
              .camera-icon {
                font-size: 36px;
              }

              p {
                font-size: 14px;

                &.scan-tip {
                  font-size: 12px;
                }
              }
            }
          }
        }
      }

      .scan-summary {
        .summary-content {
          .summary-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;

            .summary-label {
              width: auto;
            }
          }
        }
      }
    }
  }
}
</style>
