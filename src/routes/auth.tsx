import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar | Use Lamajô" },
      { name: "description", content: "Acesso ao painel administrativo da Use Lamajô." },
      { property: "og:title", content: "Entrar | Use Lamajô" },
      { property: "og:description", content: "Acesso ao painel administrativo da Use Lamajô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/admin" }); });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg("");
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin" });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
        if (error) throw error;
        if (data.session) navigate({ to: "/admin" });
        else setMsg("Conta criada! Confirme seu e-mail para entrar.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
        if (error) throw error;
        setMsg("Enviamos um link de redefinição para seu e-mail.");
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Algo deu errado.");
    } finally { setBusy(false); }
  };

  return <div className="lamajo auth-page">
    <div className="editor-panel auth-card">
      <Link to="/" className="logo"><img src="/logo-lamajo.svg" alt="Use Lamajô" /></Link>
      <span className="kicker">PAINEL ADMINISTRATIVO</span>
      <h2>{mode === "login" ? "Entrar" : mode === "signup" ? "Criar conta" : "Recuperar senha"}</h2>
      <form onSubmit={submit}>
        <label>E-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        {mode !== "forgot" && <label>Senha<input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}
        {msg && <div className="warning">{msg}</div>}
        <button className="primary-btn auth-submit" disabled={busy}>{busy ? "AGUARDE..." : mode === "login" ? "ENTRAR" : mode === "signup" ? "CRIAR CONTA" : "ENVIAR LINK"}</button>
      </form>
      <div className="auth-links">
        {mode !== "login" && <button type="button" onClick={() => setMode("login")}>Já tenho conta</button>}
        {mode !== "signup" && <button type="button" onClick={() => setMode("signup")}>Criar conta</button>}
        {mode !== "forgot" && <button type="button" onClick={() => setMode("forgot")}>Esqueci a senha</button>}
        <Link to="/">← Voltar ao site</Link>
      </div>
    </div>
  </div>;
}
