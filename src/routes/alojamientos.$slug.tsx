import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Bath, BedDouble, Check, ChevronLeft, MapPin, Users } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { PropertyImageSwiper } from "@/components/property-image-swiper";
import { propertyFallbackImage, propertyImages } from "@/lib/property-images";

export const Route = createFileRoute("/alojamientos/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replaceAll("-", " ")} — Nido` },
      {
        name: "description",
        content: "Consulta detalles, disponibilidad y solicita tu estancia en Nido.",
      },
    ],
  }),
  component: PropertyDetail,
});

function PropertyDetail() {
  const { slug } = Route.useParams();
  const [range, setRange] = useState<DateRange | undefined>();
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const { data: property, isLoading } = useQuery({
    queryKey: ["property", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();
      if (error) throw error;
      return data;
    },
  });
  if (isLoading)
    return <div className="grid min-h-screen place-items-center">Cargando alojamiento…</div>;
  if (!property)
    return <div className="grid min-h-screen place-items-center">Alojamiento no encontrado</div>;
  const nights = range?.from && range.to ? differenceInCalendarDays(range.to, range.from) : 0;
  const total = nights * Number(property.price_per_night);

  function reserveByWhatsApp() {
    if (!property) return;
    const fechas =
      range?.from && range.to
        ? `del ${format(range.from, "d 'de' MMMM", { locale: es })} al ${format(range.to, "d 'de' MMMM", { locale: es })}`
        : "(sin fechas seleccionadas aún)";
    const nota = message.trim() ? ` Nota: ${message.trim()}.` : "";
    const mensaje = `¡Hola! Quiero reservar *${property.name}* ${fechas}, para ${guests} huésped${guests > 1 ? "es" : ""}.${nota} ¿Está disponible?`;
    const url = `https://wa.me/18092921223?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Button asChild variant="ghost" className="mb-5 -ml-3">
          <Link to="/">
            <ChevronLeft /> Todos los alojamientos
          </Link>
        </Button>
        <PropertyImageSwiper
          images={propertyImages[property.slug] ?? [propertyFallbackImage]}
          alt={property.name}
        >
          <div className="absolute bottom-0 p-7 text-primary-foreground md:p-10">
            <p className="flex items-center gap-1 text-sm">
              <MapPin className="size-4" />
              {property.city}, {property.country}
            </p>
            <h1 className="mt-2 font-display text-5xl sm:text-7xl">{property.name}</h1>
          </div>
        </PropertyImageSwiper>
        <div className="grid gap-12 py-12 lg:grid-cols-[1fr_400px]">
          <article>
            <p className="text-xl leading-8">{property.short_description}</p>
            <div className="my-8 flex flex-wrap gap-6 border-y border-border py-5 text-sm">
              <span className="flex items-center gap-2">
                <Users /> Hasta {property.max_guests} huéspedes
              </span>
              <span className="flex items-center gap-2">
                <BedDouble /> {property.bedrooms} habitaciones
              </span>
              <span className="flex items-center gap-2">
                <Bath /> {property.bathrooms} baños
              </span>
            </div>
            <h2 className="font-display text-3xl">Sobre este lugar</h2>
            <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">{property.description}</p>
            <h2 className="mt-10 font-display text-3xl">Normas de la casa</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {property.house_rules.map((rule) => (
                <li key={rule} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 text-primary" />
                  {rule}
                </li>
              ))}
            </ul>
          </article>
          <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24">
            <p>
              <strong className="font-display text-3xl">
                {Number(property.price_per_night).toLocaleString("es-DO", {
                  style: "currency",
                  currency: "DOP",
                  maximumFractionDigits: 0,
                })}
              </strong>{" "}
              <span className="text-muted-foreground">/ noche</span>
            </p>
            <Calendar
              mode="range"
              selected={range}
              onSelect={setRange}
              disabled={{ before: new Date() }}
              defaultMonth={addDays(new Date(), 1)}
              locale={es}
              className="pointer-events-auto mx-auto my-5"
            />
            <label className="text-sm font-medium">
              Huéspedes
              <Input
                type="number"
                min={1}
                max={property.max_guests}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="mt-2"
              />
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              placeholder="Cuéntanos algo sobre tu estancia (opcional)"
              className="mt-4"
            />
            {nights > 0 && (
              <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between">
                  <span>{nights} noches</span>
                  <span>
                    {total.toLocaleString("es-DO", {
                      style: "currency",
                      currency: "DOP",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total estimado</span>
                  <span>
                    {total.toLocaleString("es-DO", {
                      style: "currency",
                      currency: "DOP",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </div>
            )}
            <Button size="lg" className="mt-5 w-full" onClick={reserveByWhatsApp}>
              Reservar por WhatsApp
            </Button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Te contactaremos directo por WhatsApp para confirmar tu reserva.
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
