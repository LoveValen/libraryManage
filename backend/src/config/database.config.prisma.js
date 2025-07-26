/**
 * Database configuration compatibility layer for Prisma migration
 * This file provides a bridge between the old Sequelize-based code and Prisma
 */

const prisma = require('../utils/prisma');

// Mock sequelize object for compatibility
const sequelize = {
  // Compatibility methods
  authenticate: async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      throw error;
    }
  },
  
  close: async () => {
    await prisma.$disconnect();
  },
  
  transaction: async (callback) => {
    return prisma.$transaction(callback);
  },
  
  query: async (sql, options = {}) => {
    return prisma.$queryRawUnsafe(sql);
  },
  
  // Add Sequelize property for compatibility
  Sequelize: {
    Op: {
      or: 'OR',
      and: 'AND',
      ne: 'not',
      eq: 'equals',
      gt: 'gt',
      gte: 'gte',
      lt: 'lt',
      lte: 'lte',
      like: 'contains',
      notLike: 'notContains',
      in: 'in',
      notIn: 'notIn',
      between: 'between',
      notBetween: 'notBetween'
    }
  },
  
  // Query types for compatibility
  QueryTypes: {
    SELECT: 'SELECT',
    INSERT: 'INSERT',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    RAW: 'RAW'
  }
};

// Test connection function
const testConnection = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful (Prisma)');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

// Export config for compatibility
const config = {
  development: {
    dialect: 'mysql',
    database: process.env.DB_NAME || 'library_management',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307
  },
  test: {
    dialect: 'mysql',
    database: `${process.env.DB_NAME}_test` || 'library_management_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307
  },
  production: {
    dialect: 'mysql',
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306
  }
};

module.exports = {
  sequelize,
  testConnection,
  config,
  prisma // Also export prisma for direct access
};