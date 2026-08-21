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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const [isSaving, setIsSaving] = useState(false);

  const currentDate = new Date();
  const [filterMonth, setFilterMonth] = useState<string>(
    String(currentDate.getMonth() + 1).padStart(2, "0"),
  );
  const [filterYear, setFilterYear] = useState<string>(String(currentDate.getFullYear()));
  const [printType, setPrintType] = useState<"all" | "earnings" | "refunds">("all");

  const roleQuery = useQuery({ queryKey: ["admin-role", user.id], queryFn: async () => true });

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

  const clientIds = Array.from(
    new Set((bookingsQuery.data ?? []).map((b) => b.user_id).filter(Boolean)),
  );
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

  async function uploadImagesToSupabase(
    propertyId: string,
    propertyName: string,
    files: File[],
    startIndex: number,
  ) {
    const uploadPromises = files.map(async (file, index) => {
      const ext = file.name.split(".").pop() || "jpg";
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf("."));
      const safeName =
        nameWithoutExt
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "-")
          .replace(/-+/g, "")
          .replace(/(^-|-$)/g, "") || "foto";
      const uuid =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15);
      const path = `${propertyId}/${uuid}-${safeName}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(path, file);
      if (uploadError) throw uploadError;

      return {
        property_id: propertyId,
        storage_path: path,
        alt_text: `${propertyName} - foto`,
        sort_order: startIndex + index + 1,
      };
    });

    const imageRecords = await Promise.all(uploadPromises);
    const { error: insertError } = await supabase.from("property_images").insert(imageRecords);
    if (insertError) throw insertError;
  }

  const handleCreateProperty = async (values: PropertyFormValues, newFiles: File[]) => {
    setIsSaving(true);
    setNotice("");
    try {
      const slug = values.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const { data: newProp, error: propErr } = await supabase
        .from("properties")
        .insert({ ...values, slug, status: "draft" })
        .select()
        .single();
      if (propErr) throw propErr;

      if (newFiles.length > 0) {
        await uploadImagesToSupabase(newProp.id, values.name, newFiles, 0);
      }

      setNotice("Alojamiento y fotos guardados exitosamente.");
      setDialog(false);
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch (err: any) {
      setNotice(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateProperty = async (id: string, values: PropertyFormValues, newFiles: File[]) => {
    setIsSaving(true);
    setNotice("");
    try {
      const { error: propErr } = await supabase.from("properties").update(values).eq("id", id);
      if (propErr) throw propErr;

      if (newFiles.length > 0) {
        const existingCount = editingProperty?.property_images?.length || 0;
        await uploadImagesToSupabase(id, values.name, newFiles, existingCount);
      }

      setNotice("Alojamiento actualizado.");
      setEditingProperty(null);
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    } catch (err: any) {
      setNotice(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExistingImage = async (imageId: string, storagePath: string) => {
    try {
      await supabase.storage.from("property-images").remove([storagePath]);
      await supabase.from("property_images").delete().eq("id", imageId);
      queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
      if (editingProperty) {
        setEditingProperty({
          ...editingProperty,
          property_images: editingProperty.property_images.filter((img) => img.id !== imageId),
        });
      }
    } catch (err: any) {
      setNotice("Error al borrar la foto: " + err.message);
    }
  };

  const properties = propertiesQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const profilesList = clientsQuery.data ?? [];
  const pending = bookings.filter((item) => item.status === "pending");

  const bookingsFilteredByDate = bookings.filter((b) => {
    if (!b.created_at) return false;
    const fecha = new Date(b.created_at);
    const itemMonth = String(fecha.getMonth() + 1).padStart(2, "0");
    const itemYear = String(fecha.getFullYear());
    const matchMonth = filterMonth === "all" || itemMonth === filterMonth;
    const matchYear = filterYear === "" || filterYear === "all" || itemYear === filterYear;
    return matchMonth && matchYear;
  });

  const totalGananciasFiltradas = bookingsFilteredByDate.reduce(
    (acc, b) =>
      b.status === "approved" && b.payment_status === "paid"
        ? acc + (Number(b.total_amount) || 0)
        : acc,
    0,
  );
  const totalDevolucionesFiltradas = bookingsFilteredByDate.reduce(
    (acc, b) =>
      b.payment_status === "refunded" || b.payment_status === "partially_refunded"
        ? acc + (Number(b.total_amount) || 0)
        : acc,
    0,
  );

  const bookingsForPrint = bookingsFilteredByDate.filter((b) => {
    if (printType === "earnings") return b.status === "approved" && b.payment_status === "paid";
    if (printType === "refunds")
      return b.payment_status === "refunded" || b.payment_status === "partially_refunded";
    return true;
  });

  const nombresMeses: Record<string, string> = {
    "01": "Enero",
    "02": "Febrero",
    "03": "Marzo",
    "04": "Abril",
    "05": "Mayo",
    "06": "Junio",
    "07": "Julio",
    "08": "Agosto",
    "09": "Septiembre",
    "10": "Octubre",
    "11": "Noviembre",
    "12": "Diciembre",
    all: "Todos los meses",
  };

  return (
    <div className="min-h-screen bg-muted/50 lg:grid lg:grid-cols-[240px_1fr] print:block print:bg-white print:text-black print:h-auto print:min-h-0">
      <aside className="hidden min-h-screen border-r border-border bg-card p-6 lg:flex lg:flex-col print:hidden">
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
            <Banknote /> Finanzas y Reportes
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

      <main className="p-5 sm:p-8 lg:p-10 print:p-0 print:m-0 print:w-full print:block print:overflow-visible">
        <header className="flex flex-wrap items-center justify-between gap-4 print:hidden">
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
                  Ingresa todos los detalles de la cabaña y sube sus fotos en un solo lugar.
                </DialogDescription>
              </DialogHeader>
              <PropertyForm
                submitLabel="Crear alojamiento"
                isSubmitting={isSaving}
                onSubmit={handleCreateProperty}
              />
            </DialogContent>
          </Dialog>
        </header>

        {notice && <p className="mt-5 rounded-xl bg-card p-3 text-sm print:hidden">{notice}</p>}

        {section !== "finanzas" && (
          <section className="mt-8 grid gap-4 sm:grid-cols-3 print:hidden">
            <Stat label="Alojamientos" value={properties.length} icon={<Building2 />} />
            <Stat label="Pendientes" value={pending.length} icon={<Clock3 />} />
            <Stat
              label="Aprobadas"
              value={bookings.filter((b) => b.status === "approved").length}
              icon={<CalendarCheck />}
            />
          </section>
        )}

        {(section === "resumen" || section === "solicitudes") && (
          <section className="mt-10 print:hidden">
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-3xl">
                {section === "solicitudes" ? "Solicitudes" : "Solicitudes recientes"}
              </h2>
              <Badge variant="secondary">{pending.length} pendientes</Badge>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {bookings.length ? (
                (section === "solicitudes" ? bookings : bookings.slice(0, 6)).map((booking) => {
                  const clientProfile = profilesList.find((p) => p.id === booking.user_id);
                  const clientName = clientProfile?.full_name || "Cliente General";
                  return (
                    <div
                      key={booking.id}
                      className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 last:border-0"
                    >
                      <div>
                        <p className="font-semibold">{booking.properties?.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {clientName} · {booking.check_in} → {booking.check_out}
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
                  );
                })
              ) : (
                <p className="p-8 text-center text-muted-foreground">Todavía no hay solicitudes.</p>
              )}
            </div>
          </section>
        )}

        {(section === "resumen" || section === "alojamientos") && (
          <section className="mt-10 print:hidden">
            <h2 className="mb-5 font-display text-3xl">Alojamientos</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {properties.map((property) => {
                const hasImages = property.property_images && property.property_images.length > 0;
                const imageUrl = hasImages
                  ? getPropertyImageUrls(property.property_images)[0]
                  : null;

                return (
                  <article
                    key={property.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card flex flex-col"
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={property.name}
                        loading="lazy"
                        className="aspect-[2/1] w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-[2/1] w-full bg-muted/50 flex items-center justify-center border-b border-border text-muted-foreground">
                        <span className="text-sm font-medium">Sin imagen</span>
                      </div>
                    )}

                    <div className="p-4 flex flex-col flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold truncate">{property.name}</h3>
                        <Badge
                          variant={property.status === "published" ? "default" : "secondary"}
                          className="shrink-0"
                        >
                          {property.status}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {property.city} · {formatCurrencyDOP(Number(property.price_per_night))}
                        /noche
                      </p>
                      <div className="mt-auto pt-4 flex gap-2">
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
                          Editar alojamiento
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {section === "clientes" && (
          <section className="mt-10 print:hidden">
            <h2 className="mb-5 font-display text-3xl">Clientes</h2>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {profilesList.length ? (
                profilesList.map((client) => {
                  const clientBookings = bookings.filter((b) => b.user_id === client.id);
                  const nameText = client.full_name || "Cliente General";
                  return (
                    <div
                      key={client.id}
                      className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5 last:border-0"
                    >
                      <div>
                        <p className="font-semibold">{nameText}</p>
                      </div>
                      <Badge variant="secondary">{clientBookings.length} solicitudes</Badge>
                    </div>
                  );
                })
              ) : (
                <p className="p-8 text-center text-muted-foreground">
                  Todavía no hay clientes registrados o con reservas.
                </p>
              )}
            </div>
          </section>
        )}

        {section === "finanzas" && (
          <section className="mt-10 space-y-6 print:mt-0 print:space-y-0">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-card p-6 rounded-2xl border border-border print:hidden">
              <div>
                <h2 className="font-display text-3xl">Reporte Financiero</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Genera el reporte formal de ingresos y reembolsos.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <Label className="text-xs">Mes</Label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="mt-1 flex h-10 rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="01">Enero</option>
                    <option value="02">Febrero</option>
                    <option value="03">Marzo</option>
                    <option value="04">Abril</option>
                    <option value="05">Mayo</option>
                    <option value="06">Junio</option>
                    <option value="07">Julio</option>
                    <option value="08">Agosto</option>
                    <option value="09">Septiembre</option>
                    <option value="10">Octubre</option>
                    <option value="11">Noviembre</option>
                    <option value="12">Diciembre</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Año</Label>
                  <Input
                    type="number"
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="mt-1 h-10 w-24 rounded-xl"
                    placeholder="Ej. 2026"
                  />
                </div>
                <div>
                  <Label className="text-xs">Mostrar en Reporte</Label>
                  <select
                    value={printType}
                    onChange={(e) => setPrintType(e.target.value as "all" | "earnings" | "refunds")}
                    className="mt-1 flex h-10 rounded-xl border border-input bg-background px-3 py-1 text-sm shadow-sm font-medium"
                  >
                    <option value="all">Ambos (Ganancias y Desembolsos)</option>
                    <option value="earnings">Solo Ganancias</option>
                    <option value="refunds">Solo Desembolsos</option>
                  </select>
                </div>
                <Button onClick={() => window.print()} className="mt-5 shadow-lg">
                  Imprimir reporte
                </Button>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-border bg-card p-10 print:border-none print:shadow-none print:w-full print:m-0 print:block print:bg-white print:text-black print:overflow-visible">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <img src={logo} alt="Nido Logo" className="h-16 w-auto object-contain mb-3" />
                  <p className="text-muted-foreground print:text-gray-500 text-[15px] font-medium tracking-tight">
                    Reporte financiero
                  </p>
                </div>
                <div className="text-muted-foreground print:text-gray-500 text-sm font-medium">
                  {new Date().toLocaleDateString("es-DO")}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-8 gap-x-6 mb-12">
                <div>
                  <p className="text-muted-foreground print:text-gray-500 text-[13px] mb-1">
                    Período evaluado
                  </p>
                  <p className="font-semibold text-[15px] uppercase">
                    {nombresMeses[filterMonth]} {filterYear}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground print:text-gray-500 text-[13px] mb-1">
                    Filtro aplicado
                  </p>
                  <p className="font-semibold text-[15px]">
                    {printType === "all"
                      ? "Ganancias y Desembolsos"
                      : printType === "earnings"
                        ? "Solo Ganancias"
                        : "Solo Desembolsos"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground print:text-gray-500 text-[13px] mb-1">
                    Generado por
                  </p>
                  <p className="font-semibold text-[15px]">Administración Nido</p>
                </div>
              </div>
              <h2 className="font-display text-2xl font-bold mb-5 tracking-tight">Movimientos</h2>
              <div className="rounded-[1.25rem] border border-border print:border-gray-300 overflow-hidden print:overflow-visible mb-12">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border print:border-gray-300 bg-transparent text-muted-foreground print:text-gray-500">
                      <th className="py-4 px-5 font-normal text-[14px]">Fecha</th>
                      <th className="py-4 px-5 font-normal text-[14px]">Cliente</th>
                      <th className="py-4 px-5 font-normal text-[14px]">Alojamiento</th>
                      <th className="py-4 px-5 font-normal text-[14px]">Estado</th>
                      <th className="py-4 px-5 font-normal text-[14px] text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 print:divide-gray-200">
                    {bookingsForPrint.length > 0 ? (
                      bookingsForPrint.map((booking) => {
                        const clientProfile = profilesList.find((p) => p.id === booking.user_id);
                        return (
                          <tr key={booking.id} className="text-[14px]">
                            <td className="py-4 px-5 whitespace-nowrap">
                              {new Date(booking.created_at).toLocaleDateString("es-DO")}
                            </td>
                            <td className="py-4 px-5 font-medium">
                              {clientProfile?.full_name || "Cliente General"}
                            </td>
                            <td className="py-4 px-5">{booking.properties?.name}</td>
                            <td className="py-4 px-5">
                              {paymentStatusLabels[booking.payment_status] ||
                                booking.payment_status}
                            </td>
                            <td className="py-4 px-5 text-right font-medium whitespace-nowrap">
                              {formatCurrencyDOP(Number(booking.total_amount))}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-muted-foreground print:text-gray-500"
                        >
                          No se registraron movimientos con estos filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-border print:border-gray-300 pt-6 flex flex-wrap gap-x-24 gap-y-6">
                {printType !== "refunds" && (
                  <div>
                    <p className="text-muted-foreground print:text-gray-500 text-[14px] mb-1">
                      Total pagado
                    </p>
                    <p className="font-bold text-[17px]">
                      {formatCurrencyDOP(totalGananciasFiltradas)}
                    </p>
                  </div>
                )}
                {printType !== "earnings" && (
                  <div>
                    <p className="text-muted-foreground print:text-gray-500 text-[14px] mb-1">
                      Total reembolsado
                    </p>
                    <p className="font-bold text-[17px]">
                      {formatCurrencyDOP(totalDevolucionesFiltradas)}
                    </p>
                  </div>
                )}
              </div>
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
            <PropertyForm
              defaultValues={editingProperty}
              existingImages={editingProperty.property_images.map((img) => ({
                id: img.id,
                storage_path: img.storage_path,
                url: supabase.storage.from("property-images").getPublicUrl(img.storage_path).data
                  .publicUrl,
              }))}
              onDeleteExistingImage={handleDeleteExistingImage}
              submitLabel="Guardar cambios"
              isSubmitting={isSaving}
              onSubmit={(values, files) => handleUpdateProperty(editingProperty.id, values, files)}
            />
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
