import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha | Use Lamajô" },
      { name: "description", content: "Defina uma nova senha para o painel da Use Lamajô." },
      { property: "og:title", content: "Nova senha | Use Lamajô" },
      { property: "og:description", content: "Defina uma nova senha para o painel da Use Lamajô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(error.message); else navigate({ to: "/admin" });
  };
  return <div className="lamajo auth-page"><div className="editor-panel auth-card">
    <span className="kicker">RECUPERAÇÃO DE ACESSO</span><h2>Nova senha</h2>
    <form onSubmit={submit}>
      <label>Nova senha<input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" /></label>
      {msg && <div className="warning">{msg}</div>}
      <button className="primary-btn auth-submit">SALVAR NOVA SENHA</button>
    </form>
  </div></div>;
}
