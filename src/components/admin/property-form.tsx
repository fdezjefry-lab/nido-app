import { Plus, X, Home, DollarSign, Users, Info, CheckSquare } from "lucide-react";
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

export function PropertyForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  defaultValues?: Partial<PropertyFormValues>;
  submitLabel: string;
  isSubmitting?: boolean;
  onSubmit: (values: PropertyFormValues) => void;
}) {
  // Usamos "any" o permitimos strings temporalmente para que los inputs numéricos puedan estar vacíos ("")
  // al crear un alojamiento, en lugar de obligar al usuario a borrar un "0".
  const [values, setValues] = useState<any>({
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

  function setField(key: string, value: any) {
    setValues((current: any) => ({ ...current, [key]: value }));
  }

  function addRule() {
    const trimmed = ruleDraft.trim();
    if (!trimmed || values.house_rules.includes(trimmed)) return;
    setField("house_rules", [...values.house_rules, trimmed]);
    setRuleDraft("");
  }

  function removeRule(rule: string) {
    setField(
      "house_rules",
      values.house_rules.filter((item: string) => item !== rule),
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Justo antes de enviarlo, aseguramos que todo se convierta a número real para Supabase
        onSubmit({
          ...values,
          price_per_night: Number(values.price_per_night),
          max_guests: Number(values.max_guests),
          bedrooms: Number(values.bedrooms),
          beds: Number(values.beds),
          bathrooms: Number(values.bathrooms),
          min_nights: Number(values.min_nights),
          max_nights: Number(values.max_nights),
        });
      }}
      className="space-y-8"
    >
      {/* Información Básica */}
      <div className="rounded-3xl border border-border p-6 bg-muted/20">
        <h3 className="flex items-center gap-2 font-display text-xl mb-6">
          <Home className="size-5 text-primary" /> Información básica
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nombre de la propiedad</Label>
            <Input
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Input
              value={values.city}
              onChange={(e) => setField("city", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label>País</Label>
            <Input
              value={values.country}
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
              value={values.short_description}
              onChange={(e) => setField("short_description", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label>Descripción detallada</Label>
            <Textarea
              value={values.description}
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
            value={values.price_per_night}
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
                value={values.max_guests}
                onChange={(e) => setField("max_guests", e.target.value)}
                required
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label>Habitaciones</Label>
              <Input
                type="number"
                value={values.bedrooms}
                onChange={(e) => setField("bedrooms", e.target.value)}
                required
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label>Camas</Label>
              <Input
                type="number"
                value={values.beds}
                onChange={(e) => setField("beds", e.target.value)}
                required
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label>Baños</Label>
              <Input
                type="number"
                value={values.bathrooms}
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
          {values.house_rules.map((rule: string) => (
            <Badge key={rule} className="rounded-full px-3 py-1 flex gap-2">
              {rule}{" "}
              <button type="button" onClick={() => removeRule(rule)}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
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
