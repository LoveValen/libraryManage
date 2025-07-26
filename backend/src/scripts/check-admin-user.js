const UserService = require('../services/user.service');
const { USER_ROLES, USER_STATUS } = require('../utils/constants');

async function checkAndCreateAdminUser() {
  try {
    console.log('Checking for admin user...');
    
    // Check if admin user exists
    const adminUser = await UserService.findByIdentifier('admin');
    
    if (adminUser && adminUser.role === USER_ROLES.ADMIN) {
      console.log('Admin user already exists:', UserService.toSafeJSON(adminUser));
      return adminUser;
    }
    
    console.log('Admin user not found, creating new admin user...');
    
    // Create admin user
    const newAdminUser = await UserService.create({
      username: 'admin',
      password: 'admin123',
      real_name: 'System Administrator',
      email: 'admin@library.com',
      role: USER_ROLES.ADMIN,
      status: USER_STATUS.ACTIVE,
      email_verified: true,
      points_balance: 0,
      borrow_permission: ['borrow', 'renew', 'reserve'],
      borrow_limit: 50,
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
    
    console.log('Admin user created successfully:', UserService.toSafeJSON(newAdminUser));
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