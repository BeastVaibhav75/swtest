const User = require('../models/User');

// Generate a unique member ID
async function generateMemberId() {
  // Get the count of existing members
  const count = await User.countDocuments();
  
  // Generate member ID in format: M001, M002, etc.
  const memberId = `M${String(count + 1).padStart(3, '0')}`;
  
  // Check if member ID already exists (shouldn't happen, but just in case)
  const existingUser = await User.findOne({ memberId });
  if (existingUser) {
    // If exists, try the next number
    return generateMemberId();
  }
  
  return memberId;
}

module.exports = {
  generateMemberId,
}; 