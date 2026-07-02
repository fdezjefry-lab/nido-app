import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link to="/" className="font-display text-2xl font-semibold tracking-tight">Nido<span className="text-primary">.</span></Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegación principal">
          <Link to="/" className="text-sm text-muted-foreground transition hover:text-foreground">Alojamientos</Link>
          {signedIn && <Link to="/cuenta" className="text-sm text-muted-foreground transition hover:text-foreground">Mis solicitudes</Link>}
        </nav>
        <div className="hidden md:block">
          {signedIn ? <Button variant="outline" onClick={signOut}>Cerrar sesión</Button> : <Button asChild><Link to="/auth"><UserRound /> Entrar</Link></Button>}
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(!open)} aria-label="Abrir menú">{open ? <X /> : <Menu />}</Button>
      </div>
      {open && <nav className="border-t border-border px-5 py-5 md:hidden">
        <div className="flex flex-col gap-4">
          <Link to="/" onClick={() => setOpen(false)}>Alojamientos</Link>
          {signedIn && <Link to="/cuenta" onClick={() => setOpen(false)}>Mis solicitudes</Link>}
          {signedIn ? <Button variant="outline" onClick={signOut}>Cerrar sesión</Button> : <Button asChild><Link to="/auth">Entrar</Link></Button>}
        </div>
      </nav>}
    </header>
  );
}