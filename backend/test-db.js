const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    // Create connection to MySQL server (without specifying database)
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3307,
      user: 'root',
      password: 'root'
    });

    console.log('✅ Connected to MySQL server');

    // Check if database exists
    const [databases] = await connection.execute('SHOW DATABASES LIKE "library_management"');
    
    if (databases.length === 0) {
      console.log('📦 Database does not exist. Creating...');
      await connection.execute('CREATE DATABASE IF NOT EXISTS library_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      console.log('✅ Database created successfully');
    } else {
      console.log('✅ Database already exists');
    }

    // Test connection to the specific database
    await connection.changeUser({ database: 'library_management' });
    console.log('✅ Connected to library_management database');

    await connection.end();
    console.log('✅ Connection closed');
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.error('Error details:', error);
  }
}

testConnection();