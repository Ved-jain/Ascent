// ─────────────────────────────────────────────────────────
//  db.js  —  MongoDB Connection
//
//  This file does ONE thing: connect to MongoDB using Mongoose.
//  We call this function once when the server starts.
//
//  Why a separate file?
//    Keeps server.js clean. If we ever change databases, we
//    only edit this file — nothing else needs to change.
// ─────────────────────────────────────────────────────────

import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 60000,
    });

    console.log(`  ✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`  ❌ MongoDB connection failed: ${error.message}`);
    // Exit the process if we can't connect to the database.
    // There's no point running the server without a database.
    process.exit(1);
  }
};

export default connectDB;
