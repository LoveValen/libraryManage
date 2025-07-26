const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const config = require('./src/config');
const { createHttpLogger } = require('./src/utils/logger');
const { attachResponseMethods } = require('./src/utils/apiResponse');
const { setupErrorHandlers } = require('./src/middlewares/error.middleware');
const { apiRateLimit, sanitizeInput } = require('./src/middlewares/validation.middleware');
const reviewsController = require('./src/controllers/reviews.controller');
const { authenticateToken } = require('./src/middlewares/auth.middleware');

async function testFullMiddlewareChain() {
  console.log('🔍 Testing FULL Middleware Chain (exact replica of app.js)\n');
  console.log(`   Environment: ${config.app.environment}`);
  console.log(`   Rate limiting enabled: ${config.app.environment === 'production'}`);
  
  const app = express();
  
  console.log('\n📚 Applying middleware in exact order from app.js:');
  
  // 1. Trust proxy
  app.set('trust proxy', 1);
  console.log('   ✓ Trust proxy set');
  
  // 2. Helmet security
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
  console.log('   ✓ Helmet security middleware');
  
  // 3. CORS
  app.use(cors({
    origin: function (origin, callback) {
      const allowedOrigins = ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:3001', 'http://127.0.0.1:8080', 'http://127.0.0.1:8081', 'http://127.0.0.1:8082'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'x-request-id',
    ],
  }));
  console.log('   ✓ CORS middleware');
  
  // 4. Compression
  app.use(compression());
  console.log('   ✓ Compression middleware');
  
  // 5. Body parsing
  app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ 
    extended: true, 
    limit: '10mb',
  }));
  console.log('   ✓ Body parsing middleware');
  
  // 6. HTTP logger (conditional)
  if (config.app.environment !== 'test') {
    app.use(createHttpLogger());
    console.log('   ✓ HTTP logger middleware (environment is not test)');
  } else {
    console.log('   ⚠️  HTTP logger SKIPPED (test environment)');
  }
  
  // 7. Rate limiting (production only)
  if (config.app.environment === 'production') {
    app.use('/api/', apiRateLimit);
    console.log('   ✓ API rate limiting middleware (production only)');
  } else {
    console.log('   ⚠️  Rate limiting SKIPPED (not production)');
  }
  
  // 8. Input sanitization
  app.use(sanitizeInput);
  console.log('   ✓ Input sanitization middleware');
  
  // 9. Response methods
  app.use(attachResponseMethods);
  console.log('   ✓ Response methods middleware');
  
  // 10. Test route
  app.get('/api/v1/reviews/my', authenticateToken, reviewsController.getMyReviews);
  console.log('   ✓ Reviews route with auth middleware');
  
  // 11. Error handlers
  setupErrorHandlers(app);
  console.log('   ✓ Error handling middleware chain');
  
  console.log('\n🧪 Testing with full middleware chain...');
  
  return new Promise((resolve) => {
    const server = app.listen(3020, async () => {
      try {
        const axios = require('axios');
        const fs = require('fs');
        
        const token = fs.readFileSync('temp_token.txt', 'utf8').trim();
        
        console.log('   📡 Making request to full middleware chain...');
        const response = await axios.get('http://localhost:3020/api/v1/reviews/my', {
          headers: { 'Authorization': `Bearer ${token}` },
          validateStatus: () => true,
          timeout: 10000
        });
        
        const success = response.status === 200;
        const resStatusError = response.status === 500 && 
          response.data?.message?.includes('res.status is not a function');
        
        console.log('\n📊 Full Middleware Chain Results:');
        console.log(`   Status: ${response.status}`);
        console.log(`   Success: ${success ? '✅ YES' : '❌ NO'}`);
        console.log(`   res.status error: ${resStatusError ? '❌ YES' : '✅ NO'}`);
        
        if (!success) {
          console.log(`   Error message: ${response.data?.message?.substring(0, 100) || 'No message'}`);
          if (response.data?.stack) {
            console.log('   Stack trace (first 2 lines):');
            response.data.stack.split('\n').slice(0, 2).forEach(line => {
              console.log(`     ${line}`);
            });
          }
        }
        
        if (resStatusError) {
          console.log('\n🎯 CONFIRMED: Full middleware chain causes res.status error!');
        } else if (success) {
          console.log('\n🤔 MYSTERY: Full middleware chain works in isolation too!');
          console.log('   The issue might be:');
          console.log('   1. Server restart needed');
          console.log('   2. Different environment variables');
          console.log('   3. Port/resource conflicts');
          console.log('   4. Cached modules/state');
        }
        
        server.close();
        resolve({ success, resStatusError, status: response.status });
        
      } catch (error) {
        console.log(`\n❌ Request failed: ${error.message}`);
        server.close();
        resolve({ success: false, requestFailed: true });
      }
    });
    
    setTimeout(() => {
      console.log('\n⏰ Test timed out after 15 seconds');
      server.close();
      resolve({ success: false, timeout: true });
    }, 15000);
  });
}

testFullMiddlewareChain()
  .then(() => {
    console.log('\n✅ Full middleware chain test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });