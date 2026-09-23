/**
 * scripts/test-db-connection.ts
 *
 * Non-destructive MongoDB Atlas connection test.
 *
 * Checks:
 * 1. MONGODB_URI availability.
 * 2. Successful handshake and authentication to MongoDB Atlas.
 * 3. Ping latency.
 * 4. Verification that connected database is explicitly "template_generator".
 * 5. Listing existing collections without mutating or deleting data.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";

// Manually load .env.local if not already in process.env
const envLocalPath = resolve(process.cwd(), ".env.local");
if (existsSync(envLocalPath)) {
  const content = readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

import { connectToDatabase } from "../lib/db";

async function runConnectionTest() {
  console.log("==================================================");
  console.log("  MongoDB Atlas Non-Destructive Connection Test   ");
  console.log("==================================================");

  if (!process.env.MONGODB_URI) {
    console.error("❌ ERROR: MONGODB_URI is not set in .env.local.");
    process.exit(1);
  }

  // Sanitize URI for log output (hide username and password)
  const sanitizedUri = process.env.MONGODB_URI.replace(
    /\/\/([^:]+):([^@]+)@/,
    "//$1:****@"
  );
  console.log(`Connecting to: ${sanitizedUri}`);

  const start = Date.now();

  try {
    const conn = await connectToDatabase();
    const duration = Date.now() - start;

    console.log(` Connected to MongoDB Atlas in ${duration}ms`);
    console.log(`Ready State: ${conn.connection.readyState} (1 = Connected)`);

    const db = conn.connection.db;
    if (!db) {
      throw new Error("Connected but database object is undefined.");
    }

    console.log(`Active Database: "${db.databaseName}"`);

    if (db.databaseName !== "template_generator") {
      console.warn(
        `⚠️ WARNING: Connected database is "${db.databaseName}", expected "template_generator".`
      );
    } else {
      console.log(` Database verification passed: target is "template_generator".`);
    }

    // Ping admin
    const pingStart = Date.now();
    await db.admin().ping();
    const pingLatency = Date.now() - pingStart;
    console.log(` Round-trip Ping Latency: ${pingLatency}ms`);

    // List collections (read-only)
    const collections = await db.listCollections().toArray();
    console.log(
      ` Existing Collections (${collections.length}):`,
      collections.map((c) => c.name)
    );

    console.log("\n Non-destructive connection test completed successfully!");
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: unknown) {
    console.error("❌ Database connection failed:");
    if (error instanceof Error) {
      console.error(`- Error: ${error.message}`);
      if ("code" in error) {
        console.error(`- Code: ${(error as { code: string | number }).code}`);
      }
    } else {
      console.error(error);
    }
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

runConnectionTest();
