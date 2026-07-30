import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const BUCKET = "property-images";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 20;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type PropertyImage = Tables<"property_images">;

export function PropertyImageManager({
  propertyId,
  propertyName,
}: {
  propertyId: string;
  propertyName: string;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  const queryKey = ["admin-property-images", propertyId];
  const imagesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_images")
        .select("*")
        .eq("property_id", propertyId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const images = imagesQuery.data ?? [];

  const uploadImages = useMutation({
    mutationFn: async (files: FileList) => {
      const list = Array.from(files);
      if (images.length + list.length > MAX_IMAGES) {
        throw new Error(`Máximo ${MAX_IMAGES} imágenes por alojamiento.`);
      }
      let nextSortOrder = images.reduce((max, img) => Math.max(max, img.sort_order), -1) + 1;
      for (const file of list) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error(`Formato no permitido: ${file.name}. Usa JPG, PNG o WebP.`);
        }
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(`${file.name} pesa más de 8 MB.`);
        }
        const path = `${propertyId}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file);
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabase.from("property_images").insert({
          property_id: propertyId,
          storage_path: path,
          alt_text: `${propertyName} - foto ${nextSortOrder + 1}`,
          sort_order: nextSortOrder,
        });
        if (insertError) throw insertError;
        nextSortOrder += 1;
      }
    },
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteImage = useMutation({
    mutationFn: async (image: PropertyImage) => {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([image.storage_path]);
      if (storageError) throw storageError;
      const { error: deleteError } = await supabase
        .from("property_images")
        .delete()
        .eq("id", image.id);
      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err: Error) => setError(err.message),
  });

  const moveImage = useMutation({
    mutationFn: async ({
      image,
      direction,
    }: {
      image: PropertyImage;
      direction: "up" | "down";
    }) => {
      const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
      const index = sorted.findIndex((item) => item.id === image.id);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= sorted.length) return;
      const neighbor = sorted[swapIndex];
      const [{ error: err1 }, { error: err2 }] = await Promise.all([
        supabase
          .from("property_images")
          .update({ sort_order: neighbor.sort_order })
          .eq("id", image.id),
        supabase
          .from("property_images")
          .update({ sort_order: image.sort_order })
          .eq("id", neighbor.id),
      ]);
      if (err1 || err2) throw err1 ?? err2;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {images.length} / {MAX_IMAGES} imágenes
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={uploadImages.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploadImages.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
          Subir fotos
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) uploadImages.mutate(event.target.files);
            event.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {imagesQuery.isLoading ? (
        <p className="mt-4 text-sm text-muted-foreground">Cargando imágenes…</p>
      ) : images.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-xl border border-border"
            >
              <img
                src={supabase.storage.from(BUCKET).getPublicUrl(image.storage_path).data.publicUrl}
                alt={image.alt_text}
                className="aspect-square w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center gap-1 bg-foreground/0 opacity-0 transition group-hover:bg-foreground/40 group-hover:opacity-100">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-8"
                  disabled={index === 0 || moveImage.isPending}
                  onClick={() => moveImage.mutate({ image, direction: "up" })}
                  aria-label="Mover antes"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="size-8"
                  disabled={index === images.length - 1 || moveImage.isPending}
                  onClick={() => moveImage.mutate({ image, direction: "down" })}
                  aria-label="Mover después"
                >
                  <ArrowDown className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="size-8"
                  disabled={deleteImage.isPending}
                  onClick={() => deleteImage.mutate(image)}
                  aria-label="Eliminar imagen"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Todavía no hay fotos para este alojamiento.
        </p>
      )}
    </div>
  );
}
