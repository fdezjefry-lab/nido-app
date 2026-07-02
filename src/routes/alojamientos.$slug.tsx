import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import { propertyFallbackImage, propertyImages } from "@/lib/property-images";

export const Route = createFileRoute("/alojamientos/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug.replaceAll("-", " ")} — Nido` }, { name: "description", content: "Consulta detalles, disponibilidad y solicita tu estancia en Nido." }] }),
  component: PropertyDetail,
});

function PropertyDetail() {
  const { slug } = Route.useParams(); const navigate = useNavigate();
  const [range, setRange] = useState<DateRange | undefined>(); const [guests, setGuests] = useState(1); const [message, setMessage] = useState(""); const [status, setStatus] = useState("");
  const { data: property, isLoading } = useQuery({ queryKey: ["property", slug], queryFn: async () => { const { data, error } = await supabase.from("properties").select("*").eq("slug", slug).eq("status", "published").single(); if (error) throw error; return data; } });
  if (isLoading) return <div className="grid min-h-screen place-items-center">Cargando alojamiento…</div>;
  if (!property) return <div className="grid min-h-screen place-items-center">Alojamiento no encontrado</div>;
  const nights = range?.from && range.to ? differenceInCalendarDays(range.to, range.from) : 0; const total = nights * Number(property.price_per_night); const image = propertyImages[property.slug] ?? propertyFallbackImage;
  async function requestBooking() {
    if (!property) return;
    setStatus(""); const { data: userData } = await supabase.auth.getUser(); if (!userData.user) { await navigate({ to: "/auth" }); return; }
    if (!range?.from || !range.to) { setStatus("Selecciona las fechas de entrada y salida."); return; }
    const { error } = await supabase.from("booking_requests").insert({ property_id: property.id, user_id: userData.user.id, check_in: format(range.from, "yyyy-MM-dd"), check_out: format(range.to, "yyyy-MM-dd"), guests, nightly_rate: Number(property.price_per_night), total_amount: total, message: message.trim() || null });
    setStatus(error ? "No se pudo enviar. Comprueba que las fechas estén disponibles." : "Solicitud enviada. Te avisaremos cuando sea revisada.");
  }
  return <div className="min-h-screen"><SiteHeader /><main className="mx-auto max-w-7xl px-5 py-8 lg:px-8"><Button asChild variant="ghost" className="mb-5 -ml-3"><Link to="/"><ChevronLeft /> Todos los alojamientos</Link></Button><div className="relative overflow-hidden rounded-3xl"><img src={image} alt={property.name} width={1344} height={896} className="h-[48vh] min-h-96 w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" /><div className="absolute bottom-0 p-7 text-primary-foreground md:p-10"><p className="flex items-center gap-1 text-sm"><MapPin className="size-4" />{property.city}, {property.country}</p><h1 className="mt-2 font-display text-5xl sm:text-7xl">{property.name}</h1></div></div>
    <div className="grid gap-12 py-12 lg:grid-cols-[1fr_400px]"><article><p className="text-xl leading-8">{property.short_description}</p><div className="my-8 flex flex-wrap gap-6 border-y border-border py-5 text-sm"><span className="flex items-center gap-2"><Users /> Hasta {property.max_guests} huéspedes</span><span className="flex items-center gap-2"><BedDouble /> {property.bedrooms} habitaciones</span><span className="flex items-center gap-2"><Bath /> {property.bathrooms} baños</span></div><h2 className="font-display text-3xl">Sobre este lugar</h2><p className="mt-4 max-w-3xl leading-8 text-muted-foreground">{property.description}</p><h2 className="mt-10 font-display text-3xl">Normas de la casa</h2><ul className="mt-4 grid gap-3 sm:grid-cols-2">{property.house_rules.map((rule) => <li key={rule} className="flex items-center gap-2 text-sm"><Check className="size-4 text-primary" />{rule}</li>)}</ul></article>
    <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-24"><p><strong className="font-display text-3xl">{Number(property.price_per_night).toLocaleString("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 })}</strong> <span className="text-muted-foreground">/ noche</span></p><Calendar mode="range" selected={range} onSelect={setRange} disabled={{ before: new Date() }} defaultMonth={addDays(new Date(), 1)} locale={es} className="pointer-events-auto mx-auto my-5" /><label className="text-sm font-medium">Huéspedes<Input type="number" min={1} max={property.max_guests} value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="mt-2" /></label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} placeholder="Cuéntanos algo sobre tu estancia (opcional)" className="mt-4" />{nights > 0 && <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm"><div className="flex justify-between"><span>{nights} noches</span><span>{total.toLocaleString("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 })}</span></div><div className="flex justify-between font-semibold"><span>Total estimado</span><span>{total.toLocaleString("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 })}</span></div></div>}<Button size="lg" className="mt-5 w-full" onClick={requestBooking}>Solicitar reserva</Button><p className="mt-3 text-center text-xs text-muted-foreground">Solo enviarás una solicitud; no se realizará ningún pago.</p>{status && <p className="mt-4 rounded-xl bg-muted p-3 text-sm">{status}</p>}</aside></div></main></div>;
}