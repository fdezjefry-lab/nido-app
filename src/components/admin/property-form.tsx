import {
  Plus,
  X,
  Home,
  DollarSign,
  Users,
  Info,
  CheckSquare,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type PropertyFormValues = {
  name: string;
  city: string;
  country: string;
  short_description: string;
  description: string;
  price_per_night: number;
  max_guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  min_nights: number;
  max_nights: number;
  house_rules: string[];
};

export type ExistingImage = {
  id: string;
  storage_path: string;
  url: string;
};

export function PropertyForm({
  defaultValues,
  existingImages = [],
  onDeleteExistingImage,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  defaultValues?: Partial<PropertyFormValues>;
  existingImages?: ExistingImage[];
  onDeleteExistingImage?: (id: string, storagePath: string) => void;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (values: PropertyFormValues, files: File[]) => void;
}) {
  const [values, setValues] = useState<Record<string, string | number | string[]>>({
    name: defaultValues?.name || "",
    city: defaultValues?.city || "",
    country: defaultValues?.country || "República Dominicana",
    short_description: defaultValues?.short_description || "",
    description: defaultValues?.description || "",
    price_per_night: defaultValues?.price_per_night ?? "",
    max_guests: defaultValues?.max_guests ?? "",
    bedrooms: defaultValues?.bedrooms ?? "",
    beds: defaultValues?.beds ?? "",
    bathrooms: defaultValues?.bathrooms ?? "",
    min_nights: defaultValues?.min_nights ?? 1,
    max_nights: defaultValues?.max_nights ?? 30,
    house_rules: defaultValues?.house_rules || [],
  });

  const [ruleDraft, setRuleDraft] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  function setField(key: string, value: string | number | string[]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function addRule() {
    const trimmed = ruleDraft.trim();
    const currentRules = (values.house_rules as string[]) || [];
    if (!trimmed || currentRules.includes(trimmed)) return;
    setField("house_rules", [...currentRules, trimmed]);
    setRuleDraft("");
  }

  function removeRule(rule: string) {
    const currentRules = (values.house_rules as string[]) || [];
    setField(
      "house_rules",
      currentRules.filter((item: string) => item !== rule),
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.name || !values.city || !values.country) {
      alert("Faltan datos. Por favor, completa el nombre, la ciudad y el país del alojamiento.");
      return;
    }
    if (!values.short_description || !values.description) {
      alert("Falta información. Por favor, escribe un resumen y una descripción.");
      return;
    }
    if (Number(values.price_per_night) < 0 || values.price_per_night === "") {
      alert("El precio por noche debe ser mayor o igual a 0.");
      return;
    }

    // --- NUEVA VALIDACIÓN ESTRICTA DE CAPACIDAD ---
    const guests = Number(values.max_guests);
    const bedrooms = Number(values.bedrooms);
    const beds = Number(values.beds);
    const bathrooms = Number(values.bathrooms);

    if (
      guests < 1 ||
      values.max_guests === "" ||
      bedrooms < 1 ||
      values.bedrooms === "" ||
      beds < 1 ||
      values.beds === "" ||
      bathrooms < 1 ||
      values.bathrooms === ""
    ) {
      alert(
        "Error en la capacidad: Los huéspedes, habitaciones, camas y baños deben ser al menos 1.",
      );
      return;
    }
    // ----------------------------------------------

    const currentRules = (values.house_rules as string[]) || [];
    if (currentRules.length === 0) {
      if (ruleDraft.trim()) {
        alert("¡Tienes una norma escrita pero no le has dado al botón '+' para agregarla!");
      } else {
        alert("Faltan las normas de la casa. Agrega al menos una norma antes de guardar.");
      }
      return;
    }

    onSubmit(
      {
        name: values.name as string,
        city: values.city as string,
        country: values.country as string,
        short_description: values.short_description as string,
        description: values.description as string,
        price_per_night: Number(values.price_per_night),
        max_guests: guests,
        bedrooms: bedrooms,
        beds: beds,
        bathrooms: bathrooms,
        min_nights: Number(values.min_nights),
        max_nights: Number(values.max_nights),
        house_rules: values.house_rules as string[],
      },
      selectedFiles,
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Información Básica */}
      <div className="rounded-3xl border border-border p-6 bg-muted/20">
        <h3 className="flex items-center gap-2 font-display text-xl mb-6">
          <Home className="size-5 text-primary" /> Información básica
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nombre de la propiedad</Label>
            <Input
              value={values.name as string}
              onChange={(e) => setField("name", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Input
              value={values.city as string}
              onChange={(e) => setField("city", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label>País</Label>
            <Input
              value={values.country as string}
              onChange={(e) => setField("country", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Descripciones */}
      <div className="rounded-3xl border border-border p-6 bg-muted/20">
        <h3 className="flex items-center gap-2 font-display text-xl mb-6">
          <Info className="size-5 text-primary" /> Descripciones
        </h3>
        <div className="grid gap-6">
          <div>
            <Label>Resumen corto</Label>
            <Input
              value={values.short_description as string}
              onChange={(e) => setField("short_description", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label>Descripción detallada</Label>
            <Textarea
              value={values.description as string}
              onChange={(e) => setField("description", e.target.value)}
              required
              className="mt-2 min-h-[120px] rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* Finanzas y Capacidad */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-border p-6 bg-primary/5">
          <h3 className="flex items-center gap-2 font-display text-xl mb-6">
            <DollarSign className="size-5 text-primary" /> Precios
          </h3>
          <Label>Precio por noche (DOP)</Label>
          <Input
            type="number"
            min={0}
            value={values.price_per_night as string | number}
            onChange={(e) => setField("price_per_night", e.target.value)}
            required
            className="mt-2 h-11 rounded-xl bg-background"
          />
        </div>

        <div className="rounded-3xl border border-border p-6 bg-muted/20">
          <h3 className="flex items-center gap-2 font-display text-xl mb-6">
            <Users className="size-5 text-primary" /> Capacidad
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Huéspedes</Label>
              <Input
                type="number"
                min={1}
                value={values.max_guests as string | number}
                onChange={(e) => setField("max_guests", e.target.value)}
                required
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label>Habitaciones</Label>
              <Input
                type="number"
                min={1}
                value={values.bedrooms as string | number}
                onChange={(e) => setField("bedrooms", e.target.value)}
                required
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label>Camas</Label>
              <Input
                type="number"
                min={1}
                value={values.beds as string | number}
                onChange={(e) => setField("beds", e.target.value)}
                required
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label>Baños</Label>
              <Input
                type="number"
                min={1}
                value={values.bathrooms as string | number}
                onChange={(e) => setField("bathrooms", e.target.value)}
                required
                className="mt-2 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Normas */}
      <div className="rounded-3xl border border-border p-6 bg-muted/20">
        <h3 className="flex items-center gap-2 font-display text-xl mb-6">
          <CheckSquare className="size-5 text-primary" /> Normas de la casa
        </h3>
        <div className="flex gap-2">
          <Input
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addRule())}
            placeholder="Ej. No mascotas"
            className="h-11 rounded-xl"
          />
          <Button type="button" size="icon" onClick={addRule} className="rounded-xl">
            <Plus />
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(values.house_rules as string[]).map((rule: string) => (
            <Badge key={rule} className="rounded-full px-3 py-1 flex gap-2">
              {rule}{" "}
              <button type="button" onClick={() => removeRule(rule)}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Selector y Vista Previa de Imágenes */}
      <div className="rounded-3xl border border-border p-6 bg-muted/20">
        <h3 className="flex items-center gap-2 font-display text-xl mb-6">
          <ImageIcon className="size-5 text-primary" /> Fotos del alojamiento
        </h3>

        {/* Fotos guardadas (solo en edición) */}
        {existingImages.length > 0 && (
          <div className="mb-6">
            <Label className="mb-3 block">Imágenes actuales</Label>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
              {existingImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-border"
                >
                  <img src={img.url} alt="Foto actual" className="h-full w-full object-cover" />
                  {onDeleteExistingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        onClick={() => onDeleteExistingImage(img.id, img.storage_path)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4">
          <Label>
            {existingImages.length > 0
              ? "Agregar nuevas imágenes"
              : "Seleccionar imágenes (opcional)"}
          </Label>
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              setSelectedFiles(files);
            }}
            className="file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20 cursor-pointer h-auto py-2"
          />

          {/* VISTA PREVIA de fotos nuevas a punto de subir */}
          {selectedFiles.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                {selectedFiles.length} foto(s) lista(s) para subir
              </p>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
                {selectedFiles.map((file, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Vista previa"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full h-14 rounded-full text-lg shadow-lg"
      >
        {isSubmitting ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
