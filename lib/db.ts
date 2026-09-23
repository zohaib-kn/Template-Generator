/**
 * lib/db.ts
 *
 * Production-ready Mongoose connection singleton for Next.js App Router.
 *
 * Ensures:
 * 1. Single cached connection across Fast Refresh / Hot Module Reloads.
 * 2. Explicit connection to the "template_generator" database.
 * 3. Fail-fast timeout safeguards (5 seconds server selection).
 * 4. Automatic error handling and cache invalidation on failed attempts.
 */

import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "MONGODB_URI environment variable is missing. Please define it in .env.local"
    );
  }

  // Return existing connected instance
  if (cached.conn && cached.conn.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      dbName: "template_generator",
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    };

    cached.promise = mongoose
      .connect(uri, opts)
      .then((mongooseInstance) => {
        return mongooseInstance;
      })
      .catch((err) => {
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
