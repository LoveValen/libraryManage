require('dotenv').config();

async function testModels() {
  try {
    console.log('🔄 Testing model initialization...');
    
    // Test database config first
    console.log('\n1️⃣ Testing database config...');
    const { sequelize } = require('./src/config/database.config');
    await sequelize.authenticate();
    console.log('✅ Database config OK');
    
    // Test individual problematic models
    console.log('\n2️⃣ Testing individual models...');
    
    try {
      const SystemHealth = require('./src/models/systemHealth.model');
      console.log('✅ SystemHealth model loaded');
    } catch (error) {
      console.error('❌ SystemHealth model error:', error.message);
    }
    
    try {
      const Alert = require('./src/models/alert.model');
      console.log('✅ Alert model loaded');
    } catch (error) {
      console.error('❌ Alert model error:', error.message);
    }
    
    // Test full models index
    console.log('\n3️⃣ Testing models/index.js...');
    try {
      const { models } = require('./src/models');
      console.log('✅ All models loaded successfully');
      console.log('📦 Available models:', Object.keys(models).join(', '));
    } catch (error) {
      console.error('❌ Models initialization error:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

testModels();