const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swanidhi', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    if (collections.some(c => c.name === 'users')) {
      console.log('Dropping email index from users collection...');
      await db.collection('users').dropIndex('email_1');
      console.log('Email index dropped successfully');
    } else {
      console.log('Users collection not found');
    }

    console.log('Done');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixIndex(); 