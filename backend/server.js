const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const loanRoutes = require('./routes/loans');
const installmentRoutes = require('./routes/installments');
const expenseRoutes = require('./routes/expenses');
const fundRoutes = require('./routes/fund');
const logsRoutes = require('./routes/logs');

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// MongoDB Connection
console.log('Attempting to connect to MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swanidhi', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB successfully');
  console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/swanidhi');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
  console.error('Please make sure MongoDB is running on your system');
  process.exit(1);
});

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Swanidhi API Server' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/installments', installmentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/fund', fundRoutes);
app.use('/api/logs', logsRoutes);

// Create default admin user
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const createDefaultAdmin = async () => {
  try {
    console.log('Checking for existing admin user...');
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      console.log('No admin user found, creating default admin...');
      const hashedPassword = await bcrypt.hash('Admin@Dinesh1506', 10);
      await User.create({
        memberId: 'admin01',
        name: 'Admin',
        phone: '9876543210',
        password: hashedPassword,
        role: 'admin',
      });
      console.log('Default admin user created successfully');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

createDefaultAdmin();

// Server configuration
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

// Add detailed logging about environment and configuration
console.log('Environment variables:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Server configuration:');
console.log('Using PORT:', PORT);
console.log('Using HOST:', HOST);

// Start the server - only one listen call
app.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
  console.log(`Local API URL: http://localhost:${PORT}/api`);
  console.log(`Android Emulator API URL: http://10.0.2.2:${PORT}/api`);
  console.log('Server successfully started and is listening for requests');
});