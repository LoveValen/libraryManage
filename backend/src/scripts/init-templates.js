const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');

/**
 * 默认通知模板配置
 */
const defaultTemplates = [
  {
    code: 'borrow_success',
    name: '借阅成功通知',
    type: 'borrow_reminder',
    title: '图书借阅成功',
    content: '您已成功借阅图书《{{bookTitle}}》，借阅记录ID：{{borrowId}}。请按时归还。',
    emailSubject: '图书借阅成功通知',
    emailContent: `
      <h2>借阅成功通知</h2>
      <p>尊敬的读者，</p>
      <p>您已成功借阅图书《<strong>{{bookTitle}}</strong>》。</p>
      <p>借阅记录ID：{{borrowId}}</p>
      <p>请按时归还图书，避免产生逾期费用。</p>
      <p>感谢您使用图书馆服务！</p>
    `,
    smsContent: '您已成功借阅图书《{{bookTitle}}》，请按时归还。',
    pushTitle: '借阅成功',
    pushContent: '图书《{{bookTitle}}》借阅成功',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      email: true,
      sms: false,
      push: true
    },
    variables: [
      { name: 'bookTitle', description: '图书标题', required: true },
      { name: 'borrowId', description: '借阅记录ID', required: true }
    ]
  },
  {
    code: 'borrow_due_reminder',
    name: '图书到期提醒',
    type: 'return_reminder',
    title: '图书即将到期',
    content: '您借阅的图书《{{bookTitle}}》将于{{dueDate}}到期，请及时归还。',
    emailSubject: '图书到期提醒',
    emailContent: `
      <h2>图书到期提醒</h2>
      <p>尊敬的读者，</p>
      <p>您借阅的图书《<strong>{{bookTitle}}</strong>》将于<strong>{{dueDate}}</strong>到期。</p>
      <p>为避免产生逾期费用，请及时归还图书。</p>
      <p>如需续借，请登录系统办理续借手续。</p>
    `,
    smsContent: '您借阅的图书《{{bookTitle}}》将于{{dueDate}}到期，请及时归还。',
    pushTitle: '图书即将到期',
    pushContent: '《{{bookTitle}}》将于{{dueDate}}到期',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      email: true,
      sms: true,
      push: true
    },
    variables: [
      { name: 'bookTitle', description: '图书标题', required: true },
      { name: 'dueDate', description: '到期日期', required: true },
      { name: 'borrowId', description: '借阅记录ID', required: false }
    ]
  },
  {
    code: 'borrow_overdue_warning',
    name: '图书逾期警告',
    type: 'overdue_warning',
    title: '图书已逾期',
    content: '您借阅的图书《{{bookTitle}}》已逾期{{daysOverdue}}天，请立即归还并缴纳逾期费用。',
    emailSubject: '图书逾期警告',
    emailContent: `
      <h2>图书逾期警告</h2>
      <p>尊敬的读者，</p>
      <p>您借阅的图书《<strong>{{bookTitle}}</strong>》已逾期<strong>{{daysOverdue}}</strong>天。</p>
      <p>请立即归还图书并缴纳相应的逾期费用。</p>
      <p>继续逾期可能影响您的信用记录和借阅权限。</p>
    `,
    smsContent: '您借阅的图书《{{bookTitle}}》已逾期{{daysOverdue}}天，请立即归还。',
    pushTitle: '图书已逾期',
    pushContent: '《{{bookTitle}}》已逾期{{daysOverdue}}天',
    priority: 'urgent',
    defaultChannels: {
      inApp: true,
      email: true,
      sms: true,
      push: true
    },
    variables: [
      { name: 'bookTitle', description: '图书标题', required: true },
      { name: 'daysOverdue', description: '逾期天数', required: true },
      { name: 'borrowId', description: '借阅记录ID', required: false }
    ]
  },
  {
    code: 'book_returned_success',
    name: '图书归还成功',
    type: 'system',
    title: '图书归还成功',
    content: '您已成功归还图书《{{bookTitle}}》，感谢您的配合。',
    emailSubject: '图书归还确认',
    emailContent: `
      <h2>图书归还确认</h2>
      <p>尊敬的读者，</p>
      <p>您已成功归还图书《<strong>{{bookTitle}}</strong>》。</p>
      <p>感谢您按时归还图书，期待您下次光临！</p>
    `,
    smsContent: '您已成功归还图书《{{bookTitle}}》。',
    pushTitle: '归还成功',
    pushContent: '图书《{{bookTitle}}》归还成功',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      email: false,
      sms: false,
      push: true
    },
    variables: [
      { name: 'bookTitle', description: '图书标题', required: true },
      { name: 'borrowId', description: '借阅记录ID', required: false }
    ]
  },
  {
    code: 'review_published',
    name: '书评发布成功',
    type: 'review_reply',
    title: '书评发布成功',
    content: '您对图书《{{bookTitle}}》的书评已发布成功，感谢您的分享。',
    priority: 'low',
    defaultChannels: {
      inApp: true,
      email: false,
      sms: false,
      push: false
    },
    variables: [
      { name: 'bookTitle', description: '图书标题', required: true },
      { name: 'reviewerName', description: '评论者姓名', required: false },
      { name: 'reviewId', description: '书评ID', required: false }
    ]
  },
  {
    code: 'points_awarded',
    name: '积分奖励通知',
    type: 'points_change',
    title: '积分奖励',
    content: '恭喜您获得{{points}}积分奖励！原因：{{reason}}',
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      email: false,
      sms: false,
      push: true
    },
    variables: [
      { name: 'points', description: '获得的积分', required: true },
      { name: 'reason', description: '获得积分的原因', required: true }
    ]
  },
  {
    code: 'book_available',
    name: '图书可借通知',
    type: 'book_available',
    title: '预约图书可借',
    content: '您预约的图书《{{bookTitle}}》现已可借，请在{{deadline}}前完成借阅。',
    emailSubject: '预约图书可借通知',
    emailContent: `
      <h2>预约图书可借通知</h2>
      <p>尊敬的读者，</p>
      <p>您预约的图书《<strong>{{bookTitle}}</strong>》现已可借。</p>
      <p>请在<strong>{{deadline}}</strong>前完成借阅，逾期预约将自动取消。</p>
    `,
    smsContent: '您预约的图书《{{bookTitle}}》现已可借，请在{{deadline}}前完成借阅。',
    pushTitle: '预约图书可借',
    pushContent: '《{{bookTitle}}》现已可借',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      email: true,
      sms: true,
      push: true
    },
    variables: [
      { name: 'bookTitle', description: '图书标题', required: true },
      { name: 'deadline', description: '借阅截止时间', required: true }
    ]
  },
  {
    code: 'system_maintenance',
    name: '系统维护通知',
    type: 'maintenance',
    title: '系统维护通知',
    content: '系统将于{{startTime}}至{{endTime}}进行维护，期间服务可能中断，请合理安排使用时间。',
    emailSubject: '系统维护通知',
    emailContent: `
      <h2>系统维护通知</h2>
      <p>尊敬的用户，</p>
      <p>{{title}}</p>
      <p>{{content}}</p>
      <p>维护时间：{{startTime}} 至 {{endTime}}</p>
      <p>维护期间系统服务可能中断，给您带来的不便敬请谅解。</p>
    `,
    smsContent: '系统将于{{startTime}}至{{endTime}}维护，期间服务可能中断。',
    pushTitle: '系统维护通知',
    pushContent: '系统将进行维护，请合理安排使用时间',
    priority: 'high',
    defaultChannels: {
      inApp: true,
      email: true,
      sms: false,
      push: true
    },
    variables: [
      { name: 'title', description: '维护标题', required: true },
      { name: 'content', description: '维护内容', required: true },
      { name: 'startTime', description: '维护开始时间', required: true },
      { name: 'endTime', description: '维护结束时间', required: true }
    ]
  },
  {
    code: 'welcome_message',
    name: '欢迎消息',
    type: 'system',
    title: '欢迎使用图书馆管理系统',
    content: '欢迎{{username}}！感谢您注册图书馆管理系统，开始您的阅读之旅吧。',
    emailSubject: '欢迎加入图书馆',
    emailContent: `
      <h2>欢迎加入图书馆</h2>
      <p>亲爱的{{username}}，</p>
      <p>欢迎您注册图书馆管理系统！</p>
      <p>您现在可以：</p>
      <ul>
        <li>浏览和搜索图书</li>
        <li>在线借阅图书</li>
        <li>查看借阅历史</li>
        <li>发表图书评论</li>
        <li>参与积分活动</li>
      </ul>
      <p>祝您阅读愉快！</p>
    `,
    priority: 'normal',
    defaultChannels: {
      inApp: true,
      email: true,
      sms: false,
      push: false
    },
    variables: [
      { name: 'username', description: '用户名', required: true }
    ]
  },
  {
    code: 'admin_alert',
    name: '管理员警报',
    type: 'admin_alert',
    title: '系统警报',
    content: '{{alertType}}：{{message}}',
    priority: 'urgent',
    defaultChannels: {
      inApp: true,
      email: true,
      sms: false,
      push: true
    },
    variables: [
      { name: 'alertType', description: '警报类型', required: true },
      { name: 'message', description: '警报消息', required: true }
    ]
  }
];

/**
 * 初始化通知模板
 */
async function initializeNotificationTemplates() {
  try {
    logger.info('🔄 初始化通知模板...');

    let createdCount = 0;
    let updatedCount = 0;

    for (const templateData of defaultTemplates) {
      const existingTemplate = await models.NotificationTemplate.findOne({
        where: { code: templateData.code }
      });

      if (existingTemplate) {
        // 更新现有模板（只更新非内容字段，保护用户自定义的内容）
        await existingTemplate.update({
          name: templateData.name,
          type: templateData.type,
          priority: templateData.priority,
          defaultChannels: templateData.defaultChannels,
          variables: templateData.variables,
          isActive: true
        });
        updatedCount++;
      } else {
        // 创建新模板
        await models.NotificationTemplate.create(templateData);
        createdCount++;
      }
    }

    logger.info(`✅ 通知模板初始化完成: 创建 ${createdCount} 个，更新 ${updatedCount} 个`);
    return { created: createdCount, updated: updatedCount };

  } catch (error) {
    logger.error('❌ 通知模板初始化失败:', error);
    throw error;
  }
}

/**
 * 获取模板统计信息
 */
async function getTemplateStatistics() {
  try {
    const total = await models.NotificationTemplate.count();
    const active = await models.NotificationTemplate.count({
      where: { isActive: true }
    });
    const byType = await models.NotificationTemplate.findAll({
      attributes: [
        'type',
        [models.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['type'],
      raw: true
    });

    return {
      total,
      active,
      inactive: total - active,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {})
    };
  } catch (error) {
    logger.error('获取模板统计信息失败:', error);
    throw error;
  }
}

/**
 * 重置模板到默认状态
 */
async function resetTemplatesToDefault() {
  try {
    logger.info('🔄 重置通知模板到默认状态...');

    // 删除所有现有模板
    await models.NotificationTemplate.destroy({
      where: {},
      force: true
    });

    // 重新创建默认模板
    const result = await initializeNotificationTemplates();
    
    logger.info('✅ 模板重置完成');
    return result;
  } catch (error) {
    logger.error('❌ 模板重置失败:', error);
    throw error;
  }
}

/**
 * 导入模板配置
 * @param {Array} templates - 模板配置数组
 */
async function importTemplates(templates) {
  try {
    logger.info(`🔄 导入 ${templates.length} 个通知模板...`);

    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const template of templates) {
      try {
        const existingTemplate = await models.NotificationTemplate.findOne({
          where: { code: template.code }
        });

        if (existingTemplate) {
          await existingTemplate.update(template);
        } else {
          await models.NotificationTemplate.create(template);
        }
        importedCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          template: template.code,
          error: error.message
        });
        logger.error(`导入模板 ${template.code} 失败:`, error);
      }
    }

    logger.info(`✅ 模板导入完成: 成功 ${importedCount} 个，失败 ${errorCount} 个`);
    return { imported: importedCount, errors };

  } catch (error) {
    logger.error('❌ 模板导入失败:', error);
    throw error;
  }
}

/**
 * 导出所有模板配置
 */
async function exportTemplates() {
  try {
    const templates = await models.NotificationTemplate.findAll({
      order: [['type', 'ASC'], ['code', 'ASC']]
    });

    return templates.map(template => template.toJSON());
  } catch (error) {
    logger.error('❌ 模板导出失败:', error);
    throw error;
  }
}

module.exports = {
  initializeNotificationTemplates,
  getTemplateStatistics,
  resetTemplatesToDefault,
  importTemplates,
  exportTemplates,
  defaultTemplates
};