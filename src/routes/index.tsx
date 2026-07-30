import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { PropertyCard } from "@/components/property-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-nido.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Alojamientos | El Nido - Mountain Glamping" },
      {
        name: "description",
        content: "Villas, cabañas y alojamientos únicos para reservar en República Dominicana.",
      },
      { property: "og:title", content: "Alojamientos | El Nido - Mountain Glamping" },
      {
        property: "og:description",
        content: "Descubre lugares únicos para tu próxima escapada en República Dominicana.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [search, setSearch] = useState("");
  const [guests, setGuests] = useState(1);
  const { data = [], isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*, property_images(*)")
        .eq("status", "published")
        .order("featured", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const properties = useMemo(
    () =>
      data.filter(
        (item) =>
          `${item.name} ${item.city}`.toLowerCase().includes(search.toLowerCase()) &&
          item.max_guests >= guests,
      ),
    [data, guests, search],
  );
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="relative overflow-hidden">
          <img
            src={heroImage}
            alt="El Nido - Mountain Glamping"
            className="h-[70vh] min-h-[520px] w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end px-5 pb-16 lg:px-8 lg:pb-24">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-primary-foreground">
              El Nido - Mountain Glamping
            </p>
            <h1 className="max-w-4xl font-display text-5xl leading-[.98] tracking-tight text-primary-foreground sm:text-7xl lg:text-8xl">
              Glamping abrazando las nubes.
            </h1>
            <p className="mt-4 max-w-md text-base leading-7 text-primary-foreground/90">
              Nuestras cabañas de madera en lo alto de la montaña ofrecen vistas únicas y un
              contacto pleno con la naturaleza.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="-mt-10 grid gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg sm:grid-cols-[1fr_180px_auto] relative z-10">
            <label className="flex items-center gap-3 px-3">
              <Search className="size-5 text-muted-foreground" />
              <span className="sr-only">Buscar destino</span>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="¿Dónde quieres ir?"
                className="border-0 p-0 shadow-none focus-visible:ring-0"
              />
            </label>
            <label className="flex items-center gap-3 border-t border-border px-3 pt-3 sm:border-l sm:border-t-0 sm:pt-0">
              <span className="text-sm text-muted-foreground">Huéspedes</span>
              <Input
                type="number"
                min={1}
                max={30}
                value={guests}
                onChange={(e) => setGuests(Math.max(1, Number(e.target.value)))}
                className="border-0 p-0 text-right shadow-none focus-visible:ring-0"
              />
            </label>
            <Button size="lg">
              <SlidersHorizontal /> Buscar
            </Button>
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
            <div className="mb-9 flex items-end justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{properties.length} alojamientos</p>
                <h2 className="mt-1 font-display text-4xl">Nuestra selección</h2>
              </div>
            </div>
            {isLoading ? (
              <p className="text-muted-foreground">Preparando los mejores lugares…</p>
            ) : properties.length ? (
              <div className="grid gap-x-7 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
                {properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border py-20 text-center">
                <h3 className="font-display text-2xl">No encontramos coincidencias</h3>
                <p className="mt-2 text-muted-foreground">
                  Prueba con otro destino o menos huéspedes.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="border-t border-border px-5 py-8 text-center text-sm text-muted-foreground">
        Nido · Alojamientos con carácter
      </footer>
    </div>
  );
}
