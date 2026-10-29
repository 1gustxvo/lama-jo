import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo | Use Lamajô" },
      { name: "description", content: "Gerencie produtos e categorias da Use Lamajô." },
      { property: "og:title", content: "Painel administrativo | Use Lamajô" },
      { property: "og:description", content: "Gerencie produtos e categorias da Use Lamajô." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

type Category = Tables<"categories">;
type Product = Tables<"products">;
const emptyForm = { name: "", description: "", price: "", promo_price: "", category_id: "", images: [] as string[], sizes: "", colors: "", stock: "0", featured: false, active: true };
const list = (s: string) => s.split(",").map(v => v.trim()).filter(Boolean);
const currency = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function AdminPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"products" | "categories">("products");
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catEditing, setCatEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
    ]);
    setCategories(c.data ?? []); setProducts(p.data ?? []);
  }, []);

  useEffect(() => {
    supabase.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { setIsAdmin(!!data); if (data) load(); });
  }, [user.id, load]);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); };
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 4000); };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const path = `${crypto.randomUUID()}.${file.name.split(".").pop() || "jpg"}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type });
      if (error) { flash("Erro no envio: " + error.message); continue; }
      const { data } = await supabase.storage.from("product-images").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (data?.signedUrl) urls.push(data.signedUrl);
    }
    setForm(f => ({ ...f, images: [...f.images, ...urls] }));
    setBusy(false);
  };

  const saveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price < 0) return flash("Informe nome e preço válidos.");
    const row = {
      name: form.name.trim(), description: form.description, price,
      promo_price: form.promo_price ? Number(form.promo_price) : null,
      category_id: form.category_id || null, images: form.images,
      sizes: list(form.sizes), colors: list(form.colors),
      stock: Math.max(0, Math.floor(Number(form.stock) || 0)), featured: form.featured, active: form.active,
    };
    setBusy(true);
    const { error } = editing ? await supabase.from("products").update(row).eq("id", editing) : await supabase.from("products").insert(row);
    setBusy(false);
    if (error) return flash("Erro: " + error.message);
    flash(editing ? "Produto atualizado." : "Produto cadastrado.");
    setForm(emptyForm); setEditing(null); load();
  };

  const editProduct = (p: Product) => {
    setEditing(p.id);
    setForm({ name: p.name, description: p.description, price: String(p.price), promo_price: p.promo_price != null ? String(p.promo_price) : "", category_id: p.category_id ?? "", images: p.images, sizes: p.sizes.join(", "), colors: p.colors.join(", "), stock: String(p.stock), featured: p.featured, active: p.active });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) flash("Erro: " + error.message); else load();
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    const { error } = catEditing
      ? await supabase.from("categories").update({ name: catName.trim() }).eq("id", catEditing)
      : await supabase.from("categories").insert({ name: catName.trim(), sort_order: categories.length + 1 });
    if (error) return flash("Erro: " + error.message);
    setCatName(""); setCatEditing(null); load();
  };

  const toggleCategory = async (c: Category) => { await supabase.from("categories").update({ active: !c.active }).eq("id", c.id); load(); };
  const deleteCategory = async (id: string) => {
    if (!confirm("Excluir esta categoria? Os produtos ficarão sem categoria.")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) flash("Erro: " + error.message); else load();
  };

  if (isAdmin === null) return <div className="lamajo auth-page"><p className="kicker">CARREGANDO...</p></div>;
  if (!isAdmin) return <div className="lamajo auth-page"><div className="editor-panel auth-card">
    <span className="kicker">ACESSO RESTRITO</span><h2>Sem permissão</h2>
    <div className="warning">Sua conta ({user.email}) ainda não é administradora. Um administrador precisa liberar o acesso pelo banco de dados usando este identificador:<br /><code className="admin-code">{user.id}</code></div>
    <div className="auth-links"><button onClick={signOut}>Sair</button><Link to="/">← Voltar ao site</Link></div>
  </div></div>;

  const catNameById = (id: string | null) => categories.find(c => c.id === id)?.name ?? "Sem categoria";

  return <div className="lamajo admin-page">
    <header className="header">
      <Link to="/" className="logo"><img src="/logo-lamajo.svg" alt="Use Lamajô" /></Link>
      <div className="admin-tabs">
        <button className={tab === "products" ? "selected" : ""} onClick={() => setTab("products")}>Produtos</button>
        <button className={tab === "categories" ? "selected" : ""} onClick={() => setTab("categories")}>Categorias</button>
      </div>
      <div className="nav-actions"><Link to="/" className="admin-link">VER SITE</Link><button onClick={signOut} className="admin-link">SAIR</button></div>
    </header>
    {msg && <div className="warning admin-msg">{msg}</div>}
    <main className="admin-main">
      {tab === "products" ? <>
        <section className="editor-panel admin-card">
          <span className="kicker">{editing ? "EDITANDO PRODUTO" : "NOVO PRODUTO"}</span>
          <h2>{editing ? "Editar peça" : "Cadastrar peça"}</h2>
          <form onSubmit={saveProduct} className="admin-form">
            <label className="span-2">Nome<input required value={form.name} onChange={e => setForm(v => ({ ...v, name: e.target.value }))} /></label>
            <label>Categoria<select value={form.category_id} onChange={e => setForm(v => ({ ...v, category_id: e.target.value }))}><option value="">Sem categoria</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Estoque<input type="number" min="0" value={form.stock} onChange={e => setForm(v => ({ ...v, stock: e.target.value }))} /></label>
            <label>Preço<input type="number" min="0" step=".01" required value={form.price} onChange={e => setForm(v => ({ ...v, price: e.target.value }))} /></label>
            <label>Preço promocional<input type="number" min="0" step=".01" value={form.promo_price} onChange={e => setForm(v => ({ ...v, promo_price: e.target.value }))} /></label>
            <label>Tamanhos (vírgula)<input placeholder="P, M, G" value={form.sizes} onChange={e => setForm(v => ({ ...v, sizes: e.target.value }))} /></label>
            <label>Cores (vírgula)<input placeholder="Rosa, Branco" value={form.colors} onChange={e => setForm(v => ({ ...v, colors: e.target.value }))} /></label>
            <label className="span-2">Descrição<textarea rows={3} value={form.description} onChange={e => setForm(v => ({ ...v, description: e.target.value }))} /></label>
            <label className="span-2">Imagens<input type="file" accept="image/*" multiple onChange={e => { upload(e.target.files); e.target.value = ""; }} /></label>
            {form.images.length > 0 && <div className="span-2 admin-thumbs">{form.images.map((src, i) => <div key={src} className="admin-thumb"><img src={src} alt={"Imagem " + (i + 1)} /><button type="button" onClick={() => setForm(v => ({ ...v, images: v.images.filter(x => x !== src) }))} aria-label="Remover imagem">×</button></div>)}</div>}
            <div className="check-row span-2">
              <label><input type="checkbox" checked={form.featured} onChange={e => setForm(v => ({ ...v, featured: e.target.checked }))} /> Destaque</label>
              <label><input type="checkbox" checked={form.active} onChange={e => setForm(v => ({ ...v, active: e.target.checked }))} /> Ativo (visível no site)</label>
            </div>
            <div className="span-2 admin-actions">
              <button type="submit" className="primary-btn" disabled={busy}>{busy ? "AGUARDE..." : editing ? "SALVAR ALTERAÇÕES" : "CADASTRAR PRODUTO"}</button>
              {editing && <button type="button" className="outline-btn" onClick={() => { setEditing(null); setForm(emptyForm); }}>CANCELAR</button>}
            </div>
          </form>
        </section>
        <section className="editor-panel admin-card">
          <h3>Produtos cadastrados ({products.length})</h3>
          {products.length === 0 && <p>Nenhum produto ainda.</p>}
          {products.map(p => <div className="editor-item admin-row" key={p.id}>
            {p.images[0] ? <img src={p.images[0]} alt={p.name} /> : <div className="admin-noimg">✦</div>}
            <div className="admin-row-info"><strong>{p.name}</strong><span>{catNameById(p.category_id)} · {currency(Number(p.promo_price ?? p.price))} · estoque {p.stock}{p.featured ? " · destaque" : ""}{p.active ? "" : " · inativo"}</span></div>
            <div className="admin-row-actions"><button onClick={() => editProduct(p)}>Editar</button><button onClick={() => deleteProduct(p.id)}>Excluir</button></div>
          </div>)}
        </section>
      </> : <section className="editor-panel admin-card">
        <span className="kicker">ORGANIZAÇÃO</span><h2>Categorias</h2>
        <form onSubmit={saveCategory} className="admin-inline">
          <input placeholder="Nome da categoria" value={catName} onChange={e => setCatName(e.target.value)} />
          <button className="primary-btn">{catEditing ? "SALVAR" : "ADICIONAR"}</button>
          {catEditing && <button type="button" className="outline-btn" onClick={() => { setCatEditing(null); setCatName(""); }}>CANCELAR</button>}
        </form>
        {categories.map(c => <div className="editor-item admin-row" key={c.id}>
          <div className="admin-row-info"><strong>{c.name}</strong><span>{c.active ? "Ativa" : "Inativa"}</span></div>
          <div className="admin-row-actions"><button onClick={() => { setCatEditing(c.id); setCatName(c.name); }}>Editar</button><button onClick={() => toggleCategory(c)}>{c.active ? "Desativar" : "Ativar"}</button><button onClick={() => deleteCategory(c.id)}>Excluir</button></div>
        </div>)}
      </section>}
    </main>
  </div>;
}
