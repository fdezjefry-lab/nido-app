// Aplica las migraciones pendientes de supabase/migrations/ al proyecto Supabase
// configurado en .env. Requiere la variable CONNECTION_STRING (conexión directa,
// no la de pooler) definida en tu .env local.
//
// Uso:
//   npm run db:migrate            aplica las migraciones nuevas
//   npm run db:migrate:dry        muestra qué se aplicaría, sin ejecutar nada
import { spawnSync } from "node:child_process";

const connectionString = process.env.CONNECTION_STRING;

if (!connectionString) {
  console.error(
    "Falta CONNECTION_STRING en tu .env. Copia la cadena de conexión directa " +
      "(Project Settings → Database → Connection string → URI, puerto 5432, no la de pooler) " +
      "y agrégala a tu archivo .env local.",
  );
  process.exit(1);
}

const extraArgs = process.argv.slice(2);
const args = ["supabase", "db", "push", "--db-url", connectionString, ...extraArgs];

const result = spawnSync("npx", args, {
  stdio: "inherit",
  shell: process.platform === "win32",
});

process.exit(result.status ?? 1);
