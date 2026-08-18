import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, MapPin, Receipt } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { paymentStatusBadgeVariant, paymentStatusLabels } from "@/lib/payment-status";

export const Route = createFileRoute("/cuenta")({
  ssr: false,
  beforeLoad: async () => { const { data } = await supabase.auth.getUser(); if (!data.user) throw redirect({ to: "/auth" }); return { user: data.user }; },
  head: () => ({ meta: [{ title: "Mis solicitudes — Nido" }, { name: "description", content: "Consulta el estado de tus solicitudes de reserva." }] }),
  component: AccountPage,
});

const labels = { pending: "Pendiente", approved: "Aprobada", rejected: "Rechazada", cancelled: "Cancelada", completed: "Completada" } as const;
function AccountPage() {
  const { user } = Route.useRouteContext();
  const { data = [], refetch } = useQuery({ queryKey: ["my-bookings", user.id], queryFn: async () => { const { data, error } = await supabase.from("booking_requests").select("*, properties(name, city, slug)").eq("user_id", user.id).order("created_at", { ascending: false }); if (error) throw error; return data; } });
  async function cancel(id: string) { await supabase.from("booking_requests").update({ status: "cancelled" }).eq("id", id); await refetch(); }
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 py-14 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Tu espacio</p>
        <h1 className="mt-3 font-display text-5xl">Mis solicitudes</h1>
        <p className="mt-3 text-muted-foreground">Consulta tus reservaciones anteriores y sigue el estado de las próximas.</p>
        <div className="mt-10 space-y-4">
          {data.length ? (
            data.map((booking) => (
              <article key={booking.id} className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-2xl">{booking.properties?.name}</h2>
                    <Badge variant={booking.status === "approved" ? "default" : "secondary"}>{labels[booking.status]}</Badge>
                    <Badge variant={paymentStatusBadgeVariant[booking.payment_status]}>{paymentStatusLabels[booking.payment_status]}</Badge>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-4" />{booking.properties?.city}</p>
                  <div className="mt-4 flex flex-wrap gap-5 text-sm">
                    <span className="flex items-center gap-2"><CalendarDays className="size-4" />{booking.check_in} → {booking.check_out}</span>
                    <span className="flex items-center gap-2"><Clock3 className="size-4" />{booking.guests} huéspedes</span>
                  </div>
                  {booking.status === "cancelled" && (
                    <p className="mt-3 text-sm">
                      Reembolsado: <strong>{Number(booking.amount_refunded) > 0 ? "Sí" : "No"}</strong>
                      {Number(booking.amount_refunded) > 0 &&
                        ` · ${Number(booking.amount_refunded).toLocaleString("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 })}`}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {Number(booking.total_amount).toLocaleString("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 })}
                  </p>
                  <div className="mt-4 flex flex-col items-end gap-2">
                    {booking.status === "pending" && (
                      <Button variant="outline" size="sm" onClick={() => cancel(booking.id)}>Cancelar</Button>
                    )}
                    {Number(booking.amount_paid) > 0 && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to="/recibo/$bookingId" params={{ bookingId: booking.id }} target="_blank">
                          <Receipt />Ver recibo
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border py-20 text-center">
              <CalendarDays className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 font-display text-2xl">Aún no tienes solicitudes</h2>
              <Button asChild className="mt-5"><a href="/">Explorar alojamientos</a></Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}