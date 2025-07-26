const { PrismaClient } = require('@prisma/client');

// Create a single instance of PrismaClient to be reused across the application
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
  errorFormat: 'minimal',
});

// Handle connection events
prisma.$connect()
  .then(() => {
    console.log('✅ Database connected successfully via Prisma');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  });

// Gracefully disconnect on application termination
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Database connection closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  console.log('Database connection closed');
  process.exit(0);
});

// Export the prisma instance for use throughout the application
module.exports = prisma;