import { useCallback, useEffect, useState } from "react";
import { Logo } from "../../components/Logo";
import { ProductPhoto } from "../../components/RealPhoneArt";
import {
  deleteCategory,
  deleteProduct,
  fetchAdminOptions,
  fetchCatalog,
  saveCategory,
  saveCombo,
  saveProduct,
  type Account,
  type AdminOptions,
  type Summary,
} from "../../lib/api";
import { shrinkPhoto } from "../../lib/shrinkPhoto";
import { useSummary } from "../../lib/useSummary";
import { AdminDesk } from "./AdminDesk";
import { AfterSalesDesk, LegalDesk } from "./AdminLegal";
import { adminNav, cashPrice, formatPrice, imageUrl, LOW_STOCK, rams, type AdminSection, type Product } from "../../lib/data";

const lightSections = new Set<AdminSection>([
  "productos",
  "combos",
  "marcas",
  "clientes",
  "mensajes",
  "inventario",
  "promociones",
  "envios",
  "canjes",
  "reportes",
  "usuarios",
  "configuracion",
  "ventas",
  "postventa",
  "legal",
]);

export function AdminApp({
  user,
  section,
  onSection,
  onLeave,
  onLogout,
  onCatalogChange,
}: {
  user: Account;
  section: AdminSection;
  onSection: (section: AdminSection) => void;
  onLeave: () => void;
  onLogout: () => void;
  onCatalogChange: () => void;
}) {
  const light = lightSections.has(section);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-[#242424] text-white">
      {menuOpen ? <button aria-label="Cerrar menú" className="fixed inset-0 z-30 bg-black/55 lg:hidden" onClick={() => setMenuOpen(false)} /> : null}
      <aside className={`admin-sidebar fixed inset-y-0 left-0 z-40 flex w-[232px] shrink-0 flex-col border-r border-white/10 bg-[#161616] transition-transform lg:static ${menuOpen ? "is-open" : ""}`}>
        <button type="button" onClick={onLeave} className="px-4 py-5 text-left">
          <Logo subtitle="Panel de Administración" />
        </button>
        <nav className="flex-1 space-y-0.5 px-3">
          {adminNav.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { onSection(item.id); setMenuOpen(false); }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${
                section === item.id ? "bg-brand font-semibold text-white" : "text-slate-300 hover:bg-white/5"
              }`}
            >
              <NavIcon id={item.id} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="m-3 rounded-xl bg-white/5 p-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold">{user.name.charAt(0).toUpperCase() || "A"}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block truncate text-[11px] text-[#A7A7A7]">{user.email}</span>
            </span>
          </div>
          <button type="button" onClick={onLogout} className="mt-3 h-9 w-full rounded-lg border border-[#4a4a4a] text-xs font-semibold text-[#d4d4d4] hover:text-white">
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className={`min-w-0 flex-1 ${light ? "bg-[#242424] text-white" : "bg-[#242424]"}`}>
        <button type="button" onClick={() => setMenuOpen(true)} className="fixed left-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-lg bg-brand text-white shadow-lg lg:hidden" aria-label="Abrir menú">☰</button>
        {section === "inicio" ? <Dashboard onSection={onSection} /> : null}
        {section === "productos" || section === "inventario" ? <ProductsAdmin onChange={onCatalogChange} /> : null}
        {section === "combos" ? <CombosAdmin onChange={onCatalogChange} /> : null}
        {section === "postventa" ? <AfterSalesDesk /> : null}
        {section === "legal" ? <LegalDesk /> : null}
        {light && !["productos", "combos", "inventario", "postventa", "legal"].includes(section) ? <AdminDesk section={section} onCatalogChange={onCatalogChange} /> : null}
      </div>
    </div>
  );
}

export function KpiCards({ summary }: { summary: Summary }) {
  const kpis = [
    { label: "Ventas de hoy", value: formatPrice(summary.todayTotal), hint: "Sin contar cancelados" },
    { label: "Pedidos de hoy", value: String(summary.todayOrders), hint: `${summary.pendingOrders} pendientes de pago en total` },
    { label: "Clientes nuevos hoy", value: String(summary.newCustomers), hint: "Se registraron en la tienda" },
    { label: "Stock total", value: summary.stock.toLocaleString("es-AR"), hint: "Productos en el local" },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <article key={kpi.label} className="rounded-2xl bg-[#333333] p-4 text-white">
          <p className="text-sm text-[#d4d4d4]">{kpi.label}</p>
          <p className="mt-2 text-2xl font-extrabold">{kpi.value}</p>
          <p className="mt-1 text-xs text-[#A7A7A7]">{kpi.hint}</p>
        </article>
      ))}
    </div>
  );
}

export function TopSellers({ summary }: { summary: Summary }) {
  if (summary.top.length === 0) return <p className="mt-3 text-sm text-[#A7A7A7]">Todavía no hay ventas.</p>;
  return (
    <ul className="mt-3 space-y-3">
      {summary.top.map((item) => (
        <li key={item.name} className="flex items-center gap-3">
          <ProductPhoto src={item.image} className="h-10 w-10 shrink-0" />
          <span className="flex-1 text-sm">{item.name}</span>
          <span className="text-xs text-[#A7A7A7]">{item.units} {item.units === 1 ? "unidad" : "unidades"}</span>
        </li>
      ))}
    </ul>
  );
}

function Dashboard({ onSection }: { onSection: (section: AdminSection) => void }) {
  const { summary, error } = useSummary();
  return (
    <div className="p-4 pt-16 sm:p-6 sm:pt-16 lg:pt-6">
      <h1 className="text-2xl font-bold">Inicio</h1>
      <p className="text-xs text-[#A7A7A7]">Panel / Inicio</p>
      {error ? <p role="alert" className="mt-4 rounded-lg bg-[#3a1212] px-3 py-2 text-sm text-[#fecaca]">{error}</p> : null}
      {!summary && !error ? <p className="mt-4 text-sm text-[#A7A7A7]">Cargando...</p> : null}
      {summary ? (
        <>
          <div className="mt-4"><KpiCards summary={summary} /></div>
          {summary.pendingOrders > 0 ? (
            <button type="button" onClick={() => onSection("ventas")} className="mt-3 w-full rounded-xl border border-[#FFD83D]/40 bg-[#3a2a00] px-4 py-3 text-left text-sm text-[#f3e6b3]">
              Tenés {summary.pendingOrders} {summary.pendingOrders === 1 ? "pedido pendiente" : "pedidos pendientes"} de pago. Cuando cobres, marcalo como pagado en Ventas y el cliente suma sus puntos →
            </button>
          ) : null}
          <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_0.8fr]">
            <article className="rounded-2xl bg-[#333333] p-4 text-white">
              <h2 className="font-bold">Ventas de los últimos 7 días</h2>
              <SalesChart days={summary.days} />
            </article>
            <article className="rounded-2xl bg-[#333333] p-4 text-white">
              <h2 className="font-bold">Productos más vendidos</h2>
              <TopSellers summary={summary} />
            </article>
          </div>
          <article className="mt-4 rounded-2xl bg-[#333333] p-4 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Stock bajo</h2>
                <p className="text-sm text-[#A7A7A7]">Colores con {LOW_STOCK} unidades o menos. El stock se edita en Productos.</p>
              </div>
              <button type="button" onClick={() => onSection("productos")} className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white">Ver productos</button>
            </div>
            {summary.low.length === 0 ? <p className="mt-4 text-sm text-[#A7A7A7]">No hay alertas de stock.</p> : (
              <ul className="mt-4 divide-y divide-[#4a4a4a]">
                {summary.low.map((item) => (
                  <li key={item.name} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="font-semibold">{item.name}</span>
                    <span className={`font-bold ${item.stock === 0 ? "text-[#fca5a5]" : "text-[#FFD83D]"}`}>{item.stock === 0 ? "Sin stock" : `${item.stock} ${item.stock === 1 ? "unidad" : "unidades"}`}</span>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </>
      ) : null}
    </div>
  );
}

export function SalesChart({ days }: { days: Summary["days"] }) {
  const top = Math.max(...days.map((day) => day.total), 0);
  const max = top > 0 ? top * 1.2 : 100000;
  const w = 560;
  const h = 180;
  const step = days.length > 1 ? w / (days.length - 1) : 0;
  const coords = days.map((day, index) => [index * step, h - (day.total / max) * h] as const);
  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point[0]},${point[1]}`).join(" ");
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((part) => Math.round((max * part) / 1000) * 1000);
  return (
    <div className="mt-3">
      {top === 0 ? <p className="mb-2 text-sm text-[#A7A7A7]">Todavía no hubo ventas en estos días.</p> : null}
      <div className="flex gap-2">
        <div className="flex h-[180px] w-20 flex-col justify-between text-right text-[10px] text-[#A7A7A7]">
          {ticks.map((tick) => <span key={tick}>{formatPrice(tick)}</span>)}
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="h-[180px] flex-1" role="img" aria-label={days.map((day) => `${day.label}: ${formatPrice(day.total)}`).join(", ")}>
          {[0, 1, 2, 3, 4].map((row) => (
            <line key={row} x1="0" x2={w} y1={(h / 4) * row} y2={(h / 4) * row} stroke="#4a4a4a" />
          ))}
          <path d={`${line} L${w},${h} L0,${h} Z`} fill="url(#sales)" opacity="0.9" />
          <path d={line} fill="none" stroke="#FFD83D" strokeWidth="3" />
          <defs>
            <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFD83D" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#FFD83D" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="mt-1 flex justify-between pl-[88px] text-[10px] text-[#A7A7A7]">
        {days.map((day) => <span key={day.label}>{day.label}</span>)}
      </div>
    </div>
  );
}

function parsePesos(text: string) {
  return Number(text.trim().replace(/,\d{1,2}$/, "").replace(/\D/g, "")) || 0;
}

type ColorRow = { key: number; variantId: number | null; color: string; stock: string; onOrder: boolean; image: string | null; file: File | null; preview: string | null };
type ProductForm = {
  id: number | null;
  name: string;
  brand: string;
  categoryId: string;
  condition: "Nuevos" | "Usados";
  storage: string;
  ram: string;
  price: string;
  oldPrice: string;
  askPrice: boolean;
  description: string;
  featured: boolean;
  colors: ColorRow[];
};

let rowKey = 0;
const newRow = (): ColorRow => ({ key: ++rowKey, variantId: null, color: "", stock: "", onOrder: false, image: null, file: null, preview: null });

const inputClass = "mt-1 h-10 w-full rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-3 text-sm text-white placeholder:text-[#A7A7A7]";

function ProductsAdmin({ onChange }: { onChange: () => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [options, setOptions] = useState<AdminOptions | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [form, setForm] = useState<ProductForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [categoryForm, setCategoryForm] = useState<{ id: number | null; name: string; description: string; phoneSpecs: boolean } | null>(null);
  const [tab, setTab] = useState("");

  const load = useCallback(() => {
    void Promise.all([fetchCatalog(), fetchAdminOptions()]).then(([catalog, opts]) => {
      if (catalog.ok) setProducts(catalog.data.filter((item) => item.type === "PRODUCT"));
      if (opts.ok) setOptions(opts.data);
      setLoadError(!catalog.ok ? catalog.error : !opts.ok ? opts.error : "");
    });
  }, []);

  useEffect(load, [load]);

  const say = (text: string, bad = false) => {
    setNotice(text);
    setNoticeError(bad);
    if (text) window.setTimeout(() => document.getElementById("aviso-productos")?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
  };

  const productCategories = (options?.categories ?? []).filter((category) => category.slug !== "combos");
  const formCategory = form ? productCategories.find((category) => String(category.id) === form.categoryId) : undefined;
  const isPhone = formCategory?.phoneSpecs ?? false;
  const shown = (products ?? []).filter((product) => !tab || String(product.categoryId) === tab);

  const openNew = () => {
    say("");
    setForm({ id: null, name: "", brand: "", categoryId: tab || String(productCategories[0]?.id ?? ""), condition: "Nuevos", storage: "", ram: "", price: "", oldPrice: "", askPrice: false, description: "", featured: false, colors: [newRow()] });
    window.setTimeout(() => document.getElementById("form-producto")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  };

  const openEdit = (product: Product) => {
    say("");
    setForm({
      id: product.id,
      name: product.name,
      brand: product.brand,
      categoryId: String(product.categoryId),
      condition: product.condition,
      storage: product.storage,
      ram: product.ram,
      price: product.askPrice ? "" : product.price.toLocaleString("es-AR"),
      oldPrice: product.askPrice || !product.oldPrice ? "" : product.oldPrice.toLocaleString("es-AR"),
      askPrice: product.askPrice,
      description: product.description,
      featured: product.featured,
      colors: product.colors.map((color) => ({ key: ++rowKey, variantId: color.variantId, color: color.name, stock: color.onOrder ? "" : String(color.stock), onOrder: color.onOrder, image: color.image, file: null, preview: null })),
    });
    window.setTimeout(() => document.getElementById("form-producto")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  };

  const setRow = (key: number, patch: Partial<ColorRow>) => {
    setForm((current) => current && { ...current, colors: current.colors.map((row) => row.key === key ? { ...row, ...patch } : row) });
  };

  const submit = async () => {
    if (!form) return;
    const price = parsePesos(form.price);
    const oldPrice = parsePesos(form.oldPrice);
    const problems: string[] = [];
    if (!form.name.trim()) problems.push("Escribí el nombre.");
    if (!form.brand.trim()) problems.push("Escribí la marca.");
    if (!form.categoryId) problems.push("Elegí una categoría.");
    if (!form.askPrice && price <= 0) problems.push("Escribí el precio en pesos, por ejemplo 249.999.");
    if (!form.askPrice && oldPrice && oldPrice <= price) problems.push("El precio anterior tiene que ser más alto que el actual, o dejalo vacío.");
    if (form.colors.length === 0) problems.push("Agregá al menos un color.");
    if (form.colors.some((row) => !row.color)) problems.push("Elegí el color de cada fila.");
    if (new Set(form.colors.map((row) => row.color)).size !== form.colors.length) problems.push("Hay un color repetido.");
    if (form.colors.some((row) => !row.onOrder && (row.stock.trim() === "" || !/^\d+$/.test(row.stock.trim())))) problems.push("Escribí cuántas unidades hay de cada color (puede ser 0).");
    if (problems.length > 0) {
      say(problems.join(" "), true);
      return;
    }

    setSaving(true);
    const data = new FormData();
    data.set("data", JSON.stringify({
      id: form.id,
      name: form.name.trim(),
      brand: form.brand.trim(),
      categoryId: Number(form.categoryId),
      condition: form.condition,
      storage: isPhone ? form.storage : "",
      ram: isPhone ? form.ram : "",
      price: form.askPrice ? 0 : price,
      oldPrice: form.askPrice ? null : oldPrice || null,
      askPrice: form.askPrice,
      description: form.description.trim(),
      featured: form.featured,
      colors: form.colors.map((row) => ({ variantId: row.variantId, color: row.color, stock: row.onOrder ? 0 : Number(row.stock), onOrder: row.onOrder })),
    }));
    try {
      for (const [index, row] of form.colors.entries()) {
        if (row.file) data.set(`foto_${index}`, await shrinkPhoto(row.file), `foto_${index}.webp`);
      }
    } catch {
      setSaving(false);
      say("No pudimos leer una de las fotos. Probá con otra (JPG, PNG o WEBP).", true);
      return;
    }
    const result = await saveProduct(data);
    setSaving(false);
    if (!result.ok) {
      say(result.error, true);
      return;
    }
    const published = form.askPrice ? "El precio se consulta por WhatsApp." : `Ya se ve a ${formatPrice(cashPrice(price))} contado.`;
    say(form.id ? `Listo, ${form.name.trim()} quedó actualizado. ${published}` : `Listo, ${form.name.trim()} ya está en la tienda. ${published}`);
    setForm(null);
    load();
    onChange();
  };

  const remove = async (product: Product) => {
    if (!window.confirm(`¿Sacar ${product.name} de la tienda? Las ventas que ya tuvo quedan guardadas. Si está en algún combo, ese combo también se saca.`)) return;
    const result = await deleteProduct(product.id);
    if (!result.ok) {
      say(result.error, true);
      return;
    }
    const paused = result.data.pausedCombos;
    say(`${product.name} ya no se muestra en la tienda.${paused > 0 ? ` También sacamos ${paused === 1 ? "1 combo que lo incluía" : `${paused} combos que lo incluían`}: armalo de nuevo en Combos si querés.` : ""}`);
    load();
    onChange();
  };

  const submitCategory = async () => {
    if (!categoryForm) return;
    if (!categoryForm.name.trim()) {
      say("Escribí el nombre de la categoría.", true);
      return;
    }
    const result = await saveCategory({ id: categoryForm.id ?? undefined, name: categoryForm.name.trim(), description: categoryForm.description.trim(), phoneSpecs: categoryForm.phoneSpecs });
    if (!result.ok) {
      say(result.error, true);
      return;
    }
    setOptions((current) => current && { ...current, categories: result.data });
    setCategoryForm(null);
    say(categoryForm.id ? "Categoría actualizada." : "Categoría creada.");
    load();
    onChange();
  };

  const removeCategory = async (id: number, name: string) => {
    if (!window.confirm(`¿Borrar la categoría ${name}?`)) return;
    const result = await deleteCategory(id);
    if (!result.ok) {
      say(result.error, true);
      return;
    }
    setOptions((current) => current && { ...current, categories: result.data });
    say("Categoría borrada.");
  };

  const price = form ? parsePesos(form.price) : 0;

  return (
    <div>
      <div className="bg-[#242424] px-6 py-4 pl-16 text-white lg:pl-6">
        <h1 className="text-xl font-bold">Productos</h1>
      </div>
      <div className="space-y-4 p-5">
        <section id="admin-productos" className="rounded-2xl bg-[#333333] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Productos</h2>
              <p className="text-xs text-[#d4d4d4]">Productos que se venden en la tienda. Lo que guardes acá se ve al instante en la página.</p>
            </div>
            <button type="button" onClick={openNew} disabled={!options} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold disabled:opacity-50">
              Cargar un producto
            </button>
          </div>
          {loadError ? <p role="alert" className="mt-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{loadError}</p> : null}
          {notice ? <p id="aviso-productos" role={noticeError ? "alert" : "status"} className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${noticeError ? "bg-[#3a1212] text-[#fecaca]" : "bg-[#123024] text-[#86efac]"}`}>{notice}</p> : null}

          {form && options ? (
            <form id="form-producto" className="mt-3 space-y-4 rounded-xl border border-[#4a4a4a] bg-[#242424] p-4" onSubmit={(event) => { event.preventDefault(); void submit(); }} noValidate>
              <h3 className="font-bold">{form.id ? `Editar ${form.name}` : "Nuevo producto"}</h3>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs font-semibold text-[#d4d4d4]">Qué vas a cargar
                  <select name="categoria" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })} className={inputClass}>
                    {productCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                  </select>
                  <span className="mt-1 block font-normal text-[#A7A7A7]">{isPhone ? "Pide almacenamiento y RAM. Al venderlo se carga el IMEI." : "Sin almacenamiento, RAM ni IMEI."}</span>
                </label>
                <label className="text-xs font-semibold text-[#d4d4d4] md:col-span-2">Nombre
                  <input name="nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={isPhone ? "Ej.: Motorola Moto G24 128GB" : "Ej.: marca, modelo y tamaño"} className={inputClass} />
                </label>
                <label className="text-xs font-semibold text-[#d4d4d4]">Marca
                  <input name="marca" list="marcas-lista" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Elegí o escribí una nueva" className={inputClass} />
                  <datalist id="marcas-lista">{options.brands.map((brand) => <option key={brand.id} value={brand.name} />)}</datalist>
                </label>
                <label className="text-xs font-semibold text-[#d4d4d4]">Estado
                  <select name="estado" value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value as ProductForm["condition"] })} className={inputClass}>
                    <option value="Nuevos">Nuevo</option>
                    <option value="Usados">Usado</option>
                  </select>
                </label>
                {isPhone ? <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-[#d4d4d4]">Almacenamiento
                    <select name="almacenamiento" value={form.storage} onChange={(event) => setForm({ ...form, storage: event.target.value })} className={inputClass}>
                      <option value="">—</option>
                      {options.storages.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-[#d4d4d4]">RAM
                    <select name="ram" value={form.ram} onChange={(event) => setForm({ ...form, ram: event.target.value })} className={inputClass}>
                      <option value="">—</option>
                      {rams.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div> : null}
                <div className="text-xs font-semibold text-[#d4d4d4]">
                  <label htmlFor="precio">Precio de lista en pesos (tarjeta 1 pago)</label>
                  <input id="precio" name="precio" inputMode="numeric" value={form.price} disabled={form.askPrice} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Ej.: 249.999" className={`${inputClass} disabled:opacity-40`} />
                  <label htmlFor="consultar-precio" className="mt-2 flex items-center gap-2 font-normal text-sm text-[#d4d4d4]">
                    <input id="consultar-precio" name="consultar-precio" type="checkbox" checked={form.askPrice} onChange={(event) => setForm({ ...form, askPrice: event.target.checked, price: event.target.checked ? "" : form.price, oldPrice: event.target.checked ? "" : form.oldPrice })} className="h-4 w-4 accent-[#FFD83D]" />
                    Consultar el precio por WhatsApp
                  </label>
                  <span className="mt-1 block font-normal text-[#A7A7A7]">{form.askPrice ? "En la tienda no se muestra un precio. El cliente lo pregunta por WhatsApp." : price > 0 ? `Se publica a ${formatPrice(price)} · contado ${formatPrice(cashPrice(price))}` : "Podés escribirlo con o sin puntos."}</span>
                </div>
                <label className="text-xs font-semibold text-[#d4d4d4]">Precio anterior (opcional, sale tachado)
                  <input name="precio-anterior" inputMode="numeric" value={form.oldPrice} disabled={form.askPrice} onChange={(event) => setForm({ ...form, oldPrice: event.target.value })} placeholder="Ej.: 299.999" className={`${inputClass} disabled:opacity-40`} />
                </label>
                <label className="flex items-center gap-2 self-center text-sm text-[#d4d4d4]">
                  <input name="destacado" type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} className="h-4 w-4 accent-[#FFD83D]" />
                  Mostrar en Productos destacados
                </label>
                <label className="text-xs font-semibold text-[#d4d4d4] md:col-span-3">Descripción (una característica por renglón)
                  <textarea name="descripcion" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} placeholder={isPhone ? "Ej.:\nPantalla 6,56\"\nCámara 50 MP\nBatería 5000 mAh" : "Ej.:\nMedidas o capacidad\nMaterial\nQué trae la caja"} className={`${inputClass} h-auto py-2`} />
                </label>
              </div>

              <fieldset>
                <legend className="text-sm font-bold">Colores, stock y fotos</legend>
                <p className="text-xs text-[#A7A7A7]">Cada color tiene su propio stock y su foto. La foto cambia en la tienda cuando el cliente elige el color.</p>
                <div className="mt-3 space-y-2">
                  {form.colors.map((row, index) => {
                    const photo = row.preview ?? imageUrl(row.image);
                    return (
                      <div key={row.key} className="grid items-end gap-3 rounded-lg border border-[#4a4a4a] p-3 sm:grid-cols-[72px_1fr_10rem_1fr_auto]">
                        <div className="grid h-[72px] w-[72px] place-items-center overflow-hidden rounded-lg bg-[#1a1a1a] text-[10px] text-[#A7A7A7]">
                          {photo ? <img src={photo} alt="" className="h-full w-full object-contain" /> : "Sin foto"}
                        </div>
                        <label className="text-xs font-semibold text-[#d4d4d4]">Color {index + 1}
                          <select name={`color-${index}`} value={row.color} onChange={(event) => setRow(row.key, { color: event.target.value })} className={inputClass}>
                            <option value="">Elegí un color</option>
                            {options.colors.map((color) => <option key={color.name}>{color.name}</option>)}
                          </select>
                        </label>
                        <div className="text-xs font-semibold text-[#d4d4d4]">
                          <label htmlFor={`unidades-${index}`}>Unidades</label>
                          <input id={`unidades-${index}`} name={`unidades-${index}`} inputMode="numeric" value={row.stock} disabled={row.onOrder} onChange={(event) => setRow(row.key, { stock: event.target.value })} placeholder="Ej.: 3" className={`${inputClass} disabled:opacity-40`} />
                          <label htmlFor={`encargo-${index}`} className="mt-2 flex items-center gap-2 font-normal text-sm text-[#d4d4d4]">
                            <input id={`encargo-${index}`} name={`encargo-${index}`} type="checkbox" checked={row.onOrder} onChange={(event) => setRow(row.key, { onOrder: event.target.checked, stock: event.target.checked ? "" : row.stock })} className="h-4 w-4 accent-[#FFD83D]" />
                            Por encargo
                          </label>
                        </div>
                        <label className="text-xs font-semibold text-[#d4d4d4]">{photo ? "Cambiar foto" : "Subir foto"}
                          <input name={`foto-${index}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            setRow(row.key, { file, preview: file ? URL.createObjectURL(file) : null });
                          }} className="mt-1 block w-full text-xs text-[#d4d4d4] file:mr-2 file:h-10 file:rounded-lg file:border-0 file:bg-[#3a2a00] file:px-3 file:font-semibold file:text-[#FFD83D]" />
                        </label>
                        <button type="button" disabled={form.colors.length === 1} onClick={() => setForm({ ...form, colors: form.colors.filter((item) => item.key !== row.key) })} className="h-10 rounded-lg bg-[#3a1212] px-3 text-xs font-semibold text-[#fecaca] disabled:opacity-40">Quitar</button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setForm({ ...form, colors: [...form.colors, newRow()] })} className="mt-2 rounded-lg border border-[#4a4a4a] px-3 py-2 text-xs font-semibold">+ Agregar otro color</button>
              </fieldset>

              <div className="flex flex-wrap gap-2">
                <button disabled={saving} className="h-10 rounded-lg bg-brand px-5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button>
                <button type="button" onClick={() => { setForm(null); say(""); }} className="h-10 rounded-lg border border-[#4a4a4a] px-4 text-sm">Cancelar</button>
              </div>
            </form>
          ) : null}

          <div role="group" aria-label="Ver por categoría" className="mt-4 flex flex-wrap gap-2">
            {[{ id: "", name: "Todos", count: products?.length ?? 0 }, ...productCategories.map((category) => ({ id: String(category.id), name: category.name, count: (products ?? []).filter((product) => product.categoryId === category.id).length }))].map((item) => (
              <button
                key={item.id || "todos"}
                type="button"
                aria-pressed={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${tab === item.id ? "bg-[#3a2a00] text-[#FFD83D]" : "text-[#d4d4d4] hover:bg-[#2a2a2a]"}`}
              >
                {item.name} ({item.count})
              </button>
            ))}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="admin-table w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs text-[#A7A7A7]">
                <tr>
                  <th className="py-2 font-medium">Imagen</th>
                  <th className="font-medium">Producto</th>
                  <th className="font-medium">Marca</th>
                  <th className="font-medium">Precio</th>
                  <th className="font-medium">Stock por color</th>
                  <th className="font-medium">Estado</th>
                  <th className="font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((product) => (
                  <tr key={product.id} className="border-t border-[#4a4a4a]">
                    <td className="py-2"><ProductPhoto src={product.image} className="h-10 w-10" /></td>
                    <td>
                      <span className="font-semibold">{product.name}</span>
                      <span className="block text-xs text-[#A7A7A7]">{[product.category, product.condition === "Usados" ? "Usado" : "Nuevo", product.featured ? "Destacado" : ""].filter(Boolean).join(" · ")}</span>
                    </td>
                    <td>{product.brand}</td>
                    <td>{product.askPrice ? "Consultar por WhatsApp" : <>{formatPrice(product.price)}{product.oldPrice ? <span className="block text-xs text-[#A7A7A7] line-through">{formatPrice(product.oldPrice)}</span> : null}</>}</td>
                    <td className="text-xs">
                      {product.colors.map((color) => (
                        <span key={color.variantId} className={`mr-2 inline-flex items-center gap-1 ${!color.onOrder && color.stock <= LOW_STOCK ? "font-bold text-[#FFD83D]" : ""}`}>
                          <span className="h-2.5 w-2.5 rounded-full border border-black/20" style={{ background: color.hex }} />
                          {color.name}: {color.onOrder ? "por encargo" : color.stock}
                        </span>
                      ))}
                    </td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${product.colors.every((color) => color.onOrder) ? "bg-[#3a2a00] text-[#FFD83D]" : product.stock === 0 ? "bg-[#3a1212] text-[#fecaca]" : product.stock <= LOW_STOCK ? "bg-[#3a2a00] text-[#FFD83D]" : "bg-[#123024] text-[#86efac]"}`}>
                        {product.colors.every((color) => color.onOrder) ? "Por encargo" : product.stock === 0 ? "Sin stock" : product.stock <= LOW_STOCK ? "Poco stock" : "A la venta"}
                      </span>
                    </td>
                    <td>
                      <span className="flex gap-1.5">
                        <button type="button" onClick={() => openEdit(product)} className="rounded-md bg-[#3a2a00] px-2 py-1 text-xs font-semibold text-[#FFD83D]">Editar</button>
                        <button type="button" onClick={() => void remove(product)} className="rounded-md bg-[#3a1212] px-2 py-1 text-xs font-semibold text-[#fecaca]">Eliminar</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products === null && !loadError ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Cargando productos...</p> : null}
            {products !== null && shown.length === 0 ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Todavía no cargaste productos en esta categoría. Tocá Cargar un producto.</p> : null}
          </div>
          <p className="mt-3 text-right text-xs text-[#A7A7A7]">{products ? `${products.length} productos en la tienda. Los combos usan el stock de estos productos.` : ""}</p>
        </section>

        <section id="admin-categorias" className="rounded-2xl bg-[#333333] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Categorías</h2>
              <p className="text-xs text-[#d4d4d4]">Grupos para ordenar la vidriera. La cantidad de productos se cuenta sola.</p>
            </div>
            <button type="button" onClick={() => setCategoryForm({ id: null, name: "", description: "", phoneSpecs: false })} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold">
              Nueva categoría
            </button>
          </div>
          {categoryForm ? (
            <form className="mt-3 grid gap-2 rounded-xl border border-[#4a4a4a] bg-[#242424] p-3 md:grid-cols-[1fr_2fr_auto]" onSubmit={(event) => { event.preventDefault(); void submitCategory(); }}>
              <label className="text-xs font-semibold text-[#d4d4d4]">Nombre
                <input name="categoria-nombre" value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} placeholder="Ej.: Accesorios" className={inputClass} />
              </label>
              <label className="text-xs font-semibold text-[#d4d4d4]">Para qué sirve
                <input name="categoria-descripcion" value={categoryForm.description} onChange={(event) => setCategoryForm({ ...categoryForm, description: event.target.value })} placeholder="Ej.: Fundas, cargadores y cables" className={inputClass} />
              </label>
              <label className="flex items-center gap-2 text-sm text-[#d4d4d4] md:col-span-2 md:row-start-2">
                <input name="categoria-ficha-celular" type="checkbox" checked={categoryForm.phoneSpecs} onChange={(event) => setCategoryForm({ ...categoryForm, phoneSpecs: event.target.checked })} className="h-4 w-4 accent-[#FFD83D]" />
                Lleva almacenamiento, RAM e IMEI (celulares, tablets)
              </label>
              <span className="flex items-end gap-2">
                <button className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold">Guardar</button>
                <button type="button" onClick={() => setCategoryForm(null)} className="h-10 rounded-lg border border-[#4a4a4a] px-3 text-sm">Cancelar</button>
              </span>
            </form>
          ) : null}
          <div className="mt-3 overflow-x-auto">
            <table className="admin-table w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-[#A7A7A7]">
                <tr>
                  <th className="py-2 font-medium">Nombre</th>
                  <th className="font-medium">Descripción</th>
                  <th className="font-medium">Ficha</th>
                  <th className="font-medium">Productos</th>
                  <th className="font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(options?.categories ?? []).map((category) => (
                  <tr key={category.id} className="border-t border-[#4a4a4a]">
                    <td className="py-3">{category.name}</td>
                    <td className="py-3 text-[#d4d4d4]">{category.description}</td>
                    <td className="text-xs text-[#d4d4d4]">{category.slug === "combos" ? "Combo" : category.phoneSpecs ? "Celular: almacenamiento, RAM e IMEI" : "General"}</td>
                    <td>{category.products}</td>
                    <td>
                      <span className="flex gap-1.5">
                        <button type="button" onClick={() => setCategoryForm({ id: category.id, name: category.name, description: category.description, phoneSpecs: category.phoneSpecs })} className="rounded-md bg-[#3a2a00] px-2 py-1 text-xs font-semibold text-[#FFD83D]">Editar</button>
                        <button type="button" onClick={() => void removeCategory(category.id, category.name)} className="rounded-md bg-[#3a1212] px-2 py-1 text-xs font-semibold text-[#fecaca]">Eliminar</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

type ComboRow = { key: number; variantId: string; quantity: string };
type ComboForm = { id: number | null; name: string; price: string; oldPrice: string; description: string; featured: boolean; items: ComboRow[] };

const newComboRow = (variantId = "", quantity = "1"): ComboRow => ({ key: ++rowKey, variantId, quantity });

function CombosAdmin({ onChange }: { onChange: () => void }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [form, setForm] = useState<ComboForm | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    void fetchCatalog().then((catalog) => {
      if (catalog.ok) setProducts(catalog.data);
      setLoadError(catalog.ok ? "" : catalog.error);
    });
  }, []);

  useEffect(load, [load]);

  const say = (text: string, bad = false) => {
    setNotice(text);
    setNoticeError(bad);
    if (text) window.setTimeout(() => document.getElementById("aviso-combos")?.scrollIntoView({ behavior: "smooth", block: "center" }), 40);
  };

  const phones = (products ?? []).filter((item) => item.type === "PRODUCT");
  const combos = (products ?? []).filter((item) => item.type === "COMBO");
  const variants = new Map(phones.flatMap((phone) => phone.colors.map((color) => [color.variantId, { phone, color }] as const)));
  const describe = (variantId: number) => {
    const found = variants.get(variantId);
    return found ? `${found.phone.name} · ${found.color.name}` : "Producto que ya no está a la venta";
  };
  const separateTotal = (items: { variantId: number; quantity: number }[]) =>
    items.reduce((sum, item) => sum + (variants.get(item.variantId)?.phone.price ?? 0) * item.quantity, 0);

  const formItems = (form?.items ?? [])
    .map((row) => ({ variantId: Number(row.variantId), quantity: Number(row.quantity) }))
    .filter((item) => item.variantId > 0 && item.quantity > 0);
  const separate = separateTotal(formItems);
  const price = form ? parsePesos(form.price) : 0;

  const scrollToForm = () => window.setTimeout(() => document.getElementById("form-combo")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);

  const openNew = () => {
    say("");
    setForm({ id: null, name: "", price: "", oldPrice: "", description: "", featured: false, items: [newComboRow()] });
    scrollToForm();
  };

  const openEdit = (combo: Product) => {
    say("");
    setForm({
      id: combo.id,
      name: combo.name,
      price: String(combo.price),
      oldPrice: combo.oldPrice ? String(combo.oldPrice) : "",
      description: combo.description,
      featured: combo.featured,
      items: combo.items.length > 0 ? combo.items.map((item) => newComboRow(String(item.variantId), String(item.quantity))) : [newComboRow()],
    });
    scrollToForm();
  };

  const setRow = (key: number, patch: Partial<ComboRow>) => {
    setForm((current) => current && { ...current, items: current.items.map((row) => row.key === key ? { ...row, ...patch } : row) });
  };

  const submit = async () => {
    if (!form) return;
    const oldPrice = parsePesos(form.oldPrice);
    const problems: string[] = [];
    if (!form.name.trim()) problems.push("Escribí el nombre del combo.");
    if (form.items.some((row) => !row.variantId)) problems.push("Elegí el producto y el color de cada fila.");
    if (form.items.some((row) => !/^[1-9]\d*$/.test(row.quantity.trim()))) problems.push("La cantidad de cada fila tiene que ser 1 o más.");
    if (new Set(form.items.map((row) => row.variantId)).size !== form.items.length) problems.push("Hay un producto repetido con el mismo color.");
    if (price <= 0) problems.push("Escribí el precio del combo en pesos, por ejemplo 499.999.");
    if (oldPrice && oldPrice <= price) problems.push("El precio anterior tiene que ser más alto que el del combo, o dejalo vacío.");
    if (problems.length > 0) {
      say(problems.join(" "), true);
      return;
    }

    setSaving(true);
    const result = await saveCombo({
      id: form.id,
      name: form.name.trim(),
      price,
      oldPrice: oldPrice || null,
      description: form.description.trim(),
      featured: form.featured,
      items: formItems,
    });
    setSaving(false);
    if (!result.ok) {
      say(result.error, true);
      return;
    }
    say(form.id ? `Listo, ${form.name.trim()} quedó actualizado.` : `Listo, ${form.name.trim()} ya está a la venta en Combos a ${formatPrice(cashPrice(price))} contado.`);
    setForm(null);
    load();
    onChange();
  };

  const remove = async (combo: Product) => {
    if (!window.confirm(`¿Sacar ${combo.name} de la tienda? Los productos siguen a la venta y las ventas que tuvo quedan guardadas.`)) return;
    const result = await deleteProduct(combo.id);
    if (!result.ok) {
      say(result.error, true);
      return;
    }
    say(`${combo.name} ya no se muestra en la tienda.`);
    load();
    onChange();
  };

  return (
    <div>
      <div className="bg-[#242424] px-6 py-4 pl-16 text-white lg:pl-6">
        <h1 className="text-xl font-bold">Combos</h1>
      </div>
      <div className="space-y-4 p-5">
        <section className="rounded-2xl bg-[#333333] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Combos</h2>
              <p className="text-xs text-[#d4d4d4]">Armalos con los productos que ya cargaste en Productos. El stock del combo sale del stock de esos productos; el precio lo ponés vos.</p>
            </div>
            <button type="button" onClick={openNew} disabled={!products || phones.length === 0} className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold disabled:opacity-50">
              Armar un combo
            </button>
          </div>
          {loadError ? <p role="alert" className="mt-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{loadError}</p> : null}
          {notice ? <p id="aviso-combos" role={noticeError ? "alert" : "status"} className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${noticeError ? "bg-[#3a1212] text-[#fecaca]" : "bg-[#123024] text-[#86efac]"}`}>{notice}</p> : null}

          {form ? (
            <form id="form-combo" className="mt-3 space-y-4 rounded-xl border border-[#4a4a4a] bg-[#242424] p-4" onSubmit={(event) => { event.preventDefault(); void submit(); }} noValidate>
              <h3 className="font-bold">{form.id ? `Editar ${form.name}` : "Nuevo combo"}</h3>
              <label className="block text-xs font-semibold text-[#d4d4d4]">Nombre del combo
                <input name="combo-nombre" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ej.: Galaxy A54 listo" className={inputClass} />
              </label>

              <fieldset>
                <legend className="text-sm font-bold">Productos del combo</legend>
                <p className="text-xs text-[#A7A7A7]">Elegí de los productos cargados. Cuando se vende el combo, se descuenta el stock de cada uno.</p>
                <div className="mt-3 space-y-2">
                  {form.items.map((row, index) => {
                    const chosen = variants.get(Number(row.variantId));
                    return (
                      <div key={row.key} className="grid items-end gap-3 rounded-lg border border-[#4a4a4a] p-3 sm:grid-cols-[56px_1fr_100px_auto]">
                        <ProductPhoto src={chosen?.color.image ?? chosen?.phone.image ?? null} className="h-14 w-14" />
                        <label className="text-xs font-semibold text-[#d4d4d4]">Producto y color {index + 1}
                          <select name={`combo-celular-${index}`} value={row.variantId} onChange={(event) => setRow(row.key, { variantId: event.target.value })} className={inputClass}>
                            <option value="">Elegí un producto</option>
                            {phones.map((phone) => (
                              <optgroup key={phone.id} label={phone.name}>
                                {phone.colors.map((color) => (
                                  <option key={color.variantId} value={color.variantId}>
                                    {phone.name} · {color.name} — {formatPrice(phone.price)} ({color.stock} en stock)
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-semibold text-[#d4d4d4]">Cantidad
                          <input name={`combo-cantidad-${index}`} inputMode="numeric" value={row.quantity} onChange={(event) => setRow(row.key, { quantity: event.target.value })} className={inputClass} />
                        </label>
                        <button type="button" disabled={form.items.length === 1} onClick={() => setForm({ ...form, items: form.items.filter((item) => item.key !== row.key) })} className="h-10 rounded-lg bg-[#3a1212] px-3 text-xs font-semibold text-[#fecaca] disabled:opacity-40">Quitar</button>
                      </div>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setForm({ ...form, items: [...form.items, newComboRow()] })} className="mt-2 rounded-lg border border-[#4a4a4a] px-3 py-2 text-xs font-semibold">+ Agregar otro producto</button>
              </fieldset>

              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs font-semibold text-[#d4d4d4]">Precio del combo en pesos (tarjeta 1 pago)
                  <input name="combo-precio" inputMode="numeric" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="Ej.: 499.999" className={inputClass} />
                  <span className="mt-1 block font-normal text-[#A7A7A7]">{price > 0 ? `Se publica a ${formatPrice(price)} · contado ${formatPrice(cashPrice(price))}` : "Podés escribirlo con o sin puntos."}</span>
                </label>
                <label className="text-xs font-semibold text-[#d4d4d4]">Precio anterior (opcional, sale tachado)
                  <input name="combo-precio-anterior" inputMode="numeric" value={form.oldPrice} onChange={(event) => setForm({ ...form, oldPrice: event.target.value })} placeholder="Ej.: 549.999" className={inputClass} />
                </label>
                <div className="rounded-lg border border-[#4a4a4a] p-3 text-xs text-[#d4d4d4]">
                  <p>Los productos solos, sin accesorios, suman</p>
                  <p className="mt-1 text-lg font-bold text-white">{formatPrice(separate)}</p>
                  {separate > 0 ? (
                    <button type="button" onClick={() => setForm({ ...form, price: String(separate) })} className="mt-1 font-semibold text-[#FFD83D] underline-offset-2 hover:underline">Usar este precio</button>
                  ) : null}
                </div>
                <label className="text-xs font-semibold text-[#d4d4d4] md:col-span-2">Qué incluye además de los productos (uno por renglón)
                  <textarea name="combo-incluye" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={4} placeholder={"Ej.:\nCargador 25W\nFunda\nVidrio templado"} className={`${inputClass} h-auto py-2`} />
                </label>
                <label className="flex items-center gap-2 self-center text-sm text-[#d4d4d4]">
                  <input name="combo-destacado" type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} className="h-4 w-4 accent-[#FFD83D]" />
                  Mostrar en destacados
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button disabled={saving} className="h-10 rounded-lg bg-brand px-5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button>
                <button type="button" onClick={() => { setForm(null); say(""); }} className="h-10 rounded-lg border border-[#4a4a4a] px-4 text-sm">Cancelar</button>
              </div>
            </form>
          ) : null}

          <div className="mt-3 overflow-x-auto">
            <table className="admin-table w-full min-w-[820px] text-left text-sm">
              <thead className="text-xs text-[#A7A7A7]">
                <tr>
                  <th className="py-2 font-medium">Imagen</th>
                  <th className="font-medium">Combo</th>
                  <th className="font-medium">Precio</th>
                  <th className="font-medium">Productos solos</th>
                  <th className="font-medium">Estado</th>
                  <th className="font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {combos.map((combo) => (
                  <tr key={combo.id} className="border-t border-[#4a4a4a]">
                    <td className="py-2"><ProductPhoto src={combo.image} className="h-10 w-10" /></td>
                    <td>
                      <span className="font-semibold">{combo.name}</span>
                      <span className="block text-xs text-[#A7A7A7]">
                        {[...combo.items.map((item) => `${item.quantity > 1 ? `${item.quantity}× ` : ""}${describe(item.variantId)}`), ...combo.specs].join(" · ")}
                      </span>
                    </td>
                    <td>{formatPrice(combo.price)}{combo.oldPrice ? <span className="block text-xs text-[#A7A7A7] line-through">{formatPrice(combo.oldPrice)}</span> : null}</td>
                    <td className="text-[#d4d4d4]">{formatPrice(separateTotal(combo.items))}</td>
                    <td>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${combo.stock === 0 ? "bg-[#3a1212] text-[#fecaca]" : combo.stock <= LOW_STOCK ? "bg-[#3a2a00] text-[#FFD83D]" : "bg-[#123024] text-[#86efac]"}`}>
                        {combo.stock === 0 ? "Sin stock" : `${combo.stock} disponibles`}
                      </span>
                    </td>
                    <td>
                      <span className="flex gap-1.5">
                        <button type="button" onClick={() => openEdit(combo)} className="rounded-md bg-[#3a2a00] px-2 py-1 text-xs font-semibold text-[#FFD83D]">Editar</button>
                        <button type="button" onClick={() => void remove(combo)} className="rounded-md bg-[#3a1212] px-2 py-1 text-xs font-semibold text-[#fecaca]">Eliminar</button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products === null && !loadError ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Cargando combos...</p> : null}
            {products && combos.length === 0 ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Todavía no hay combos. Tocá "Armar un combo" para crear el primero.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function NavIcon({ id }: { id: AdminSection }) {
  const paths: Record<AdminSection, string> = {
    inicio: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-8.5Z",
    ventas: "M4 16l5-5 3 3 7-8",
    productos: "M4 7h16v12H4zM8 7V5h8v2",
    combos: "M3 10h18v10H3zM2 7h20v3H2zM12 7v13M12 7c-1.5-3-5-3-5-1s3.5 1 5 1Zm0 0c1.5-3 5-3 5-1s-3.5 1-5 1Z",
    marcas: "M12 3l2.2 4.6L19 8.2l-3.5 3.4.8 4.9L12 14.8 7.7 16.5l.8-4.9L5 8.2l4.8-.6L12 3Z",
    clientes: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19c.6-2.5 2.4-4 4.5-4s3.9 1.5 4.5 4M14 15c1.8 0 3.3 1.1 4 3",
    mensajes: "M4 6h16v11H8l-4 3V6Z",
    inventario: "M4 7l8-3 8 3-8 3-8-3ZM4 7v10l8 3 8-3V7",
    promociones: "M4 12l8-8h6v6l-8 8-6-6Z",
    envios: "M3 16V8h11v8M14 12h4l3 3v1h-7M7 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM17 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
    canjes: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3.5 1 5 1Zm0 0c1.5-3 5-3 5-1s-3.5 1-5 1Z",
    reportes: "M5 19V10M10 19V5M15 19v-7M20 19V8",
    usuarios: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 19c.7-2.6 2.6-4 5-4s4.3 1.4 5 4",
    postventa: "M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4M12 8v4l3 2",
    legal: "M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3ZM9 12l2 2 4-4",
    configuracion: "M12 8.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5ZM12 3v2.2M12 18.8V21M4.8 6.2l1.6 1.6M17.6 16.2l1.6 1.6M3 12h2.2M18.8 12H21M4.8 17.8l1.6-1.6M17.6 7.8l1.6-1.6",
  };
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d={paths[id]} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
