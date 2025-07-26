const express = require('express');
const { attachResponseMethods } = require('./src/utils/apiResponse');
const { setupErrorHandlers } = require('./src/middlewares/error.middleware');
const { sanitizeInput } = require('./src/middlewares/validation.middleware');
const reviewsController = require('./src/controllers/reviews.controller');
const { authenticateToken } = require('./src/middlewares/auth.middleware');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const { createHttpLogger } = require('./src/utils/logger');

// Test each middleware incrementally
const tests = [
  {
    name: 'Baseline (minimal working)',
    middlewares: ['express.json', 'attachResponseMethods']
  },
  {
    name: 'Add sanitizeInput',
    middlewares: ['express.json', 'sanitizeInput', 'attachResponseMethods']
  },
  {
    name: 'Add helmet',
    middlewares: ['helmet', 'express.json', 'sanitizeInput', 'attachResponseMethods']
  },
  {
    name: 'Add cors',
    middlewares: ['helmet', 'cors', 'express.json', 'sanitizeInput', 'attachResponseMethods']
  },
  {
    name: 'Add compression',
    middlewares: ['helmet', 'cors', 'compression', 'express.json', 'sanitizeInput', 'attachResponseMethods']
  },
  {
    name: 'Add HTTP logger',
    middlewares: ['helmet', 'cors', 'compression', 'express.json', 'httpLogger', 'sanitizeInput', 'attachResponseMethods']
  }
];

async function runTest(testConfig, port) {
  return new Promise((resolve) => {
    const app = express();
    
    console.log(`\n🧪 Testing: ${testConfig.name}`);
    console.log(`   Middlewares: ${testConfig.middlewares.join(' → ')}`);
    
    // Apply middlewares in order
    testConfig.middlewares.forEach(middleware => {
      switch (middleware) {
        case 'helmet':
          app.use(helmet({
            contentSecurityPolicy: {
              directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
              },
            },
            crossOriginEmbedderPolicy: false,
          }));
          break;
        case 'cors':
          app.use(cors({
            origin: function (origin, callback) {
              const allowedOrigins = ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082'];
              if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
              } else {
                callback(new Error('Not allowed by CORS'));
              }
            },
            credentials: true,
            optionsSuccessStatus: 200,
          }));
          break;
        case 'compression':
          app.use(compression());
          break;
        case 'express.json':
          app.use(express.json({ limit: '10mb' }));
          break;
        case 'httpLogger':
          app.use(createHttpLogger());
          break;
        case 'sanitizeInput':
          app.use(sanitizeInput);
          break;
        case 'attachResponseMethods':
          app.use(attachResponseMethods);
          break;
      }
    });

    // Add test route
    app.get('/test-reviews-my', authenticateToken, reviewsController.getMyReviews);
    
    // Add error handling
    setupErrorHandlers(app);

    const server = app.listen(port, async () => {
      try {
        const axios = require('axios');
        const fs = require('fs');
        
        const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
        
        const response = await axios.get(`http://localhost:${port}/test-reviews-my`, {
          headers: { 'Authorization': `Bearer ${token}` },
          validateStatus: () => true,
          timeout: 5000
        });
        
        const success = response.status === 200;
        const error = response.status === 500 && response.data?.message?.includes('res.status is not a function');
        
        console.log(`   Result: ${success ? '✅ SUCCESS' : error ? '❌ res.status ERROR' : `⚠️  OTHER ERROR (${response.status})`}`);
        if (!success && response.data?.message) {
          console.log(`   Error: ${response.data.message.substring(0, 100)}${response.data.message.length > 100 ? '...' : ''}`);
        }
        
        server.close();
        resolve({ success, error, status: response.status, message: response.data?.message });
        
      } catch (err) {
        console.log(`   Result: ❌ REQUEST FAILED - ${err.message}`);
        server.close();
        resolve({ success: false, error: true, requestFailed: true });
      }
    });
    
    // Timeout safety
    setTimeout(() => {
      server.close();
      resolve({ success: false, error: true, timeout: true });
    }, 10000);
  });
}

async function main() {
  console.log('🔍 Systematic Middleware Isolation Test');
  console.log('   Goal: Find which middleware breaks res.status functionality\n');
  
  let failingTest = null;
  
  for (let i = 0; i < tests.length; i++) {
    const result = await runTest(tests[i], 3003 + i);
    
    if (result.error) {
      failingTest = tests[i];
      console.log(`\n🎯 FOUND ISSUE: "${tests[i].name}" breaks res.status functionality!`);
      
      if (i > 0) {
        const previousTest = tests[i - 1];
        const newMiddleware = tests[i].middlewares.filter(m => !previousTest.middlewares.includes(m));
        console.log(`   The culprit middleware is: ${newMiddleware.join(', ')}`);
      }
      break;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  if (!failingTest) {
    console.log('\n🤔 No middleware caused the issue in isolation.');
    console.log('   The problem might be:');
    console.log('   1. Timing/async related');
    console.log('   2. Specific to the full middleware chain order');
    console.log('   3. Related to middleware interaction rather than individual middleware');
  }
  
  console.log('\n✅ Middleware isolation test completed');
  process.exit(0);
}

main().catch(console.error);