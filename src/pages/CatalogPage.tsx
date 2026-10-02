import { useMemo, useState } from "react";
import { Icon } from "../components/Icon";
import { ProductPhoto } from "../components/RealPhoneArt";
import { cardOffer, cashPrice, conditions, formatPrice, productBadge, stockLabel, type Product, type View } from "../data";

const pageSize = 9;

const bySize = (a: string, b: string) => {
  const gb = (value: string) => parseFloat(value) * (value.includes("TB") ? 1024 : 1);
  return gb(a) - gb(b);
};

export function CatalogPage({
  products,
  loadError,
  query,
  brand,
  promos,
  favorites,
  onNavigate,
  onOpen,
  onFavorite,
  onReset,
  onRetry,
}: {
  products: Product[] | null;
  loadError: string;
  query: string;
  brand: string;
  promos: boolean;
  favorites: string[];
  onNavigate: (view: View) => void;
  onOpen: (slug: string) => void;
  onFavorite: (slug: string) => void;
  onReset: () => void;
  onRetry: () => void;
}) {
  const [category, setCategory] = useState("");
  const [selectedBrands, setSelectedBrands] = useState<string[]>(brand ? [brand] : []);
  const [selectedStorage, setSelectedStorage] = useState<string[]>([]);
  const [selectedRam, setSelectedRam] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string[]>([]);
  const [promoOnly, setPromoOnly] = useState(promos);
  const [inStock, setInStock] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState("Más relevantes");
  const [list, setList] = useState(false);
  const [page, setPage] = useState(1);

  const items = useMemo(() => (products ?? []).filter((product) => product.type === "PRODUCT"), [products]);
  const categories = useMemo(() => {
    const found = new Map<string, { slug: string; name: string; count: number }>();
    for (const product of items) {
      const entry = found.get(product.categorySlug) ?? { slug: product.categorySlug, name: product.category, count: 0 };
      entry.count += 1;
      found.set(product.categorySlug, entry);
    }
    return [...found.values()];
  }, [items]);
  const inCategory = useMemo(() => (category ? items.filter((product) => product.categorySlug === category) : items), [items, category]);
  const categoryName = categories.find((item) => item.slug === category)?.name ?? "";
  const brands = useMemo(() => [...new Set(inCategory.map((product) => product.brand))].sort(), [inCategory]);
  const storages = useMemo(() => [...new Set(inCategory.map((product) => product.storage).filter(Boolean))].sort(bySize), [inCategory]);
  const rams = useMemo(() => [...new Set(inCategory.map((product) => product.ram).filter(Boolean))].sort(bySize), [inCategory]);
  const topPrice = Math.max(0, ...inCategory.map((product) => cashPrice(product.price)));
  const priceStep = topPrice > 500000 ? 50000 : 5000;
  const priceCeiling = Math.max(priceStep, Math.ceil(topPrice / priceStep) * priceStep);
  const priceLimit = Math.min(maxPrice ?? priceCeiling, priceCeiling);

  const filteredProducts = useMemo(() => {
    const text = query.trim().toLowerCase();
    const filtered = inCategory.filter((product) => {
      if (text && !`${product.name} ${product.brand} ${product.category}`.toLowerCase().includes(text)) return false;
      if (selectedBrands.length && !selectedBrands.includes(product.brand)) return false;
      if (selectedStorage.length && !selectedStorage.includes(product.storage)) return false;
      if (selectedRam.length && !selectedRam.includes(product.ram)) return false;
      if (selectedCondition.length && !selectedCondition.includes(product.condition)) return false;
      if (promoOnly && !product.oldPrice) return false;
      if (inStock && product.stock <= 0) return false;
      if (maxPrice !== null && cashPrice(product.price) > maxPrice) return false;
      return true;
    });
    const ranked = [...filtered];
    if (sort === "Menor precio") ranked.sort((a, b) => a.price - b.price);
    if (sort === "Mayor precio") ranked.sort((a, b) => b.price - a.price);
    if (sort === "Más relevantes") ranked.sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0));
    return ranked;
  }, [inCategory, query, selectedBrands, selectedStorage, selectedRam, selectedCondition, promoOnly, inStock, maxPrice, sort]);

  const pages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const current = Math.min(page, pages);
  const visible = filteredProducts.slice((current - 1) * pageSize, current * pageSize);
  const filter = (setter: (values: string[]) => void) => (values: string[]) => { setter(values); setPage(1); };

  const pickCategory = (slug: string) => {
    setCategory(slug);
    setSelectedBrands([]);
    setSelectedStorage([]);
    setSelectedRam([]);
    setMaxPrice(null);
    setPage(1);
  };

  const clear = () => {
    setCategory("");
    setSelectedBrands([]);
    setSelectedStorage([]);
    setSelectedRam([]);
    setSelectedCondition([]);
    setPromoOnly(false);
    setInStock(false);
    setMaxPrice(null);
    setPage(1);
    onReset();
  };

  return (
    <main className="mx-auto min-h-[70vh] max-w-[1240px] px-4 pb-16 pt-8">
      <p className="text-sm text-muted">
        <button type="button" className="hover:text-ink hover:underline" onClick={() => onNavigate("home")}>Inicio</button>
        <span aria-hidden="true"> / </span>
        {categoryName ? (
          <>
            <button type="button" className="hover:text-ink hover:underline" onClick={() => pickCategory("")}>Productos</button>
            <span aria-hidden="true"> / </span>
            <span className="text-ink">{categoryName}</span>
          </>
        ) : <span className="text-ink">Productos</span>}
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-3xl font-bold sm:text-4xl">{[categoryName || "Productos", selectedBrands.length === 1 ? selectedBrands[0] : ""].filter(Boolean).join(" ")}</h1>
        {products !== null ? <p className="text-sm text-muted">{filteredProducts.length} {filteredProducts.length === 1 ? "resultado" : "resultados"}</p> : null}
      </div>
      {categories.length > 1 ? (
        <nav aria-label="Categorías" className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {[{ slug: "", name: "Todos", count: items.length }, ...categories].map((item) => (
            <button
              key={item.slug || "todos"}
              type="button"
              aria-pressed={category === item.slug}
              onClick={() => pickCategory(item.slug)}
              className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${category === item.slug ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"}`}
            >
              {item.name} <span className={category === item.slug ? "text-white/70" : "text-muted"}>{item.count}</span>
            </button>
          ))}
        </nav>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="h-fit rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Filtros</h2>
            <button type="button" onClick={clear} className="text-sm text-muted underline-offset-2 hover:text-ink hover:underline">Limpiar</button>
          </div>
          <p className="mt-5 text-sm font-semibold">Precio de contado</p>
          <input type="range" min={priceStep} max={priceCeiling} step={priceStep} value={priceLimit} onChange={(event) => { const value = Number(event.target.value); setMaxPrice(value >= priceCeiling ? null : value); setPage(1); }} className="mt-3 w-full accent-[#151515]" aria-label="Precio máximo" />
          <p className="price text-sm text-muted">Hasta {formatPrice(priceLimit)}</p>

          <div className="mt-5 space-y-2 border-t border-line pt-4">
            <Check label="Solo con stock" checked={inStock} onChange={() => { setInStock((value) => !value); setPage(1); }} />
            <Check label="Solo con descuento" checked={promoOnly} onChange={() => { setPromoOnly((value) => !value); setPage(1); }} />
          </div>

          <FilterGroup title="Marca" options={brands} selected={selectedBrands} onChange={filter(setSelectedBrands)} />
          {storages.length > 0 ? <FilterGroup title="Almacenamiento" options={storages} selected={selectedStorage} onChange={filter(setSelectedStorage)} /> : null}
          {rams.length > 0 ? <FilterGroup title="RAM" options={rams} selected={selectedRam} onChange={filter(setSelectedRam)} /> : null}
          <FilterGroup title="Estado" options={conditions} selected={selectedCondition} onChange={filter(setSelectedCondition)} />
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-end gap-2 text-sm">
            <label htmlFor="orden" className="text-muted">Ordenar por</label>
            <select id="orden" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="h-10 rounded-full border border-line bg-white px-4 text-ink">
              <option>Más relevantes</option>
              <option>Menor precio</option>
              <option>Mayor precio</option>
            </select>
            <div className="flex rounded-full border border-line bg-white p-0.5">
              <button type="button" aria-label="Vista grilla" aria-pressed={!list} onClick={() => setList(false)} className={`grid h-10 w-10 place-items-center rounded-full ${list ? "text-muted" : "bg-ink text-white"}`}><Icon name="grid" className="h-4 w-4" /></button>
              <button type="button" aria-label="Vista lista" aria-pressed={list} onClick={() => setList(true)} className={`grid h-10 w-10 place-items-center rounded-full ${list ? "bg-ink text-white" : "text-muted"}`}><Icon name="list" className="h-4 w-4" /></button>
            </div>
          </div>

          {loadError ? (
            <div role="alert" className="rounded-2xl bg-bad-soft p-6 text-center text-sm text-bad">
              <p>{loadError}</p>
              <button type="button" onClick={onRetry} className="mt-3 rounded-full bg-ink px-5 py-2 font-semibold text-white">Probar de nuevo</button>
            </div>
          ) : products === null ? (
            <p className="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted">Cargando productos...</p>
          ) : visible.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-10 text-center">
              <p className="font-semibold">No hay productos con esos filtros.</p>
              <button type="button" onClick={clear} className="mt-3 text-sm text-muted underline">Limpiar filtros</button>
            </div>
          ) : null}
          <div className={list ? "grid gap-3" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"}>
            {visible.map((product) => (
              <ProductCard key={product.slug} product={product} list={list} favorite={favorites.includes(product.slug)} onOpen={() => onOpen(product.slug)} onFavorite={() => onFavorite(product.slug)} />
            ))}
          </div>

          {pages > 1 ? (
            <nav aria-label="Páginas" className="mt-8 flex items-center justify-center gap-1.5 text-sm">
              <PagerButton label="Página anterior" icon="chevronLeft" onClick={() => setPage(Math.max(1, current - 1))} />
              {Array.from({ length: pages }, (_, index) => index + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={current === n ? "page" : undefined}
                  className={`price grid h-10 w-10 place-items-center rounded-full ${current === n ? "bg-ink text-white" : "border border-line bg-white text-muted hover:text-ink"}`}
                >
                  {n}
                </button>
              ))}
              <PagerButton label="Página siguiente" icon="chevronRight" onClick={() => setPage(Math.min(pages, current + 1))} />
            </nav>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export function ProductCard({ product, list = false, favorite, onOpen, onFavorite }: { product: Product; list?: boolean; favorite: boolean; onOpen: () => void; onFavorite: () => void }) {
  const badge = productBadge(product);
  const stock = stockLabel(product.stock);
  const soldOut = product.stock <= 0;
  return (
    <article className={`wicel-card group relative rounded-2xl ${list ? "flex items-center gap-5 p-3 pr-5" : "flex flex-col p-3"}`}>
      <div className={`relative rounded-xl bg-white ${list ? "w-32 shrink-0" : ""}`}>
        <span className={`absolute left-2 top-2 z-10 rounded-full px-2.5 py-1 text-xs font-bold ${badge.tone === "red" ? "bg-brand text-[#080808]" : badge.tone === "green" ? "bg-ok-soft text-ok" : "bg-paper text-ink"}`}>
          {badge.label}
        </span>
        <button
          type="button"
          aria-label={favorite ? `Quitar ${product.name} de favoritos` : `Guardar ${product.name} en favoritos`}
          aria-pressed={favorite}
          onClick={onFavorite}
          className={`absolute right-1 top-1 z-10 grid h-11 w-11 place-items-center rounded-full ${favorite ? "text-bad" : "text-[#8a8a85] hover:text-ink"}`}
        >
          <Icon name="heart" filled={favorite} />
        </button>
        <ProductPhoto src={product.image} alt={product.name} className={`${list ? "h-32" : "h-56"} w-full py-4 transition duration-300 group-hover:scale-[1.03] ${soldOut ? "opacity-45" : ""}`} />
      </div>
      <div className={`min-w-0 flex-1 ${list ? "" : "px-2 pb-2 pt-3"}`}>
        <p className="text-xs font-medium text-muted">{product.brand}</p>
        <h3 className="mt-0.5 text-base font-semibold leading-snug">
          <button type="button" onClick={onOpen} className="text-left after:absolute after:inset-0 after:rounded-2xl">{product.name}</button>
        </h3>
        {product.colors.length > 0 ? (
          <div className="mt-2 flex items-center gap-1.5" aria-label={`Colores: ${product.colors.map((color) => color.name).join(", ")}`}>
            {product.colors.map((color) => <span key={color.variantId} title={color.name} className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ background: color.hex }} />)}
          </div>
        ) : null}
        <p className="price mt-3 text-2xl font-bold">{formatPrice(cashPrice(product.price))}</p>
        <p className="text-xs font-medium text-gold">Precio en efectivo o transferencia</p>
        <p className="price mt-1.5 text-sm text-muted">
          Tarjeta {product.oldPrice ? <s className="mr-1">{formatPrice(product.oldPrice)}</s> : null}{cardOffer(product.price)}
        </p>
        <p className={`mt-2 text-xs font-semibold ${stock.tone}`}>{stock.text}</p>
      </div>
    </article>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2.5 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-[#151515]" />
      {label}
    </label>
  );
}

function FilterGroup({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="mt-5 border-t border-line pt-4">
      <legend className="sr-only">{title}</legend>
      <p aria-hidden="true" className="text-sm font-semibold">{title}</p>
      <div className="mt-2.5 space-y-2">
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <Check
              key={option}
              label={option}
              checked={checked}
              onChange={() => onChange(checked ? selected.filter((item) => item !== option) : [...selected, option])}
            />
          );
        })}
      </div>
    </fieldset>
  );
}

function PagerButton({ label, icon, onClick }: { label: string; icon: "chevronLeft" | "chevronRight"; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-muted hover:text-ink">
      <Icon name={icon} className="h-4 w-4" />
    </button>
  );
}
