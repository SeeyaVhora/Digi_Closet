const mongoose = require('mongoose');
const env = require('./env');

mongoose.set('strictQuery', true);

const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log(`  🗄️  MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    // Brings the users indexes in line with the schema (email became optional
    // when phone sign-in was added, so its unique index is now partial).
    await require('../models/User').syncIndexes();
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected.');
});

module.exports = connectDB;
