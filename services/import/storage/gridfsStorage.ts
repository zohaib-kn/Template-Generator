/**
 * services/import/storage/gridfsStorage.ts
 *
 * Secure in-database private storage for uploaded resume files (PDF, DOCX)
 * using MongoDB GridFS.
 *
 * Architecture:
 * - Reuses existing MongoDB Atlas connection from lib/db.ts.
 * - Stores raw buffers in standard GridFS buckets (bucketName: "resume_files").
 * - Zero public exposure: Files are only accessible via authenticated server route.
 */

import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import { connectToDatabase } from "@/lib/db";
import { Readable } from "node:stream";

const DEFAULT_BUCKET_NAME = "document_files";

function getGridFSBucket(bucketName: string = DEFAULT_BUCKET_NAME): GridFSBucket {
  if (!mongoose.connection.db) {
    throw new Error("MongoDB connection is not established.");
  }
  return new GridFSBucket(mongoose.connection.db, {
    bucketName,
  });
}

/**
 * Saves a file buffer to MongoDB GridFS.
 * Returns the created ObjectId as a hex string.
 */
export async function saveFileToGridFS(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  bucketName: string = DEFAULT_BUCKET_NAME
): Promise<string> {
  await connectToDatabase();
  const bucket = getGridFSBucket(bucketName);

  return new Promise((resolve, reject) => {
    const readable = Readable.from(buffer);
    const uploadStream = bucket.openUploadStream(fileName, {
      metadata: {
        contentType: mimeType,
        uploadedAt: new Date().toISOString(),
      },
    });

    readable
      .pipe(uploadStream)
      .on("error", (err) => reject(err))
      .on("finish", () => {
        resolve(uploadStream.id.toString());
      });
  });
}

/**
 * Retrieves a file from MongoDB GridFS as a Buffer.
 */
export async function getFileFromGridFS(
  fileId: string,
  bucketName: string = DEFAULT_BUCKET_NAME
): Promise<{ buffer: Buffer; fileName: string; contentType: string } | null> {
  await connectToDatabase();
  const bucket = getGridFSBucket(bucketName);

  try {
    const objectId = new ObjectId(fileId);
    const files = await bucket.find({ _id: objectId }).toArray();
    if (!files || files.length === 0) {
      // Fallback check in resume_files legacy bucket if not found in default
      if (bucketName !== "resume_files") {
        const legacyBucket = getGridFSBucket("resume_files");
        const legacyFiles = await legacyBucket.find({ _id: objectId }).toArray();
        if (legacyFiles && legacyFiles.length > 0) {
          const fileMeta = legacyFiles[0];
          const downloadStream = legacyBucket.openDownloadStream(objectId);
          const chunks: Buffer[] = [];
          const contentType =
            (fileMeta.metadata as { contentType?: string } | undefined)?.contentType ||
            "application/octet-stream";

          return new Promise((resolve, reject) => {
            downloadStream
              .on("data", (chunk: Buffer) => chunks.push(chunk))
              .on("error", (err) => reject(err))
              .on("end", () => {
                resolve({
                  buffer: Buffer.concat(chunks),
                  fileName: fileMeta.filename,
                  contentType,
                });
              });
          });
        }
      }
      return null;
    }

    const fileMeta = files[0];
    const downloadStream = bucket.openDownloadStream(objectId);
    const chunks: Buffer[] = [];

    const contentType =
      (fileMeta.metadata as { contentType?: string } | undefined)?.contentType ||
      "application/octet-stream";

    return new Promise((resolve, reject) => {
      downloadStream
        .on("data", (chunk: Buffer) => chunks.push(chunk))
        .on("error", (err) => reject(err))
        .on("end", () => {
          resolve({
            buffer: Buffer.concat(chunks),
            fileName: fileMeta.filename,
            contentType,
          });
        });
    });
  } catch (err) {
    console.error("[gridfsStorage] Error retrieving file:", err);
    return null;
  }
}

/**
 * Deletes a file from MongoDB GridFS.
 */
export async function deleteFileFromGridFS(
  fileId: string,
  bucketName: string = DEFAULT_BUCKET_NAME
): Promise<boolean> {
  await connectToDatabase();
  const bucket = getGridFSBucket(bucketName);

  try {
    const objectId = new ObjectId(fileId);
    await bucket.delete(objectId);
    return true;
  } catch (err) {
    console.error("[gridfsStorage] Error deleting file:", err);
    return false;
  }
}

