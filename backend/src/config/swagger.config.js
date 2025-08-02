/**
 * Swagger API文档配置 - 遵循Express.js企业级最佳实践
 */

const config = require('./index');

/**
 * 设置API文档
 */
const setupApiDocs = (app) => {
  // 只在开发环境启用
  if (config.app.environment !== 'development') {
    return;
  }

  try {
    const swaggerJsdoc = require('swagger-jsdoc');
    const swaggerUi = require('swagger-ui-express');

    const options = {
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'Library Management System API',
          version: config.app.version || '1.0.0',
          description: '现代图书馆管理系统API文档',
          contact: {
            name: 'Library Management Team',
            email: 'support@library.com',
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
        servers: [
          {
            url: `http://localhost:${config.app.port}/api/v1`,
            description: 'Development server',
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT授权token'
            },
            apiKey: {
              type: 'apiKey',
              in: 'header',
              name: 'X-API-Key',
              description: 'API密钥'
            },
          },
          responses: {
            UnauthorizedError: {
              description: '未授权访问',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: '未授权访问' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            },
            ValidationError: {
              description: '验证错误',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: false },
                      message: { type: 'string', example: '参数验证失败' },
                      errors: { type: 'array', items: { type: 'object' } },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      apis: [
        './src/routes/*.js',
        './src/controllers/*.js',
      ],
    };

    const specs = swaggerJsdoc(options);
    
    // 自定义Swagger UI配置
    const swaggerOptions = {
      explorer: true,
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .scheme-container { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; }
      `,
      customSiteTitle: 'Library Management API Docs',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      }
    };
    
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

    console.log(`📚 API Documentation: http://localhost:${config.app.port}/api/docs`);
    
    // 提供原始JSON规范
    app.get('/api/docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(specs);
    });
    
  } catch (error) {
    console.warn('⚠️  API documentation setup failed:', error.message);
  }
};

/**
 * Swagger路由标签定义
 */
const swaggerTags = {
  AUTH: 'Authentication',
  BOOKS: 'Books',
  CATEGORIES: 'Book Categories',
  USERS: 'Users',
  BORROWS: 'Borrowing',
  REVIEWS: 'Reviews',
  POINTS: 'Points System',
  ANALYTICS: 'Analytics',
  NOTIFICATIONS: 'Notifications',
  HEALTH: 'Health Check',
  ADMIN: 'Administration'
};

module.exports = {
  setupApiDocs,
  swaggerTags,
};