const mongoose = require('mongoose');
require('dotenv').config();

async function recreateCollection() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swanidhi', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop the existing users collection
    console.log('Dropping users collection...');
    await db.collection('users').drop();
    console.log('Users collection dropped');

    // Create a new admin user
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    
    console.log('Creating new admin user...');
    const hashedPassword = await bcrypt.hash('Admin@Dinesh1506', 10);
    await User.create({
      memberId: 'admin01',
      name: 'Admin',
      phone: '9876543210',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('Admin user created successfully');

    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

recreateCollection(); 