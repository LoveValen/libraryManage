<template>
  <div class="qrcode-generator">
    <!-- 图书信息 -->
    <div class="book-info">
      <div class="book-cover">
        <img :src="book.cover" :alt="book.title" />
      </div>
      <div class="book-details">
        <h3 class="book-title">{{ book.title }}</h3>
        <p class="book-author">作者：{{ book.author }}</p>
        <p class="book-isbn">ISBN：{{ book.isbn }}</p>
        <p class="book-location">位置：{{ book.location }}</p>
      </div>
    </div>

    <!-- 二维码配置 -->
    <div class="qrcode-config">
      <el-form :model="qrConfig" label-width="100px" size="default">
        <el-form-item label="二维码类型">
          <el-radio-group v-model="qrConfig.type" @change="generateQRCode">
            <el-radio value="book_info">图书信息</el-radio>
            <el-radio value="borrow_link">借阅链接</el-radio>
            <el-radio value="detail_page">详情页面</el-radio>
            <el-radio value="custom">自定义内容</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="qrConfig.type === 'custom'" label="自定义内容">
          <el-input
            v-model="qrConfig.customContent"
            type="textarea"
            :rows="3"
            placeholder="请输入要生成二维码的内容"
            @input="generateQRCode"
          />
        </el-form-item>

        <el-form-item label="尺寸大小">
          <el-select v-model="qrConfig.size" @change="generateQRCode" style="width: 150px">
            <el-option label="小 (128×128)" value="128" />
            <el-option label="中 (256×256)" value="256" />
            <el-option label="大 (512×512)" value="512" />
            <el-option label="特大 (1024×1024)" value="1024" />
          </el-select>
        </el-form-item>

        <el-form-item label="纠错级别">
          <el-select v-model="qrConfig.errorCorrectionLevel" @change="generateQRCode" style="width: 150px">
            <el-option label="低 (L)" value="L" />
            <el-option label="中 (M)" value="M" />
            <el-option label="高 (Q)" value="Q" />
            <el-option label="最高 (H)" value="H" />
          </el-select>
        </el-form-item>

        <el-form-item label="颜色配置">
          <div class="color-config">
            <div class="color-item">
              <span>前景色：</span>
              <el-color-picker v-model="qrConfig.foregroundColor" @change="generateQRCode" />
            </div>
            <div class="color-item">
              <span>背景色：</span>
              <el-color-picker v-model="qrConfig.backgroundColor" @change="generateQRCode" />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="包含Logo">
          <el-switch v-model="qrConfig.includeLogo" @change="generateQRCode" />
          <span class="form-note">在二维码中心添加图书馆Logo</span>
        </el-form-item>

        <el-form-item label="输出格式">
          <el-radio-group v-model="qrConfig.format">
            <el-radio value="png">PNG</el-radio>
            <el-radio value="jpeg">JPEG</el-radio>
            <el-radio value="svg">SVG</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </div>

    <!-- 二维码预览 -->
    <div class="qrcode-preview">
      <el-card shadow="never" class="preview-card">
        <template #header>
          <div class="preview-header">
            <span>二维码预览</span>
            <div class="preview-actions">
              <el-button size="small" @click="refreshQRCode" :loading="generating">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
              <el-button size="small" @click="downloadQRCode" type="primary">
                <el-icon><Download /></el-icon>
                下载
              </el-button>
            </div>
          </div>
        </template>

        <div class="preview-content">
          <div v-if="generating" class="loading-placeholder">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>生成中...</span>
          </div>

          <div v-else-if="qrCodeDataUrl" class="qrcode-display">
            <div class="qrcode-container">
              <img ref="qrCodeImage" :src="qrCodeDataUrl" :alt="`${book.title}的二维码`" />
            </div>

            <div class="qrcode-info">
              <div class="info-item">
                <span class="info-label">内容：</span>
                <span class="info-value">{{ currentContent }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">尺寸：</span>
                <span class="info-value">{{ qrConfig.size }}×{{ qrConfig.size }}px</span>
              </div>
              <div class="info-item">
                <span class="info-label">格式：</span>
                <span class="info-value">{{ qrConfig.format.toUpperCase() }}</span>
              </div>
            </div>
          </div>

          <div v-else class="error-placeholder">
            <el-icon><Warning /></el-icon>
            <span>二维码生成失败</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 批量生成 -->
    <div class="batch-generate">
      <el-card shadow="never">
        <template #header>
          <span>批量生成</span>
        </template>

        <div class="batch-options">
          <el-checkbox v-model="batchConfig.includeBookInfo">包含图书信息</el-checkbox>
          <el-checkbox v-model="batchConfig.includeBorrowLink">包含借阅链接</el-checkbox>
          <el-checkbox v-model="batchConfig.includeDetailPage">包含详情页面</el-checkbox>
        </div>

        <div class="batch-actions">
          <el-button @click="generateBatchQRCodes" :loading="batchGenerating">
            <el-icon><Tickets /></el-icon>
            为当前图书生成所有类型二维码
          </el-button>
          <el-button @click="openBatchDialog">
            <el-icon><Grid /></el-icon>
            批量生成多本图书二维码
          </el-button>
        </div>
      </el-card>
    </div>

    <!-- 使用指南 -->
    <div class="usage-guide">
      <el-collapse>
        <el-collapse-item title="二维码使用指南" name="guide">
          <div class="guide-content">
            <h4>二维码类型说明：</h4>
            <ul>
              <li>
                <strong>图书信息：</strong>
                包含图书的基本信息，扫码可快速查看图书详情
              </li>
              <li>
                <strong>借阅链接：</strong>
                包含快速借阅链接，用户扫码可直接进入借阅流程
              </li>
              <li>
                <strong>详情页面：</strong>
                链接到图书详情页面，提供完整的图书信息和操作
              </li>
              <li>
                <strong>自定义内容：</strong>
                可以自定义二维码内容，灵活应用于各种场景
              </li>
            </ul>

            <h4>应用场景：</h4>
            <ul>
              <li>打印贴在图书上，方便用户快速获取图书信息</li>
              <li>用于图书推广材料和海报</li>
              <li>在图书馆导览和展示中使用</li>
              <li>移动端快速借阅和查询</li>
            </ul>

            <h4>最佳实践：</h4>
            <ul>
              <li>选择合适的尺寸，确保扫码设备能够识别</li>
              <li>使用高纠错级别，提高扫码成功率</li>
              <li>保持前景色和背景色的对比度</li>
              <li>定期更新和维护二维码内容</li>
            </ul>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 批量生成对话框 -->
    <el-dialog v-model="showBatchDialog" title="批量生成二维码" width="800px" destroy-on-close>
      <div class="batch-dialog-content">
        <p>功能开发中，敬请期待...</p>
      </div>

      <template #footer>
        <el-button @click="showBatchDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import QRCode from 'qrcode'

// Props
const props = defineProps({
  book: {
    type: Object,
    required: true
  }
})

// 响应式数据
const generating = ref(false)
const batchGenerating = ref(false)
const qrCodeDataUrl = ref('')
const qrCodeImage = ref()
const showBatchDialog = ref(false)

// 二维码配置
const qrConfig = reactive({
  type: 'book_info',
  customContent: '',
  size: '256',
  errorCorrectionLevel: 'M',
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  includeLogo: false,
  format: 'png'
})

// 批量生成配置
const batchConfig = reactive({
  includeBookInfo: true,
  includeBorrowLink: true,
  includeDetailPage: false
})

// 计算属性
const currentContent = computed(() => {
  switch (qrConfig.type) {
    case 'book_info':
      return JSON.stringify({
        type: 'book',
        id: props.book.id,
        title: props.book.title,
        author: props.book.author,
        isbn: props.book.isbn,
        location: props.book.location
      })
    case 'borrow_link':
      return `${window.location.origin}/borrow/${props.book.id}`
    case 'detail_page':
      return `${window.location.origin}/books/${props.book.id}`
    case 'custom':
      return qrConfig.customContent
    default:
      return ''
  }
})

// 方法
const generateQRCode = async () => {
  if (!currentContent.value) return

  try {
    generating.value = true

    const options = {
      width: parseInt(qrConfig.size),
      margin: 2,
      color: {
        dark: qrConfig.foregroundColor,
        light: qrConfig.backgroundColor
      },
      errorCorrectionLevel: qrConfig.errorCorrectionLevel
    }

    qrCodeDataUrl.value = await QRCode.toDataURL(currentContent.value, options)

    // 如果需要添加Logo，在这里进行图像合成
    if (qrConfig.includeLogo) {
      await addLogoToQRCode()
    }
  } catch (error) {
    console.error('生成二维码失败:', error)
    ElMessage.error('生成二维码失败')
    qrCodeDataUrl.value = ''
  } finally {
    generating.value = false
  }
}

const addLogoToQRCode = async () => {
  // 这里可以实现Logo合成逻辑
  // 由于需要canvas操作，这里简化处理
  console.log('Logo合成功能待实现')
}

const refreshQRCode = () => {
  generateQRCode()
}

const downloadQRCode = () => {
  if (!qrCodeDataUrl.value) {
    ElMessage.warning('请先生成二维码')
    return
  }

  try {
    const link = document.createElement('a')
    link.download = `${props.book.title}_${qrConfig.type}_qrcode.${qrConfig.format}`
    link.href = qrCodeDataUrl.value
    link.click()

    ElMessage.success('二维码下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败')
  }
}

const generateBatchQRCodes = async () => {
  try {
    batchGenerating.value = true

    const types = []
    if (batchConfig.includeBookInfo) types.push('book_info')
    if (batchConfig.includeBorrowLink) types.push('borrow_link')
    if (batchConfig.includeDetailPage) types.push('detail_page')

    if (types.length === 0) {
      ElMessage.warning('请至少选择一种二维码类型')
      return
    }

    // 创建ZIP文件（这里简化处理）
    const downloads = []

    for (const type of types) {
      const tempConfig = { ...qrConfig, type }
      const content = getContentByType(type)

      const options = {
        width: parseInt(qrConfig.size),
        margin: 2,
        color: {
          dark: qrConfig.foregroundColor,
          light: qrConfig.backgroundColor
        },
        errorCorrectionLevel: qrConfig.errorCorrectionLevel
      }

      const dataUrl = await QRCode.toDataURL(content, options)
      downloads.push({
        filename: `${props.book.title}_${type}_qrcode.${qrConfig.format}`,
        dataUrl
      })
    }

    // 逐个下载（实际项目中可以打包成ZIP）
    for (const download of downloads) {
      const link = document.createElement('a')
      link.download = download.filename
      link.href = download.dataUrl
      link.click()

      // 添加延迟避免浏览器阻止多个下载
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    ElMessage.success(`批量生成完成，共生成${downloads.length}个二维码`)
  } catch (error) {
    console.error('批量生成失败:', error)
    ElMessage.error('批量生成失败')
  } finally {
    batchGenerating.value = false
  }
}

const getContentByType = type => {
  switch (type) {
    case 'book_info':
      return JSON.stringify({
        type: 'book',
        id: props.book.id,
        title: props.book.title,
        author: props.book.author,
        isbn: props.book.isbn,
        location: props.book.location
      })
    case 'borrow_link':
      return `${window.location.origin}/borrow/${props.book.id}`
    case 'detail_page':
      return `${window.location.origin}/books/${props.book.id}`
    default:
      return ''
  }
}

const openBatchDialog = () => {
  showBatchDialog.value = true
}

// 生命周期
onMounted(() => {
  generateQRCode()
})
</script>

<style lang="scss" scoped>
.qrcode-generator {
  .book-info {
    display: flex;
    gap: 16px;
    margin-bottom: 20px;
    padding: 16px;
    background: var(--el-fill-color-lighter);
    border-radius: 8px;

    .book-cover {
      flex-shrink: 0;

      img {
        width: 80px;
        height: 112px;
        object-fit: cover;
        border-radius: 4px;
        border: 1px solid var(--el-border-color-light);
      }
    }

    .book-details {
      flex: 1;

      .book-title {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        line-height: 1.4;
      }

      p {
        margin: 0 0 6px 0;
        color: var(--el-text-color-regular);
        font-size: 14px;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .qrcode-config {
    margin-bottom: 20px;

    .color-config {
      display: flex;
      gap: 20px;

      .color-item {
        display: flex;
        align-items: center;
        gap: 8px;

        span {
          font-size: 14px;
          color: var(--el-text-color-regular);
        }
      }
    }

    .form-note {
      margin-left: 8px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .qrcode-preview {
    margin-bottom: 20px;

    .preview-card {
      :deep(.el-card__body) {
        padding: 0;
      }

      .preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .preview-actions {
          display: flex;
          gap: 8px;
        }
      }

      .preview-content {
        padding: 20px;

        .loading-placeholder,
        .error-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: var(--el-text-color-secondary);

          .el-icon {
            font-size: 32px;
            margin-bottom: 8px;
          }
        }

        .qrcode-display {
          display: flex;
          gap: 20px;

          .qrcode-container {
            flex-shrink: 0;

            img {
              max-width: 256px;
              max-height: 256px;
              border: 1px solid var(--el-border-color-light);
              border-radius: 8px;
            }
          }

          .qrcode-info {
            flex: 1;

            .info-item {
              display: flex;
              margin-bottom: 12px;

              .info-label {
                width: 60px;
                color: var(--el-text-color-secondary);
                font-size: 14px;
              }

              .info-value {
                flex: 1;
                color: var(--el-text-color-primary);
                font-size: 14px;
                word-break: break-all;
              }
            }
          }
        }
      }
    }
  }

  .batch-generate {
    margin-bottom: 20px;

    .batch-options {
      margin-bottom: 16px;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .batch-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
  }

  .usage-guide {
    .guide-content {
      h4 {
        color: var(--el-text-color-primary);
        margin: 16px 0 8px 0;
        font-size: 14px;

        &:first-child {
          margin-top: 0;
        }
      }

      ul {
        margin: 0 0 16px 0;
        padding-left: 20px;

        li {
          margin-bottom: 6px;
          line-height: 1.5;
          color: var(--el-text-color-regular);
          font-size: 14px;

          strong {
            color: var(--el-text-color-primary);
          }
        }
      }
    }
  }
}

.batch-dialog-content {
  text-align: center;
  padding: 40px;
  color: var(--el-text-color-secondary);
}

// 响应式设计
@media (max-width: 768px) {
  .qrcode-generator {
    .book-info {
      flex-direction: column;
      align-items: center;
      text-align: center;

      .book-cover {
        align-self: center;
      }
    }

    .color-config {
      flex-direction: column;
      gap: 12px;
    }

    .qrcode-display {
      flex-direction: column;

      .qrcode-container {
        align-self: center;

        img {
          max-width: 200px;
          max-height: 200px;
        }
      }
    }

    .batch-options {
      flex-direction: column;
      gap: 8px;
    }

    .batch-actions {
      flex-direction: column;

      .el-button {
        width: 100%;
      }
    }
  }
}
</style>
