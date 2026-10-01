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

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
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
        console.error('❌ Error connecting to MongoDB:', error);
        if (!process.env.VERCEL) {
            process.exit(1);
        }
    }

    return cached.conn;
};

module.exports = connectDB;
