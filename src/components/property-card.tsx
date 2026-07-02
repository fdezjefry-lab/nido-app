import { Link } from "@tanstack/react-router";
import { ArrowUpRight, BedDouble, MapPin, Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { propertyFallbackImage, propertyImages } from "@/lib/property-images";

export function PropertyCard({ property }: { property: Tables<"properties"> }) {
  const image = propertyImages[property.slug] ?? propertyFallbackImage;
  return (
    <article className="group">
      <Link to="/alojamientos/$slug" params={{ slug: property.slug }} className="block overflow-hidden rounded-3xl bg-muted">
        <img src={image} alt={property.name} width={1344} height={896} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-700 group-hover:scale-105" />
      </Link>
      <div className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div><p className="flex items-center gap-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground"><MapPin className="size-3" />{property.city}</p><h2 className="mt-1 font-display text-2xl font-semibold">{property.name}</h2></div>
          <Link to="/alojamientos/$slug" params={{ slug: property.slug }} className="grid size-10 shrink-0 place-items-center rounded-full border border-border transition group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground" aria-label={`Ver ${property.name}`}><ArrowUpRight className="size-4" /></Link>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{property.short_description}</p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
          <div className="flex gap-4 text-muted-foreground"><span className="flex items-center gap-1"><Users className="size-4" />{property.max_guests}</span><span className="flex items-center gap-1"><BedDouble className="size-4" />{property.bedrooms}</span></div>
          <p><strong className="text-lg">{Number(property.price_per_night).toLocaleString("es-DO", { style: "currency", currency: "DOP", maximumFractionDigits: 0 })}</strong> <span className="text-muted-foreground">/ noche</span></p>
        </div>
      </div>
    </article>
  );
}