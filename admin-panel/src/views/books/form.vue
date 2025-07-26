<template>
  <div class="book-form" v-loading="loading">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" size="default">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/books' }">图书管理</el-breadcrumb-item>
            <el-breadcrumb-item>{{ isEdit ? '编辑图书' : '新增图书' }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="handleSave" type="primary" :loading="submitting">
          <el-icon><Check /></el-icon>
          {{ isEdit ? '更新图书' : '创建图书' }}
        </el-button>
        <el-button @click="handleSaveAndNew" v-if="!isEdit" :loading="submitting">
          <el-icon><Plus /></el-icon>
          保存并新建
        </el-button>
      </div>
    </div>

    <!-- 表单内容 -->
    <div class="form-content">
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="120px" size="default">
        <el-row :gutter="24">
          <!-- 左侧：基本信息 -->
          <el-col :xl="16" :lg="16" :md="24" :sm="24">
            <el-card shadow="never" class="form-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Reading /></el-icon>
                  <span>基本信息</span>
                </div>
              </template>

              <el-row :gutter="20">
                <el-col :lg="12" :md="24">
                  <el-form-item label="图书标题" prop="title" required>
                    <el-input v-model="formData.title" placeholder="请输入图书标题" maxlength="200" show-word-limit />
                  </el-form-item>
                </el-col>

                <el-col :lg="12" :md="24">
                  <el-form-item label="副标题" prop="subtitle">
                    <el-input
                      v-model="formData.subtitle"
                      placeholder="请输入副标题（可选）"
                      maxlength="200"
                      show-word-limit
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :lg="12" :md="24">
                  <el-form-item label="作者" prop="author" required>
                    <el-input v-model="formData.author" placeholder="请输入作者姓名" maxlength="100" show-word-limit />
                  </el-form-item>
                </el-col>

                <el-col :lg="12" :md="24">
                  <el-form-item label="ISBN" prop="isbn" required>
                    <el-input
                      v-model="formData.isbn"
                      placeholder="请输入ISBN号码"
                      maxlength="20"
                      @blur="handleISBNBlur"
                    >
                      <template #append>
                        <el-button @click="validateISBN" :loading="validatingISBN">验证</el-button>
                      </template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :lg="12" :md="24">
                  <el-form-item label="出版社" prop="publisher" required>
                    <el-input
                      v-model="formData.publisher"
                      placeholder="请输入出版社名称"
                      maxlength="100"
                      show-word-limit
                    />
                  </el-form-item>
                </el-col>

                <el-col :lg="12" :md="24">
                  <el-form-item label="出版日期" prop="publishDate" required>
                    <el-date-picker
                      v-model="formData.publishDate"
                      type="date"
                      placeholder="选择出版日期"
                      style="width: 100%"
                      format="YYYY-MM-DD"
                      value-format="YYYY-MM-DD"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :lg="8" :md="12" :sm="24">
                  <el-form-item label="分类" prop="categoryId" required>
                    <el-tree-select
                      v-model="formData.categoryId"
                      :data="categoryTreeOptions"
                      :props="{ label: 'name', value: 'id', children: 'children' }"
                      placeholder="选择图书分类"
                      clearable
                      check-strictly
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>

                <el-col :lg="8" :md="12" :sm="24">
                  <el-form-item label="语言" prop="language">
                    <el-select v-model="formData.language" placeholder="选择语言" style="width: 100%">
                      <el-option label="中文" value="zh" />
                      <el-option label="英文" value="en" />
                      <el-option label="日文" value="ja" />
                      <el-option label="法文" value="fr" />
                      <el-option label="德文" value="de" />
                      <el-option label="其他" value="other" />
                    </el-select>
                  </el-form-item>
                </el-col>

                <el-col :lg="8" :md="12" :sm="24">
                  <el-form-item label="版次" prop="edition">
                    <el-input-number
                      v-model="formData.edition"
                      :min="1"
                      :max="99"
                      placeholder="版次"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>
              </el-row>

              <el-row :gutter="20">
                <el-col :lg="8" :md="12" :sm="24">
                  <el-form-item label="页数" prop="pages">
                    <el-input-number
                      v-model="formData.pages"
                      :min="1"
                      :max="9999"
                      placeholder="页数"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>

                <el-col :lg="8" :md="12" :sm="24">
                  <el-form-item label="价格" prop="price">
                    <el-input-number
                      v-model="formData.price"
                      :min="0"
                      :precision="2"
                      placeholder="价格"
                      style="width: 100%"
                    >
                      <template #prefix>¥</template>
                    </el-input-number>
                  </el-form-item>
                </el-col>

                <el-col :lg="8" :md="12" :sm="24">
                  <el-form-item label="格式" prop="format">
                    <el-select v-model="formData.format" placeholder="选择格式" style="width: 100%">
                      <el-option label="平装" value="paperback" />
                      <el-option label="精装" value="hardcover" />
                      <el-option label="电子书" value="ebook" />
                      <el-option label="有声书" value="audiobook" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>

              <el-form-item label="内容简介" prop="description">
                <el-input
                  v-model="formData.description"
                  type="textarea"
                  :rows="5"
                  placeholder="请输入图书内容简介"
                  maxlength="1000"
                  show-word-limit
                />
              </el-form-item>

              <el-form-item label="标签" prop="tags">
                <el-select
                  v-model="formData.tags"
                  multiple
                  filterable
                  allow-create
                  default-first-option
                  placeholder="请选择或输入标签"
                  style="width: 100%"
                >
                  <el-option v-for="tag in commonTags" :key="tag" :label="tag" :value="tag" />
                </el-select>
              </el-form-item>
            </el-card>

            <!-- 库存管理 -->
            <el-card shadow="never" class="form-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Box /></el-icon>
                  <span>库存管理</span>
                </div>
              </template>

              <el-row :gutter="20">
                <el-col :lg="8" :md="12" :sm="24">
                  <el-form-item label="库存数量" prop="stock" required>
                    <el-input-number
                      v-model="formData.stock"
                      :min="0"
                      :max="9999"
                      placeholder="库存数量"
                      style="width: 100%"
                    />
                  </el-form-item>
                </el-col>

                <el-col :lg="8" :md="12" :sm="24">
                  <el-form-item label="存放位置" prop="location" required>
                    <el-select
                      v-model="formData.location"
                      filterable
                      allow-create
                      placeholder="选择或输入位置"
                      style="width: 100%"
                    >
                      <el-option
                        v-for="location in commonLocations"
                        :key="location"
                        :label="location"
                        :value="location"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>

                <el-col :lg="8" :md="12" :sm="24">
                  <el-form-item label="图书状态" prop="status" required>
                    <el-select v-model="formData.status" placeholder="选择状态" style="width: 100%">
                      <el-option label="可借阅" value="available" />
                      <el-option label="维修中" value="maintenance" />
                      <el-option label="已下架" value="offline" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
            </el-card>
          </el-col>

          <!-- 右侧：封面和其他信息 -->
          <el-col :xl="8" :lg="8" :md="24" :sm="24">
            <!-- 封面上传 -->
            <el-card shadow="never" class="form-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Picture /></el-icon>
                  <span>图书封面</span>
                </div>
              </template>

              <div class="cover-upload-section">
                <div class="current-cover" v-if="formData.cover">
                  <img :src="formData.cover" alt="图书封面" class="cover-image" />
                  <div class="cover-actions">
                    <el-button size="small" @click="previewCover">
                      <el-icon><View /></el-icon>
                      预览
                    </el-button>
                    <el-button size="small" type="danger" @click="removeCover">
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                  </div>
                </div>

                <el-upload
                  ref="uploadRef"
                  :action="uploadAction"
                  :headers="uploadHeaders"
                  :data="uploadData"
                  :show-file-list="false"
                  :before-upload="beforeUpload"
                  :on-success="handleUploadSuccess"
                  :on-error="handleUploadError"
                  accept="image/*"
                  drag
                  class="cover-uploader"
                >
                  <div class="upload-content">
                    <el-icon class="upload-icon"><Plus /></el-icon>
                    <div class="upload-text">
                      <p>点击或拖拽上传封面</p>
                      <p class="upload-hint">支持 jpg、png 格式，建议尺寸 3:4，大小不超过 5MB</p>
                    </div>
                  </div>
                </el-upload>

                <div class="isbn-fetch">
                  <el-button @click="fetchBookInfo" :loading="fetchingInfo" style="width: 100%">
                    <el-icon><Search /></el-icon>
                    根据ISBN自动获取图书信息
                  </el-button>
                </div>
              </div>
            </el-card>

            <!-- 快捷操作 -->
            <el-card shadow="never" class="form-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Tools /></el-icon>
                  <span>快捷操作</span>
                </div>
              </template>

              <div class="quick-actions">
                <el-button @click="loadTemplate" style="width: 100%">
                  <el-icon><Document /></el-icon>
                  加载模板
                </el-button>

                <el-button @click="clearForm" style="width: 100%">
                  <el-icon><RefreshLeft /></el-icon>
                  清空表单
                </el-button>

                <el-button @click="previewData" style="width: 100%">
                  <el-icon><View /></el-icon>
                  预览数据
                </el-button>
              </div>
            </el-card>

            <!-- 字段检查 -->
            <el-card shadow="never" class="form-card">
              <template #header>
                <div class="card-header">
                  <el-icon><Select /></el-icon>
                  <span>字段检查</span>
                </div>
              </template>

              <div class="field-checks">
                <div class="check-item">
                  <el-icon :class="{ 'check-success': formData.title, 'check-error': !formData.title }">
                    <component :is="formData.title ? 'Check' : 'Close'" />
                  </el-icon>
                  <span>图书标题</span>
                </div>

                <div class="check-item">
                  <el-icon :class="{ 'check-success': formData.author, 'check-error': !formData.author }">
                    <component :is="formData.author ? 'Check' : 'Close'" />
                  </el-icon>
                  <span>作者</span>
                </div>

                <div class="check-item">
                  <el-icon
                    :class="{
                      'check-success': formData.isbn && isValidISBN,
                      'check-error': !formData.isbn || !isValidISBN
                    }"
                  >
                    <component :is="formData.isbn && isValidISBN ? 'Check' : 'Close'" />
                  </el-icon>
                  <span>ISBN</span>
                </div>

                <div class="check-item">
                  <el-icon :class="{ 'check-success': formData.publisher, 'check-error': !formData.publisher }">
                    <component :is="formData.publisher ? 'Check' : 'Close'" />
                  </el-icon>
                  <span>出版社</span>
                </div>

                <div class="check-item">
                  <el-icon :class="{ 'check-success': formData.categoryId, 'check-error': !formData.categoryId }">
                    <component :is="formData.categoryId ? 'Check' : 'Close'" />
                  </el-icon>
                  <span>分类</span>
                </div>

                <div class="check-item">
                  <el-icon :class="{ 'check-success': formData.stock >= 0, 'check-error': formData.stock < 0 }">
                    <component :is="formData.stock >= 0 ? 'Check' : 'Close'" />
                  </el-icon>
                  <span>库存数量</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <!-- 预览对话框 -->
    <el-dialog v-model="showPreview" title="数据预览" width="600px">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="图书标题">{{ formData.title }}</el-descriptions-item>
        <el-descriptions-item label="副标题">{{ formData.subtitle || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作者">{{ formData.author }}</el-descriptions-item>
        <el-descriptions-item label="ISBN">{{ formData.isbn }}</el-descriptions-item>
        <el-descriptions-item label="出版社">{{ formData.publisher }}</el-descriptions-item>
        <el-descriptions-item label="出版日期">{{ formData.publishDate }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ getCategoryName(formData.categoryId) }}</el-descriptions-item>
        <el-descriptions-item label="语言">{{ getLanguageName(formData.language) }}</el-descriptions-item>
        <el-descriptions-item label="版次">第{{ formData.edition }}版</el-descriptions-item>
        <el-descriptions-item label="页数">{{ formData.pages }}页</el-descriptions-item>
        <el-descriptions-item label="价格">¥{{ formData.price }}</el-descriptions-item>
        <el-descriptions-item label="格式">{{ getFormatName(formData.format) }}</el-descriptions-item>
        <el-descriptions-item label="库存">{{ formData.stock }}本</el-descriptions-item>
        <el-descriptions-item label="位置">{{ formData.location }}</el-descriptions-item>
        <el-descriptions-item label="状态">{{ getStatusName(formData.status) }}</el-descriptions-item>
        <el-descriptions-item label="标签" :span="2">
          <el-tag v-for="tag in formData.tags" :key="tag" size="small" style="margin-right: 8px">
            {{ tag }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="内容简介" :span="2">
          {{ formData.description || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="showPreview = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 封面预览对话框 -->
    <el-dialog v-model="showCoverPreview" title="封面预览" width="400px">
      <div class="cover-preview">
        <img :src="formData.cover" alt="图书封面" style="width: 100%; height: auto" />
      </div>

      <template #footer>
        <el-button @click="showCoverPreview = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { bookApi } from '@/api/book'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const validatingISBN = ref(false)
const fetchingInfo = ref(false)
const isValidISBN = ref(true)
const formRef = ref()
const uploadRef = ref()

// 对话框状态
const showPreview = ref(false)
const showCoverPreview = ref(false)

// 分类和选项数据
const categories = ref([])
const commonTags = ref(['科技', '文学', '历史', '艺术', '哲学', '科学', '教育', '管理', '经济', '法律'])
const commonLocations = ref(['A区', 'B区', 'C区', 'D区', '阅览室', '特藏室', '新书展示区'])

// 表单数据
const formData = reactive({
  title: '',
  subtitle: '',
  author: '',
  isbn: '',
  publisher: '',
  publishDate: '',
  categoryId: null,
  language: 'zh',
  edition: 1,
  pages: null,
  price: null,
  format: 'paperback',
  description: '',
  tags: [],
  stock: 1,
  location: '',
  status: 'available',
  cover: ''
})

// 表单验证规则
const formRules = {
  title: [
    { required: true, message: '请输入图书标题', trigger: 'blur' },
    { min: 1, max: 200, message: '标题长度在 1 到 200 个字符', trigger: 'blur' }
  ],
  author: [
    { required: true, message: '请输入作者', trigger: 'blur' },
    { min: 1, max: 100, message: '作者长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  isbn: [
    { required: true, message: '请输入ISBN', trigger: 'blur' },
    { pattern: /^(97[89])?[\d\-]+[\dX]$/, message: 'ISBN格式不正确', trigger: 'blur' }
  ],
  publisher: [
    { required: true, message: '请输入出版社', trigger: 'blur' },
    { min: 1, max: 100, message: '出版社长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  publishDate: [{ required: true, message: '请选择出版日期', trigger: 'change' }],
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  stock: [
    { required: true, message: '请输入库存数量', trigger: 'blur' },
    { type: 'number', min: 0, message: '库存数量不能小于0', trigger: 'blur' }
  ],
  location: [{ required: true, message: '请输入存放位置', trigger: 'blur' }],
  status: [{ required: true, message: '请选择图书状态', trigger: 'change' }]
}

// 计算属性
const isEdit = computed(() => !!route.params.id)
const bookId = computed(() => route.params.id)

const categoryTreeOptions = computed(() => {
  const buildTree = (items, parentId = null) => {
    return items
      .filter(item => item.parentId === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }))
  }

  return buildTree(categories.value)
})

const uploadAction = computed(() => {
  return `${import.meta.env.VITE_API_BASE_URL}/upload/image`
})

const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${authStore.token}`
}))

const uploadData = computed(() => ({
  type: 'book_cover'
}))

// 方法
const fetchCategories = async () => {
  try {
    const { data } = await bookApi.getCategories()
    categories.value = data.categories
  } catch (error) {
    console.error('获取分类失败:', error)
  }
}

const fetchBookDetail = async () => {
  if (!isEdit.value) return

  try {
    loading.value = true
    const { data } = await bookApi.getBookDetail(bookId.value)

    Object.assign(formData, {
      ...data.book,
      publishDate: data.book.publishDate?.split('T')[0], // 格式化日期
      tags: data.book.tags || []
    })
  } catch (error) {
    console.error('获取图书详情失败:', error)
    ElMessage.error('获取图书详情失败')
  } finally {
    loading.value = false
  }
}

const handleISBNBlur = () => {
  if (formData.isbn) {
    validateISBN()
  }
}

const validateISBN = async () => {
  if (!formData.isbn) return

  try {
    validatingISBN.value = true
    const { data } = await bookApi.checkISBN(formData.isbn, isEdit.value ? bookId.value : null)
    isValidISBN.value = data.isValid

    if (!data.isValid) {
      ElMessage.warning('ISBN已存在或格式不正确')
    } else if (data.exists) {
      ElMessage.warning('该ISBN已存在')
    } else {
      ElMessage.success('ISBN验证通过')
    }
  } catch (error) {
    console.error('ISBN验证失败:', error)
    isValidISBN.value = false
  } finally {
    validatingISBN.value = false
  }
}

const fetchBookInfo = async () => {
  if (!formData.isbn) {
    ElMessage.warning('请先输入ISBN')
    return
  }

  try {
    fetchingInfo.value = true
    const { data } = await bookApi.getBookByISBN(formData.isbn)

    if (data.book) {
      const bookInfo = data.book

      // 只更新空字段
      if (!formData.title && bookInfo.title) formData.title = bookInfo.title
      if (!formData.subtitle && bookInfo.subtitle) formData.subtitle = bookInfo.subtitle
      if (!formData.author && bookInfo.author) formData.author = bookInfo.author
      if (!formData.publisher && bookInfo.publisher) formData.publisher = bookInfo.publisher
      if (!formData.publishDate && bookInfo.publishDate) formData.publishDate = bookInfo.publishDate
      if (!formData.description && bookInfo.description) formData.description = bookInfo.description
      if (!formData.cover && bookInfo.cover) formData.cover = bookInfo.cover
      if (!formData.pages && bookInfo.pages) formData.pages = bookInfo.pages
      if (!formData.price && bookInfo.price) formData.price = bookInfo.price
      if (!formData.language && bookInfo.language) formData.language = bookInfo.language

      ElMessage.success('图书信息获取成功')
    } else {
      ElMessage.info('未找到该ISBN对应的图书信息')
    }
  } catch (error) {
    console.error('获取图书信息失败:', error)
    ElMessage.error('获取图书信息失败')
  } finally {
    fetchingInfo.value = false
  }
}

const beforeUpload = file => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }

  return true
}

const handleUploadSuccess = response => {
  if (response.success) {
    formData.cover = response.data.url
    ElMessage.success('封面上传成功')
  } else {
    ElMessage.error('封面上传失败')
  }
}

const handleUploadError = () => {
  ElMessage.error('封面上传失败')
}

const previewCover = () => {
  if (formData.cover) {
    showCoverPreview.value = true
  }
}

const removeCover = () => {
  formData.cover = ''
  ElMessage.success('封面已删除')
}

const loadTemplate = () => {
  ElMessage.info('模板加载功能开发中...')
}

const clearForm = async () => {
  try {
    await ElMessageBox.confirm('确定要清空表单吗？此操作不可撤销！', '清空表单', { type: 'warning' })

    formRef.value.resetFields()
    Object.assign(formData, {
      title: '',
      subtitle: '',
      author: '',
      isbn: '',
      publisher: '',
      publishDate: '',
      categoryId: null,
      language: 'zh',
      edition: 1,
      pages: null,
      price: null,
      format: 'paperback',
      description: '',
      tags: [],
      stock: 1,
      location: '',
      status: 'available',
      cover: ''
    })

    ElMessage.success('表单已清空')
  } catch (error) {
    // 用户取消
  }
}

const previewData = () => {
  showPreview.value = true
}

const handleSave = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    if (isEdit.value) {
      await bookApi.updateBook(bookId.value, formData)
      ElMessage.success('图书更新成功')
      router.push(`/books/detail/${bookId.value}`)
    } else {
      const { data } = await bookApi.createBook(formData)
      ElMessage.success('图书创建成功')
      router.push(`/books/detail/${data.book.id}`)
    }
  } catch (error) {
    if (error !== false) {
      // 表单验证失败时error为false
      console.error('保存失败:', error)
      ElMessage.error('保存失败：' + (error.message || '未知错误'))
    }
  } finally {
    submitting.value = false
  }
}

const handleSaveAndNew = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true

    await bookApi.createBook(formData)
    ElMessage.success('图书创建成功')

    // 清空表单继续新建
    clearForm()
  } catch (error) {
    if (error !== false) {
      console.error('保存失败:', error)
      ElMessage.error('保存失败：' + (error.message || '未知错误'))
    }
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.go(-1)
}

// 辅助方法
const getCategoryName = categoryId => {
  const findCategory = (items, id) => {
    for (const item of items) {
      if (item.id === id) return item.name
      if (item.children) {
        const found = findCategory(item.children, id)
        if (found) return found
      }
    }
    return null
  }

  return findCategory(categories.value, categoryId) || '未分类'
}

const getLanguageName = language => {
  const languageMap = {
    zh: '中文',
    en: '英文',
    ja: '日文',
    fr: '法文',
    de: '德文',
    other: '其他'
  }
  return languageMap[language] || language
}

const getFormatName = format => {
  const formatMap = {
    paperback: '平装',
    hardcover: '精装',
    ebook: '电子书',
    audiobook: '有声书'
  }
  return formatMap[format] || format
}

const getStatusName = status => {
  const statusMap = {
    available: '可借阅',
    maintenance: '维修中',
    offline: '已下架'
  }
  return statusMap[status] || status
}

// 监听器
watch(
  () => formData.isbn,
  () => {
    isValidISBN.value = true
  }
)

// 生命周期
onMounted(() => {
  fetchCategories()
  if (isEdit.value) {
    fetchBookDetail()
  }
})
</script>

<style lang="scss" scoped>
.book-form {
  padding: 20px;
  background-color: var(--content-bg-color);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;

  .breadcrumb {
    :deep(.el-breadcrumb__item) {
      font-size: 14px;
    }
  }
}

.header-actions {
  display: flex;
  gap: 12px;
}

.form-content {
  .form-card {
    margin-bottom: 20px;

    :deep(.el-card__header) {
      background: var(--el-fill-color-lighter);
      border-bottom: 1px solid var(--el-border-color-light);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--el-text-color-primary);

      .el-icon {
        font-size: 16px;
      }
    }
  }
}

.cover-upload-section {
  .current-cover {
    margin-bottom: 16px;
    text-align: center;

    .cover-image {
      width: 150px;
      height: 200px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid var(--el-border-color-light);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .cover-actions {
      margin-top: 8px;
      display: flex;
      justify-content: center;
      gap: 8px;
    }
  }

  .cover-uploader {
    margin-bottom: 16px;

    :deep(.el-upload-dragger) {
      width: 100%;
      height: 120px;
      border: 2px dashed var(--el-border-color);
      border-radius: 8px;
      padding: 20px;

      &:hover {
        border-color: var(--el-color-primary);
      }
    }

    .upload-content {
      text-align: center;

      .upload-icon {
        font-size: 32px;
        color: var(--el-text-color-secondary);
        margin-bottom: 8px;
      }

      .upload-text {
        p {
          margin: 0;
          color: var(--el-text-color-regular);

          &.upload-hint {
            font-size: 12px;
            color: var(--el-text-color-secondary);
            margin-top: 4px;
          }
        }
      }
    }
  }

  .isbn-fetch {
    margin-top: 16px;
  }
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .check-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;

    .el-icon {
      font-size: 16px;

      &.check-success {
        color: var(--el-color-success);
      }

      &.check-error {
        color: var(--el-color-danger);
      }
    }
  }
}

.cover-preview {
  text-align: center;
}

// 响应式设计
@media (max-width: 768px) {
  .book-form {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;

    .header-actions {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
    }
  }

  .cover-upload-section {
    .current-cover {
      .cover-image {
        width: 120px;
        height: 160px;
      }
    }
  }
}
</style>
