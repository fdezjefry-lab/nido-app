import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CalendarCheck,
  Check,
  Clock3,
  Euro,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { claimAdmin } from "@/lib/admin.functions";
import { propertyFallbackImage, propertyImages } from "@/lib/property-images";

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
  const [notice, setNotice] = useState("");
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
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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
  async function createProperty(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const { error } = await supabase.from("properties").insert({
      name,
      slug,
      city,
      description,
      short_description: String(form.get("short") ?? "").trim(),
      price_per_night: Number(form.get("price")),
      max_guests: Number(form.get("guests")),
      bedrooms: Number(form.get("bedrooms")),
      status: "draft",
    });
    setNotice(error ? error.message : "Alojamiento creado como borrador.");
    if (!error) {
      setDialog(false);
      await queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
    }
  }
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
  return (
    <div className="min-h-screen bg-muted/50 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden min-h-screen border-r border-border bg-card p-6 lg:flex lg:flex-col">
        <a href="/" className="font-display text-3xl">
          Nido.
        </a>
        <nav className="mt-10 space-y-2">
          <Button variant="secondary" className="w-full justify-start">
            <LayoutDashboard /> Resumen
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Building2 /> Alojamientos
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <CalendarCheck /> Solicitudes
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <Users /> Clientes
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">Nuevo alojamiento</DialogTitle>
                <DialogDescription>
                  Podrás añadir fotos y disponibilidad después de crearlo.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={createProperty} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="p-name">Nombre</Label>
                  <Input id="p-name" name="name" minLength={3} maxLength={120} required />
                </div>
                <div>
                  <Label htmlFor="p-city">Ciudad</Label>
                  <Input id="p-city" name="city" minLength={2} maxLength={100} required />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="p-short">Descripción corta</Label>
                  <Input id="p-short" name="short" minLength={10} maxLength={220} required />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="p-description">Descripción</Label>
                  <Textarea
                    id="p-description"
                    name="description"
                    minLength={20}
                    maxLength={5000}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="p-price">Precio por noche</Label>
                  <Input id="p-price" name="price" type="number" min={1} required />
                </div>
                <div>
                  <Label htmlFor="p-guests">Huéspedes</Label>
                  <Input id="p-guests" name="guests" type="number" min={1} max={30} required />
                </div>
                <div>
                  <Label htmlFor="p-bedrooms">Habitaciones</Label>
                  <Input id="p-bedrooms" name="bedrooms" type="number" min={0} max={20} required />
                </div>
                <Button type="submit" className="self-end">
                  Crear borrador
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>
        {notice && <p className="mt-5 rounded-xl bg-card p-3 text-sm">{notice}</p>}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Alojamientos" value={properties.length} icon={<Building2 />} />
          <Stat label="Pendientes" value={pending.length} icon={<Clock3 />} />
          <Stat
            label="Aprobadas"
            value={bookings.filter((b) => b.status === "approved").length}
            icon={<CalendarCheck />}
          />
          <Stat
            label="Valor de reservaciones"
            value={bookings
              .filter((b) => b.status === "approved")
              .reduce((sum, b) => sum + Number(b.total_amount), 0)
              .toLocaleString("es-DO", {
                style: "currency",
                currency: "DOP",
                maximumFractionDigits: 0,
              })}
            icon={<Euro />}
          />
        </section>
        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-3xl">Solicitudes recientes</h2>
            <Badge variant="secondary">{pending.length} pendientes</Badge>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            {bookings.length ? (
              bookings.slice(0, 6).map((booking) => (
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
                  </div>
                </div>
              ))
            ) : (
              <p className="p-8 text-center text-muted-foreground">Todavía no hay solicitudes.</p>
            )}
          </div>
        </section>
        <section className="mt-10">
          <h2 className="mb-5 font-display text-3xl">Alojamientos</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <article
                key={property.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <img
                  src={(propertyImages[property.slug] ?? [propertyFallbackImage])[0]}
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
                    {property.city} ·{" "}
                    {Number(property.price_per_night).toLocaleString("es-DO", {
                      style: "currency",
                      currency: "DOP",
                      maximumFractionDigits: 0,
                    })}
                    /noche
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
                    <Button size="sm" variant="ghost">
                      Editar
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
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
