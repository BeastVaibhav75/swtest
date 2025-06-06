const mongoose = require('mongoose');
const User = require('../models/User');
const Installment = require('../models/Installment');
require('dotenv').config();

async function migrateInvestmentBalance() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/swanidhi');
    console.log('Connected to MongoDB');

    // Get all members
    const members = await User.find({ role: 'member' });
    console.log(`Found ${members.length} members to update`);

    // For each member, calculate their total installments
    for (const member of members) {
      const installments = await Installment.find({ memberId: member._id });
      const totalInstallments = installments.reduce((sum, inst) => sum + inst.amount, 0);
      
      // Update member's investment balance
      member.investmentBalance = totalInstallments;
      await member.save();
      
      console.log(`Updated member ${member.memberId} with investment balance: ${totalInstallments}`);
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateInvestmentBalance(); 