import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { r2Client, R2_BUCKET } from "@/core/storage/r2";
import { BadRequestError } from "@/core/api/errors";

export const STORAGE_PREFIX = {
  medicalReports: "medical-reports",
  prescriptions: "prescriptions",
  profilePhotos: "profile-photos",
} as const;

type StorageCategory = keyof typeof STORAGE_PREFIX;

const MAX_FILE_SIZE_BYTES: Record<StorageCategory, number> = {
  medicalReports: 25 * 1024 * 1024,
  prescriptions: 25 * 1024 * 1024,
  profilePhotos: 5 * 1024 * 1024,
};

const ALLOWED_MIME_TYPES: Record<StorageCategory, readonly string[]> = {
  medicalReports: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  prescriptions: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  profilePhotos: ["image/jpeg", "image/png", "image/webp"],
};

/**
 * Enforced before a presigned upload URL is ever issued — the actual PUT
 * goes straight to R2, so this is the only checkpoint where we can reject an
 * unsupported or oversized file up front.
 */
export function assertValidFileUpload(
  category: StorageCategory,
  contentType: string,
  fileSize?: number
): void {
  if (!ALLOWED_MIME_TYPES[category].includes(contentType)) {
    throw new BadRequestError(`Unsupported file type: ${contentType}`);
  }
  const maxSize = MAX_FILE_SIZE_BYTES[category];
  if (fileSize !== undefined && fileSize > maxSize) {
    throw new BadRequestError(
      `File exceeds the ${Math.floor(maxSize / (1024 * 1024))}MB limit`
    );
  }
}

export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<void> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function deleteObject(key: string): Promise<void> {
  await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300
): Promise<string> {
  const command = new GetObjectCommand({ Bucket: R2_BUCKET, Key: key });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}

export async function getSignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn: expiresInSeconds });
}
