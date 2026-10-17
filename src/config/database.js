import mongoose from 'mongoose';

// MongoDB Connection
export const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/idk-org';
    const dbName = process.env.DATABASE_NAME || 'idk-org';

    const connection = await mongoose.connect(mongoURI, {
      dbName: dbName,
      retryWrites: true,
      w: 'majority'
    });

    console.log(`✅ MongoDB Connected: ${connection.connection.host}`);
    console.log(`📦 Database: ${dbName}`);

    return connection;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    throw error;
  }
};

// Disconnect from MongoDB
export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✅ MongoDB Disconnected');
  } catch (error) {
    console.error('❌ MongoDB Disconnect Error:', error.message);
    throw error;
  }
};

// Check if connected
export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};
