const { sequelize } = require('../models');
const migration = require('../database/migrations/20250115000001-add-missing-user-fields');

async function runMigration() {
  try {
    console.log('Running migration to add missing user fields...');
    
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runMigration();