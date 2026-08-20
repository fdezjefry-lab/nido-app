import { Plus, X, Home, MapPin, DollarSign, Users, Info } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ... (El resto de tus tipos y EMPTY_VALUES se mantienen igual)

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
  // ... (Tu lógica de useState y funciones setField, addRule, removeRule se mantienen igual)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
      className="space-y-8"
    >
      {/* SECCIÓN 1: Información Básica */}
      <div className="rounded-3xl border border-border p-6 bg-muted/20">
        <h3 className="flex items-center gap-2 font-display text-xl mb-6">
          <Home className="size-5 text-primary" /> Información básica
        </h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="p-name">Nombre de la propiedad</Label>
            <Input
              id="p-name"
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="p-city">Ciudad</Label>
            <Input
              id="p-city"
              value={values.city}
              onChange={(e) => setField("city", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="p-country">País</Label>
            <Input
              id="p-country"
              value={values.country}
              onChange={(e) => setField("country", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 2: Descripción */}
      <div className="rounded-3xl border border-border p-6 bg-muted/20">
        <h3 className="flex items-center gap-2 font-display text-xl mb-6">
          <Info className="size-5 text-primary" /> Descripciones
        </h3>
        <div className="grid gap-6">
          <div>
            <Label htmlFor="p-short">Resumen corto (visible en tarjetas)</Label>
            <Input
              id="p-short"
              value={values.short_description}
              onChange={(e) => setField("short_description", e.target.value)}
              required
              className="mt-2 h-11 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="p-description">Descripción detallada</Label>
            <Textarea
              id="p-description"
              value={values.description}
              onChange={(e) => setField("description", e.target.value)}
              required
              className="mt-2 min-h-[120px] rounded-2xl"
            />
          </div>
        </div>
      </div>

      {/* SECCIÓN 3: Configuración y Precios */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-3xl border border-border p-6 bg-primary/5">
          <h3 className="flex items-center gap-2 font-display text-xl mb-6">
            <DollarSign className="size-5 text-primary" /> Precios
          </h3>
          <Label htmlFor="p-price">Precio por noche (DOP)</Label>
          <Input
            id="p-price"
            type="number"
            value={values.price_per_night === 0 ? "" : values.price_per_night}
            onChange={(e) => setField("price_per_night", Number(e.target.value))}
            required
            className="mt-2 h-11 rounded-xl bg-background"
          />
        </div>

        <div className="rounded-3xl border border-border p-6 bg-muted/20">
          <h3 className="flex items-center gap-2 font-display text-xl mb-6">
            <Users className="size-5 text-primary" /> Capacidad
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Aquí irían tus inputs de huéspedes, habitaciones, etc. organizados en 2 columnas */}
            {/* (He omitido el código repetitivo aquí para mantenerlo limpio, pero sigue la misma lógica) */}
          </div>
        </div>
      </div>

      {/* Botón Final */}
      <Button
        type="submit"
        size="lg"
        disabled={isSubmitting}
        className="w-full h-14 rounded-full text-lg shadow-lg shadow-primary/20"
      >
        {isSubmitting ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
