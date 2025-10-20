<template>
  <div class="book-form" v-loading="loading">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <ElButton @click="goBack" size="default">
          <ElIcon><ArrowLeft /></ElIcon>
          返回
        </ElButton>
      </div>
      <div class="header-actions">
        <ElButton @click="handleSave" type="primary" :loading="submitting">
          保存
        </ElButton>
      </div>
    </div>

    <!-- ProForm 表单 -->
    <ProForm
      ref="proFormRef"
      :fields="formFields"
      :initial-values="initialFormValues"
      :groups="formGroups"
      :loading="loading"
      :mode="isEdit ? 'edit' : 'create'"
      :columns="4"
      :gutter="16"
      :actions="false"
      :class-name="'book-pro-form'"
      @submit="handleFormSubmit"
      @values-change="handleValuesChange"
      @field-change="handleFieldChange"
    >
      <!-- 自定义 ISBN 输入字段 -->
      <template #field-isbn="{ value }">
        <ElInput
          :model-value="value"
          placeholder="请输入ISBN号码"
          maxlength="20"
          clearable
          @blur="handleISBNBlur"
          @update:model-value="handleISBNChange"
        >
          <template #append>
            <ElButton :loading="validatingISBN" @click="validateISBN">验证</ElButton>
          </template>
        </ElInput>
      </template>

      <!-- 自定义封面上传字段 -->
      <template #field-cover>
        <div class="cover-upload-field">
          <div class="cover-content">
            <!-- 封面预览区 -->
            <div v-if="defaultFormValues.cover" class="preview-card">
              <img :src="defaultFormValues.cover" alt="图书封面" class="cover-image" />
              <div class="preview-actions">
                <ElButton size="small" @click="previewCover">
                  <ElIcon><View /></ElIcon>
                  预览
                </ElButton>
                <ElButton size="small" type="danger" @click="removeCover">
                  <ElIcon><Delete /></ElIcon>
                  删除
                </ElButton>
              </div>
            </div>
            <div v-else class="preview-card is-empty">
              <ElIcon class="empty-icon"><Picture /></ElIcon>
              <span>暂无封面</span>
            </div>

            <!-- 上传区 -->
            <div class="upload-card">
              <ElUpload
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
                  <ElIcon class="upload-icon"><Plus /></ElIcon>
                  <div class="upload-text">
                    <p>点击或拖拽上传封面</p>
                    <p class="upload-hint">建议比例 3:4，最大 5MB</p>
                  </div>
                </div>
              </ElUpload>
            </div>
          </div>
        </div>
      </template>
    </ProForm>

    <!-- 封面预览对话框 -->
    <el-dialog v-model="showCoverPreview" title="封面预览" width="400px">
      <div class="cover-preview">
        <img :src="defaultFormValues.cover" alt="图书封面" style="width: 100%; height: auto" />
      </div>

      <template #footer>
        <ElButton @click="showCoverPreview = false">关闭</ElButton>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showSuccess, showError, showWarning } from '@/utils/message'
import {
  ElInput,
  ElButton,
  ElUpload,
  ElIcon,
  ElSelect,
  ElOption
} from 'element-plus'
import {
  Search,
  Plus,
  View,
  Delete,
  ArrowLeft,
  Reading,
  Box,
  Picture
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { get, isArray, sortBy, groupBy, forEach, filter, compact, isEmpty, pick, defaults, toNumber, castArray, isNumber, isString } from 'lodash-es'
import { bookApi } from '@/api/book'
import { useAuthStore, getUploadAction, getAuthHeaders } from '@/stores/auth'
import { ProForm } from '@/components/common'
import InputNumber from '@/components/InputNumber.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const uploadAction = getUploadAction()
const uploadHeaders = getAuthHeaders(authStore.token)

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const validatingISBN = ref(false)
const isValidISBN = ref(true)
const proFormRef = ref()
const uploadRef = ref()

// 对话框状态
const showCoverPreview = ref(false)

// 分类和选项数据
const categories = ref([])

// 将后端返回的分类列表转换成树形选择器需要的结构
// 后端返回格式: { id, name, parent_id }
const normalizeCategoryTree = (list = []) => {
  if (!isArray(list)) return []

  const nodeMap = new Map()
  const roots = []

  // 一次遍历完成所有操作
  forEach(list, item => {
    if (!item?.id) return

    // 获取或创建当前节点
    let node = nodeMap.get(item.id)
    if (!node) {
      node = { value: item.id, label: item.name || '未命名分类' }
      nodeMap.set(item.id, node)
    } else {
      // 补充节点信息（如果之前是作为父节点被创建的）
      node.label = node.label || item.name || '未命名分类'
    }

    // 处理父子关系
    if (item.parent_id) {
      let parent = nodeMap.get(item.parent_id)
      if (!parent) {
        parent = { value: item.parent_id }
        nodeMap.set(item.parent_id, parent)
      }
      // 只在有子节点时创建 children 数组
      if (!parent.children) parent.children = []
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

const tagOptions = ref([])
const locationOptions = ref([])

const setTagOptions = (tags = []) => {
  if (!Array.isArray(tags)) return
  tagOptions.value = tags.map(tag => ({
    label: tag.name,
    value: tag.id,
    raw: tag
  }))
  syncTagFieldOptions()
}

const setLocationOptions = (locations = []) => {
  if (!Array.isArray(locations)) return
  locationOptions.value = locations.map(location => ({
    label: location.name,
    value: location.id,
    raw: location
  }))
  syncLocationFieldOptions()
}

const ensureOption = (targetRef, option) => {
  if (!option || option.value === undefined || option.value === null) return
  if (!targetRef.value.some(existing => existing.value === option.value)) {
    targetRef.value = [...targetRef.value, option]
  }
}

// 表单数据
const defaultFormValues = Object.freeze({
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
  tagIds: [],
  tags: [],
  stock: 1,
  locationId: null,
  location: '',
  status: 'available',
  cover: ''
})

const initialFormValues = reactive({ ...defaultFormValues })
const formData = reactive({ ...defaultFormValues })

// 表单分组配置
const formGroups = [
  {
    key: 'basicInfo',
    title: '基本信息'
  },
  {
    key: 'stockInfo',
    title: '库存管理'
  },
  {
    key: 'coverInfo',
    title: '图书封面'
  }
]

// 计算属性
const isEdit = ref(!!route.params.id)
const bookId = ref(route.params.id ?? null)


const uploadData = computed(() => ({
  type: 'book_cover'
}))

// ISBN 输入变化处理
const handleISBNChange = (val) => {
  formData.isbn = val
  proFormRef.value?.setFieldValue('isbn', val)
}

// ProForm 字段配置
const formFields = ref([
  // 基本信息组
  {
    name: 'title',
    label: '图书标题',
    valueType: 'text',
    group: 'basicInfo',
    span: 6,
    required: true,
    placeholder: '请输入图书标题',
    fieldProps: {
      maxlength: 200,
      showWordLimit: true,
      clearable: true
    },
    rules: [
      { required: true, message: '请输入图书标题', trigger: 'blur' },
      { min: 1, max: 200, message: '标题长度在 1 到 200 个字符', trigger: 'blur' }
    ]
  },
  {
    name: 'subtitle',
    label: '副标题',
    valueType: 'text',
    group: 'basicInfo',
    span: 6,
    placeholder: '请输入副标题（可选）',
    fieldProps: {
      maxlength: 200,
      showWordLimit: true,
      clearable: true
    }
  },
  {
    name: 'author',
    label: '作者',
    valueType: 'text',
    group: 'basicInfo',
    span: 6,
    required: true,
    placeholder: '请输入作者姓名',
    fieldProps: {
      maxlength: 100,
      showWordLimit: true,
      clearable: true
    },
    rules: [
      { required: true, message: '请输入作者', trigger: 'blur' },
      { min: 1, max: 100, message: '作者长度在 1 到 100 个字符', trigger: 'blur' }
    ]
  },
  {
    name: 'isbn',
    label: 'ISBN',
    valueType: 'custom',
    group: 'basicInfo',
    span: 6,
    required: true,
    placeholder: '请输入ISBN号码',
    rules: [
      { required: true, message: '请输入ISBN', trigger: 'blur' },
      { pattern: /^(97[89])?[\d\-]+[\dX]$/, message: 'ISBN格式不正确', trigger: 'blur' }
    ]
  },
  {
    name: 'publisher',
    label: '出版社',
    valueType: 'text',
    group: 'basicInfo',
    span: 6,
    required: true,
    placeholder: '请输入出版社名称',
    fieldProps: {
      maxlength: 100,
      showWordLimit: true,
      clearable: true
    },
    rules: [
      { required: true, message: '请输入出版社', trigger: 'blur' },
      { min: 1, max: 100, message: '出版社长度在 1 到 100 个字符', trigger: 'blur' }
    ]
  },
  {
    name: 'publishDate',
    label: '出版日期',
    valueType: 'date',
    group: 'basicInfo',
    span: 6,
    required: true,
    placeholder: '选择出版日期',
    fieldProps: {
      format: 'YYYY-MM-DD',
      valueFormat: 'YYYY-MM-DD',
      style: { width: '100%' }
    },
    rules: [{ required: true, message: '请选择出版日期', trigger: 'change' }]
  },
    {
    name: 'categoryId',
    label: '分类',
    valueType: 'treeSelect',
    group: 'basicInfo',
    span: 6,
    required: true,
    placeholder: '选择图书分类',
    fieldProps: {
      props: { label: 'label', value: 'value', children: 'children' },
      data: categories.value,
      clearable: true,
      checkStrictly: true,
      style: { width: '100%' }
    },
    rules: [{ required: true, message: '请选择分类', trigger: 'change' }]
  },
  {
    name: 'language',
    label: '语言',
    valueType: 'select',
    group: 'basicInfo',
    span: 6,
    placeholder: '选择语言',
    options: [
      { label: '中文', value: 'zh' },
      { label: '英文', value: 'en' },
      { label: '日文', value: 'ja' },
      { label: '法文', value: 'fr' },
      { label: '德文', value: 'de' },
      { label: '其他', value: 'other' }
    ]
  },
    {
    name: 'edition',
    label: '版次',
    valueType: 'custom',
    group: 'basicInfo',
    span: 6,
    required: true,
    renderFormItem: () => h(InputNumber, {
      modelValue: formData.edition,
      min: 1,
      max: 99,
      step: 1,
      textAlign: 'center',
      size: 'default',
      onChange: updateEdition,
      'onUpdate:modelValue': updateEdition
    })
  },
    {
    name: 'pages',
    label: '页数',
    valueType: 'custom',
    group: 'basicInfo',
    span: 6,
    renderFormItem: () => h(InputNumber, {
      modelValue: formData.pages,
      min: 1,
      max: 9999,
      step: 1,
      textAlign: 'center',
      size: 'default',
      onChange: updatePages,
      'onUpdate:modelValue': updatePages
    })
  },
    {
    name: 'price',
    label: '价格',
    valueType: 'custom',
    group: 'basicInfo',
    span: 6,
    renderFormItem: () => h(InputNumber, {
      modelValue: formData.price,
      min: 0,
      step: 0.1,
      precision: 2,
      textAlign: 'right',
      thousands: true,
      unit: '¥',
      size: 'default',
      onChange: updatePrice,
      'onUpdate:modelValue': updatePrice
    })
  },
  {
    name: 'format',
    label: '格式',
    valueType: 'select',
    group: 'basicInfo',
    span: 6,
    placeholder: '选择格式',
    options: [
      { label: '平装', value: 'paperback' },
      { label: '精装', value: 'hardcover' },
      { label: '电子书', value: 'ebook' },
      { label: '有声书', value: 'audiobook' }
    ]
  },
  {
    name: 'description',
    label: '内容简介',
    valueType: 'textarea',
    group: 'basicInfo',
    span: 24,
    placeholder: '请输入图书内容简介',
    fieldProps: {
      rows: 5,
      maxlength: 1000,
      showWordLimit: true
    }
  },
  {
    name: 'tagIds',
    label: '标签',
    valueType: 'multipleSelect',
    group: 'basicInfo',
    span: 24,
    placeholder: '请选择标签',
    fieldProps: {
      filterable: true,
      style: { width: '100%' }
    },
    options: tagOptions.value
  },

  // 库存管理组
    {
    name: 'stock',
    label: '库存数量',
    valueType: 'custom',
    group: 'stockInfo',
    span: 6,
    required: true,
    renderFormItem: () => h(InputNumber, {
      modelValue: formData.stock,
      min: 0,
      max: 9999,
      step: 1,
      textAlign: 'center',
      size: 'default',
      onChange: updateStock,
      'onUpdate:modelValue': updateStock
    }),
    rules: [
      { required: true, message: '请输入库存数量', trigger: 'blur' },
      { type: 'number', min: 0, message: '库存数量不能小于0', trigger: 'blur' }
    ]
  },
  {
    name: 'locationId',
    label: '存放位置',
    valueType: 'select',
    group: 'stockInfo',
    span: 6,
    required: true,
    placeholder: '请选择存放位置',
    fieldProps: {
      filterable: true,
      style: { width: '100%' }
    },
    options: locationOptions.value,
    rules: [{ required: true, message: '请输入存放位置', trigger: 'blur' }]
  },
  {
    name: 'status',
    label: '图书状态',
    valueType: 'select',
    group: 'stockInfo',
    span: 6,
    required: true,
    placeholder: '选择状态',
    options: [
      { label: '可借阅', value: 'available' },
      { label: '维修中', value: 'maintenance' },
      { label: '已下架', value: 'offline' }
    ],
    rules: [{ required: true, message: '请选择图书状态', trigger: 'change' }]
  },

  // 图书封面组
  {
    name: 'cover',
    label: '',
    valueType: 'custom',
    group: 'coverInfo',
    span: 24
  }
])

const updateFormField = (fieldName, updater) => {
  const index = formFields.value.findIndex(field => field.name === fieldName)
  if (index === -1) return
  const currentField = formFields.value[index]
  const nextField = {
    ...currentField,
    ...updater(currentField)
  }
  formFields.value = [
    ...formFields.value.slice(0, index),
    nextField,
    ...formFields.value.slice(index + 1)
  ]
}

const syncCategoryFieldOptions = () => {
  updateFormField('categoryId', field => ({
    fieldProps: {
      ...(field.fieldProps || {}),
      data: categories.value
    }
  }))
}

const syncTagFieldOptions = () => {
  const options = tagOptions.value.map(option => ({ ...option }))
  updateFormField('tagIds', () => ({ options }))
}

const syncLocationFieldOptions = () => {
  const options = locationOptions.value.map(option => ({ ...option }))
  updateFormField('locationId', () => ({ options }))
}

const normalizeNumberValue = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) return fallback
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

const setNumericField = (field, value, fallback = 0) => {
  const normalized = normalizeNumberValue(value, fallback)
  formData[field] = normalized
  proFormRef.value?.setFieldValue(field, normalized)
}

const updateEdition = value => setNumericField('edition', value, 1)
const updatePages = value => setNumericField('pages', value, null)
const updatePrice = value => setNumericField('price', value, 0)
const updateStock = value => setNumericField('stock', value, 0)

// 方法
const fetchCategories = async () => {
  try {
    const response = await bookApi.getCategoryTree()
    const rawCategories = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.categories)
        ? response.data.categories
        : []
    const treeCategories = normalizeCategoryTree(rawCategories)
    categories.value = treeCategories
    syncCategoryFieldOptions()
  } catch (error) {
    console.error('获取分类失败:', error)
    showError('获取分类数据失败：' + (error.message || '网络错误'))
  }
}

const fetchTagOptions = async () => {
  try {
    const response = await bookApi.getBookTags()
    const rawData = response?.data
    const tags = Array.isArray(rawData?.list)
      ? rawData.list
      : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData?.tags)
          ? rawData.tags
          : Array.isArray(rawData)
            ? rawData
            : []
    setTagOptions(tags)
  } catch (error) {
    console.error('获取标签列表失败:', error)
  }
}


const fetchLocationOptions = async () => {
  try {
    const response = await bookApi.getBookLocations()
    const rawData = response?.data
    const locations = Array.isArray(rawData?.list)
      ? rawData.list
      : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData?.locations)
          ? rawData.locations
          : Array.isArray(rawData)
            ? rawData
            : []
    setLocationOptions(locations)
  } catch (error) {
    console.error('获取存放位置失败:', error)
  }
}


const fetchBookDetail = async (targetId = bookId.value) => {
  if (!targetId) return

  try {
    loading.value = true
    const { data } = await bookApi.getBookDetail(targetId)
    const book = data || {}

    // 辅助函数：安全转换为数字
    const safeNumber = (value, defaultVal = null) => {
      const num = toNumber(value)
      return Number.isFinite(num) ? num : defaultVal
    }

    // 处理作者字段
    const authorsText = isArray(book.authors)
      ? book.authors.join(', ')
      : isString(book.authors) ? book.authors : ''

    // 处理出版日期
    const publishDate = (() => {
      const dateSource = book.publishDate || book.publish_date
      if (dateSource) {
        const parsed = dayjs(dateSource)
        if (parsed.isValid()) return parsed.format('YYYY-MM-DD')
      }
      const year = book.publicationYear || book.publication_year
      if (year) {
        const parsed = dayjs(`${year}-01-01`)
        if (parsed.isValid()) return parsed.format('YYYY-MM-DD')
      }
      return ''
    })()

    // 处理标签数据
    const tagItems = castArray(book.tagItems).filter(Boolean)
    const tagIds = compact(
      book.tagIds
        ? castArray(book.tagIds).map(safeNumber)
        : tagItems.map(item => safeNumber(item?.id))
    )
    const tagNames = tagItems.length
      ? compact(tagItems.map(item => item?.name))
      : castArray(book.tags).filter(isString)

    // 处理位置数据
    const locationId = safeNumber(
      book.locationId || book.location_id || get(book, 'locationInfo.id')
    )
    const locationName = book.locationName || book.location || get(book, 'locationInfo.name', '')

    // 构建表单值
    const detailValues = defaults(
      {
        title: book.title,
        subtitle: book.subtitle,
        author: authorsText,
        isbn: book.isbn,
        publisher: book.publisher,
        publishDate,
        categoryId: safeNumber(book.categoryId || book.category),
        language: book.language || 'zh',
        edition: safeNumber(book.edition, 1),
        pages: safeNumber(book.pages),
        price: safeNumber(book.price),
        format: book.format,
        description: book.description || book.summary,
        tagIds,
        tags: tagNames,
        stock: safeNumber(
          book.totalStock || book.total_stock || book.stock ||
          book.availableStock || book.available_stock, 1
        ),
        locationId,
        location: locationName,
        status: book.status || 'available',
        cover: book.cover || book.coverUrl || book.cover_image
      },
      defaultFormValues
    )

    // 更新表单数据
    Object.assign(initialFormValues, detailValues)
    Object.assign(formData, detailValues)

    // 更新选项列表
    forEach(tagItems, tag => {
      if (tag?.id && tag?.name) {
        ensureOption(tagOptions, { label: tag.name, value: tag.id, raw: tag })
      }
    })

    if (locationId && locationName) {
      ensureOption(locationOptions, {
        label: locationName,
        value: locationId,
        raw: book.locationInfo || { id: locationId, name: locationName }
      })
    }
    syncTagFieldOptions()
    syncLocationFieldOptions()

    await nextTick()
    proFormRef.value?.setValues(detailValues)
  } catch (error) {
    console.error('获取图书详情失败:', error)
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
      showWarning('ISBN已存在或格式不正确')
    } else if (data.exists) {
      showWarning('该ISBN已存在')
    } else {
      showSuccess('ISBN验证通过')
    }
  } catch (error) {
    console.error('ISBN验证失败:', error)
    isValidISBN.value = false
  } finally {
    validatingISBN.value = false
  }
}

const beforeUpload = file => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    showError('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    showError('图片大小不能超过 5MB!')
    return false
  }

  return true
}

const handleUploadSuccess = response => {
  if (response.success) {
    defaultFormValues.cover = response.data.url
    showSuccess('封面上传成功')
  } else {
    showError('封面上传失败')
  }
}

const handleUploadError = () => {
  showError('封面上传失败')
}

const previewCover = () => {
  if (defaultFormValues.cover) {
    showCoverPreview.value = true
  }
}

const removeCover = () => {
  defaultFormValues.cover = ''
  showSuccess('封面已删除')
}

const buildSubmitPayload = () => {
  const authors = formData.author
    ? formData.author
        .split(',')
        .map(author => author.trim())
        .filter(Boolean)
    : []

  const publishDate = formData.publishDate
  const publicationYear = publishDate && dayjs(publishDate).isValid()
    ? dayjs(publishDate).year()
    : undefined

  const normalizedLocationId = formData.locationId !== null && formData.locationId !== undefined && formData.locationId !== ''
    ? Number(formData.locationId)
    : null

  const payload = {
    ...formData,
    authors,
    author: formData.author,
    categoryId: formData.categoryId !== null && formData.categoryId !== undefined && formData.categoryId !== ''
      ? Number(formData.categoryId)
      : null,
    tagIds: Array.isArray(formData.tagIds)
      ? formData.tagIds.map(id => Number(id)).filter(id => !Number.isNaN(id))
      : [],
    tags: Array.isArray(formData.tags) ? formData.tags : [],
    locationId: normalizedLocationId,
    location: formData.location || null,
    totalStock: formData.stock !== null && formData.stock !== undefined ? Number(formData.stock) : 0,
    availableStock: formData.stock !== null && formData.stock !== undefined ? Number(formData.stock) : 0,
    publicationYear,
    publishDate: publishDate || null,
    price: formData.price !== null && formData.price !== undefined ? Number(formData.price) : null,
    pages: formData.pages !== null && formData.pages !== undefined ? Number(formData.pages) : null,
    edition: formData.edition !== null && formData.edition !== undefined ? Number(formData.edition) : null,
  }

  delete payload.stock

  if (!publicationYear) {
    delete payload.publicationYear
  }

  return payload
}

const handleSave = async () => {
  try {
    const isValid = await proFormRef.value?.validate()
    if (!isValid) return

    submitting.value = true

    const payload = buildSubmitPayload()

    if (isEdit.value) {
      await bookApi.updateBook(bookId.value, payload)
      showSuccess('图书更新成功')
      router.push(`/books/detail/${bookId.value}`)
    } else {
      const { data } = await bookApi.createBook(payload)
      showSuccess('图书创建成功')
      router.push(`/books/detail/${data.book.id}`)
    }
  } catch (error) {
    console.error('保存失败:', error)
    showError('保存失败：' + (error.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  router.go(-1)
}

// ProForm 事件处理
const handleFormSubmit = async (values) => {
  await handleSave()
}

const handleValuesChange = (changedValues) => {
  Object.entries(changedValues || {}).forEach(([key, value]) => {
    if (formData[key] !== value) {
      formData[key] = value
    }
  })

  if (Object.prototype.hasOwnProperty.call(changedValues, 'categoryId')) {
    const value = changedValues.categoryId
    formData.categoryId = value !== null && value !== undefined && value !== '' ? Number(value) : null
  }

  if (Object.prototype.hasOwnProperty.call(changedValues, 'locationId')) {
    const value = changedValues.locationId
    formData.locationId = value !== null && value !== undefined && value !== '' ? Number(value) : null
  }

  if (Object.prototype.hasOwnProperty.call(changedValues, 'tagIds')) {
    formData.tagIds = Array.isArray(changedValues.tagIds)
      ? changedValues.tagIds.map(id => Number(id)).filter(id => !Number.isNaN(id))
      : []
  }
}


const handleFieldChange = (fieldName, value, oldValue) => {
  // 特殊字段处理
  if (fieldName === 'isbn') {
    isValidISBN.value = true // 重置验证状态
  }

  if (fieldName === 'categoryId') {
    formData.categoryId = value !== null && value !== undefined && value !== '' ? Number(value) : null
  }

  if (fieldName === 'locationId') {
    formData.locationId = value !== null && value !== undefined && value !== '' ? Number(value) : null
  }

  if (fieldName === 'tagIds') {
    formData.tagIds = Array.isArray(value) ? value.map(id => Number(id)).filter(id => !Number.isNaN(id)) : []
  }
}


const handleReset = () => {
  const resetValues = {}
  Object.entries(initialFormValues).forEach(([key, value]) => {
    const cloned = Array.isArray(value) ? [...value] : value
    formData[key] = cloned
    resetValues[key] = cloned
  })

  proFormRef.value?.setValues({ ...resetValues })
}

const resetToDefaultFormValues = () => {
  const defaults = {}
  Object.entries(defaultFormValues).forEach(([key, value]) => {
    const cloned = Array.isArray(value) ? [...value] : value
    initialFormValues[key] = cloned
    formData[key] = cloned
    defaults[key] = cloned
  })

  proFormRef.value?.setValues({ ...defaults })
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

// 生命周期
onMounted(async () => {
  const id = route.params.id ?? null

  bookId.value = id
  isEdit.value = !!id
  await fetchCategories()
  await fetchTagOptions()
  await fetchLocationOptions()

  if (isEdit.value) {
    await fetchBookDetail(bookId.value)
  } else {
    await resetToDefaultFormValues()
  }
})
</script>

<style lang="scss" scoped>
.book-form {
  background-color: var(--content-bg-color);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

// 自定义字段样式
.cover-upload-field {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .cover-content {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: stretch;
  }

  .preview-card {
    width: 160px;
    padding: 12px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    background: var(--el-bg-color);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    .cover-image {
      width: 100%;
      border-radius: 6px;
      object-fit: cover;
      max-height: 220px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .preview-actions {
      display: flex;
      gap: 8px;
      width: 100%;
      justify-content: center;
    }

    &.is-empty {
      justify-content: center;
      border-style: dashed;
      color: var(--el-text-color-secondary);

      .empty-icon {
        font-size: 32px;
        margin-bottom: 6px;
        color: var(--el-text-color-placeholder);
      }
    }
  }

  .upload-card {
    min-width: 220px;
    max-width: 280px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    :deep(.el-upload) {
      width: 100%;
    }

    :deep(.el-upload-dragger) {
      height: 140px;
      padding: 16px;
      border-radius: 8px;
    }

    .upload-content {
      text-align: center;

      .upload-icon {
        font-size: 28px;
        color: var(--el-text-color-placeholder);
        margin-bottom: 8px;
      }

      .upload-text {
        p {
          margin: 0;
          font-size: 13px;
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
}

.cover-preview {
  text-align: center;
}

// ISBN 输入组件样式
:deep(.isbn-input-field) {
  .el-input-group__append {
    padding: 0;

    .el-button {
      border-left: none;
    }
  }
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

  :deep(.book-pro-form) {
    .el-card .el-card__body {
      padding: 16px;
    }
  }

  .cover-upload-field {
    .cover-content {
      flex-direction: column;
      align-items: stretch;
    }

    .preview-card,
    .upload-card {
      width: 100%;
      max-width: none;
    }

    .preview-card .cover-image {
      max-height: none;
    }
  }
}
</style>
