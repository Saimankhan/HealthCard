import "server-only";
import { getSignedDownloadUrl, STORAGE_PREFIX } from "@/core/storage/storage";

/**
 * `User.image` stores either a raw R2 object key (for uploaded avatars) or
 * an already-usable URL (e.g. from an OAuth provider, if ever added). Resolve
 * R2 keys to a short-lived signed URL at read time since the bucket is private.
 */
export async function resolveAvatarUrl(
  image: string | null | undefined
): Promise<string | null> {
  if (!image) return null;
  if (image.startsWith(`${STORAGE_PREFIX.profilePhotos}/`)) {
    return getSignedDownloadUrl(image, 3600);
  }
  return image;
}
