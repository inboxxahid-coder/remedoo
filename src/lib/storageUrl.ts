import { supabase } from "@/integrations/supabase/client";

/**
 * Resolves a storage path or URL into a displayable image URL.
 * - If already a full URL (https://...), returns as-is.
 * - If a storage path (e.g. "userId/photo_123.jpg"), generates a signed URL from the certificates bucket.
 */
export async function resolveImageUrl(imageUrl: string | null | undefined, bucket = "certificates"): Promise<string | null> {
  if (!imageUrl) return null;
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;

  const { data } = await supabase.storage.from(bucket).createSignedUrl(imageUrl, 3600);
  return data?.signedUrl || null;
}
