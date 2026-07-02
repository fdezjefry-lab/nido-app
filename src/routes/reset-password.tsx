import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({ component: ResetPassword });
function ResetPassword() {
  const [password, setPassword] = useState(""); const [message, setMessage] = useState("");
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!window.location.hash.includes("type=recovery")) { setMessage("El enlace no es válido o ha caducado."); return; } const { error } = await supabase.auth.updateUser({ password }); setMessage(error ? error.message : "Contraseña actualizada. Ya puedes iniciar sesión."); }
  return <main className="grid min-h-screen place-items-center px-5"><form onSubmit={submit} className="w-full max-w-md space-y-5"><h1 className="font-display text-4xl">Nueva contraseña</h1><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} maxLength={128} required placeholder="Mínimo 8 caracteres" />{message && <p className="text-sm text-muted-foreground">{message}</p>}<Button type="submit" className="w-full">Actualizar contraseña</Button></form></main>;
}