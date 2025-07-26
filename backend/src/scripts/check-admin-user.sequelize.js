const { models } = require('../models');
const bcrypt = require('bcryptjs');

async function checkAndCreateAdminUser() {
  try {
    console.log('Checking for admin user...');
    
    // Check if admin user exists
    const adminUser = await models.User.findOne({
      where: {
        username: 'admin',
        role: 'admin',
        isDeleted: false
      }
    });
    
    if (adminUser) {
      console.log('Admin user already exists:', adminUser.toSafeJSON());
      return adminUser;
    }
    
    console.log('Admin user not found, creating new admin user...');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const newAdminUser = await models.User.create({
      username: 'admin',
      passwordHash: hashedPassword,
      realName: 'System Administrator',
      email: 'admin@library.com',
      role: 'admin',
      status: 'active',
      emailVerified: true,
      pointsBalance: 0,
      borrowPermission: ['borrow', 'renew', 'reserve'],
      borrowLimit: 50,
      preferences: {
        language: 'zh-CN',
        timezone: 'Asia/Shanghai',
        notifications: {
          email: true,
          sms: false,
          push: true,
          dueDateReminder: true,
          overdueNotice: true,
          pointsUpdate: true,
        },
      }
    });
    
    console.log('Admin user created successfully:', newAdminUser.toSafeJSON());
    return newAdminUser;
    
  } catch (error) {
    console.error('Error checking/creating admin user:', error);
    throw error;
  }
}

// Run the check
checkAndCreateAdminUser()
  .then(() => {
    console.log('Admin user check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Admin user check failed:', error);
    process.exit(1);
  });