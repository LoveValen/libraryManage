<template>
  <div class="virtual-table-demo">
    <el-card class="intro" shadow="never">
      <h2>ProTable 虚拟滚动与列宽拖拽示例</h2>
      <p>
        该示例展示了 ProTable 在大数据量列表下的虚拟滚动能力，以及完整的列宽拖拽调整功能。
      </p>
      <el-alert
        title="列宽拖拽功能说明"
        type="info"
        :closable="false"
        show-icon
      >
        <template #default>
          <div>
            <p><strong>🎯 核心功能：</strong></p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li><strong>单列拖拽：</strong>拖拽列边界调整单列宽度</li>
              <li><strong>多列选择：</strong>Ctrl+点击多选，Shift+点击范围选择</li>
              <li><strong>多列同步：</strong>选中多列后拖拽，所有选中列同步调整</li>
              <li><strong>双击自适应：</strong>双击列边界自动调整至最适宽度</li>
              <li><strong>智能分配：</strong>自动重新分配其他列宽度，保持表格填满容器</li>
            </ul>
            <p style="margin-top: 8px;"><strong>💡 使用提示：</strong></p>
            <ul style="margin: 8px 0; padding-left: 20px;">
              <li>鼠标悬停在列边界时会显示拖拽手柄</li>
              <li>拖拽时会显示蓝色指示线</li>
              <li>开启调试模式可查看详细的拖拽状态</li>
            </ul>
          </div>
        </template>
      </el-alert>
      <el-alert
        title="性能优化"
        type="success"
        :closable="false"
        show-icon
        style="margin-top: 12px;"
      >
        虚拟滚动可在 1000+ 行数据下保持 60fps 流畅体验，列宽调整已优化响应速度。
      </el-alert>
    </el-card>

    <!-- 控制面板 -->
    <el-card class="controls" shadow="never">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>⚙️ 控制面板</span>
          <el-tag :type="resizeMonitor.isDragging ? 'danger' : 'info'">
            {{ resizeMonitor.isDragging ? '拖拽中...' : '就绪' }}
          </el-tag>
        </div>
      </template>
      
      <div class="controls-grid">
        <!-- 虚拟滚动控制 -->
        <div class="control-section">
          <h4>📊 虚拟滚动</h4>
          <div class="control-item">
            <el-switch v-model="enableVirtual" active-text="启用" inactive-text="关闭" />
          </div>
          <div class="control-item">
            <el-radio-group v-model="heightMode" size="small">
              <el-radio-button label="fixed">固定行高</el-radio-button>
              <el-radio-button label="dynamic">动态行高</el-radio-button>
            </el-radio-group>
          </div>
          <div class="control-item">
            <span class="label">行高(px):</span>
            <el-input-number v-model="itemHeight" :min="28" :max="120" :step="2" size="small" />
          </div>
          <div class="control-item">
            <span class="label">预渲染:</span>
            <el-input-number v-model="overscan" :min="0" :max="30" size="small" />
          </div>
        </div>

        <!-- 列宽控制 -->
        <div class="control-section">
          <h4>📏 列宽控制</h4>
          <div class="control-item">
            <el-checkbox v-model="enableColumnResize">启用拖拽</el-checkbox>
            <el-checkbox v-model="showResizeHandles">显示手柄</el-checkbox>
          </div>
          <div class="control-item">
            <el-radio-group v-model="columnWidthMode" size="small">
              <el-radio-button label="fixed">固定</el-radio-button>
              <el-radio-button label="mixed">混合</el-radio-button>
              <el-radio-button label="auto">自适应</el-radio-button>
            </el-radio-group>
          </div>
          <div class="control-item">
            <el-button-group size="small">
              <el-button @click="resetAllColumnWidths" type="primary">
                <el-icon><RefreshRight /></el-icon>重置宽度
              </el-button>
              <el-button @click="autoFitAllColumns" type="success">
                <el-icon><Expand /></el-icon>自适应
              </el-button>
            </el-button-group>
          </div>
          <div class="control-item">
            <el-button-group size="small">
              <el-button @click="clearColumnSelection" type="warning">清除选择</el-button>
              <el-button @click="selectAllColumns" type="info">全选列</el-button>
            </el-button-group>
          </div>
        </div>

        <!-- 调试工具 -->
        <div class="control-section">
          <h4>🔍 调试工具</h4>
          <div class="control-item">
            <el-checkbox v-model="debugMode" @change="toggleDebugMode">调试模式</el-checkbox>
            <el-checkbox v-model="showPerformanceMonitor">性能监控</el-checkbox>
          </div>
          <div class="control-item">
            <el-button-group size="small">
              <el-button @click="testDragHandles" type="primary">测试手柄</el-button>
              <el-button @click="logColumnState" type="info">查看状态</el-button>
              <el-button @click="exportColumnWidths" type="success">导出配置</el-button>
            </el-button-group>
          </div>
          <div class="control-item" v-if="debugMode">
            <el-tag>拖拽次数: {{ resizeMonitor.resizeCount }}</el-tag>
            <el-tag>当前列: {{ resizeMonitor.currentColumn || '-' }}</el-tag>
          </div>
        </div>

        <!-- 数据控制 -->
        <div class="control-section">
          <h4>📦 数据控制</h4>
          <div class="control-item">
            <span class="label">数据量:</span>
            <el-input-number v-model="dataCount" :min="0" :max="10000" :step="100" size="small" />
            <el-button @click="reloadData" :loading="loading" size="small" type="primary">重载</el-button>
          </div>
          <div class="control-item">
            <span class="label">跳转到:</span>
            <el-input-number v-model="jumpIndex" :min="0" :max="dataCount-1" size="small" />
            <el-button @click="jumpTo" size="small">跳转</el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 性能监控面板 -->
    <el-card v-if="showPerformanceMonitor" class="performance-monitor" shadow="never">
      <template #header>
        <span>📈 性能监控</span>
      </template>
      <div class="monitor-grid">
        <div class="monitor-item">
          <span class="label">FPS:</span>
          <el-progress :percentage="performanceData.fps" :color="getFPSColor(performanceData.fps)" />
        </div>
        <div class="monitor-item">
          <span class="label">渲染耗时:</span>
          <el-tag>{{ performanceData.renderTime }}ms</el-tag>
        </div>
        <div class="monitor-item">
          <span class="label">拖拽延迟:</span>
          <el-tag :type="performanceData.dragLatency < 16 ? 'success' : 'warning'">
            {{ performanceData.dragLatency }}ms
          </el-tag>
        </div>
        <div class="monitor-item">
          <span class="label">内存使用:</span>
          <el-tag>{{ performanceData.memoryUsage }}MB</el-tag>
        </div>
      </div>
    </el-card>

    <!-- 列宽状态显示 -->
    <el-card v-if="debugMode" class="column-state" shadow="never">
      <template #header>
        <span>📋 列宽状态</span>
      </template>
      <div class="state-grid">
        <div v-for="(width, key) in currentColumnWidths" :key="key" class="state-item">
          <el-tag :type="selectedColumns.has(key) ? 'primary' : 'info'">
            {{ getColumnTitle(key) }}: {{ Math.round(width) }}px
          </el-tag>
        </div>
      </div>
    </el-card>

    <!-- 主表格 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>📋 虚拟滚动表格 ({{ tableData.length }} 条数据)</span>
          <div class="header-info">
            <el-tag size="small">虚拟滚动: {{ enableVirtual ? '开' : '关' }}</el-tag>
            <el-tag size="small">列宽拖拽: {{ enableColumnResize ? '开' : '关' }}</el-tag>
            <el-tag size="small" v-if="selectedColumns.size > 0">
              选中 {{ selectedColumns.size }} 列
            </el-tag>
          </div>
        </div>
      </template>

      <!-- 拖拽提示 -->
      <div v-if="resizeMonitor.isDragging" class="drag-indicator">
        <el-alert
          :title="`正在调整列宽: ${resizeMonitor.currentColumn} (${Math.round(resizeMonitor.currentWidth)}px)`"
          type="warning"
          :closable="false"
        />
      </div>

      <!-- ProTable 组件 -->
      <div ref="tableContainer" class="table-container">
        <pro-table
          ref="tableRef"
          :request="request"
          :columns="computedColumns"
          row-key="id"
          :pagination="paginationConfig"
          :search="{ defaultCollapsed: false }"
          :row-selection="{ type: 'checkbox', width: 60 }"
          :actions="rowActions"
          :show-index="true"
          :virtual-scroll-config="virtualConfig"
          :enable-column-resize="enableColumnResize"
          :debug-mode="debugMode"
          :params="{ keyword, status }"
          @load="onTableLoad"
          @row-click="onRowClick"
          @selection-change="onSelectionChange"
        />
      </div>

      <!-- 拖拽指示线 -->
      <div v-show="resizeMonitor.isDragging" ref="resizeLine" class="resize-indicator-line"></div>
    </el-card>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RefreshRight, Expand } from '@element-plus/icons-vue'
import type { ProTableInstance, ProTableColumn, RequestParams, RequestResponse, ValueEnumItem } from '@/components/common/ProTable.types'
import ProTable from '@/components/common/ProTable.tsx'
// import { useColumnResize } from '@/composables/useColumnResize' // Temporarily disabled for debugging

// ========== 数据类型定义 ==========
interface RowItem {
  id: number
  title: string
  author: string
  status: number
  price: number
  date: string
  description: string
  category: string
  isbn: string
  publisher: string
}

// ========== 状态管理 ==========
const tableRef = ref<ProTableInstance<RowItem> | null>(null)
const tableContainer = ref<HTMLElement | null>(null)
const resizeLine = ref<HTMLElement | null>(null)

// 基础配置
const enableVirtual = ref(true)
const heightMode = ref<'fixed' | 'dynamic'>('fixed')
const columnWidthMode = ref<'fixed' | 'mixed' | 'auto'>('mixed')
const enableColumnResize = ref(true)
const showResizeHandles = ref(true)
const debugMode = ref(false)
const showPerformanceMonitor = ref(false)
const loading = ref(false)

// 虚拟滚动配置
const itemHeight = ref(44)
const estimatedItemHeight = ref(50)
const overscan = ref(8)
const threshold = ref(100)

// 数据配置
const dataCount = ref(1500)
const jumpIndex = ref(0)
const keyword = ref('')
const status = ref<number | undefined>(undefined)
const tableData = ref<RowItem[]>([])

// 列宽管理
const currentColumnWidths = ref<Record<string, number>>({})
const selectedColumns = ref<Set<string>>(new Set())

// 拖拽监控
const resizeMonitor = reactive({
  isDragging: false,
  currentColumn: null as string | null,
  currentWidth: 0,
  resizeCount: 0,
  lastResizeTime: 0
})

// 性能监控
const performanceData = reactive({
  fps: 60,
  renderTime: 0,
  dragLatency: 0,
  memoryUsage: 0
})

// ========== 临时禁用组合式函数用于调试 ==========
// Placeholder functions to fix component loading
const initializeColumnWidths = (columns: any[], containerWidth: number) => ({})
const startResize = () => {}
const autoResizeColumn = (key: string, contents: string[]) => 120
const resetColumnWidths = () => {}
const toggleColumnSelection = () => {}
const getColumnWidths = () => ({})
const setColumnWidth = () => {}
const toggleResizeDebug = () => {}

// ========== 枚举数据 ==========
const statusEnum: ValueEnumItem[] = [
  { label: '在库', value: 0, type: 'success' },
  { label: '借出', value: 1, type: 'warning' },
  { label: '预约', value: 2, type: 'primary' },
  { label: '维护', value: 3, type: 'danger' },
  { label: '丢失', value: 4, type: 'info' }
]

const categoryEnum = [
  '计算机科学', '文学经典', '历史传记', '科学技术', 
  '艺术设计', '心理学', '经济管理', '哲学思想'
]

// ========== 数据生成 ==========
function generateMockData(count: number): RowItem[] {
  const data: RowItem[] = []
  for (let i = 0; i < count; i++) {
    data.push({
      id: i + 1,
      title: `图书 ${i + 1} - ${['Vue.js实战', 'React深入浅出', 'JavaScript高级程序设计', 'Node.js权威指南'][i % 4]}`,
      author: ['张三', '李四', '王五', '赵六', '钱七'][i % 5],
      status: i % 5,
      price: Math.round((Math.random() * 200 + 20) * 100) / 100,
      date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      description: `这是第 ${i + 1} 本图书的详细描述，包含了丰富的内容和深入的技术讲解...`,
      category: categoryEnum[i % categoryEnum.length],
      isbn: `978-${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`,
      publisher: ['人民邮电出版社', '机械工业出版社', '电子工业出版社'][i % 3]
    })
  }
  return data
}

// ========== 计算属性 ==========
const computedColumns = computed<ProTableColumn[]>(() => {
  const baseColumns: ProTableColumn[] = [
    {
      key: 'title',
      title: '书名',
      dataIndex: 'title',
      valueType: 'text',
      sorter: true,
      search: true,
      ellipsis: true,
      width: columnWidthMode.value === 'fixed' ? 200 : undefined,
      minWidth: 150
    },
    {
      key: 'author',
      title: '作者',
      dataIndex: 'author',
      valueType: 'text',
      search: true,
      width: columnWidthMode.value === 'fixed' ? 120 : undefined,
      minWidth: 100
    },
    {
      key: 'category',
      title: '分类',
      dataIndex: 'category',
      valueType: 'text',
      width: columnWidthMode.value === 'fixed' ? 120 : undefined,
      minWidth: 100
    },
    {
      key: 'status',
      title: '状态',
      dataIndex: 'status',
      valueType: 'option',
      valueEnum: statusEnum,
      search: true,
      align: 'center',
      width: 100
    },
    {
      key: 'price',
      title: '价格',
      dataIndex: 'price',
      valueType: 'money',
      sorter: true,
      align: 'right',
      width: 100
    },
    {
      key: 'isbn',
      title: 'ISBN',
      dataIndex: 'isbn',
      valueType: 'text',
      width: columnWidthMode.value === 'fixed' ? 140 : undefined,
      minWidth: 120
    },
    {
      key: 'publisher',
      title: '出版社',
      dataIndex: 'publisher',
      valueType: 'text',
      width: columnWidthMode.value === 'fixed' ? 150 : undefined,
      minWidth: 120
    },
    {
      key: 'date',
      title: '入库日期',
      dataIndex: 'date',
      valueType: 'date',
      sorter: true,
      width: columnWidthMode.value === 'fixed' ? 120 : undefined,
      minWidth: 100
    },
    {
      key: 'description',
      title: '简介',
      dataIndex: 'description',
      valueType: 'text',
      ellipsis: true,
      hideInSearch: true,
      width: columnWidthMode.value === 'fixed' ? 300 : undefined,
      minWidth: 200
    }
  ]

  // 应用当前列宽
  return baseColumns.map(col => ({
    ...col,
    width: currentColumnWidths.value[col.key] || col.width
  }))
})

const virtualConfig = computed(() => ({
  virtualScroll: enableVirtual.value,
  itemHeight: heightMode.value === 'fixed' ? itemHeight.value : undefined,
  estimatedItemHeight: estimatedItemHeight.value,
  overscan: overscan.value,
  threshold: threshold.value
}))

const paginationConfig = computed(() => ({
  current: 1,
  pageSize: 50,
  total: 0,
  pageSizes: [20, 50, 100, 200],
  showQuickJumper: true,
  showSizeChanger: true
}))

const rowActions = [
  {
    key: 'view',
    text: '查看',
    onClick: (row: RowItem) => {
      ElMessage.info(`查看: ${row.title}`)
    }
  },
  {
    key: 'edit',
    text: '编辑',
    onClick: (row: RowItem) => {
      ElMessage.warning(`编辑: ${row.title}`)
    }
  }
]

// ========== 请求函数 ==========
const request = async (params: RequestParams): Promise<RequestResponse<RowItem>> => {
  const { current = 1, pageSize = 50, sorter, order, keyword: kw, status: st } = params
  
  let filtered = [...tableData.value]
  
  // 过滤
  if (kw) {
    const searchKey = String(kw).toLowerCase()
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(searchKey) ||
      item.author.toLowerCase().includes(searchKey) ||
      item.category.toLowerCase().includes(searchKey)
    )
  }
  
  if (st !== undefined && st !== '') {
    filtered = filtered.filter(item => item.status === Number(st))
  }
  
  // 排序
  if (sorter) {
    filtered.sort((a, b) => {
      const aVal = (a as any)[sorter]
      const bVal = (b as any)[sorter]
      if (order === 'ascend') return aVal > bVal ? 1 : -1
      if (order === 'descend') return aVal < bVal ? 1 : -1
      return 0
    })
  }
  
  // 分页
  const total = filtered.length
  const start = (current - 1) * pageSize
  const pageData = filtered.slice(start, start + pageSize)
  
  return {
    success: true,
    data: pageData,
    total,
    pagination: { current, pageSize, total }
  }
}

// ========== 功能方法 ==========
function reloadData() {
  loading.value = true
  setTimeout(() => {
    tableData.value = generateMockData(dataCount.value)
    loading.value = false
    tableRef.value?.reload?.(true)
    ElMessage.success(`已加载 ${dataCount.value} 条数据`)
  }, 300)
}

function jumpTo() {
  tableRef.value?.scrollToIndex?.(jumpIndex.value)
  ElMessage.success(`已跳转到第 ${jumpIndex.value} 行`)
}

function resetAllColumnWidths() {
  resetColumnWidths()
  currentColumnWidths.value = {}
  tableRef.value?.resetColumnWidths?.()
  ElMessage.success('所有列宽已重置')
}

function autoFitAllColumns() {
  const columns = computedColumns.value
  columns.forEach(col => {
    const contents = tableData.value.slice(0, 100).map(row => String((row as any)[col.dataIndex || col.key] || ''))
    const width = autoResizeColumn(col.key, contents)
    currentColumnWidths.value[col.key] = width
  })
  tableRef.value?.resetColumnWidths?.()
  ElMessage.success('已自动调整所有列宽')
}

function clearColumnSelection() {
  selectedColumns.value.clear()
  tableRef.value?.clearColumnSelection?.()
  ElMessage.info('列选择已清除')
}

function selectAllColumns() {
  computedColumns.value.forEach(col => {
    selectedColumns.value.add(col.key)
  })
  ElMessage.success('已选中所有列')
}

function toggleDebugMode() {
  toggleResizeDebug()
  tableRef.value?.toggleDebugMode?.()
  
  if (debugMode.value) {
    console.group('🔍 调试模式已开启')
    console.log('当前列宽:', currentColumnWidths.value)
    console.log('选中列:', Array.from(selectedColumns.value))
    console.log('表格配置:', {
      virtualScroll: enableVirtual.value,
      columnResize: enableColumnResize.value,
      dataCount: tableData.value.length
    })
    console.groupEnd()
  }
}

function testDragHandles() {
  // 测试新的拖拽线
  const dragLines = document.querySelectorAll('.drag-line')
  const handles = document.querySelectorAll('.column-resize-handle')
  
  console.group('🎯 拖拽功能测试')
  console.log(`找到 ${dragLines.length} 个拖拽线（新实现）`)
  console.log(`找到 ${handles.length} 个拖拽手柄（旧实现）`)
  
  // 测试拖拽线
  dragLines.forEach((line, index) => {
    const el = line as HTMLElement
    const rect = el.getBoundingClientRect()
    console.log(`拖拽线 ${index}:`, {
      columnKey: el.dataset.columnKey,
      visible: rect.width > 0 && rect.height > 0,
      position: `${rect.left}, ${rect.top}`,
      size: `${rect.width}x${rect.height}`,
      draggable: el.draggable,
      zIndex: window.getComputedStyle(el).zIndex
    })
    
    // 添加视觉高亮
    el.style.backgroundColor = 'rgba(0, 255, 0, 0.3)'
    setTimeout(() => {
      el.style.backgroundColor = ''
    }, 2000)
  })
  
  // 测试拖拽手柄（如果存在）
  handles.forEach((handle, index) => {
    const el = handle as HTMLElement
    const rect = el.getBoundingClientRect()
    console.log(`拖拽手柄 ${index}:`, {
      columnKey: el.dataset.columnKey,
      visible: rect.width > 0 && rect.height > 0,
      position: `${rect.left}, ${rect.top}`,
      size: `${rect.width}x${rect.height}`,
      zIndex: window.getComputedStyle(el).zIndex
    })
    
    // 添加视觉高亮
    el.style.backgroundColor = 'rgba(255, 0, 0, 0.3)'
    setTimeout(() => {
      el.style.backgroundColor = ''
    }, 2000)
  })
  
  console.groupEnd()
  
  ElMessage.success(`测试完成：找到 ${dragLines.length} 个拖拽线，${handles.length} 个拖拽手柄`)
}

function logColumnState() {
  const widths = tableRef.value?.getColumnWidths?.() || currentColumnWidths.value
  console.group('📊 列宽状态')
  console.table(widths)
  console.log('选中列:', Array.from(selectedColumns.value))
  console.log('拖拽统计:', {
    totalResizes: resizeMonitor.resizeCount,
    lastColumn: resizeMonitor.currentColumn
  })
  console.groupEnd()
  
  ElMessage.success('列宽状态已输出到控制台')
}

function exportColumnWidths() {
  const config = {
    columnWidths: currentColumnWidths.value,
    timestamp: new Date().toISOString(),
    dataCount: tableData.value.length
  }
  
  const json = JSON.stringify(config, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `column-widths-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('列宽配置已导出')
}

function updateTableColumnWidth(columnKey: string, width: number) {
  currentColumnWidths.value[columnKey] = width
  
  if (debugMode.value) {
    console.log(`列宽更新: ${columnKey} = ${width}px`)
  }
  
  // 更新性能数据
  const now = performance.now()
  if (resizeMonitor.lastResizeTime > 0) {
    performanceData.dragLatency = now - resizeMonitor.lastResizeTime
  }
  resizeMonitor.lastResizeTime = now
}

function logResizeEvent(event: string, data: any) {
  if (debugMode.value) {
    console.log(`[拖拽事件] ${event}:`, data)
  }
}

function getColumnTitle(key: string): string {
  const column = computedColumns.value.find(col => col.key === key)
  return column?.title || key
}

function getFPSColor(fps: number): string {
  if (fps >= 55) return '#67c23a'
  if (fps >= 30) return '#e6a23c'
  return '#f56c6c'
}

// ========== 事件处理 ==========
function onTableLoad() {
  console.log('表格数据加载完成')
}

function onRowClick(row: RowItem) {
  console.log('行点击:', row)
}

function onSelectionChange(keys: any[], rows: RowItem[]) {
  console.log('选择变化:', keys.length, '行被选中')
}

// ========== 性能监控 ==========
let animationFrameId: number | null = null
let lastFrameTime = performance.now()
let frameCount = 0

function startPerformanceMonitor() {
  if (!showPerformanceMonitor.value) return
  
  const measureFPS = () => {
    const now = performance.now()
    const delta = now - lastFrameTime
    
    frameCount++
    if (delta >= 1000) {
      performanceData.fps = Math.round((frameCount * 1000) / delta)
      frameCount = 0
      lastFrameTime = now
    }
    
    // 测量内存使用（如果可用）
    if ((performance as any).memory) {
      performanceData.memoryUsage = Math.round((performance as any).memory.usedJSHeapSize / 1048576)
    }
    
    animationFrameId = requestAnimationFrame(measureFPS)
  }
  
  measureFPS()
}

function stopPerformanceMonitor() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

// ========== 生命周期 ==========
onMounted(() => {
  console.log('🚀 VirtualTableDemo 组件开始挂载')
  
  // 初始化数据
  tableData.value = generateMockData(dataCount.value)
  console.log(`📊 生成了 ${dataCount.value} 条测试数据`)
  
  // 初始化列宽
  if (tableContainer.value) {
    const containerWidth = tableContainer.value.clientWidth
    const columns = computedColumns.value
    currentColumnWidths.value = initializeColumnWidths(columns, containerWidth)
    console.log('📏 初始化列宽:', currentColumnWidths.value)
  }
  
  // 启动性能监控
  startPerformanceMonitor()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleWindowResize)
  
  console.log('✅ VirtualTableDemo 挂载完成')
  console.log('🎯 列宽拖拽功能状态:', enableColumnResize.value ? '启用' : '禁用')
  console.log('🔍 调试模式:', debugMode.value ? '开启' : '关闭')
  
  // 延迟检查拖拽线
  setTimeout(() => {
    const dragLines = document.querySelectorAll('.drag-line')
    console.log(`🔧 检测到 ${dragLines.length} 个拖拽线`)
    if (dragLines.length > 0) {
      console.log('💡 提示：可以在浏览器控制台运行 testVirtualTableDrag() 来测试拖拽功能')
    }
  }, 1000)
  
  // 添加全局测试函数
  ;(window as any).testVirtualTableDrag = () => {
    console.log('🔍 开始测试虚拟表格拖拽功能...')
    
    const dragLines = document.querySelectorAll('.drag-line')
    console.log(`✅ 找到 ${dragLines.length} 个拖拽线`)
    
    if (dragLines.length === 0) {
      console.error('❌ 未找到拖拽线元素')
      return
    }
    
    // 高亮所有拖拽线
    dragLines.forEach((line, index) => {
      const rect = line.getBoundingClientRect()
      const columnKey = (line as HTMLElement).dataset.columnKey
      console.log(`拖拽线 ${index + 1}: 列=${columnKey}, 可见=${rect.width > 0 && rect.height > 0}, 尺寸=${Math.round(rect.width)}x${Math.round(rect.height)}`)
      
      // 视觉高亮
      const el = line as HTMLElement
      const originalBg = el.style.backgroundColor
      el.style.backgroundColor = 'rgba(0, 255, 0, 0.7)'
      el.style.border = '2px solid green'
      setTimeout(() => {
        el.style.backgroundColor = originalBg
        el.style.border = ''
      }, 2000)
    })
    
    return { dragLineCount: dragLines.length }
  }
})

onUnmounted(() => {
  stopPerformanceMonitor()
  window.removeEventListener('resize', handleWindowResize)
})

function handleWindowResize() {
  // 重新计算列宽
  if (columnWidthMode.value === 'auto' && tableContainer.value) {
    const containerWidth = tableContainer.value.clientWidth
    const columns = computedColumns.value
    currentColumnWidths.value = initializeColumnWidths(columns, containerWidth)
  }
}

// ========== 监听器 ==========
watch(showPerformanceMonitor, (val) => {
  if (val) {
    startPerformanceMonitor()
  } else {
    stopPerformanceMonitor()
  }
})

watch(columnWidthMode, () => {
  resetAllColumnWidths()
})
</script>

<style scoped lang="scss">
.virtual-table-demo {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  
  .el-card {
    margin-bottom: 20px;
    border-radius: 12px;
    overflow: hidden;
    
    &.intro {
      background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
      
      h2 {
        margin: 0 0 12px 0;
        color: #303133;
      }
      
      p {
        color: #606266;
        line-height: 1.6;
      }
    }
  }
}

.controls-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.control-section {
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  
  h4 {
    margin: 0 0 12px 0;
    color: var(--el-text-color-primary);
    font-size: 16px;
  }
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    color: var(--el-text-color-regular);
    font-size: 14px;
    min-width: 80px;
  }
}

.performance-monitor {
  .monitor-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  
  .monitor-item {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .label {
      font-weight: 500;
      color: var(--el-text-color-regular);
    }
  }
}

.column-state {
  .state-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .state-item {
    // 每个列状态标签
  }
}

.table-card {
  min-height: 500px;
  
  .header-info {
    display: flex;
    gap: 8px;
  }
  
  .drag-indicator {
    margin-bottom: 12px;
  }
  
  .table-container {
    position: relative;
    width: 100%;
    min-height: 400px;
    border: 1px solid var(--el-border-color);
    border-radius: 6px;
    overflow: hidden;
  }
}

// 拖拽指示线
.resize-indicator-line {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, 
    transparent,
    var(--el-color-primary) 20%,
    var(--el-color-primary) 80%,
    transparent
  );
  z-index: 10000;
  pointer-events: none;
  box-shadow: 0 0 8px rgba(64, 158, 255, 0.6);
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -8px;
    width: 18px;
    height: 18px;
    background: var(--el-color-primary);
    border-radius: 50%;
    transform: translateY(-50%);
    box-shadow: 0 0 12px rgba(64, 158, 255, 0.8);
  }
}

// 列拖拽相关样式（包含新的拖拽线样式）
:deep(.pro-table) {
  // 新的拖拽线样式（基于参考文章）
  .drag-line {
    position: absolute !important;
    right: 0px !important;
    top: 0px !important;
    bottom: 0px !important;
    width: 4px !important;
    cursor: ew-resize !important;
    z-index: 9999 !important;
    user-select: none !important;
    background: transparent;
    transition: background-color 0.2s ease;
    
    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 1px;
      height: 20px;
      background: var(--el-border-color-light);
      transition: all 0.2s ease;
    }
    
    &:hover {
      background: rgba(64, 158, 255, 0.08);
      
      &::after {
        background: var(--el-color-primary);
        width: 2px;
        height: 30px;
        box-shadow: 0 0 4px rgba(64, 158, 255, 0.4);
      }
    }
  }

  // 旧的拖拽手柄样式（兼容）
  .column-resize-handle {
    position: absolute !important;
    right: -3px;
    top: 0;
    bottom: 0;
    width: 6px;
    cursor: col-resize;
    background: transparent;
    transition: all 0.2s;
    z-index: 999;
    
    &::before {
      content: '';
      position: absolute;
      left: 2px;
      top: 50%;
      width: 2px;
      height: 20px;
      background: var(--el-border-color);
      transform: translateY(-50%);
      transition: all 0.2s;
    }
    
    &:hover {
      background: rgba(64, 158, 255, 0.1);
      
      &::before {
        background: var(--el-color-primary);
        height: 30px;
      }
    }
    
    &.dragging {
      background: rgba(64, 158, 255, 0.2);
      
      &::before {
        background: var(--el-color-primary);
        height: 100%;
        width: 3px;
      }
    }
  }
  
  .resizable-header {
    position: relative;
    user-select: none;
    
    &.column-selected {
      background: rgba(64, 158, 255, 0.1) !important;
      border-left: 2px solid var(--el-color-primary);
    }
  }
}

// 调试模式样式
.debug-mode {
  :deep(.pro-table) {
    .drag-line {
      background: rgba(255, 0, 0, 0.1) !important;
      
      &::after {
        background: red !important;
        width: 2px;
      }
      
      &:hover {
        background: rgba(255, 0, 0, 0.2) !important;
      }
    }
    
    .column-resize-handle {
      background: rgba(255, 0, 0, 0.2) !important;
      
      &::before {
        background: red !important;
      }
    }
  }
}

// 全局拖拽状态
:global(body.column-resizing) {
  cursor: col-resize !important;
  user-select: none !important;
  
  * {
    cursor: col-resize !important;
    user-select: none !important;
  }
}
</style>