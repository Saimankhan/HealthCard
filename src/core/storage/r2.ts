import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

import { serverEnv } from "@/core/config/env.server";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: serverEnv.R2_ENDPOINT,
  credentials: {
    accessKeyId: serverEnv.R2_ACCESS_KEY_ID,
    secretAccessKey: serverEnv.R2_SECRET_ACCESS_KEY,
  },
});

export const R2_BUCKET = serverEnv.R2_BUCKET_NAME;
