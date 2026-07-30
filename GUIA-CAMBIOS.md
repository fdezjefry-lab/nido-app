# Guía rápida — cambios en Nido App

Resumen de lo que se hizo en esta sesión, centrado en backend, base de datos y el panel admin.

## 1. Qué se construyó: edición de propiedades + gestión de imágenes

Antes, el panel `/admin` solo permitía crear alojamientos (formulario incompleto) y publicar/ocultar. El botón "Editar" no hacía nada, y las fotos salían de un diccionario fijo en el código (`src/lib/property-images.ts`).

**Ahora:**
- El botón **"Editar"** abre un modal con dos pestañas:
  - **Detalles**: todos los campos de la propiedad (nombre, ciudad, país, precio, huéspedes, habitaciones, camas, baños, noches mín/máx, normas de la casa).
  - **Fotos**: subir (arrastra o selecciona varias, JPG/PNG/WebP, máx. 8 MB c/u, hasta 20 por alojamiento), reordenar (flechas ↑/↓) y eliminar imágenes. Todo se guarda al instante contra Supabase Storage + la tabla `property_images`.
- El formulario de **crear** alojamiento ahora comparte el mismo componente que el de editar, así que ya no le faltan campos.
- Las imágenes en la página pública (`/`, `/alojamientos/:slug`) y en el panel admin ahora se leen de `property_images`, no del diccionario hardcodeado.

### Archivos nuevos
- `src/components/admin/property-form.tsx` — formulario compartido crear/editar.
- `src/components/admin/property-image-manager.tsx` — subir/reordenar/eliminar fotos.
- `src/lib/property-image-url.ts` — helper para resolver URLs públicas de Storage.
- `scripts/seed-new-project.ts` — script de un solo uso que pobló el proyecto Supabase nuevo (ver sección 3).
- `supabase/migrations/20260728120000_property_images_bucket.sql` — crea el bucket `property-images`.

### Archivos modificados
- `src/routes/admin.tsx` — edición cableada, query con imágenes embebidas.
- `src/routes/index.tsx`, `src/routes/alojamientos.$slug.tsx`, `src/components/property-card.tsx` — leen fotos desde la base de datos.
- `src/lib/property-images.ts` — reducido a solo la imagen de fallback.

## 2. Cambio de proyecto Supabase

El proyecto original (`wcnnmoqcjmzmtgaxfhdy`, creado desde Lovable) no daba acceso a una `service_role key` válida — cada intento de generarla desde Lovable creaba credenciales de otro proyecto. Se optó por crear un proyecto Supabase propio y controlado directamente por ti:

- **Proyecto nuevo**: `imsvuiygbelblklrvfzz` (ya configurado en `.env` y `supabase/config.toml`).
- Se aplicaron ahí las 7 migraciones originales del esquema + la nueva del bucket de imágenes.
- Se recuperaron y migraron **los datos reales** del proyecto viejo (la anon key original todavía funcionaba para leerlos): las 3 propiedades (Villa Brisa del Mar, Cabaña del Pinar, Loft Ciudad Colonial), sus 8 amenidades y las 23 fotos — nada se inventó.
- Se creó una cuenta **admin** (`jhonbatista@ktpillartech.com`) — la contraseña se compartió en el chat de esta sesión, cámbiala cuanto antes desde tu cuenta.


## 4. Pendiente / recomendado a futuro

- Cambiar la contraseña del usuario admin.
- El flujo de "Reservar" en `/alojamientos/:slug` sigue yendo por WhatsApp (no crea fila en `booking_requests`) — sin cambios, quedó fuera de alcance de esta sesión.
- Tablas `amenities`, `availability_blocks`, `notifications` tienen datos/soporte en base de datos pero aún no tienen UI en el panel admin (gestión de amenidades por propiedad, bloqueo manual de fechas, centro de notificaciones).
- Revisar y confirmar si el proyecto Supabase viejo (`wcnnmoqcjmzmtgaxfhdy`) debe eliminarse o mantenerse archivado.
