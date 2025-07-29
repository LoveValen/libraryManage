<template>
  <div class="books-import-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1>批量导入图书</h1>
      <p class="description">支持Excel、CSV格式的图书数据批量导入</p>
      <div class="header-actions">
        <el-button type="default" :icon="Download" @click="downloadTemplate">下载模板</el-button>
        <el-button type="default" :icon="QuestionFilled" @click="showHelp">使用帮助</el-button>
      </div>
    </div>

    <!-- 导入步骤 -->
    <el-card shadow="never" class="steps-card">
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="选择文件" description="上传Excel或CSV文件" />
        <el-step title="数据预览" description="检查和修正数据" />
        <el-step title="字段映射" description="设置字段对应关系" />
        <el-step title="导入确认" description="确认导入设置" />
        <el-step title="导入完成" description="查看导入结果" />
      </el-steps>
    </el-card>

    <!-- 步骤1: 文件上传 -->
    <div v-if="currentStep === 0">
      <el-row :gutter="20">
        <el-col :span="16">
          <el-card shadow="never" class="upload-card">
            <template #header>
              <div class="card-header">
                <div class="header-title">
                  <el-icon><UploadFilled /></el-icon>
                  上传文件
                </div>
              </div>
            </template>

            <el-upload
              ref="uploadRef"
              class="upload-dragger"
              drag
              :action="uploadAction"
              :headers="uploadHeaders"
              :before-upload="beforeUpload"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              :on-progress="handleUploadProgress"
              :show-file-list="false"
              accept=".xlsx,.xls,.csv"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                将文件拖到此处，或
                <em>点击上传</em>
              </div>
              <div class="el-upload__tip">支持 .xlsx、.xls、.csv 格式，文件大小不超过 10MB</div>
            </el-upload>

            <div v-if="uploadProgress > 0 && uploadProgress < 100" class="upload-progress">
              <el-progress :percentage="uploadProgress" :status="uploadStatus" />
            </div>

            <div v-if="uploadedFile" class="uploaded-file">
              <div class="file-info">
                <el-icon><Document /></el-icon>
                <span class="file-name">{{ uploadedFile.name }}</span>
                <span class="file-size">{{ formatFileSize(uploadedFile.size) }}</span>
                <el-button type="text" :icon="Delete" @click="removeUploadedFile" class="remove-file">删除</el-button>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="8">
          <el-card shadow="never" class="help-card">
            <template #header>
              <div class="card-header">
                <div class="header-title">
                  <el-icon><QuestionFilled /></el-icon>
                  使用说明
                </div>
              </div>
            </template>

            <div class="help-content">
              <h4>支持格式</h4>
              <ul>
                <li>Excel文件（.xlsx、.xls）</li>
                <li>CSV文件（.csv）</li>
              </ul>

              <h4>必填字段</h4>
              <ul>
                <li>书名（title）</li>
                <li>作者（author）</li>
                <li>ISBN（isbn）</li>
                <li>分类（category）</li>
              </ul>

              <h4>可选字段</h4>
              <ul>
                <li>出版社（publisher）</li>
                <li>出版日期（publishDate）</li>
                <li>价格（price）</li>
                <li>库存数量（stock）</li>
                <li>描述（description）</li>
                <li>标签（tags）</li>
              </ul>

              <div class="template-download">
                <el-button type="primary" :icon="Download" @click="downloadTemplate" size="small">下载模板</el-button>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 步骤2: 数据预览 -->
    <div v-if="currentStep === 1">
      <el-card shadow="never" class="preview-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><View /></el-icon>
              数据预览
            </div>
            <div class="header-actions">
              <el-tag type="info">共 {{ previewData.length }} 行数据</el-tag>
              <el-button type="primary" size="small" @click="validateData" :loading="validating">验证数据</el-button>
            </div>
          </div>
        </template>

        <div v-if="validationErrors.length > 0" class="validation-errors">
          <el-alert title="数据验证错误" type="error" :closable="false" show-icon>
            <template #default>
              <p>发现 {{ validationErrors.length }} 个错误，请修正后重新上传：</p>
              <ul class="error-list">
                <li v-for="error in validationErrors.slice(0, 10)" :key="error.row">
                  第 {{ error.row }} 行：{{ error.message }}
                </li>
                <li v-if="validationErrors.length > 10">还有 {{ validationErrors.length - 10 }} 个错误...</li>
              </ul>
            </template>
          </el-alert>
        </div>

        <el-table :data="previewData.slice(0, 50)" border stripe style="width: 100%" max-height="400">
          <el-table-column
            v-for="column in previewColumns"
            :key="column.prop"
            :prop="column.prop"
            :label="column.label"
            :width="column.width"
            show-overflow-tooltip
          />
        </el-table>

        <div v-if="previewData.length > 50" class="preview-tip">
          <el-text type="info">仅显示前 50 行数据预览，实际将导入 {{ previewData.length }} 行</el-text>
        </div>
      </el-card>
    </div>

    <!-- 步骤3: 字段映射 -->
    <div v-if="currentStep === 2">
      <el-card shadow="never" class="mapping-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><Connection /></el-icon>
              字段映射
            </div>
            <div class="header-actions">
              <el-button type="default" size="small" @click="autoMapping">自动映射</el-button>
              <el-button type="default" size="small" @click="resetMapping">重置映射</el-button>
            </div>
          </div>
        </template>

        <div class="mapping-content">
          <div class="mapping-grid">
            <div class="source-fields">
              <h4>文件字段</h4>
              <div class="field-list">
                <div
                  v-for="field in sourceFields"
                  :key="field"
                  class="field-item"
                  :class="{ mapped: fieldMapping[field] }"
                >
                  <span class="field-name">{{ field }}</span>
                  <el-tag v-if="fieldMapping[field]" size="small" type="success">已映射</el-tag>
                </div>
              </div>
            </div>

            <div class="arrow-separator">
              <el-icon><Right /></el-icon>
            </div>

            <div class="target-fields">
              <h4>系统字段</h4>
              <div class="mapping-form">
                <div v-for="field in targetFields" :key="field.key" class="mapping-item">
                  <label class="field-label">
                    {{ field.label }}
                    <el-tag v-if="field.required" type="danger" size="small">必填</el-tag>
                  </label>
                  <el-select
                    v-model="fieldMapping[field.key]"
                    placeholder="选择对应字段"
                    clearable
                    style="width: 200px"
                  >
                    <el-option
                      v-for="sourceField in sourceFields"
                      :key="sourceField"
                      :label="sourceField"
                      :value="sourceField"
                    />
                  </el-select>
                </div>
              </div>
            </div>
          </div>

          <div class="mapping-summary">
            <el-descriptions title="映射统计" :column="4" border>
              <el-descriptions-item label="必填字段">
                {{ mappedRequiredFields }}/{{ requiredFieldsCount }}
              </el-descriptions-item>
              <el-descriptions-item label="可选字段">
                {{ mappedOptionalFields }}/{{ optionalFieldsCount }}
              </el-descriptions-item>
              <el-descriptions-item label="未映射字段">
                {{ unmappedSourceFields.length }}
              </el-descriptions-item>
              <el-descriptions-item label="映射完成度">
                <el-progress
                  :percentage="mappingProgress"
                  :color="mappingProgress === 100 ? '#67c23a' : '#e6a23c'"
                  :show-text="false"
                  style="width: 100px"
                />
                {{ mappingProgress }}%
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 步骤4: 导入确认 -->
    <div v-if="currentStep === 3">
      <el-card shadow="never" class="confirm-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><CircleCheck /></el-icon>
              导入确认
            </div>
          </div>
        </template>

        <div class="confirm-content">
          <el-descriptions title="导入设置" :column="2" border>
            <el-descriptions-item label="文件名">{{ uploadedFile?.name }}</el-descriptions-item>
            <el-descriptions-item label="数据行数">{{ previewData.length }}</el-descriptions-item>
            <el-descriptions-item label="导入模式">
              <el-radio-group v-model="importMode">
                <el-radio value="insert">仅插入</el-radio>
                <el-radio value="update">更新已存在</el-radio>
                <el-radio value="upsert">插入或更新</el-radio>
              </el-radio-group>
            </el-descriptions-item>
            <el-descriptions-item label="重复处理">
              <el-radio-group v-model="duplicateHandling">
                <el-radio value="skip">跳过</el-radio>
                <el-radio value="overwrite">覆盖</el-radio>
                <el-radio value="rename">重命名</el-radio>
              </el-radio-group>
            </el-descriptions-item>
          </el-descriptions>

          <div class="field-mapping-summary">
            <h4>字段映射汇总</h4>
            <el-table :data="mappingSummary" border>
              <el-table-column prop="targetField" label="系统字段" width="200" />
              <el-table-column prop="sourceField" label="文件字段" width="200" />
              <el-table-column prop="required" label="是否必填" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.required ? 'danger' : 'info'" size="small">
                    {{ row.required ? '必填' : '可选' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="sampleValue" label="示例数据" show-overflow-tooltip />
            </el-table>
          </div>

          <div class="import-options">
            <h4>高级选项</h4>
            <el-checkbox v-model="importOptions.validateISBN">验证ISBN格式</el-checkbox>
            <el-checkbox v-model="importOptions.autoCategory">自动创建不存在的分类</el-checkbox>
            <el-checkbox v-model="importOptions.autoTags">自动处理标签</el-checkbox>
            <el-checkbox v-model="importOptions.skipErrors">跳过错误行继续导入</el-checkbox>
            <el-checkbox v-model="importOptions.sendNotification">完成后发送通知</el-checkbox>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 步骤5: 导入结果 -->
    <div v-if="currentStep === 4">
      <el-card shadow="never" class="result-card">
        <template #header>
          <div class="card-header">
            <div class="header-title">
              <el-icon><SuccessFilled /></el-icon>
              导入完成
            </div>
          </div>
        </template>

        <div class="result-content">
          <div class="result-summary">
            <el-result
              :icon="importResult.success ? 'success' : 'error'"
              :title="importResult.success ? '导入成功' : '导入失败'"
              :sub-title="importResult.message"
            >
              <template #extra>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="总计处理">{{ importResult.total }}</el-descriptions-item>
                  <el-descriptions-item label="成功导入">
                    <el-text type="success">{{ importResult.success_count }}</el-text>
                  </el-descriptions-item>
                  <el-descriptions-item label="更新记录">
                    <el-text type="warning">{{ importResult.updated_count }}</el-text>
                  </el-descriptions-item>
                  <el-descriptions-item label="跳过记录">
                    <el-text type="info">{{ importResult.skipped_count }}</el-text>
                  </el-descriptions-item>
                  <el-descriptions-item label="失败记录">
                    <el-text type="danger">{{ importResult.failed_count }}</el-text>
                  </el-descriptions-item>
                  <el-descriptions-item label="耗时">{{ importResult.duration }}</el-descriptions-item>
                </el-descriptions>
              </template>
            </el-result>
          </div>

          <div v-if="importResult.errors && importResult.errors.length > 0" class="error-details">
            <h4>错误详情</h4>
            <el-table :data="importResult.errors" border max-height="300">
              <el-table-column prop="row" label="行号" width="80" />
              <el-table-column prop="field" label="字段" width="120" />
              <el-table-column prop="value" label="值" width="150" show-overflow-tooltip />
              <el-table-column prop="error" label="错误信息" show-overflow-tooltip />
            </el-table>
          </div>

          <div class="result-actions">
            <el-button type="primary" @click="downloadReport">下载导入报告</el-button>
            <el-button type="default" @click="viewImportedBooks">查看导入的图书</el-button>
            <el-button type="default" @click="startNewImport">重新导入</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button v-if="currentStep > 0" @click="previousStep" :disabled="importing">上一步</el-button>
      <el-button
        v-if="currentStep < 4"
        type="primary"
        @click="nextStep"
        :disabled="!canProceed"
        :loading="importing && currentStep === 3"
      >
        {{ currentStep === 3 ? '开始导入' : '下一步' }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'
import {
  Upload,
  UploadFilled,
  Document,
  Delete,
  Download,
  QuestionFilled,
  View,
  Connection,
  Right,
  CircleCheck,
  SuccessFilled
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { importBooks, downloadImportTemplate } from '@/api/books'

// 认证信息
const authStore = useAuthStore()

// 响应式数据
const currentStep = ref(0)
const uploadRef = ref(null)
const uploadProgress = ref(0)
const uploadStatus = ref('')
const uploadedFile = ref(null)
const validating = ref(false)
const importing = ref(false)

// 上传配置
const uploadAction = computed(() => `${import.meta.env.VITE_API_BASE_URL}/api/v1/books/import/upload`)
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${authStore.token}`
}))

// 预览数据
const previewData = ref([])
const previewColumns = ref([])
const validationErrors = ref([])

// 字段映射
const sourceFields = ref([])
const fieldMapping = reactive({})

// 目标字段定义
const targetFields = [
  { key: 'title', label: '书名', required: true },
  { key: 'author', label: '作者', required: true },
  { key: 'isbn', label: 'ISBN', required: true },
  { key: 'category', label: '分类', required: true },
  { key: 'publisher', label: '出版社', required: false },
  { key: 'publishDate', label: '出版日期', required: false },
  { key: 'price', label: '价格', required: false },
  { key: 'stock', label: '库存数量', required: false },
  { key: 'description', label: '描述', required: false },
  { key: 'tags', label: '标签', required: false },
  { key: 'location', label: '位置', required: false },
  { key: 'coverUrl', label: '封面图片', required: false }
]

// 导入设置
const importMode = ref('insert')
const duplicateHandling = ref('skip')
const importOptions = reactive({
  validateISBN: true,
  autoCategory: true,
  autoTags: true,
  skipErrors: true,
  sendNotification: true
})

// 导入结果
const importResult = ref({})


// 计算属性
const canProceed = computed(() => {
  switch (currentStep.value) {
    case 0:
      return uploadedFile.value && validationErrors.value.length === 0
    case 1:
      return previewData.value.length > 0 && validationErrors.value.length === 0
    case 2:
      return mappingProgress.value === 100
    case 3:
      return true
    default:
      return false
  }
})

const requiredFieldsCount = computed(() => {
  return targetFields.filter(field => field.required).length
})

const optionalFieldsCount = computed(() => {
  return targetFields.filter(field => !field.required).length
})

const mappedRequiredFields = computed(() => {
  return targetFields.filter(field => field.required && fieldMapping[field.key]).length
})

const mappedOptionalFields = computed(() => {
  return targetFields.filter(field => !field.required && fieldMapping[field.key]).length
})

const unmappedSourceFields = computed(() => {
  const mappedSources = Object.values(fieldMapping).filter(Boolean)
  return sourceFields.value.filter(field => !mappedSources.includes(field))
})

const mappingProgress = computed(() => {
  const totalRequired = requiredFieldsCount.value
  const mappedRequired = mappedRequiredFields.value

  if (totalRequired === 0) return 100
  return Math.round((mappedRequired / totalRequired) * 100)
})

const mappingSummary = computed(() => {
  return targetFields
    .filter(field => fieldMapping[field.key])
    .map(field => ({
      targetField: field.label,
      sourceField: fieldMapping[field.key],
      required: field.required,
      sampleValue: getSampleValue(fieldMapping[field.key])
    }))
})

// 方法

const beforeUpload = file => {
  const isValidType = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ].includes(file.type)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isValidType) {
    ElMessage.error('只能上传 Excel 或 CSV 文件')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 10MB')
    return false
  }

  uploadProgress.value = 0
  uploadStatus.value = 'active'
  return true
}

const handleUploadProgress = event => {
  uploadProgress.value = Math.round((event.loaded / event.total) * 100)
}

const handleUploadSuccess = response => {
  uploadProgress.value = 100
  uploadStatus.value = 'success'

  if (response.success) {
    uploadedFile.value = response.data.file
    previewData.value = response.data.preview
    previewColumns.value = response.data.columns
    sourceFields.value = response.data.fields

    ElNotification.success({
      title: '上传成功',
      message: `成功解析 ${previewData.value.length} 行数据`
    })

    // 自动进入下一步
    setTimeout(() => {
      currentStep.value = 1
      validateData()
    }, 1000)
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleUploadError = error => {
  uploadProgress.value = 0
  uploadStatus.value = 'error'
  console.error('Upload error:', error)
  ElMessage.error('文件上传失败')
}

const removeUploadedFile = () => {
  uploadedFile.value = null
  previewData.value = []
  previewColumns.value = []
  sourceFields.value = []
  validationErrors.value = []
  uploadProgress.value = 0
  Object.keys(fieldMapping).forEach(key => {
    delete fieldMapping[key]
  })
}

const validateData = async () => {
  validating.value = true
  try {
    // 这里应该调用后端API进行数据验证
    // 模拟验证过程
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 简单的客户端验证示例
    const errors = []
    previewData.value.forEach((row, index) => {
      if (!row.title) {
        errors.push({ row: index + 1, message: '书名不能为空' })
      }
      if (!row.isbn) {
        errors.push({ row: index + 1, message: 'ISBN不能为空' })
      }
    })

    validationErrors.value = errors

    if (errors.length === 0) {
      ElNotification.success({
        title: '验证通过',
        message: '所有数据验证通过，可以继续下一步'
      })
    } else {
      ElNotification.warning({
        title: '验证发现问题',
        message: `发现 ${errors.length} 个问题，请处理后重新上传`
      })
    }
  } catch (error) {
    ElMessage.error('数据验证失败')
  } finally {
    validating.value = false
  }
}

const autoMapping = () => {
  // 自动映射逻辑
  const mapping = {}

  sourceFields.value.forEach(sourceField => {
    const normalized = sourceField.toLowerCase().trim()

    // 定义映射规则
    const mappingRules = {
      书名: 'title',
      title: 'title',
      标题: 'title',
      作者: 'author',
      author: 'author',
      著者: 'author',
      isbn: 'isbn',
      ISBN: 'isbn',
      分类: 'category',
      category: 'category',
      类别: 'category',
      出版社: 'publisher',
      publisher: 'publisher',
      出版商: 'publisher',
      出版日期: 'publishDate',
      publish_date: 'publishDate',
      date: 'publishDate',
      价格: 'price',
      price: 'price',
      库存: 'stock',
      stock: 'stock',
      数量: 'stock',
      描述: 'description',
      description: 'description',
      简介: 'description',
      标签: 'tags',
      tags: 'tags',
      tag: 'tags'
    }

    const targetField = mappingRules[normalized] || mappingRules[sourceField]
    if (targetField) {
      mapping[targetField] = sourceField
    }
  })

  Object.assign(fieldMapping, mapping)
  ElMessage.success('自动映射完成')
}

const resetMapping = () => {
  Object.keys(fieldMapping).forEach(key => {
    delete fieldMapping[key]
  })
  ElMessage.info('映射已重置')
}

const getSampleValue = sourceField => {
  if (!sourceField || previewData.value.length === 0) return ''
  const firstRow = previewData.value[0]
  return firstRow[sourceField] || ''
}

const nextStep = async () => {
  if (currentStep.value === 3) {
    // 开始导入
    await startImport()
  } else {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const startImport = async () => {
  try {
    importing.value = true

    const importData = {
      fileId: uploadedFile.value.id,
      fieldMapping,
      importMode: importMode.value,
      duplicateHandling: duplicateHandling.value,
      options: importOptions
    }

    const response = await importBooks(importData)

    if (response.success) {
      importResult.value = response.data
      currentStep.value = 4

      ElNotification.success({
        title: '导入完成',
        message: `成功导入 ${response.data.success_count} 条图书记录`
      })
    } else {
      ElMessage.error(response.message || '导入失败')
    }
  } catch (error) {
    console.error('Import error:', error)
    ElMessage.error('导入过程中发生错误')
  } finally {
    importing.value = false
  }
}

const downloadTemplate = async () => {
  try {
    const response = await downloadImportTemplate()

    // 创建下载链接
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '图书导入模板.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error('Download template error:', error)
    ElMessage.error('模板下载失败')
  }
}

const downloadReport = () => {
  // 生成导入报告并下载
  const reportData = {
    timestamp: new Date().toISOString(),
    result: importResult.value
  }

  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `导入报告_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

const viewImportedBooks = () => {
  // 跳转到图书列表页面
  window.open('/books/list', '_blank')
}

const startNewImport = () => {
  // 重置所有状态
  currentStep.value = 0
  removeUploadedFile()
  importResult.value = {}
}

const showHelp = () => {
  ElMessageBox.alert(
    '1. 准备Excel或CSV格式的图书数据文件\n' +
      '2. 确保包含必填字段：书名、作者、ISBN、分类\n' +
      '3. 上传文件并预览数据\n' +
      '4. 设置字段映射关系\n' +
      '5. 确认导入设置并开始导入\n' +
      '6. 查看导入结果和报告',
    '使用帮助',
    {
      confirmButtonText: '确定',
      type: 'info'
    }
  )
}

const formatFileSize = bytes => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 生命周期
onMounted(() => {
  // 初始化
})
</script>

<style lang="scss" scoped>
.books-import-container {
  padding: 20px;
}

.page-header {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 24px;
  margin-bottom: 20px;
  border: 1px solid var(--el-border-color-lighter);

  h1 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .description {
    margin: 0 0 16px 0;
    color: var(--el-text-color-regular);
    font-size: 14px;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.steps-card {
  margin-bottom: 20px;

  .el-steps {
    padding: 20px 0;
  }
}

.upload-card {
  .upload-dragger {
    :deep(.el-upload-dragger) {
      width: 100%;
      height: 180px;
      border: 2px dashed var(--el-border-color-lighter);
      border-radius: 8px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: all 0.3s;

      &:hover {
        border-color: var(--el-color-primary);
      }
    }

    .el-icon--upload {
      font-size: 48px;
      color: var(--el-text-color-placeholder);
      margin-bottom: 16px;
    }

    .el-upload__text {
      color: var(--el-text-color-regular);
      font-size: 14px;
      line-height: 1.4;
    }

    .el-upload__tip {
      color: var(--el-text-color-placeholder);
      font-size: 12px;
      margin-top: 8px;
    }
  }

  .upload-progress {
    margin-top: 20px;
  }

  .uploaded-file {
    margin-top: 20px;
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    background: var(--el-fill-color-extra-light);

    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;

      .file-name {
        font-weight: 500;
        color: var(--el-text-color-primary);
        flex: 1;
      }

      .file-size {
        font-size: 12px;
        color: var(--el-text-color-regular);
      }

      .remove-file {
        color: var(--el-color-danger);
      }
    }
  }
}

.help-card {
  .help-content {
    h4 {
      margin: 16px 0 8px 0;
      color: var(--el-text-color-primary);
      font-size: 14px;

      &:first-child {
        margin-top: 0;
      }
    }

    ul {
      margin: 0 0 16px 0;
      padding-left: 20px;

      li {
        margin-bottom: 4px;
        color: var(--el-text-color-regular);
        font-size: 13px;
        line-height: 1.4;
      }
    }

    .template-download {
      margin-top: 20px;
      text-align: center;
    }
  }
}

.preview-card {
  .validation-errors {
    margin-bottom: 20px;

    .error-list {
      margin: 8px 0 0 0;
      padding-left: 20px;

      li {
        margin-bottom: 4px;
        color: var(--el-color-danger);
        font-size: 13px;
      }
    }
  }

  .preview-tip {
    margin-top: 12px;
    text-align: center;
  }
}

.mapping-card {
  .mapping-content {
    .mapping-grid {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 20px;
      margin-bottom: 30px;

      .source-fields,
      .target-fields {
        h4 {
          margin: 0 0 16px 0;
          color: var(--el-text-color-primary);
          font-size: 16px;
        }
      }

      .field-list {
        .field-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          margin-bottom: 8px;
          border: 1px solid var(--el-border-color-lighter);
          border-radius: 4px;
          background: var(--el-fill-color-extra-light);

          &.mapped {
            border-color: var(--el-color-success);
            background: var(--el-color-success-light-9);
          }

          .field-name {
            font-size: 13px;
            color: var(--el-text-color-primary);
          }
        }
      }

      .arrow-separator {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: var(--el-color-primary);
      }

      .mapping-form {
        .mapping-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;

          .field-label {
            font-size: 13px;
            color: var(--el-text-color-primary);
            display: flex;
            align-items: center;
            gap: 8px;
          }
        }
      }
    }

    .mapping-summary {
      padding-top: 20px;
      border-top: 1px solid var(--el-border-color-lighter);
    }
  }
}

.confirm-card {
  .confirm-content {
    .field-mapping-summary {
      margin: 24px 0;

      h4 {
        margin: 0 0 16px 0;
        color: var(--el-text-color-primary);
        font-size: 16px;
      }
    }

    .import-options {
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid var(--el-border-color-lighter);

      h4 {
        margin: 0 0 16px 0;
        color: var(--el-text-color-primary);
        font-size: 16px;
      }

      .el-checkbox {
        display: block;
        margin-bottom: 8px;
      }
    }
  }
}

.result-card {
  .result-content {
    .result-summary {
      margin-bottom: 24px;
    }

    .error-details {
      margin: 24px 0;

      h4 {
        margin: 0 0 16px 0;
        color: var(--el-text-color-primary);
        font-size: 16px;
      }
    }

    .result-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 24px;
    }
  }
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .books-import-container {
    padding: 10px;
  }

  .mapping-grid {
    grid-template-columns: 1fr !important;

    .arrow-separator {
      transform: rotate(90deg);
    }
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
