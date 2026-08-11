import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({ meta: [{ title: "Entrar o crear cuenta — Nido" }, { name: "description", content: "Accede a Nido para solicitar y gestionar tus estancias." }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setMessage("");
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      if (!error && data.user) {
        await supabase.from("profiles").upsert({ id: data.user.id, full_name: name.trim() });
        await supabase.from("user_roles").upsert({ user_id: data.user.id, role: "customer" });
      }
      setMessage(error ? error.message : "Revisa tu correo para confirmar la cuenta.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else if (redirect) window.location.href = redirect;
      else await navigate({ to: "/cuenta" });
    }
    setLoading(false);
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}${redirect ?? "/cuenta"}` });
    if (result.error) setMessage(result.error.message);
  }

  return <main className="grid min-h-screen lg:grid-cols-2">
    <div className="relative hidden overflow-hidden bg-primary lg:block"><div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,var(--secondary),transparent_55%)] opacity-60" /><div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground"><a href="/" className="font-display text-3xl">Nido.</a><blockquote className="max-w-lg font-display text-5xl leading-tight">“Viajar es encontrar otro ritmo para los días.”</blockquote><p className="text-sm opacity-70">Alojamientos con carácter</p></div></div>
    <div className="flex items-center justify-center px-5 py-12"><div className="w-full max-w-md"><Button variant="ghost" asChild className="mb-10 -ml-3"><a href="/"><ArrowLeft /> Volver</a></Button><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Bienvenido a Nido</p><h1 className="mt-3 font-display text-4xl">{mode === "login" ? "Vuelve a tu refugio" : "Crea tu cuenta"}</h1><p className="mt-2 text-muted-foreground">{mode === "login" ? "Consulta tus solicitudes y próximas estancias." : "Guarda tus datos y solicita alojamientos."}</p>
      <Button variant="outline" size="lg" className="mt-8 w-full" onClick={google}><Chrome /> Continuar con Google</Button><div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />o con correo<span className="h-px flex-1 bg-border" /></div>
      <form onSubmit={submit} className="space-y-4">{mode === "signup" && <div><Label htmlFor="name">Nombre completo</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={100} required className="mt-2 h-11" /></div>}<div><Label htmlFor="email">Correo electrónico</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} className="mt-2 h-11" /></div><div><Label htmlFor="password">Contraseña</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} required className="mt-2 h-11" /></div>{message && <p className="rounded-xl bg-muted p-3 text-sm">{message}</p>}<Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? "Procesando…" : mode === "login" ? "Entrar" : "Crear cuenta"}</Button></form>
      <p className="mt-6 text-center text-sm text-muted-foreground">{mode === "login" ? "¿Aún no tienes cuenta?" : "¿Ya tienes una cuenta?"} <Button variant="link" className="px-1" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Regístrate" : "Entra"}</Button></p>
    </div></div>
  </main>;
}