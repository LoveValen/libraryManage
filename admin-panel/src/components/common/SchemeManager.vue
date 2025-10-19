<template>
  <div class="scheme-manager">
    <div class="manager-header">
      <el-tabs v-model="activeTab" class="scheme-tabs">
        <el-tab-pane label="我的方案" name="my-schemes">
          <div class="schemes-list">
            <div v-if="schemes.length === 0" class="empty-state">
              <el-empty description="暂无保存的筛选方案">
                <el-button type="primary" @click="handleSaveNew">
                  <el-icon><Plus /></el-icon>
                  保存当前方案
                </el-button>
              </el-empty>
            </div>
            
            <div v-else class="scheme-items">
              <div
                v-for="scheme in schemes"
                :key="scheme.id"
                class="scheme-item"
                :class="{ 'is-active': selectedScheme?.id === scheme.id }"
                @click="selectScheme(scheme)"
              >
                <div class="scheme-content">
                  <div class="scheme-header">
                    <h4 class="scheme-name">{{ scheme.name }}</h4>
                    <div class="scheme-actions">
                      <el-tooltip content="应用方案">
                        <el-button 
                          type="primary" 
                          text 
                          size="small"
                          :icon="Check"
                          @click.stop="handleLoad(scheme)"
                        />
                      </el-tooltip>
                      <el-tooltip content="编辑方案">
                        <el-button 
                          type="info" 
                          text 
                          size="small"
                          :icon="Edit"
                          @click.stop="handleEdit(scheme)"
                        />
                      </el-tooltip>
                      <el-tooltip content="删除方案">
                        <el-button 
                          type="danger" 
                          text 
                          size="small"
                          :icon="Delete"
                          @click.stop="handleDelete(scheme)"
                        />
                      </el-tooltip>
                    </div>
                  </div>
                  
                  <div class="scheme-meta">
                    <span class="meta-item">
                      <el-icon><Calendar /></el-icon>
                      {{ formatDate(scheme.createdAt) }}
                    </span>
                    <span class="meta-item">
                      <el-icon><Filter /></el-icon>
                      {{ getFilterCount(scheme.data) }} 个筛选条件
                    </span>
                  </div>
                  
                  <div v-if="scheme.description" class="scheme-description">
                    {{ scheme.description }}
                  </div>
                  
                  <div class="scheme-preview">
                    <el-tag
                      v-for="(value, key) in getPreviewFilters(scheme.data)"
                      :key="key"
                      size="small"
                      type="info"
                      class="preview-tag"
                    >
                      {{ key }}: {{ value }}
                    </el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="新建方案" name="new-scheme">
          <div class="new-scheme-form">
            <el-form
              ref="schemeFormRef"
              :model="schemeForm"
              :rules="schemeRules"
              label-width="80px"
            >
              <el-form-item label="方案名称" prop="name">
                <el-input
                  v-model="schemeForm.name"
                  placeholder="请输入方案名称"
                  maxlength="20"
                  show-word-limit
                />
              </el-form-item>
              
              <el-form-item label="方案描述" prop="description">
                <el-input
                  v-model="schemeForm.description"
                  type="textarea"
                  placeholder="请输入方案描述（可选）"
                  :rows="3"
                  maxlength="100"
                  show-word-limit
                />
              </el-form-item>
              
              <el-form-item label="筛选条件">
                <div class="current-filters">
                  <div v-if="currentFilterCount === 0" class="no-filters">
                    <el-text type="info">当前没有筛选条件</el-text>
                  </div>
                  <div v-else class="filter-preview">
                    <el-tag
                      v-for="(value, key) in currentFilters"
                      :key="key"
                      type="primary"
                      size="small"
                      class="filter-tag"
                    >
                      {{ key }}: {{ value }}
                    </el-tag>
                  </div>
                </div>
              </el-form-item>
              
              <el-form-item label="高级选项">
                <el-checkbox-group v-model="schemeForm.options">
                  <el-checkbox value="setAsDefault">设为默认方案</el-checkbox>
                  <el-checkbox value="autoApply">自动应用</el-checkbox>
                  <el-checkbox value="shareWithTeam">团队共享</el-checkbox>
                </el-checkbox-group>
              </el-form-item>
            </el-form>
            
            <div class="form-actions">
              <el-button @click="resetSchemeForm">重置</el-button>
              <el-button 
                type="primary" 
                :disabled="currentFilterCount === 0"
                @click="handleSaveScheme"
              >
                <el-icon><DocumentAdd /></el-icon>
                保存方案
              </el-button>
            </div>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="导入导出" name="import-export">
          <div class="import-export-section">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-card shadow="never" class="action-card">
                  <template #header>
                    <div class="card-header">
                      <el-icon><Upload /></el-icon>
                      <span>导入方案</span>
                    </div>
                  </template>
                  
                  <div class="card-content">
                    <p>从文件导入筛选方案</p>
                    <el-upload
                      ref="uploadRef"
                      :auto-upload="false"
                      :show-file-list="false"
                      accept=".json"
                      @change="handleImportFile"
                    >
                      <el-button type="primary">
                        <el-icon><FolderOpened /></el-icon>
                        选择文件
                      </el-button>
                    </el-upload>
                  </div>
                </el-card>
              </el-col>
              
              <el-col :span="12">
                <el-card shadow="never" class="action-card">
                  <template #header>
                    <div class="card-header">
                      <el-icon><Download /></el-icon>
                      <span>导出方案</span>
                    </div>
                  </template>
                  
                  <div class="card-content">
                    <p>导出所有筛选方案到文件</p>
                    <el-button 
                      type="primary"
                      :disabled="schemes.length === 0"
                      @click="handleExportSchemes"
                    >
                      <el-icon><DocumentCopy /></el-icon>
                      导出方案
                    </el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>
            
            <div class="bulk-actions">
              <el-divider>批量操作</el-divider>
              <div class="bulk-buttons">
                <el-button 
                  type="warning"
                  :disabled="schemes.length === 0"
                  @click="handleClearAll"
                >
                  <el-icon><Delete /></el-icon>
                  清空所有方案
                </el-button>
                <el-button 
                  type="info"
                  :disabled="schemes.length === 0"
                  @click="handleResetToDefaults"
                >
                  <el-icon><RefreshRight /></el-icon>
                  恢复默认方案
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { formatDateTime as formatDateTimeUtil } from '@/utils/date'
import { showSuccess, showError, confirm, prompt } from '@/utils/message'
import {
  Plus,
  Check,
  Edit,
  Delete,
  Calendar,
  Filter,
  DocumentAdd,
  Upload,
  Download,
  FolderOpened,
  DocumentCopy,
  RefreshRight
} from '@element-plus/icons-vue'

// Props定义
const props = defineProps({
  schemes: {
    type: Array,
    default: () => []
  },
  currentData: {
    type: Object,
    default: () => ({})
  },
  fields: {
    type: Array,
    default: () => []
  }
})

// 事件定义
const emit = defineEmits(['save', 'load', 'delete', 'close'])

// 响应式数据
const activeTab = ref('my-schemes')
const selectedScheme = ref(null)
const schemeFormRef = ref()
const uploadRef = ref()

const schemeForm = reactive({
  name: '',
  description: '',
  options: []
})

const schemeRules = {
  name: [
    { required: true, message: '请输入方案名称', trigger: 'blur' },
    { min: 1, max: 20, message: '方案名称长度为1-20个字符', trigger: 'blur' }
  ]
}

// 计算属性
const currentFilters = computed(() => {
  const filters = {}
  const data = props.currentData || {}
  
  props.fields.forEach(field => {
    const value = data[field.key]
    if (value !== undefined && value !== null && value !== '' && 
        !(Array.isArray(value) && value.length === 0)) {
      
      let displayValue = value
      
      // 处理选择器显示值
      if (field.type === 'select' && field.options) {
        if (Array.isArray(value)) {
          displayValue = value
            .map(v => {
              const option = field.options.find(opt => opt.value === v)
              return option ? option.label : v
            })
            .join(', ')
        } else {
          const option = field.options.find(opt => opt.value === value)
          displayValue = option ? option.label : value
        }
      }
      
      // 处理日期范围
      if (field.type === 'date' && Array.isArray(value)) {
        displayValue = `${value[0]} 至 ${value[1]}`
      }
      
      filters[field.label] = displayValue
    }
  })
  
  return filters
})

const currentFilterCount = computed(() => {
  return Object.keys(currentFilters.value).length
})

// 工具方法
const formatDate = (dateString) => {
  const formatted = formatDateTimeUtil(dateString)
  return formatted || '未知时间'
})
  } catch {
    return '未知时间'
  }
}

const getFilterCount = (data) => {
  if (!data || typeof data !== 'object') return 0
  return Object.keys(data).filter(key => {
    const value = data[key]
    return value !== undefined && value !== null && value !== '' && 
           !(Array.isArray(value) && value.length === 0)
  }).length
}

const getPreviewFilters = (data, limit = 3) => {
  if (!data || typeof data !== 'object') return {}
  
  const filters = {}
  const keys = Object.keys(data).slice(0, limit)
  
  keys.forEach(key => {
    const value = data[key]
    if (value !== undefined && value !== null && value !== '') {
      // 简化显示值
      if (Array.isArray(value)) {
        filters[key] = value.length > 1 ? `${value[0]} 等${value.length}项` : value[0]
      } else if (typeof value === 'string' && value.length > 10) {
        filters[key] = value.substring(0, 10) + '...'
      } else {
        filters[key] = value
      }
    }
  })
  
  return filters
}

// 事件处理
const selectScheme = (scheme) => {
  selectedScheme.value = selectedScheme.value?.id === scheme.id ? null : scheme
}

const handleLoad = (scheme) => {
  emit('load', scheme)
  ElMessage.success(`已应用方案"${scheme.name}"`)
}

const handleEdit = async (scheme) => {
  try {
    const { value: newName } = await ElMessageBox.prompt(
      '请输入新的方案名称',
      '编辑方案',
      {
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputValue: scheme.name,
        inputPattern: /^.{1,20}$/,
        inputErrorMessage: '方案名称长度为1-20个字符'
      }
    )
    
    const updatedScheme = {
      ...scheme,
      name: newName,
      updatedAt: new Date().toISOString()
    }
    
    emit('save', updatedScheme)
    ElMessage.success('方案更新成功')
  } catch {
    // 用户取消操作
  }
}

const handleDelete = async (scheme) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除方案"${scheme.name}"吗？此操作不可撤销！`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    emit('delete', scheme)
    ElMessage.success('方案删除成功')
    
    // 如果删除的是当前选中的方案，清除选中状态
    if (selectedScheme.value?.id === scheme.id) {
      selectedScheme.value = null
    }
  } catch {
    // 用户取消操作
  }
}

const handleSaveNew = () => {
  activeTab.value = 'new-scheme'
}

const handleSaveScheme = async () => {
  try {
    const valid = await schemeFormRef.value.validate()
    if (!valid) return
    
    const scheme = {
      id: Date.now().toString(),
      name: schemeForm.name,
      description: schemeForm.description,
      data: { ...props.currentData },
      options: schemeForm.options,
      createdAt: new Date().toISOString()
    }
    
    emit('save', scheme)
    ElMessage.success('方案保存成功')
    
    // 重置表单并切换到方案列表
    resetSchemeForm()
    activeTab.value = 'my-schemes'
  } catch (error) {
    console.error('保存方案失败:', error)
    ElMessage.error('保存方案失败')
  }
}

const resetSchemeForm = () => {
  schemeForm.name = ''
  schemeForm.description = ''
  schemeForm.options = []
  schemeFormRef.value?.clearValidate()
}

const handleImportFile = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const schemes = JSON.parse(e.target.result)
      if (!Array.isArray(schemes)) {
        throw new Error('Invalid file format')
      }
      
      // 验证数据格式
      const validSchemes = schemes.filter(scheme => 
        scheme.id && scheme.name && scheme.data
      )
      
      if (validSchemes.length === 0) {
        throw new Error('No valid schemes found')
      }
      
      // 导入方案（添加时间戳避免ID冲突）
      validSchemes.forEach(scheme => {
        const importedScheme = {
          ...scheme,
          id: `${scheme.id}_${Date.now()}`,
          importedAt: new Date().toISOString()
        }
        emit('save', importedScheme)
      })
      
      ElMessage.success(`成功导入 ${validSchemes.length} 个方案`)
    } catch (error) {
      console.error('导入失败:', error)
      ElMessage.error('文件格式错误或数据无效')
    }
  }
  reader.readAsText(file.raw)
}

const handleExportSchemes = () => {
  try {
    const exportData = props.schemes.map(scheme => ({
      ...scheme,
      exportedAt: new Date().toISOString()
    }))
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `filter-schemes-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    
    URL.revokeObjectURL(url)
    ElMessage.success('方案导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const handleClearAll = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有方案吗？此操作不可撤销！',
      '清空确认',
      {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    props.schemes.forEach(scheme => emit('delete', scheme))
    ElMessage.success('所有方案已清空')
  } catch {
    // 用户取消操作
  }
}

const handleResetToDefaults = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复到默认方案吗？这将清空所有自定义方案！',
      '恢复默认',
      {
        confirmButtonText: '恢复',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 这里可以添加默认方案的逻辑
    ElMessage.success('已恢复默认方案')
  } catch {
    // 用户取消操作
  }
}
</script>

<style lang="scss" scoped>
.scheme-manager {
  // 统一的设计令牌系统
  --scheme-bg: #ffffff;
  --scheme-border: #e5e7eb;
  --scheme-border-hover: #d1d5db;
  --scheme-border-active: #0ea5e9;
  --scheme-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --scheme-shadow-hover: 0 4px 12px rgba(14, 165, 233, 0.15);
  --scheme-shadow-active: 0 6px 20px rgba(14, 165, 233, 0.2);
  --scheme-radius: 8px;
  --scheme-radius-lg: 12px;
  --scheme-spacing: 16px;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #0ea5e9;
  --primary-600: #0284c7;
  
  // 动画和过渡
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 250ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 350ms cubic-bezier(0.4, 0, 0.2, 1);
  --spring-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  
  background: var(--scheme-bg);
  border-radius: var(--scheme-radius-lg);
  overflow: hidden;
  
  .manager-header {
    position: relative;
    
    // 头部的渐变背景
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: linear-gradient(135deg, 
        var(--primary-50), 
        rgba(239, 246, 255, 0.3));
      z-index: 0;
    }
    
    .scheme-tabs {
      position: relative;
      z-index: 1;
      
      :deep(.el-tabs__header) {
        margin: 0;
        background: transparent;
        
        .el-tabs__nav-wrap {
          &::after {
            display: none; // 移除默认的底部边框
          }
        }
        
        .el-tabs__item {
          padding: 20px 20px;
          font-weight: 600;
          color: var(--text-secondary);
          transition: all var(--transition-normal);
          position: relative;
          
          // 标签项的背景效果
          &::before {
            content: '';
            position: absolute;
            inset: 8px;
            border-radius: var(--scheme-radius);
            background: rgba(255, 255, 255, 0.6);
            opacity: 0;
            transition: all var(--transition-normal);
            z-index: -1;
          }
          
          &:hover {
            color: var(--primary-500);
            
            &::before {
              opacity: 1;
              background: rgba(255, 255, 255, 0.8);
            }
          }
          
          &.is-active {
            color: var(--primary-600);
            background: transparent;
            
            &::before {
              opacity: 1;
              background: rgba(255, 255, 255, 0.9);
              box-shadow: var(--scheme-shadow);
            }
            
            // 活跃指示器
            &::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 50%;
              transform: translateX(-50%);
              width: 32px;
              height: 3px;
              background: linear-gradient(90deg, var(--primary-500), var(--primary-600));
              border-radius: 2px;
            }
          }
        }
      }
      
      :deep(.el-tabs__content) {
        padding: var(--scheme-spacing);
        background: var(--scheme-bg);
      }
    }
  }
  
  .schemes-list {
    .empty-state {
      padding: 60px 0;
      text-align: center;
      
      // 空状态的美化
      :deep(.el-empty) {
        .el-empty__image {
          svg {
            width: 120px;
            height: 120px;
          }
        }
        
        .el-empty__description {
          color: var(--text-secondary);
          font-size: 16px;
          margin: 20px 0;
        }
        
        .el-button {
          border-radius: var(--scheme-radius);
          padding: 12px 20px;
          font-weight: 600;
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          border: none;
          box-shadow: var(--scheme-shadow);
          transition: all var(--transition-normal);
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: var(--scheme-shadow-hover);
          }
        }
      }
    }
    
    .scheme-items {
      display: grid;
      gap: var(--scheme-spacing);
      
      .scheme-item {
        border: 1px solid var(--scheme-border);
        border-radius: var(--scheme-radius);
        padding: 20px;
        cursor: pointer;
        transition: all var(--transition-normal);
        background: var(--scheme-bg);
        position: relative;
        overflow: hidden;
        
        // 卡片的微妙背景效果
        &::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.8), 
            rgba(255, 255, 255, 0.4));
          opacity: 0;
          transition: opacity var(--transition-fast);
          pointer-events: none;
        }
        
        &:hover {
          border-color: var(--scheme-border-active);
          box-shadow: var(--scheme-shadow-hover);
          transform: translateY(-2px);
          
          &::before {
            opacity: 1;
          }
        }
        
        &.is-active {
          border-color: var(--scheme-border-active);
          background: var(--primary-50);
          box-shadow: var(--scheme-shadow-active);
          
          &::before {
            opacity: 1;
            background: linear-gradient(135deg, 
              rgba(14, 165, 233, 0.05), 
              rgba(14, 165, 233, 0.02));
          }
          
          // 选中状态指示器
          &::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 0 20px 20px 0;
            border-color: transparent var(--primary-500) transparent transparent;
          }
        }
        
        .scheme-content {
          position: relative;
          z-index: 1;
          
          .scheme-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 12px;
            
            .scheme-name {
              margin: 0;
              font-size: 18px;
              font-weight: 700;
              color: var(--text-primary);
              line-height: 1.3;
              transition: color var(--transition-normal);
            }
            
            .scheme-actions {
              display: flex;
              gap: 6px;
              opacity: 0;
              transition: all var(--transition-normal) var(--spring-bounce);
              transform: translateX(8px);
              
              .el-button {
                border-radius: 6px;
                padding: 6px;
                transition: all var(--transition-fast);
                
                &:hover {
                  transform: scale(1.1);
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }
                
                &.el-button--primary {
                  background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
                  border: none;
                }
              }
            }
          }
          
          .scheme-meta {
            display: flex;
            gap: 20px;
            margin-bottom: 12px;
            
            .meta-item {
              display: flex;
              align-items: center;
              gap: 6px;
              font-size: 13px;
              color: var(--text-secondary);
              font-weight: 500;
              transition: color var(--transition-fast);
              
              .el-icon {
                font-size: 16px;
                color: var(--text-tertiary);
                transition: all var(--transition-fast);
              }
              
              &:hover {
                color: var(--primary-500);
                
                .el-icon {
                  color: var(--primary-500);
                  transform: scale(1.1);
                }
              }
            }
          }
          
          .scheme-description {
            font-size: 14px;
            color: var(--text-secondary);
            margin-bottom: 12px;
            line-height: 1.5;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 6px;
            border-left: 3px solid var(--primary-500);
            transition: all var(--transition-normal);
            
            &:hover {
              background: rgba(255, 255, 255, 0.8);
              transform: translateX(2px);
            }
          }
          
          .scheme-preview {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            
            .preview-tag {
              max-width: 180px;
              border-radius: 6px;
              font-size: 12px;
              font-weight: 500;
              padding: 4px 8px;
              background: linear-gradient(135deg, var(--primary-100), var(--primary-50));
              border: 1px solid var(--primary-500);
              color: var(--primary-600);
              transition: all var(--transition-fast);
              
              &:hover {
                transform: translateY(-1px) scale(1.02);
                box-shadow: 0 2px 6px rgba(14, 165, 233, 0.2);
                background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
                color: white;
              }
              
              :deep(.el-tag__content) {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              }
            }
          }
        }
        
        &:hover {
          .scheme-actions {
            opacity: 1;
            transform: translateX(0);
          }
          
          .scheme-name {
            color: var(--primary-600);
          }
        }
      }
    }
  }
  
  .new-scheme-form {
    background: var(--scheme-bg);
    border-radius: var(--scheme-radius);
    
    :deep(.el-form) {
      .el-form-item {
        margin-bottom: 20px;
        
        .el-form-item__label {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 14px;
        }
        
        .el-input,
        .el-textarea {
          .el-input__wrapper,
          .el-textarea__inner {
            border-radius: var(--scheme-radius);
            transition: all var(--transition-normal);
            
            &:hover {
              border-color: var(--scheme-border-active);
            }
            
            &.is-focus {
              box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.1);
            }
          }
        }
      }
    }
    
    .current-filters {
      .no-filters {
        padding: 16px;
        text-align: center;
        background: var(--primary-50);
        border-radius: var(--scheme-radius);
        border: 1px dashed var(--scheme-border-active);
      }
      
      .filter-preview {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        padding: 12px;
        background: var(--primary-50);
        border-radius: var(--scheme-radius);
        border: 1px solid var(--primary-100);
        
        .filter-tag {
          max-width: 240px;
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          border: none;
          color: white;
          font-weight: 500;
          transition: all var(--transition-fast);
          
          &:hover {
            transform: translateY(-1px) scale(1.05);
            box-shadow: var(--scheme-shadow-hover);
          }
          
          :deep(.el-tag__content) {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }
    }
    
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid var(--scheme-border);
      position: relative;
      
      // 分割线的渐变效果
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -20px;
        right: -20px;
        height: 1px;
        background: linear-gradient(90deg, 
          transparent, 
          var(--scheme-border), 
          transparent);
      }
      
      .el-button {
        border-radius: var(--scheme-radius);
        padding: 10px 20px;
        font-weight: 600;
        transition: all var(--transition-normal);
        
        &:not(.el-button--primary) {
          background: var(--scheme-bg);
          border: 1px solid var(--scheme-border);
          
          &:hover {
            border-color: var(--scheme-border-active);
            transform: translateY(-1px);
          }
        }
        
        &.el-button--primary {
          background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
          border: none;
          box-shadow: var(--scheme-shadow);
          
          &:hover {
            transform: translateY(-2px);
            box-shadow: var(--scheme-shadow-hover);
          }
          
          &:disabled {
            background: var(--text-tertiary);
            transform: none;
            box-shadow: none;
          }
        }
      }
    }
  }
  
  .import-export-section {
    .action-card {
      border-radius: var(--scheme-radius);
      box-shadow: var(--scheme-shadow);
      transition: all var(--transition-normal);
      overflow: hidden;
      
      &:hover {
        box-shadow: var(--scheme-shadow-hover);
        transform: translateY(-2px);
      }
      
      :deep(.el-card__header) {
        background: linear-gradient(135deg, var(--primary-50), rgba(239, 246, 255, 0.3));
        border-bottom: 1px solid var(--primary-100);
      }
      
      .card-header {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 700;
        color: var(--primary-600);
        
        .el-icon {
          font-size: 20px;
        }
      }
      
      .card-content {
        text-align: center;
        padding: 20px;
        
        p {
          margin-bottom: 20px;
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.5;
        }
        
        .el-button {
          border-radius: var(--scheme-radius);
          padding: 12px 20px;
          font-weight: 600;
          transition: all var(--transition-normal);
          
          &.el-button--primary {
            background: linear-gradient(135deg, var(--primary-500), var(--primary-600));
            border: none;
            box-shadow: var(--scheme-shadow);
            
            &:hover {
              transform: translateY(-2px);
              box-shadow: var(--scheme-shadow-hover);
            }
          }
        }
      }
    }
    
    .bulk-actions {
      margin-top: 32px;
      
      :deep(.el-divider) {
        margin: 20px 0;
        
        .el-divider__text {
          color: var(--text-secondary);
          font-weight: 600;
          background: var(--scheme-bg);
          padding: 0 16px;
        }
      }
      
      .bulk-buttons {
        display: flex;
        justify-content: center;
        gap: 16px;
        
        .el-button {
          border-radius: var(--scheme-radius);
          padding: 10px 20px;
          font-weight: 600;
          transition: all var(--transition-normal);
          
          &:hover {
            transform: translateY(-1px);
          }
          
          &.el-button--warning {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            border: none;
            color: white;
            
            &:hover {
              box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
            }
          }
          
          &.el-button--info {
            background: linear-gradient(135deg, #6b7280, #4b5563);
            border: none;
            color: white;
            
            &:hover {
              box-shadow: 0 4px 12px rgba(107, 114, 128, 0.3);
            }
          }
        }
      }
    }
  }
}

// 暗黑主题支持
@media (prefers-color-scheme: dark) {
  .scheme-manager {
    --scheme-bg: #1f2937;
    --scheme-border: #374151;
    --scheme-border-hover: #4b5563;
    --scheme-border-active: #3b82f6;
    --scheme-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    --scheme-shadow-hover: 0 4px 12px rgba(59, 130, 246, 0.2);
    --scheme-shadow-active: 0 6px 20px rgba(59, 130, 246, 0.25);
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --text-tertiary: #9ca3af;
    --primary-50: rgba(59, 130, 246, 0.05);
    --primary-100: rgba(59, 130, 246, 0.1);
    --primary-500: #3b82f6;
    --primary-600: #2563eb;
    
    .manager-header::before {
      background: linear-gradient(135deg, 
        rgba(59, 130, 246, 0.08), 
        rgba(59, 130, 246, 0.03));
    }
  }
}

// 高对比度支持
@media (prefers-contrast: high) {
  .scheme-manager {
    --scheme-border: #000000;
    --scheme-border-active: #0066cc;
    --text-primary: #000000;
    
    .scheme-item {
      &::before {
        display: none;
      }
    }
  }
}

// 减少动画效果
@media (prefers-reduced-motion: reduce) {
  .scheme-manager {
    --transition-fast: 0ms;
    --transition-normal: 0ms;
    --transition-slow: 0ms;
    
    * {
      animation: none !important;
      transition: none !important;
    }
    
    .scheme-item:hover {
      transform: none !important;
    }
  }
}

// 响应式设计
@media (max-width: 1020px) {
  .scheme-manager {
    .import-export-section {
      .el-row {
        .el-col {
          margin-bottom: 16px;
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .scheme-manager {
    .manager-header {
      .scheme-tabs {
        :deep(.el-tabs__header) {
          .el-tabs__item {
            padding: 16px 20px;
            font-size: 14px;
          }
        }
      }
    }
    
    .schemes-list {
      .scheme-items {
        .scheme-item {
          padding: 16px;
          
          .scheme-content {
            .scheme-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
              
              .scheme-name {
                font-size: 16px;
              }
              
              .scheme-actions {
                margin-top: 0;
                opacity: 1;
                transform: translateX(0);
                width: 100%;
                justify-content: flex-end;
              }
            }
            
            .scheme-meta {
              flex-direction: column;
              gap: 8px;
              
              .meta-item {
                font-size: 12px;
              }
            }
            
            .scheme-description {
              font-size: 13px;
              margin-bottom: 10px;
            }
            
            .scheme-preview {
              gap: 6px;
              
              .preview-tag {
                max-width: 120px;
                font-size: 11px;
                padding: 3px 6px;
              }
            }
          }
        }
      }
    }
    
    .new-scheme-form {
      :deep(.el-form) {
        .el-form-item {
          margin-bottom: 20px;
          
          .el-form-item__label {
            font-size: 13px;
          }
        }
      }
      
      .current-filters {
        .filter-preview {
          gap: 6px;
          
          .filter-tag {
            max-width: 150px;
            font-size: 11px;
          }
        }
      }
      
      .form-actions {
        flex-direction: column;
        gap: 12px;
        
        .el-button {
          width: 100%;
          padding: 12px;
        }
      }
    }
    
    .import-export-section {
      :deep(.el-row) {
        .el-col {
          width: 100%;
          margin-bottom: 16px;
          
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
      
      .action-card {
        .card-content {
          padding: 20px;
          
          .el-button {
            width: 100%;
          }
        }
      }
      
      .bulk-actions {
        margin-top: 20px;
        
        .bulk-buttons {
          flex-direction: column;
          gap: 12px;
          
          .el-button {
            width: 100%;
            padding: 12px;
          }
        }
      }
    }
  }
}

// 超小屏幕优化
@media (max-width: 480px) {
  .scheme-manager {
    :deep(.el-tabs__content) {
      padding: 12px;
    }
    
    .schemes-list {
      .scheme-items {
        .scheme-item {
          padding: 12px;
          
          .scheme-content {
            .scheme-header {
              .scheme-name {
                font-size: 15px;
              }
              
              .scheme-actions {
                gap: 4px;
                
                .el-button {
                  padding: 4px;
                }
              }
            }
          }
        }
      }
    }
    
    .new-scheme-form {
      .current-filters {
        .filter-preview {
          .filter-tag {
            max-width: 100px;
            font-size: 10px;
          }
        }
      }
    }
  }
}

// 触摸设备优化
@media (hover: none) and (pointer: coarse) {
  .scheme-manager {
    .scheme-item {
      .scheme-actions {
        opacity: 1 !important;
        transform: translateX(0) !important;
      }
    }
    
    .action-card .el-button,
    .bulk-buttons .el-button,
    .form-actions .el-button {
      min-height: 44px; // iOS 推荐的最小触摸目标
    }
  }
}
</style>