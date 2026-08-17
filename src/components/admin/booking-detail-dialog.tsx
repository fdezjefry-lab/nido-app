import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  formatCurrencyDOP,
  paymentStatusBadgeVariant,
  paymentStatusLabels,
  transactionMethodLabels,
  transactionTypeLabels,
} from "@/lib/payment-status";

type Booking = Tables<"booking_requests"> & { properties?: { name: string } | null };

const statusLabels: Record<Booking["status"], string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
  completed: "Completada",
};

export function BookingDetailDialog({
  booking,
  adminUserId,
  onClose,
}: {
  booking: Booking;
  adminUserId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [type, setType] = useState<"charge" | "refund">("charge");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("efectivo");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [formError, setFormError] = useState("");

  const transactionsQuery = useQuery({
    queryKey: ["booking-transactions", booking.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_transactions")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const historyQuery = useQuery({
    queryKey: ["booking-history", booking.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_status_history")
        .select("*")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const recordTransaction = useMutation({
    mutationFn: async () => {
      const parsed = Number(amount);
      if (!parsed || parsed <= 0) throw new Error("Ingresa un monto válido.");
      const { error } = await supabase.from("booking_transactions").insert({
        booking_id: booking.id,
        type,
        amount: parsed,
        method,
        reference: reference.trim() || null,
        note: note.trim() || null,
        recorded_by: adminUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAmount("");
      setReference("");
      setNote("");
      setFormError("");
      queryClient.invalidateQueries({ queryKey: ["booking-transactions", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const cancelBooking = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("booking_requests")
        .update({ status: "cancelled", admin_note: cancelReason.trim() || null })
        .eq("id", booking.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking-history", booking.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
  });

  const canCancel = booking.status === "pending" || booking.status === "approved";
  const hasCharge = (transactionsQuery.data ?? []).some((t) => t.type === "charge");

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {booking.properties?.name ?? "Reserva"}
          </DialogTitle>
          <DialogDescription>
            {booking.check_in} → {booking.check_out} · {formatCurrencyDOP(Number(booking.total_amount))}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{statusLabels[booking.status]}</Badge>
          <Badge variant={paymentStatusBadgeVariant[booking.payment_status]}>
            {paymentStatusLabels[booking.payment_status]}
          </Badge>
          {hasCharge && (
            <Button asChild size="sm" variant="outline" className="ml-auto">
              <Link to="/recibo/$bookingId" params={{ bookingId: booking.id }} target="_blank">
                <Receipt /> Ver recibo
              </Link>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <div>
            <p className="text-muted-foreground">Pagado</p>
            <p className="font-semibold">{formatCurrencyDOP(Number(booking.amount_paid))}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Reembolsado</p>
            <p className="font-semibold">{formatCurrencyDOP(Number(booking.amount_refunded))}</p>
          </div>
        </div>

        <section>
          <h3 className="mb-2 font-semibold">Movimientos</h3>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Medio</TableHead>
                  <TableHead>Referencia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(transactionsQuery.data ?? []).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.created_at).toLocaleDateString("es-DO")}</TableCell>
                    <TableCell>{transactionTypeLabels[t.type as "charge" | "refund"]}</TableCell>
                    <TableCell>{formatCurrencyDOP(Number(t.amount))}</TableCell>
                    <TableCell>{transactionMethodLabels[t.method] ?? t.method}</TableCell>
                    <TableCell>{t.reference ?? "—"}</TableCell>
                  </TableRow>
                ))}
                {!transactionsQuery.data?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Sin movimientos registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 grid gap-3 rounded-xl border border-dashed border-border p-4 sm:grid-cols-2">
            <div>
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(value) => setType(value as "charge" | "refund")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="charge">Cobro</SelectItem>
                  <SelectItem value="refund">Reembolso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto</Label>
              <Input
                className="mt-1"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Medio</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Referencia (opcional)</Label>
              <Input className="mt-1" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Nota (opcional)</Label>
              <Textarea className="mt-1" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {formError && <p className="text-sm text-destructive sm:col-span-2">{formError}</p>}
            <Button
              className="sm:col-span-2"
              disabled={recordTransaction.isPending}
              onClick={() => recordTransaction.mutate()}
            >
              Registrar movimiento
            </Button>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">Auditoría</h3>
          <ol className="space-y-2 rounded-xl border border-border p-4 text-sm">
            {(historyQuery.data ?? []).map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-4">
                <span>
                  {entry.old_status ? `${statusLabels[entry.old_status]} → ` : "Creada como "}
                  <strong>{statusLabels[entry.new_status]}</strong>
                  {entry.reason && <span className="text-muted-foreground"> · {entry.reason}</span>}
                </span>
                <span className="whitespace-nowrap text-muted-foreground">
                  {new Date(entry.created_at).toLocaleString("es-DO")}
                </span>
              </li>
            ))}
            {!historyQuery.data?.length && (
              <li className="text-center text-muted-foreground">Sin cambios registrados.</li>
            )}
          </ol>
        </section>

        {canCancel && (
          <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <Label>Cancelar reserva</Label>
            <Textarea
              className="mt-2"
              placeholder="Motivo de la cancelación (opcional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <Button
              variant="destructive"
              className="mt-2"
              disabled={cancelBooking.isPending}
              onClick={() => cancelBooking.mutate()}
            >
              Confirmar cancelación
            </Button>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
