import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarCheck,
  Check,
  Clock3,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Users,
  X,
  Banknote,
} from "lucide-react";
import { useState } from "react";
import { BookingDetailDialog } from "@/components/admin/booking-detail-dialog";
import { PropertyForm, type PropertyFormValues } from "@/components/admin/property-form";
import { PropertyImageManager } from "@/components/admin/property-image-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { claimAdmin } from "@/lib/admin.functions";
import {
  paymentStatusBadgeVariant,
  paymentStatusLabels,
  formatCurrencyDOP,
} from "@/lib/payment-status";
import { getPropertyImageUrls } from "@/lib/property-image-url";
import logo from "@/assets/logo.png";

type PropertyWithImages = Tables<"properties"> & { property_images: Tables<"property_images">[] };
type AdminSection = "resumen" | "alojamientos" | "solicitudes" | "clientes" | "finanzas";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({ meta: [{ title: "Panel de administración — Nido" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyWithImages | null>(null);
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [section, setSection] = useState<AdminSection>("resumen");
  const roleQuery = useQuery({
    queryKey: ["admin-role", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      return Boolean(data);
    },
  });
  const propertiesQuery = useQuery({
    queryKey: ["admin-properties"],
    enabled: roleQuery.data === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, property_images(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PropertyWithImages[];
    },
  });
  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings"],
    enabled: roleQuery.data === true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select("*, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const clientIds = Array.from(new Set((bookingsQuery.data ?? []).map((b) => b.user_id)));
  const clientsQuery = useQuery({
    queryKey: ["admin-clients", clientIds],
    enabled: roleQuery.data === true && clientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").in("id", clientIds);
      if (error) throw error;
      return data;
    },
  });
  const updateBooking = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase.from("booking_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-bookings"] }),
  });
  async function becomeAdmin() {
    try {
      const result = await claimAdmin();
      setNotice(
        result.claimed
          ? "Panel activado correctamente."
          : "La cuenta administradora ya fue configurada.",
      );
      await roleQuery.refetch();
    } catch {
      setNotice("No se pudo activar el panel.");
    }
  }
  const createProperty = useMutation({
    mutationFn: async (values: PropertyFormValues) => {
      const slug = values.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const { error } = await supabase
        .from("properties")
        .insert({ ...values, slug, status: "draft" });
      if (error) throw error;
    },
    onSuccess: () => {
      setNotice("Alojamiento creado como borrador.");
      setDialog(false);
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
    onError: (error: Error) => setNotice(error.message),
  });
  const updateProperty = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PropertyFormValues }) => {
      const { error } = await supabase.from("properties").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setNotice("Alojamiento actualizado.");
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    },
    onError: (error: Error) => setNotice(error.message),
  });

  if (roleQuery.isLoading)
    return <div className="grid min-h-screen place-items-center">Comprobando acceso…</div>;
  if (!roleQuery.data)
    return (
      <main className="grid min-h-screen place-items-center bg-muted px-5">
        <div className="max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Settings />
          </div>
          <h1 className="mt-6 font-display text-4xl">Configurar administrador</h1>
          <p className="mt-3 leading-7 text-muted-foreground">
            La primera cuenta que active este panel será la única administradora de Nido.
          </p>
          <Button size="lg" className="mt-7" onClick={becomeAdmin}>
            Activar esta cuenta
          </Button>
          {notice && <p className="mt-4 text-sm">{notice}</p>}
        </div>
      </main>
    );

  const properties = propertiesQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const pending = bookings.filter((item) => item.status === "pending");

  // --- LÓGICA DE HISTORIAL FINANCIERO MENSUAL ---
  // Agrupamos todas las reservas por mes usando 'reduce'
  const historialMensual = bookings.reduce(
    (acc, b) => {
      if (!b.created_at) return acc;

      const fecha = new Date(b.created_at);
      // Creamos una llave para ordenar (ej: "2026-08")
      const sortKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
      // Creamos una etiqueta amigable (ej: "agosto 2026")
      const labelMes = fecha.toLocaleDateString("es-DO", { month: "long", year: "numeric" });

      if (!acc[sortKey]) {
        acc[sortKey] = {
          key: sortKey,
          label: labelMes,
          ganancias: 0,
          devoluciones: 0,
          transacciones: [],
        };
      }

      const monto = Number(b.total_amount) || 0;
      const statusPago = b.payment_status;

      if (statusPago === "refunded" || statusPago === "partially_refunded") {
        acc[sortKey].devoluciones += monto;
      } else if (statusPago === "paid") {
        if (b.status === "approved") {
          acc[sortKey].ganancias += monto;
        }
      }

      acc[sortKey].transacciones.push(b);
      return acc;
    },
    {} as Record<
      string,
      { key: string; label: string; ganancias: number; devoluciones: number; transacciones: any[] }
    >,
  );

  // Convertimos el objeto a un arreglo y lo ordenamos (el mes más reciente primero)
  const mesesOrdenados = Object.values(historialMensual).sort((a, b) => b.key.localeCompare(a.key));
  // --- FIN LÓGICA FINANZAS ---

  return (
    <div className="min-h-screen bg-muted/50 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden min-h-screen border-r border-border bg-card p-6 lg:flex lg:flex-col">
        <a href="/" className="flex items-center">
          <img src={logo} alt="Nido" className="h-9 w-auto" />
        </a>
        <nav className="mt-10 space-y-2">
          <Button
            variant={section === "resumen" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSection("resumen")}
          >
            <LayoutDashboard /> Resumen
          </Button>
          <Button
            variant={section === "alojamientos" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSection("alojamientos")}
          >
            <Building2 /> Alojamientos
          </Button>
          <Button
            variant={section === "solicitudes" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSection("solicitudes")}
          >
            <CalendarCheck /> Solicitudes
          </Button>
          <Button
            variant={section === "clientes" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSection("clientes")}
          >
            <Users /> Clientes
          </Button>
          <Button
            variant={section === "finanzas" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setSection("finanzas")}
          >
            <Banknote /> Finanzas
          </Button>
        </nav>
        <Button
          variant="ghost"
          className="mt-auto justify-start"
          onClick={() => supabase.auth.signOut()}
        >
          <LogOut /> Cerrar sesión
        </Button>
      </aside>
      <main className="p-5 sm:p-8 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Panel privado</p>
            <h1 className="font-display text-4xl">Buenos días</h1>
          </div>
          <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus /> Nuevo alojamiento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Nuevo alojamiento</DialogTitle>
                <DialogDescription>
                  Podrás añadir fotos y disponibilidad después de crearlo.
                </DialogDescription>
              </DialogHeader>
              <PropertyForm
                submitLabel="Crear borrador"
                isSubmitting={createProperty.isPending}
                onSubmit={(values) => createProperty.mutate(values)}
              />
            </DialogContent>
          </Dialog>
        </header>
        {notice && <p className="mt-5 rounded-xl bg-card p-3 text-sm">{notice}</p>}

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Alojamientos" value={properties.length} icon={<Building2 />} />
          <Stat label="Pendientes" value={pending.length} icon={<Clock3 />} />
          <Stat
            label="Aprobadas"
            value={bookings.filter((b) => b.status === "approved").length}
            icon={<CalendarCheck />}
          />
        </section>

        {/* SECCIÓN RESUMEN O SOLICITUDES */}
        {(section === "resumen" || section === "solicitudes") && (
          <section className="mt-10">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-3xl">
                {section === "solicitudes" ? "Solicitudes" : "Solicitudes recientes"}
              </h2>
              <Badge variant="secondary">{pending.length} pendientes</Badge>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {bookings.length ? (
                (section === "solicitudes" ? bookings : bookings.slice(0, 6)).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 last:border-0"
                  >
                    <div>
                      <p className="font-semibold">{booking.properties?.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Cliente · {booking.check_in} → {booking.check_out}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{booking.status}</Badge>
                      <Badge variant={paymentStatusBadgeVariant[booking.payment_status]}>
                        {paymentStatusLabels[booking.payment_status] || booking.payment_status}
                      </Badge>
                      {booking.status === "pending" && (
                        <>
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label="Rechazar"
                            onClick={() =>
                              updateBooking.mutate({ id: booking.id, status: "rejected" })
                            }
                          >
                            <X />
                          </Button>
                          <Button
                            size="icon"
                            aria-label="Aprobar"
                            onClick={() =>
                              updateBooking.mutate({ id: booking.id, status: "approved" })
                            }
                          >
                            <Check />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetailBookingId(booking.id)}
                      >
                        Detalle
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-8 text-center text-muted-foreground">Todavía no hay solicitudes.</p>
              )}
            </div>
          </section>
        )}

        {/* SECCIÓN ALOJAMIENTOS */}
        {(section === "resumen" || section === "alojamientos") && (
          <section className="mt-10">
            <h2 className="mb-5 font-display text-3xl">Alojamientos</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {properties.map((property) => (
                <article
                  key={property.id}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <img
                    src={getPropertyImageUrls(property.property_images)[0]}
                    alt={property.name}
                    width={1344}
                    height={896}
                    loading="lazy"
                    className="aspect-[2/1] w-full object-cover"
                  />
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{property.name}</h3>
                      <Badge variant={property.status === "published" ? "default" : "secondary"}>
                        {property.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {property.city} · {formatCurrencyDOP(Number(property.price_per_night))}/noche
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await supabase
                            .from("properties")
                            .update({
                              status: property.status === "published" ? "draft" : "published",
                            })
                            .eq("id", property.id);
                          await propertiesQuery.refetch();
                        }}
                      >
                        {property.status === "published" ? "Ocultar" : "Publicar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingProperty(property)}
                      >
                        Editar
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* SECCIÓN CLIENTES */}
        {section === "clientes" && (
          <section className="mt-10">
            <h2 className="mb-5 font-display text-3xl">Clientes</h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {clientsQuery.data?.length ? (
                clientsQuery.data.map((client) => {
                  const clientBookings = bookings.filter((b) => b.user_id === client.id);
                  return (
                    <div
                      key={client.id}
                      className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 last:border-0"
                    >
                      <div>
                        <p className="font-semibold">{client.full_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {client.phone ?? "Sin teléfono"}
                        </p>
                      </div>
                      <Badge variant="secondary">{clientBookings.length} solicitudes</Badge>
                    </div>
                  );
                })
              ) : (
                <p className="p-8 text-center text-muted-foreground">Todavía no hay clientes.</p>
              )}
            </div>
          </section>
        )}

        {/* NUEVA SECCIÓN FINANZAS CON HISTORIAL */}
        {section === "finanzas" && (
          <section className="mt-10">
            <h2 className="mb-5 font-display text-3xl">Historial Financiero</h2>

            <div className="space-y-8">
              {mesesOrdenados.length > 0 ? (
                mesesOrdenados.map((mes) => (
                  <div
                    key={mes.key}
                    className="overflow-hidden rounded-2xl border border-border bg-card"
                  >
                    {/* Encabezado del mes */}
                    <div className="border-b border-border bg-muted/50 p-5">
                      <h3 className="font-display text-2xl capitalize">{mes.label}</h3>
                    </div>

                    {/* Resumen del mes */}
                    <div className="grid gap-4 border-b border-border bg-muted/20 p-5 sm:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Ganancias (Pagos de reservas aprobadas)
                        </p>
                        <p className="mt-1 text-3xl font-display text-green-600">
                          {formatCurrencyDOP(mes.ganancias)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Devuelto (Reembolsos)</p>
                        <p className="mt-1 text-3xl font-display text-red-600">
                          {formatCurrencyDOP(mes.devoluciones)}
                        </p>
                      </div>
                    </div>

                    {/* Transacciones de ese mes */}
                    <div className="p-5">
                      <h4 className="mb-4 text-sm font-semibold text-muted-foreground">
                        Transacciones del mes
                      </h4>
                      <div className="space-y-3">
                        {mes.transacciones.map((booking) => (
                          <div
                            key={booking.id}
                            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4"
                          >
                            <div>
                              <p className="font-semibold">{booking.properties?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(booking.created_at).toLocaleDateString("es-DO")} · Estado:{" "}
                                {booking.status}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                {formatCurrencyDOP(Number(booking.total_amount))}
                              </p>
                              <Badge
                                variant={paymentStatusBadgeVariant[booking.payment_status]}
                                className="mt-1"
                              >
                                {paymentStatusLabels[booking.payment_status] ||
                                  booking.payment_status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                  <p className="text-muted-foreground">
                    No hay movimientos financieros registrados.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <Dialog
        open={Boolean(editingProperty)}
        onOpenChange={(open) => !open && setEditingProperty(null)}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Editar {editingProperty?.name}
            </DialogTitle>
          </DialogHeader>
          {editingProperty && (
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details">Detalles</TabsTrigger>
                <TabsTrigger value="photos">Fotos</TabsTrigger>
              </TabsList>
              <TabsContent value="details">
                <PropertyForm
                  defaultValues={editingProperty}
                  submitLabel="Guardar cambios"
                  isSubmitting={updateProperty.isPending}
                  onSubmit={(values) =>
                    updateProperty.mutate(
                      { id: editingProperty.id, values },
                      { onSuccess: () => setEditingProperty(null) },
                    )
                  }
                />
              </TabsContent>
              <TabsContent value="photos">
                <PropertyImageManager
                  propertyId={editingProperty.id}
                  propertyName={editingProperty.name}
                />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
      {(() => {
        const detailBooking = bookings.find((b) => b.id === detailBookingId);
        return detailBooking ? (
          <BookingDetailDialog
            booking={detailBooking}
            adminUserId={user.id}
            onClose={() => setDetailBookingId(null)}
          />
        ) : null;
      })()}
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-sm">{label}</span>
        <span className="[&>svg]:size-5">{icon}</span>
      </div>
      <p className="mt-3 font-display text-3xl">{value}</p>
    </div>
  );
}
