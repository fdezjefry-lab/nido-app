import type { Database } from "@/integrations/supabase/types";

type PaymentStatus = Database["public"]["Enums"]["payment_status"];

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: "Sin pagar",
  partially_paid: "Pago parcial",
  paid: "Pagado",
  partially_refunded: "Reembolso parcial",
  refunded: "Reembolsado",
};

export const paymentStatusBadgeVariant: Record<
  PaymentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  unpaid: "outline",
  partially_paid: "secondary",
  paid: "default",
  partially_refunded: "secondary",
  refunded: "destructive",
};

export const transactionTypeLabels: Record<"charge" | "refund", string> = {
  charge: "Cobro",
  refund: "Reembolso",
};

export const transactionMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

export function formatCurrencyDOP(amount: number) {
  return amount.toLocaleString("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0,
  });
}
