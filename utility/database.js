const mongoose = require('mongoose');
const { MONGODB_URI } = require('./config');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) {
        return cached.conn;
    }

    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not set — sensor data will be unavailable');
        return null;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
        };

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
            console.log('✅ Connected to MongoDB');
            return mongooseInstance;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (error) {
        cached.promise = null;
        // Keep serving pages; data routes answer 503 and retry on the next request
        console.error('❌ Error connecting to MongoDB:', error.message);
    }

    return cached.conn;
};

module.exports = connectDB;
