const prisma = require('../utils/prisma');
const { logger } = require('../utils/logger');

/**
 * 初始化健康监控相关的通知模板
 */
async function initHealthNotificationTemplates() {
  try {
    logger.info('🔄 开始初始化健康监控通知模板...');

    const healthTemplates = [
      {
        code: 'system_alert',
        name: '系统告警通知',
        description: '系统健康监控告警通知',
        category: 'system',
        title: '系统告警: {{alertTitle}}',
        content: '检测到系统异常:\n\n告警类型: {{alertType}}\n严重程度: {{severity}}\n详细描述: {{description}}\n发生时间: {{timestamp}}\n\n请及时处理相关问题。',
        variables: ['alertTitle', 'alertType', 'severity', 'description', 'timestamp'],
        channels: {
          system: {
            enabled: true,
            template: '系统告警: {{alertTitle}} ({{severity}})'
          },
          email: {
            enabled: true,
            subject: '【系统告警】{{alertTitle}}',
            template: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #dc3545; margin: 0;">🚨 系统告警通知</h2>
                </div>
                
                <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                  <h3 style="color: #343a40; margin-top: 0;">{{alertTitle}}</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; width: 100px;">告警类型:</td>
                      <td style="padding: 8px 0;">{{alertType}}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">严重程度:</td>
                      <td style="padding: 8px 0;">
                        <span style="padding: 4px 8px; border-radius: 4px; color: white; background: 
                          {{#if_eq severity 'critical'}}#dc3545{{/if_eq}}
                          {{#if_eq severity 'high'}}#fd7e14{{/if_eq}}
                          {{#if_eq severity 'medium'}}#ffc107{{/if_eq}}
                          {{#if_eq severity 'low'}}#28a745{{/if_eq}}
                        ;">{{severity}}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">发生时间:</td>
                      <td style="padding: 8px 0;">{{timestamp}}</td>
                    </tr>
                  </table>
                  
                  <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 4px;">
                    <h4 style="margin: 0 0 10px 0; color: #495057;">详细描述:</h4>
                    <p style="margin: 0; line-height: 1.5;">{{description}}</p>
                  </div>
                  
                  <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px;">
                    <strong style="color: #856404;">⚠️ 请及时登录管理后台处理相关问题</strong>
                  </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
                  <p>这是一封自动生成的系统告警邮件，请勿直接回复。</p>
                </div>
              </div>
            `
          },
          sms: {
            enabled: true,
            template: '【系统告警】{{alertTitle}} - {{severity}}级别，请及时处理。时间:{{timestamp}}'
          }
        },
        priority: 'high',
        enabled: true
      },

      {
        code: 'health_check_failed',
        name: '健康检查失败通知',
        description: '健康检查失败时的通知',
        category: 'system',
        title: '健康检查失败: {{checkName}}',
        content: '健康检查"{{checkName}}"执行失败:\n\n检查类型: {{checkType}}\n失败原因: {{errorMessage}}\n检查时间: {{timestamp}}\n连续失败次数: {{failureCount}}\n\n请检查相关服务状态。',
        variables: ['checkName', 'checkType', 'errorMessage', 'timestamp', 'failureCount'],
        channels: {
          system: {
            enabled: true,
            template: '健康检查失败: {{checkName}}'
          },
          email: {
            enabled: true,
            subject: '【健康检查失败】{{checkName}}',
            template: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #dc3545; margin: 0;">❌ 健康检查失败</h2>
                </div>
                
                <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                  <h3 style="color: #343a40; margin-top: 0;">{{checkName}}</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; width: 100px;">检查类型:</td>
                      <td style="padding: 8px 0;">{{checkType}}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">检查时间:</td>
                      <td style="padding: 8px 0;">{{timestamp}}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">失败次数:</td>
                      <td style="padding: 8px 0;">{{failureCount}}</td>
                    </tr>
                  </table>
                  
                  <div style="margin: 20px 0; padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
                    <h4 style="margin: 0 0 10px 0; color: #721c24;">失败原因:</h4>
                    <p style="margin: 0; line-height: 1.5; color: #721c24;">{{errorMessage}}</p>
                  </div>
                  
                  <div style="margin-top: 20px; padding: 15px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px;">
                    <strong style="color: #0c5460;">💡 建议检查相关服务状态和系统日志</strong>
                  </div>
                </div>
              </div>
            `
          }
        },
        priority: 'high',
        enabled: true
      },

      {
        code: 'performance_degraded',
        name: '性能下降通知',
        description: '系统性能下降时的通知',
        category: 'system',
        title: '性能下降警告: {{serviceName}}',
        content: '检测到{{serviceName}}性能下降:\n\n当前响应时间: {{responseTime}}ms\n正常响应时间: {{normalResponseTime}}ms\n下降幅度: {{degradationPercent}}%\n检测时间: {{timestamp}}\n\n建议检查系统负载和资源使用情况。',
        variables: ['serviceName', 'responseTime', 'normalResponseTime', 'degradationPercent', 'timestamp'],
        channels: {
          system: {
            enabled: true,
            template: '性能下降: {{serviceName}} 响应时间{{responseTime}}ms'
          },
          email: {
            enabled: true,
            subject: '【性能警告】{{serviceName}} 响应时间异常',
            template: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #856404; margin: 0;">⚠️ 性能下降警告</h2>
                </div>
                
                <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                  <h3 style="color: #343a40; margin-top: 0;">{{serviceName}}</h3>
                  
                  <div style="margin: 20px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                      <span>当前响应时间:</span>
                      <strong style="color: #dc3545;">{{responseTime}}ms</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                      <span>正常响应时间:</span>
                      <span style="color: #28a745;">{{normalResponseTime}}ms</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span>下降幅度:</span>
                      <strong style="color: #fd7e14;">{{degradationPercent}}%</strong>
                    </div>
                  </div>
                  
                  <div style="margin: 20px 0; padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">
                    <strong style="color: #155724;">💡 建议检查系统负载、数据库连接和网络状况</strong>
                  </div>
                  
                  <div style="margin-top: 15px; color: #6c757d; font-size: 14px;">
                    <strong>检测时间:</strong> {{timestamp}}
                  </div>
                </div>
              </div>
            `
          }
        },
        priority: 'medium',
        enabled: true
      },

      {
        code: 'resource_usage_high',
        name: '资源使用率高通知',
        description: '系统资源使用率过高时的通知',
        category: 'system',
        title: '资源使用率警告: {{resourceType}}',
        content: '{{resourceType}}使用率过高:\n\n当前使用率: {{currentUsage}}%\n警告阈值: {{warningThreshold}}%\n严重阈值: {{criticalThreshold}}%\n检测时间: {{timestamp}}\n\n{{#if suggestions}}建议操作:\n{{#each suggestions}}- {{this}}\n{{/each}}{{/if}}',
        variables: ['resourceType', 'currentUsage', 'warningThreshold', 'criticalThreshold', 'timestamp', 'suggestions'],
        channels: {
          system: {
            enabled: true,
            template: '{{resourceType}}使用率{{currentUsage}}%，超过阈值'
          },
          email: {
            enabled: true,
            subject: '【资源警告】{{resourceType}}使用率过高 ({{currentUsage}}%)',
            template: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #856404; margin: 0;">📊 资源使用率警告</h2>
                </div>
                
                <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                  <h3 style="color: #343a40; margin-top: 0;">{{resourceType}} 使用率过高</h3>
                  
                  <div style="margin: 20px 0; text-align: center;">
                    <div style="font-size: 48px; font-weight: bold; color: #dc3545; margin-bottom: 10px;">
                      {{currentUsage}}%
                    </div>
                    <div style="color: #6c757d;">当前使用率</div>
                  </div>
                  
                  <div style="margin: 20px 0;">
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 4px; margin-bottom: 5px;">
                      <span style="color: #ffc107;">⚠️ 警告阈值: {{warningThreshold}}%</span>
                    </div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 4px;">
                      <span style="color: #dc3545;">🚨 严重阈值: {{criticalThreshold}}%</span>
                    </div>
                  </div>
                  
                  {{#if suggestions}}
                  <div style="margin: 20px 0; padding: 15px; background: #d1ecf1; border: 1px solid #bee5eb; border-radius: 4px;">
                    <h4 style="margin: 0 0 10px 0; color: #0c5460;">建议操作:</h4>
                    <ul style="margin: 0; padding-left: 20px; color: #0c5460;">
                      {{#each suggestions}}<li>{{this}}</li>{{/each}}
                    </ul>
                  </div>
                  {{/if}}
                  
                  <div style="margin-top: 15px; color: #6c757d; font-size: 14px;">
                    <strong>检测时间:</strong> {{timestamp}}
                  </div>
                </div>
              </div>
            `
          }
        },
        priority: 'medium',
        enabled: true
      },

      {
        code: 'service_recovered',
        name: '服务恢复通知',
        description: '服务从异常状态恢复正常时的通知',
        category: 'system',
        title: '服务已恢复: {{serviceName}}',
        content: '{{serviceName}}已恢复正常:\n\n服务类型: {{serviceType}}\n恢复时间: {{timestamp}}\n故障持续时间: {{downtimeDuration}}\n\n服务现已正常运行。',
        variables: ['serviceName', 'serviceType', 'timestamp', 'downtimeDuration'],
        channels: {
          system: {
            enabled: true,
            template: '✅ {{serviceName}}已恢复正常'
          },
          email: {
            enabled: true,
            subject: '【服务恢复】{{serviceName}} 已恢复正常',
            template: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h2 style="color: #155724; margin: 0;">✅ 服务恢复通知</h2>
                </div>
                
                <div style="background: white; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px;">
                  <h3 style="color: #28a745; margin-top: 0;">{{serviceName}} 已恢复正常</h3>
                  
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold; width: 100px;">服务类型:</td>
                      <td style="padding: 8px 0;">{{serviceType}}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">恢复时间:</td>
                      <td style="padding: 8px 0;">{{timestamp}}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; font-weight: bold;">故障时长:</td>
                      <td style="padding: 8px 0;">{{downtimeDuration}}</td>
                    </tr>
                  </table>
                  
                  <div style="margin: 20px 0; padding: 15px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 4px;">
                    <strong style="color: #155724;">🎉 服务现已正常运行，感谢您的耐心等待！</strong>
                  </div>
                </div>
              </div>
            `
          }
        },
        priority: 'low',
        enabled: true
      }
    ];

    let createdCount = 0;

    for (const templateData of healthTemplates) {
      try {
        const [template, created] = await models.NotificationTemplate.findOrCreate({
          where: { code: templateData.code },
          defaults: templateData
        });

        if (created) {
          createdCount++;
          logger.info(`✅ 创建健康监控通知模板: ${template.code}`);
        } else {
          logger.debug(`⏭️ 健康监控通知模板已存在: ${template.code}`);
        }
      } catch (error) {
        logger.error(`❌ 创建健康监控通知模板失败 [${templateData.code}]:`, error);
      }
    }

    logger.info(`✅ 健康监控通知模板初始化完成，创建了 ${createdCount} 个新模板`);
    return createdCount;

  } catch (error) {
    logger.error('❌ 初始化健康监控通知模板失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const { initializeDatabase } = require('../models');
  
  (async () => {
    try {
      await initializeDatabase();
      await initHealthNotificationTemplates();
      process.exit(0);
    } catch (error) {
      logger.error('脚本执行失败:', error);
      process.exit(1);
    }
  })();
}

module.exports = { initHealthNotificationTemplates };