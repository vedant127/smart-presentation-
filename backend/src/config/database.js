import mongoose from 'mongoose';

/**
 * Database Configuration
 * Connects to MongoDB with proper error handling
 */
const connectDatabase = async () => {
    try {
        const options = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, options);

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error(`❌ MongoDB connection error: ${err}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.log('⚠️  MongoDB disconnected');
        });

    } catch (error) {
        console.error(`❌ Database connection failed: ${error.message}`);
        process.exit(1);
    }
};

export default connectDatabase;
