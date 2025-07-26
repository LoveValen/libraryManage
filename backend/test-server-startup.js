require('dotenv').config();

async function testServerStartup() {
  try {
    console.log('🚀 Testing server startup sequence...\n');
    
    // Step 1: Config
    console.log('1️⃣ Loading config...');
    const config = require('./src/config');
    console.log('✅ Config loaded');
    
    // Step 2: Logger
    console.log('\n2️⃣ Initializing logger...');
    const { logger } = require('./src/utils/logger');
    console.log('✅ Logger initialized');
    
    // Step 3: Database
    console.log('\n3️⃣ Initializing database...');
    try {
      const { initializeDatabase } = require('./src/models');
      await initializeDatabase();
      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database initialization error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
    
    // Step 4: Create app
    console.log('\n4️⃣ Creating Express app...');
    try {
      const { createApp } = require('./src/app');
      const app = createApp();
      console.log('✅ Express app created');
    } catch (error) {
      console.error('❌ App creation error:', error.message);
      console.error('Stack:', error.stack);
      throw error;
    }
    
    console.log('\n✅ All startup steps completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Server startup test failed:', error.message);
    process.exit(1);
  }
}

testServerStartup();