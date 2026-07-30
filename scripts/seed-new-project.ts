// One-time script: bootstraps the fresh Supabase project with the same data the
// original (inaccessible) project had — 3 sample properties, their amenities,
// and an admin user — plus uploads the legacy photos from src/assets/.
// Run once with: bun run scripts/seed-new-project.ts
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { supabaseAdmin } from "../src/integrations/supabase/client.server";

const ADMIN_EMAIL = "jhonbatista@ktpillartech.com";
const ADMIN_PASSWORD = "RZTaNjBvD7neL%Yn";
const ADMIN_FULL_NAME = "Jhon Batista";

const PROPERTIES = [
  {
    id: "1680ec50-e06e-4290-a473-5756332ec764",
    slug: "cabana-pinar-jarabacoa",
    name: "Cabaña del Pinar",
    city: "Jarabacoa, La Vega",
    country: "República Dominicana",
    short_description: "Madera, aire fresco y montaña para desconectar de la ciudad.",
    description:
      "Una cabaña contemporánea rodeada de pinos, con grandes ventanales hacia las montañas, terraza y espacios acogedores. Ideal para explorar senderos, ríos y cascadas de Jarabacoa en cualquier época del año.",
    price_per_night: 9500.0,
    max_guests: 4,
    bedrooms: 2,
    beds: 3,
    bathrooms: 2.0,
    min_nights: 2,
    max_nights: 14,
    house_rules: ["No fumar", "Se admiten mascotas bajo petición", "Respeta el entorno"],
    status: "published",
    featured: true,
  },
  {
    id: "875b2885-e7c9-4d3d-afea-f5a4668e02bf",
    slug: "villa-brisa-las-terrenas",
    name: "Villa Brisa del Mar",
    city: "Las Terrenas, Samaná",
    country: "República Dominicana",
    short_description: "Una villa tropical privada a pocos minutos de playas de arena clara.",
    description:
      "Villa Brisa del Mar combina espacios abiertos, vegetación tropical y una piscina privada para disfrutar del ritmo tranquilo de Las Terrenas. Está cerca de Playa Bonita, restaurantes locales y excursiones por la península de Samaná.",
    price_per_night: 18500.0,
    max_guests: 6,
    bedrooms: 3,
    beds: 4,
    bathrooms: 2.5,
    min_nights: 2,
    max_nights: 21,
    house_rules: ["No se permiten fiestas", "No fumar", "Silencio a partir de las 23:00"],
    status: "published",
    featured: true,
  },
  {
    id: "75edee15-efe8-464d-974b-bceb1804212e",
    slug: "loft-ciudad-colonial",
    name: "Loft Ciudad Colonial",
    city: "Santo Domingo, Distrito Nacional",
    country: "República Dominicana",
    short_description: "Diseño sereno e historia en el corazón de la Ciudad Colonial.",
    description:
      "Un loft de techos altos y detalles restaurados a pocos pasos de la Zona Colonial, museos, plazas y restaurantes. Una base cómoda para descubrir la vida cultural de Santo Domingo.",
    price_per_night: 7200.0,
    max_guests: 2,
    bedrooms: 1,
    beds: 1,
    bathrooms: 1.0,
    min_nights: 2,
    max_nights: 10,
    house_rules: ["No se permiten fiestas", "No fumar", "Entrada a partir de las 15:00"],
    status: "published",
    featured: false,
  },
];

const AMENITIES = [
  { id: "30d0d68e-9bec-4af7-bf30-f1c8d6866031", name: "Wifi", icon: "wifi" },
  { id: "49b7338e-8139-4e4d-ad9d-f5327894502c", name: "Piscina", icon: "waves" },
  { id: "db612af6-2967-4810-8bd5-b2ec540b8484", name: "Cocina", icon: "cooking-pot" },
  { id: "6f735143-611b-467f-875b-e71f362e7128", name: "Aire acondicionado", icon: "snowflake" },
  { id: "53b8d4b5-8621-4218-9e92-a921f63b47f5", name: "Chimenea", icon: "flame" },
  { id: "5d3799fc-46c7-473a-b47a-35f2d142e2c0", name: "Espacio de trabajo", icon: "laptop" },
  { id: "8c6507b0-fbca-48ab-9cc9-bde9840bc635", name: "Vistas al mar", icon: "sailboat" },
  { id: "ea26bcf0-130c-465e-800d-1fd421f6a284", name: "Aparcamiento", icon: "car" },
];

const PROPERTY_AMENITIES: [string, string][] = [
  ["875b2885-e7c9-4d3d-afea-f5a4668e02bf", "30d0d68e-9bec-4af7-bf30-f1c8d6866031"],
  ["1680ec50-e06e-4290-a473-5756332ec764", "30d0d68e-9bec-4af7-bf30-f1c8d6866031"],
  ["75edee15-efe8-464d-974b-bceb1804212e", "30d0d68e-9bec-4af7-bf30-f1c8d6866031"],
  ["875b2885-e7c9-4d3d-afea-f5a4668e02bf", "49b7338e-8139-4e4d-ad9d-f5327894502c"],
  ["875b2885-e7c9-4d3d-afea-f5a4668e02bf", "db612af6-2967-4810-8bd5-b2ec540b8484"],
  ["1680ec50-e06e-4290-a473-5756332ec764", "db612af6-2967-4810-8bd5-b2ec540b8484"],
  ["75edee15-efe8-464d-974b-bceb1804212e", "db612af6-2967-4810-8bd5-b2ec540b8484"],
  ["875b2885-e7c9-4d3d-afea-f5a4668e02bf", "6f735143-611b-467f-875b-e71f362e7128"],
  ["75edee15-efe8-464d-974b-bceb1804212e", "6f735143-611b-467f-875b-e71f362e7128"],
  ["1680ec50-e06e-4290-a473-5756332ec764", "53b8d4b5-8621-4218-9e92-a921f63b47f5"],
  ["75edee15-efe8-464d-974b-bceb1804212e", "5d3799fc-46c7-473a-b47a-35f2d142e2c0"],
  ["875b2885-e7c9-4d3d-afea-f5a4668e02bf", "8c6507b0-fbca-48ab-9cc9-bde9840bc635"],
  ["875b2885-e7c9-4d3d-afea-f5a4668e02bf", "ea26bcf0-130c-465e-800d-1fd421f6a284"],
  ["1680ec50-e06e-4290-a473-5756332ec764", "ea26bcf0-130c-465e-800d-1fd421f6a284"],
];

const LEGACY_IMAGES: Record<string, string[]> = {
  "villa-brisa-las-terrenas": [
    "casa-mar1.jpg",
    "casa-mar2.jpg",
    "casa-mar3.jpg",
    "casa-mar4.jpg",
    "casa-mar5.jpg",
    "casa-mar6.jpg",
    "casa-mar7.jpg",
    "casa-mar8.jpg",
  ],
  "cabana-pinar-jarabacoa": [
    "colibri1.jpg",
    "colibri2.jpg",
    "colibri3.jpg",
    "colibri4.jpg",
    "colibri5.jpg",
    "colibri6.jpg",
    "colibri7.jpg",
  ],
  "loft-ciudad-colonial": [
    "gavilan1.jpg",
    "gavilan2.jpg",
    "gavilan3.jpg",
    "gavilan4.jpg",
    "gavilan5.jpg",
    "gavilan6.jpg",
    "gavilan7.jpg",
    "gavilan8.jpg",
  ],
};

async function ensureAdmin() {
  const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
  let user = existing?.users.find((u) => u.email === ADMIN_EMAIL);

  if (!user) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log(`[ok] Usuario creado: ${ADMIN_EMAIL}`);
  } else {
    console.log(`[skip] Usuario ya existe: ${ADMIN_EMAIL}`);
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: user.id, full_name: ADMIN_FULL_NAME });
  if (profileError) throw profileError;

  const { data: existingRole } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!existingRole) {
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });
    if (roleError) throw roleError;
    console.log(`[ok] Rol admin asignado a ${ADMIN_EMAIL}`);
  } else {
    console.log(`[skip] ${ADMIN_EMAIL} ya es admin`);
  }
}

async function seedProperties() {
  const { error } = await supabaseAdmin
    .from("properties")
    .upsert(PROPERTIES, { onConflict: "id" });
  if (error) throw error;
  console.log(`[ok] ${PROPERTIES.length} propiedades`);

  const { error: amenitiesError } = await supabaseAdmin
    .from("amenities")
    .upsert(AMENITIES, { onConflict: "id" });
  if (amenitiesError) throw amenitiesError;
  console.log(`[ok] ${AMENITIES.length} amenidades`);

  const { error: linkError } = await supabaseAdmin.from("property_amenities").upsert(
    PROPERTY_AMENITIES.map(([property_id, amenity_id]) => ({ property_id, amenity_id })),
    { onConflict: "property_id,amenity_id" },
  );
  if (linkError) throw linkError;
  console.log(`[ok] ${PROPERTY_AMENITIES.length} relaciones propiedad-amenidad`);
}

async function seedImages() {
  const slugs = Object.keys(LEGACY_IMAGES);
  const { data: properties, error } = await supabaseAdmin
    .from("properties")
    .select("id, name, slug")
    .in("slug", slugs);
  if (error) throw error;

  for (const slug of slugs) {
    const property = properties?.find((p) => p.slug === slug);
    if (!property) {
      console.warn(`[skip] No existe ninguna propiedad con slug "${slug}"`);
      continue;
    }

    const { data: existingImages } = await supabaseAdmin
      .from("property_images")
      .select("id")
      .eq("property_id", property.id)
      .limit(1);
    if (existingImages && existingImages.length > 0) {
      console.log(`[skip] "${property.name}" ya tiene imágenes`);
      continue;
    }

    const filenames = LEGACY_IMAGES[slug];
    for (const [index, filename] of filenames.entries()) {
      const filePath = resolve(import.meta.dirname, "../src/assets", filename);
      const fileBuffer = await readFile(filePath);
      const storagePath = `${property.id}/${filename}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from("property-images")
        .upload(storagePath, fileBuffer, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabaseAdmin.from("property_images").insert({
        property_id: property.id,
        storage_path: storagePath,
        alt_text: `${property.name} - foto ${index + 1}`,
        sort_order: index,
      });
      if (insertError) throw insertError;
    }
    console.log(`[ok] ${filenames.length} fotos para "${property.name}"`);
  }
}

async function main() {
  await ensureAdmin();
  await seedProperties();
  await seedImages();
  console.log("\nListo. Admin:", ADMIN_EMAIL, "/ Password:", ADMIN_PASSWORD);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
