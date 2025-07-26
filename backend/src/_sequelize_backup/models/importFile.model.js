const { DataTypes } = require('sequelize');

/**
 * 导入文件模型
 * 记录文件上传和导入相关信息
 */
module.exports = (sequelize) => {
  const ImportFile = sequelize.define('ImportFile', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: '导入文件唯一标识符'
    },
    
    originalName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '原始文件名'
    },
    
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '存储文件名'
    },
    
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '文件存储路径'
    },
    
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '文件大小（字节）'
    },
    
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '文件MIME类型'
    },
    
    uploadedBy: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: '上传用户ID'
    },
    
    status: {
      type: DataTypes.ENUM(
        'uploaded',        // 已上传
        'processing',      // 处理中
        'validation_passed', // 验证通过
        'validation_failed', // 验证失败
        'importing',       // 导入中
        'completed',       // 导入完成
        'failed'          // 导入失败
      ),
      defaultValue: 'uploaded',
      allowNull: false,
      comment: '处理状态'
    },
    
    recordCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '记录总数'
    },
    
    metadata: {
      type: DataTypes.JSON,
      comment: '文件元数据信息'
    },
    
    validationResult: {
      type: DataTypes.JSON,
      comment: '验证结果'
    },
    
    importResult: {
      type: DataTypes.JSON,
      comment: '导入结果'
    },
    
    processedAt: {
      type: DataTypes.DATE,
      comment: '处理完成时间'
    },
    
    deletedAt: {
      type: DataTypes.DATE,
      comment: '删除时间'
    }
  }, {
    tableName: 'import_files',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['uploaded_by']
      },
      {
        fields: ['status']
      },
      {
        fields: ['created_at']
      }
    ],
    comment: '导入文件表'
  });

  /**
   * 定义关联关系
   */
  ImportFile.associate = (models) => {
    // 导入文件属于某个用户
    ImportFile.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  };

  /**
   * 实例方法
   */
  
  /**
   * 更新处理状态
   */
  ImportFile.prototype.updateStatus = async function(status, result = null) {
    const updateData = { status };
    
    if (result) {
      if (status.includes('validation')) {
        updateData.validationResult = result;
      } else if (status === 'completed' || status === 'failed') {
        updateData.importResult = result;
        updateData.processedAt = new Date();
      }
    }
    
    return await this.update(updateData);
  };

  /**
   * 获取处理进度
   */
  ImportFile.prototype.getProgress = function() {
    const statusProgress = {
      'uploaded': 20,
      'processing': 40,
      'validation_passed': 60,
      'validation_failed': 30,
      'importing': 80,
      'completed': 100,
      'failed': 0
    };
    
    return statusProgress[this.status] || 0;
  };

  /**
   * 检查是否可以删除
   */
  ImportFile.prototype.canDelete = function() {
    return ['completed', 'failed', 'validation_failed'].includes(this.status);
  };

  /**
   * 获取文件信息摘要
   */
  ImportFile.prototype.getSummary = function() {
    return {
      id: this.id,
      originalName: this.originalName,
      fileSize: this.fileSize,
      recordCount: this.recordCount,
      status: this.status,
      progress: this.getProgress(),
      uploadedAt: this.createdAt,
      processedAt: this.processedAt
    };
  };

  /**
   * 静态方法
   */
  
  /**
   * 清理过期文件
   */
  ImportFile.cleanupExpiredFiles = async function(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const expiredFiles = await this.findAll({
      where: {
        status: ['completed', 'failed'],
        processedAt: {
          [sequelize.Sequelize.Op.lt]: cutoffDate
        }
      }
    });
    
    const fs = require('fs');
    let deletedCount = 0;
    
    for (const file of expiredFiles) {
      try {
        // 删除物理文件
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
        }
        
        // 删除数据库记录
        await file.destroy({ force: true });
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete import file ${file.id}:`, error);
      }
    }
    
    return deletedCount;
  };

  /**
   * 获取用户的导入统计
   */
  ImportFile.getUserImportStats = async function(userId) {
    const stats = await this.findAll({
      where: { uploadedBy: userId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('recordCount')), 'totalRecords']
      ],
      group: ['status'],
      raw: true
    });
    
    const result = {
      total: 0,
      completed: 0,
      failed: 0,
      processing: 0,
      totalRecords: 0
    };
    
    stats.forEach(stat => {
      const count = parseInt(stat.count);
      const records = parseInt(stat.totalRecords) || 0;
      
      result.total += count;
      result.totalRecords += records;
      
      if (stat.status === 'completed') {
        result.completed += count;
      } else if (stat.status === 'failed') {
        result.failed += count;
      } else if (['uploaded', 'processing', 'importing'].includes(stat.status)) {
        result.processing += count;
      }
    });
    
    return result;
  };

  /**
   * 获取系统导入统计
   */
  ImportFile.getSystemImportStats = async function(startDate, endDate) {
    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        [sequelize.Sequelize.Op.between]: [startDate, endDate]
      };
    }
    
    const [totalFiles, completedFiles, totalRecords] = await Promise.all([
      this.count({ where }),
      this.count({ where: { ...where, status: 'completed' } }),
      this.sum('recordCount', { where: { ...where, status: 'completed' } })
    ]);
    
    return {
      totalFiles,
      completedFiles,
      failedFiles: totalFiles - completedFiles,
      totalRecords: totalRecords || 0,
      successRate: totalFiles > 0 ? (completedFiles / totalFiles * 100).toFixed(2) : 0
    };
  };

  return ImportFile;
};