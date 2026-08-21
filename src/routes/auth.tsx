import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

// Importamos el logo y la imagen de fondo desde assets
import logoImg from "@/assets/logo.png";
import bgImg from "@/assets/a.jpg";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar o crear cuenta — Nido" },
      { name: "description", content: "Accede a Nido para solicitar y gestionar tus estancias." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Estados para los campos de registro
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [sexo, setSexo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Estados para ver/ocultar contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (mode === "signup") {
      const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;

      if (nombre.trim().length < 3 || !nameRegex.test(nombre)) {
        setMessage("El nombre debe tener al menos 3 letras y no puede contener números.");
        setLoading(false);
        return;
      }

      if (apellido.trim().length < 3 || !nameRegex.test(apellido)) {
        setMessage("El apellido debe tener al menos 3 letras y no puede contener números.");
        setLoading(false);
        return;
      }

      if (!/^[A-Z]/.test(password)) {
        setMessage("La contraseña debe empezar por una letra mayúscula.");
        setLoading(false);
        return;
      }

      // Validación de mínimo 8 caracteres
      if (password.length < 8) {
        setMessage("La contraseña debe tener al menos 8 caracteres.");
        setLoading(false);
        return;
      }

      // Validación de confirmación de contraseña
      if (password !== confirmPassword) {
        setMessage("Las contraseñas no coinciden.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            first_name: nombre.trim(),
            last_name: apellido.trim(),
            phone: telefono.trim(),
            sex: sexo,
          },
        },
      });

      setMessage(error ? error.message : "Revisa tu correo para confirmar la cuenta.");
    } else {
      // PROCESO DE INICIO DE SESIÓN
      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else if (redirect) {
        window.location.href = redirect;
      } else if (signInData.user) {
        // Consultar el rol del usuario que acaba de iniciar sesión
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", signInData.user.id)
          .maybeSingle();

        // Redirigir según el rol
        if (roleData?.role === "admin") {
          await navigate({ to: "/admin" });
        } else {
          await navigate({ to: "/" });
        }
      }
    }
    setLoading(false);
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Columna Izquierda */}
      <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-center p-12 text-white">
        <img src={bgImg} alt="Fondo Nido" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 text-center">
          <blockquote className="mx-auto max-w-lg font-display text-5xl leading-tight">
            “Viajar es encontrar otro ritmo para los días.”
          </blockquote>
        </div>
      </div>

      {/* Columna Derecha */}
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <Button variant="ghost" asChild className="mb-8 -ml-3">
            <a href="/">
              <ArrowLeft /> Volver
            </a>
          </Button>

          <div className="mb-6">
            <a href="/" className="inline-block">
              <img src={logoImg} alt="Nido Logo" className="h-20 w-auto object-contain" />
            </a>
          </div>

          <h1 className="mt-3 font-display text-4xl leading-tight">
            {mode === "login" ? "Bienvenidos a su próxima estadía" : "Crea tu cuenta"}
          </h1>

          <p className="mt-2 mb-8 text-muted-foreground">
            {mode === "login"
              ? "Consulta tus solicitudes y próximas estancias."
              : "Guarda tus datos y solicita alojamientos."}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      minLength={3}
                      maxLength={50}
                      pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$"
                      title="Debe tener al menos 3 letras y no contener números."
                      required
                      className="mt-2 h-11"
                    />
                  </div>
                  <div>
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input
                      id="apellido"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value)}
                      minLength={3}
                      maxLength={50}
                      pattern="^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$"
                      title="Debe tener al menos 3 letras y no contener números."
                      required
                      className="mt-2 h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sexo">Sexo</Label>
                    <select
                      id="sexo"
                      value={sexo}
                      onChange={(e) => setSexo(e.target.value)}
                      required
                      className="mt-2 flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="" disabled>
                        Selecciona...
                      </option>
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="telefono">Número de teléfono</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      required
                      className="mt-2 h-11"
                      placeholder="Ej: 809-555-5555"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="mt-2 h-11"
              />
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  pattern="^[A-Z].*"
                  title="La contraseña debe empezar con una letra mayúscula y tener un mínimo de 8 caracteres."
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Debe empezar con mayúscula y tener mínimo 8 caracteres.
                </p>
              )}
            </div>

            {mode === "signup" && (
              <div>
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <div className="relative mt-2">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                    className="h-11 pr-10"
                    placeholder="Repite tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {message && (
              <p className="rounded-xl bg-muted p-3 text-sm text-destructive font-medium">
                {message}
              </p>
            )}

            <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"}{" "}
            <Button
              variant="link"
              className="px-1"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Regístrate" : "Entra"}
            </Button>
          </p>
        </div>
      </div>
    </main>
  );
}
