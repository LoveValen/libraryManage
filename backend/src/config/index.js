require('dotenv').config();

const config = {
  // 应用配置
  app: {
    name: 'Library Management System',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
  },

  // 数据库配置
  database: require('./database.config'),

  // JWT配置
  jwt: require('./jwt.config'),

  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  },

  // 微信配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    loginUrl: 'https://api.weixin.qq.com/sns/jscode2session',
  },

  // 文件上传配置
  upload: {
    path: process.env.UPLOAD_PATH || './public/uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx').split(','),
    imageTypes: ['jpg', 'jpeg', 'png', 'gif'],
    documentTypes: ['pdf', 'doc', 'docx'],
  },


  // 积分系统配置
  points: {
    borrowBook: parseInt(process.env.POINTS_BORROW_BOOK) || 10,
    returnOnTime: parseInt(process.env.POINTS_RETURN_ON_TIME) || 5,
    writeReview: parseInt(process.env.POINTS_WRITE_REVIEW) || 25,
    completeTutorial: parseInt(process.env.POINTS_COMPLETE_TUTORIAL) || 50,
    overdueDeduction: parseInt(process.env.POINTS_OVERDUE_DEDUCTION) || -10,
  },

  // API限流配置
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
    maxSize: '20m',
    maxFiles: '14d',
    datePattern: 'YYYY-MM-DD',
  },

  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:8080', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200,
  },

  // 安全配置
  security: {
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12,
    sessionSecret: process.env.SESSION_SECRET || 'your_session_secret_here',
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    },
  },

  // PDF阅读器配置
  pdfViewer: {
    viewerPath: process.env.PDF_VIEWER_PATH || './public/pdf-viewer',
    ebookStoragePath: process.env.EBOOK_STORAGE_PATH || './public/ebooks',
  },

  // 书籍推荐配置
  recommendation: {
    maxRecommendations: 10,
    popularBooksLimit: 20,
    recentActivityDays: 30,
  },

  // 通知配置
  notification: {
    dueDateReminderDays: 3, // 到期前3天提醒
    overdueCheckInterval: 24 * 60 * 60 * 1000, // 24小时检查一次逾期
  },

  // 分页配置
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
};

// 验证必要的环境变量
const validateConfig = () => {
  const requiredEnvVars = [];
  
  if (config.app.environment === 'production') {
    requiredEnvVars.push(
      'JWT_SECRET',
      'DB_HOST',
      'DB_USER',
      'DB_PASSWORD',
      'DB_NAME'
    );
  }

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ 缺少必要的环境变量:', missingVars.join(', '));
    process.exit(1);
  }
};

// 在生产环境下验证配置
if (config.app.environment === 'production') {
  validateConfig();
}

module.exports = config;