import { Plus, X } from "lucide-react";
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

const EMPTY_VALUES: PropertyFormValues = {
  name: "",
  city: "",
  country: "República Dominicana",
  short_description: "",
  description: "",
  price_per_night: 0,
  max_guests: 1,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  min_nights: 1,
  max_nights: 30,
  house_rules: [],
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
  const [values, setValues] = useState<PropertyFormValues>(() => {
    const initial = { ...EMPTY_VALUES };
    for (const key of Object.keys(EMPTY_VALUES) as (keyof PropertyFormValues)[]) {
      if (defaultValues?.[key] !== undefined) {
        (initial as Record<string, unknown>)[key] = defaultValues[key];
      }
    }
    return initial;
  });
  const [ruleDraft, setRuleDraft] = useState("");

  function setField<K extends keyof PropertyFormValues>(key: K, value: PropertyFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
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
      values.house_rules.filter((item) => item !== rule),
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(values);
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div>
        <Label htmlFor="p-name">Nombre</Label>
        <Input
          id="p-name"
          value={values.name}
          onChange={(e) => setField("name", e.target.value)}
          minLength={3}
          maxLength={120}
          required
        />
      </div>
      <div>
        <Label htmlFor="p-city">Ciudad</Label>
        <Input
          id="p-city"
          value={values.city}
          onChange={(e) => setField("city", e.target.value)}
          minLength={2}
          maxLength={100}
          required
        />
      </div>
      <div>
        <Label htmlFor="p-country">País</Label>
        <Input
          id="p-country"
          value={values.country}
          onChange={(e) => setField("country", e.target.value)}
          minLength={2}
          maxLength={100}
          required
        />
      </div>
      <div>
        <Label htmlFor="p-price">Precio por noche</Label>
        <Input
          id="p-price"
          type="number"
          min={1}
          value={values.price_per_night}
          onChange={(e) => setField("price_per_night", Number(e.target.value))}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="p-short">Descripción corta</Label>
        <Input
          id="p-short"
          value={values.short_description}
          onChange={(e) => setField("short_description", e.target.value)}
          minLength={10}
          maxLength={220}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="p-description">Descripción</Label>
        <Textarea
          id="p-description"
          value={values.description}
          onChange={(e) => setField("description", e.target.value)}
          minLength={20}
          maxLength={5000}
          required
        />
      </div>
      <div>
        <Label htmlFor="p-guests">Huéspedes</Label>
        <Input
          id="p-guests"
          type="number"
          min={1}
          max={30}
          value={values.max_guests}
          onChange={(e) => setField("max_guests", Number(e.target.value))}
          required
        />
      </div>
      <div>
        <Label htmlFor="p-bedrooms">Habitaciones</Label>
        <Input
          id="p-bedrooms"
          type="number"
          min={0}
          max={20}
          value={values.bedrooms}
          onChange={(e) => setField("bedrooms", Number(e.target.value))}
          required
        />
      </div>
      <div>
        <Label htmlFor="p-beds">Camas</Label>
        <Input
          id="p-beds"
          type="number"
          min={1}
          max={30}
          value={values.beds}
          onChange={(e) => setField("beds", Number(e.target.value))}
          required
        />
      </div>
      <div>
        <Label htmlFor="p-bathrooms">Baños</Label>
        <Input
          id="p-bathrooms"
          type="number"
          min={0.5}
          step={0.5}
          value={values.bathrooms}
          onChange={(e) => setField("bathrooms", Number(e.target.value))}
          required
        />
      </div>
      <div>
        <Label htmlFor="p-min-nights">Noches mínimas</Label>
        <Input
          id="p-min-nights"
          type="number"
          min={1}
          max={90}
          value={values.min_nights}
          onChange={(e) => setField("min_nights", Number(e.target.value))}
          required
        />
      </div>
      <div>
        <Label htmlFor="p-max-nights">Noches máximas</Label>
        <Input
          id="p-max-nights"
          type="number"
          min={values.min_nights}
          max={365}
          value={values.max_nights}
          onChange={(e) => setField("max_nights", Number(e.target.value))}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="p-rule">Normas de la casa</Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="p-rule"
            value={ruleDraft}
            onChange={(e) => setRuleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addRule();
              }
            }}
            placeholder="Ej. No se permiten mascotas"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={addRule}
            aria-label="Añadir norma"
          >
            <Plus />
          </Button>
        </div>
        {values.house_rules.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {values.house_rules.map((rule) => (
              <Badge key={rule} variant="secondary" className="gap-1 pr-1">
                {rule}
                <button
                  type="button"
                  onClick={() => removeRule(rule)}
                  aria-label={`Quitar norma ${rule}`}
                  className="ml-1 grid size-4 place-items-center rounded-full hover:bg-foreground/10"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting} className="self-end sm:col-span-2">
        {isSubmitting ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
