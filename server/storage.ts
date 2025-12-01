// Cloudflare R2 storage implementation (S3-compatible)
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from './_core/env';

type StorageConfig = {
  accountId: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string; // Public URL for accessing files (e.g., custom domain or R2.dev URL)
};

function getStorageConfig(): StorageConfig {
  // Cloudflare R2 configuration
  const accountId = ENV.cloudflareAccountId || process.env.CLOUDFLARE_ACCOUNT_ID || "";
  const bucket = ENV.cloudflareBucket || process.env.CLOUDFLARE_R2_BUCKET || "";
  const accessKeyId = ENV.cloudflareAccessKeyId || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
  const secretAccessKey = ENV.cloudflareSecretAccessKey || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
  const publicUrl = ENV.cloudflarePublicUrl || process.env.CLOUDFLARE_R2_PUBLIC_URL || "";

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Cloudflare R2 credentials missing: set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_BUCKET, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY environment variables"
    );
  }

  return { accountId, bucket, accessKeyId, secretAccessKey, publicUrl };
}

function getR2Client(): S3Client {
  const config = getStorageConfig();
  
  // Cloudflare R2 uses S3-compatible API with custom endpoint
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
  
  return new S3Client({
    region: "auto", // R2 uses "auto" as region
    endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true, // R2 requires path-style addressing
  });
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

/**
 * Upload a file to Cloudflare R2
 * @param relKey - Relative key/path for the file (e.g., "user123/image.png")
 * @param data - File data as Buffer, Uint8Array, or string
 * @param contentType - MIME type of the file
 * @returns Object with key and public URL
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const client = getR2Client();
  const key = normalizeKey(relKey);

  // Convert string to Buffer if needed
  const body = typeof data === "string" ? Buffer.from(data, "utf-8") : data;

  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  try {
    await client.send(command);

    // Return public URL
    // If custom public URL is configured, use it; otherwise use R2.dev URL
    let url: string;
    if (config.publicUrl) {
      url = `${config.publicUrl.replace(/\/+$/, "")}/${key}`;
    } else {
      // Use R2.dev public URL format: https://pub-<hash>.r2.dev/<key>
      // Note: This requires the bucket to have a public domain configured
      // For production, you should set up a custom domain via Cloudflare
      url = `https://${config.bucket}.r2.dev/${key}`;
    }

    return { key, url };
  } catch (error) {
    console.error("[R2] Upload failed:", error);
    throw new Error(
      `R2 upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get a signed URL for downloading a file from R2
 * @param relKey - Relative key/path for the file
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Object with key and signed URL
 */
export async function storageGet(
  relKey: string,
  expiresIn: number = 3600
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const client = getR2Client();
  const key = normalizeKey(relKey);

  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  try {
    // Generate a presigned URL
    const url = await getSignedUrl(client, command, { expiresIn });
    return { key, url };
  } catch (error) {
    console.error("[R2] Get signed URL failed:", error);
    throw new Error(
      `R2 get signed URL failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
