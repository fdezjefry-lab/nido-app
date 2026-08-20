import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  formatCurrencyDOP,
  paymentStatusLabels,
  transactionMethodLabels,
  transactionTypeLabels,
} from "@/lib/payment-status";

// Importamos el logo directamente desde la carpeta assets
import logo from "@/assets/logo.png";

export const Route = createFileRoute("/recibo/$bookingId")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Recibo — Nido" }] }),
  component: ReceiptPage,
});

function ReceiptPage() {
  const { bookingId } = Route.useParams();
  const { data: booking, isLoading } = useQuery({
    queryKey: ["receipt-booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*, properties(name, city)")
        .eq("id", bookingId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const { data: transactions = [] } = useQuery({
    queryKey: ["receipt-transactions", bookingId],
    enabled: Boolean(booking),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_transactions")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div className="grid min-h-screen place-items-center">Cargando…</div>;
  if (!booking)
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-5 py-20 text-center">
          <h1 className="font-display text-3xl">Recibo no disponible</h1>
          <p className="mt-3 text-muted-foreground">
            No encontramos esta reserva o no tienes permiso para verla.
          </p>
        </main>
      </div>
    );

  const nights =
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86_400_000;

  return (
    <div className="min-h-screen">
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="mx-auto max-w-2xl px-5 py-14 lg:px-8">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="font-display text-4xl">Recibo</h1>
          <Button onClick={() => window.print()}>
            <Printer /> Imprimir / Guardar PDF
          </Button>
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-8 print:border-0 print:p-0">
          <div className="flex items-start justify-between">
            <div>
              {/* Aquí aumentamos el tamaño a h-16 (el doble de grande) y le dimos más margen inferior (mb-2) */}
              <img src={logo} alt="Logo Nido" className="h-16 w-auto object-contain mb-2" />
              <p className="text-sm text-muted-foreground">Recibo de reserva</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(booking.created_at).toLocaleDateString("es-DO")}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Alojamiento</p>
              <p className="font-semibold">{booking.properties?.name}</p>
              <p className="text-muted-foreground">{booking.properties?.city}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Fechas</p>
              <p className="font-semibold">
                {booking.check_in} → {booking.check_out} ({nights} noches)
              </p>
              <p className="text-muted-foreground">{booking.guests} huéspedes</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Tarifa / noche</p>
              <p className="font-semibold">{formatCurrencyDOP(Number(booking.nightly_rate))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="font-semibold">{formatCurrencyDOP(Number(booking.total_amount))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Estado de pago</p>
              <p className="font-semibold">{paymentStatusLabels[booking.payment_status]}</p>
            </div>
          </div>

          <h2 className="mt-10 font-display text-xl">Movimientos</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Medio</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_at).toLocaleDateString("es-DO")}</TableCell>
                    <TableCell>{transactionTypeLabels[t.type as "charge" | "refund"]}</TableCell>
                    <TableCell>{transactionMethodLabels[t.method] ?? t.method}</TableCell>
                    <TableCell>{t.reference ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrencyDOP(Number(t.amount))}
                    </TableCell>
                  </TableRow>
                ))}
                {!transactions.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Sin movimientos registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border pt-6 text-sm">
            <div>
              <p className="text-muted-foreground">Total pagado</p>
              <p className="font-semibold">{formatCurrencyDOP(Number(booking.amount_paid))}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total reembolsado</p>
              <p className="font-semibold">{formatCurrencyDOP(Number(booking.amount_refunded))}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
