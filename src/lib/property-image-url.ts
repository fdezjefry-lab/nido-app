import { supabase } from "@/integrations/supabase/client";
import { propertyFallbackImage } from "@/lib/property-images";
import type { Tables } from "@/integrations/supabase/types";

const BUCKET = "property-images";

export function getPropertyImageUrls(
  images: Pick<Tables<"property_images">, "storage_path" | "sort_order">[],
): string[] {
  if (!images.length) return [propertyFallbackImage];
  return [...images]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((image) => supabase.storage.from(BUCKET).getPublicUrl(image.storage_path).data.publicUrl);
}
