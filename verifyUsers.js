require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const verifyExistingUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/authdb');
    console.log('Connected to DB');

    const result = await User.updateMany(
      { isVerified: { $ne: true } },
      { $set: { isVerified: true } }
    );

    console.log(`Updated ${result.modifiedCount} users to be verified.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

verifyExistingUsers();
