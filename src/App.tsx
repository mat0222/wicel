import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { SiteFooter } from "./components/SiteFooter";
import { fetchCatalog, fetchSession, fetchSettings, logout, type Account, type StoreSettings } from "./lib/api";
import { AccountDialog, InfoDialog, ProductDialog } from "./components/ShopDialogs";
import { StoreHeader } from "./components/StoreHeader";
import { MAX_PER_ITEM, setFinancing, type AdminSection, type CartItem, type Product, type View } from "./lib/data";
import { applyStoreSettings } from "./lib/store";
import { CatalogPage } from "./pages/tienda/CatalogPage";
import { HomePage } from "./pages/tienda/HomePage";
import { LoginPage, type LoginMode } from "./pages/tienda/LoginPage";
import { ContactPage } from "./pages/tienda/ContactPage";
import { CartPage, CombosPage } from "./pages/tienda/PublicPages";
import { LegalPage, OrderPage, RegretPage } from "./pages/tienda/LegalPages";
import { RewardsPage } from "./pages/tienda/RewardsPage";

const AdminApp = lazy(() => import("./pages/admin/AdminPages").then((module) => ({ default: module.AdminApp })));

const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
const paths: Record<View, string> = {
  home: "/",
  productos: "/productos",
  combos: "/combos",
  canjes: "/canjes",
  contacto: "/contacto",
  carrito: "/carrito",
  login: "/ingresar",
  admin: "/admin",
  terminos: "/terminos",
  privacidad: "/privacidad",
  cookies: "/cookies",
  garantias: "/garantias",
  arrepentimiento: "/arrepentimiento",
  pedido: "/mi-pedido",
};

const productPath = /^\/productos\/([a-z0-9-]+)$/;
const currentPath = () => window.location.pathname.slice(base.length).replace(/\/+$/, "") || "/";

function viewFromLocation(): View {
  const path = currentPath();
  if (productPath.test(path)) return "productos";
  return (Object.entries(paths).find(([, value]) => value === path)?.[0] as View | undefined) ?? "home";
}

function slugFromLocation(): string | null {
  return productPath.exec(currentPath())?.[1] ?? null;
}

function savedCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem("wicel-carrito") ?? "[]") as CartItem[];
    return Array.isArray(parsed) ? parsed.filter((item) => Number.isInteger(item.variantId) && item.qty > 0) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [view, setView] = useState<View>(viewFromLocation);
  const [query, setQuery] = useState("");
  const [adminSection, setAdminSection] = useState<AdminSection>("inicio");
  const [cart, setCart] = useState<CartItem[]>(savedCart);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [promos, setPromos] = useState(false);
  const [active, setActive] = useState<string | null>(slugFromLocation);
  const pushedProduct = useRef(false);
  const [info, setInfo] = useState<"puntos" | "cuotas" | null>(null);
  const [notice, setNotice] = useState("");
  const [account, setAccount] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [user, setUser] = useState<Account | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("ingresar");
  const [returnTo, setReturnTo] = useState<View>("home");
  const [products, setProducts] = useState<Product[] | null>(null);
  const [catalogError, setCatalogError] = useState("");

  const navigate = useCallback((next: View) => {
    setView(next);
    setActive(null);
    pushedProduct.current = false;
    const target = base + paths[next];
    if (window.location.pathname !== target || window.location.hash) window.history.pushState(null, "", target);
    window.scrollTo(0, 0);
  }, []);

  const loadCatalog = useCallback(() => {
    void fetchCatalog().then((result) => {
      setCatalogError(result.ok ? "" : result.error);
      if (result.ok) setProducts(result.data);
    });
  }, []);

  useEffect(loadCatalog, [loadCatalog]);

  useEffect(() => {
    void fetchSession().then((found) => {
      setUser(found);
      setSessionChecked(true);
    });
    void fetchSettings().then((found) => {
      setFinancing(found);
      applyStoreSettings(found);
      setSettings(found);
    });
  }, []);

  useEffect(() => {
    const onPop = () => {
      pushedProduct.current = false;
      setView(viewFromLocation());
      setActive(slugFromLocation());
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("wicel-carrito", JSON.stringify(cart));
    } catch {
      /* el carrito sigue en memoria */
    }
  }, [cart]);

  const product = products?.find((item) => item.slug === active) ?? null;
  const storeName = settings?.store_name || "wicel";

  useEffect(() => {
    document.title = product ? `${product.name} | ${storeName}` : storeName;
  }, [product, storeName]);

  const openProduct = (slug: string) => {
    setActive(slug);
    const target = `${base}/productos/${slug}`;
    if (window.location.pathname === target) return;
    if (slugFromLocation()) window.history.replaceState(null, "", target);
    else {
      window.history.pushState(null, "", target);
      pushedProduct.current = true;
    }
  };

  const closeProduct = () => {
    if (!slugFromLocation()) return setActive(null);
    if (pushedProduct.current) {
      pushedProduct.current = false;
      window.history.back();
      return;
    }
    setActive(null);
    window.history.replaceState(null, "", base + paths[view]);
  };

  const count = cart.reduce((total, item) => total + item.qty, 0);
  const inCart = (variantId: number) => cart.find((item) => item.variantId === variantId)?.qty ?? 0;
  const stockOf = (variantId: number) => products?.flatMap((item) => item.colors).find((color) => color.variantId === variantId)?.stock ?? 0;

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const addToCart = (variantId: number, qty: number) => {
    const room = Math.min(stockOf(variantId), MAX_PER_ITEM) - inCart(variantId);
    if (room <= 0) {
      notify(inCart(variantId) >= MAX_PER_ITEM ? `Por pedido se pueden llevar hasta ${MAX_PER_ITEM} unidades de cada producto. Para más, escribinos.` : "No queda más stock de ese producto.");
      return;
    }
    const amount = Math.min(qty, room);
    setCart((current) => {
      const found = current.find((item) => item.variantId === variantId);
      if (!found) return [...current, { variantId, qty: amount }];
      return current.map((item) => item.variantId === variantId ? { ...item, qty: item.qty + amount } : item);
    });
    closeProduct();
    notify(amount < qty ? `Agregamos ${amount}: ${stockOf(variantId) > MAX_PER_ITEM ? `el máximo por pedido es ${MAX_PER_ITEM}` : "es todo el stock que queda"}.` : "Agregado al carrito.");
  };

  const toggleFavorite = (slug: string) => {
    setFavorites((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  };

  const openLogin = (mode: LoginMode, back: View = "home") => {
    setLoginMode(mode);
    setReturnTo(back);
    navigate("login");
  };

  const signIn = (found: Account, created: boolean) => {
    setUser(found);
    if (found.role === "administrador") {
      setAdminSection("inicio");
      navigate("admin");
      return;
    }
    navigate(returnTo === "login" || returnTo === "admin" ? "home" : returnTo);
    notify(created ? `¡Listo, ${found.name.split(" ")[0]}! Ya sumás puntos con cada compra.` : `Hola, ${found.name.split(" ")[0]}.`);
  };

  /** Entrar al catálogo siempre fija los filtros: sin argumentos muestra todo, para que no quede pegado el último filtro usado. */
  const browse = (filters: { brand?: string; category?: string; promos?: boolean } = {}) => {
    setBrand(filters.brand ?? "");
    setCategory(filters.category ?? "");
    setPromos(filters.promos ?? false);
    navigate("productos");
  };
  const goTo = (next: View) => (next === "productos" ? browse() : navigate(next));

  const signOut = async () => {
    await logout();
    setUser(null);
    setAccount(false);
    navigate("home");
    notify("Cerraste sesión.");
  };

  const refreshUser = () => {
    void fetchSession().then(setUser);
  };

  if (view === "login") return <LoginPage key={loginMode} initialMode={loginMode} onLogin={signIn} onBack={() => navigate(returnTo === "login" ? "home" : returnTo)} />;
  if (view === "admin") {
    if (!sessionChecked) return <div className="min-h-screen bg-[#242424]" />;
    if (user?.role !== "administrador") return <LoginPage initialMode="ingresar" onLogin={signIn} onBack={() => navigate("home")} />;
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#242424]" />}>
        <AdminApp user={user} section={adminSection} onSection={setAdminSection} onLeave={() => { navigate("home"); loadCatalog(); }} onLogout={signOut} onCatalogChange={loadCatalog} />
      </Suspense>
    );
  }

  return (
    <div className="store min-h-screen">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand focus:px-3 focus:py-2 focus:text-sm focus:font-semibold">Saltar al contenido</a>
      <StoreHeader signedIn={user !== null} view={view} query={query} cartCount={count} accountOpen={account} onQuery={setQuery} onNavigate={goTo} onAccount={() => { if (user) { refreshUser(); setAccount(true); } else openLogin("ingresar", view); }} />
      <div id="contenido">
      {view === "home" ? (
        <HomePage
          products={products}
          onNavigate={goTo}
          onBrand={(value) => browse({ brand: value })}
          onCategory={(value) => browse({ category: value })}
          onPromos={() => browse({ promos: true })}
          onOpen={openProduct}
          onInfo={setInfo}
          favorites={favorites}
          onFavorite={toggleFavorite}
        />
      ) : null}
      {view === "productos" ? (
        <CatalogPage
          key={`${brand}-${category}-${promos}`}
          products={products}
          loadError={catalogError}
          query={query}
          brand={brand}
          categorySlug={category}
          promos={promos}
          favorites={favorites}
          onNavigate={goTo}
          onOpen={openProduct}
          onFavorite={toggleFavorite}
          onReset={() => { setBrand(""); setCategory(""); setPromos(false); }}
          onRetry={loadCatalog}
        />
      ) : null}
      {view === "combos" ? <CombosPage products={products} inCart={inCart} onNavigate={goTo} onAdd={(variantId) => addToCart(variantId, 1)} /> : null}
      {view === "canjes" ? <RewardsPage user={user} settings={settings} onNavigate={goTo} onLogin={(mode) => openLogin(mode, "canjes")} onRedeemed={refreshUser} /> : null}
      {view === "contacto" ? <ContactPage onNavigate={goTo} /> : null}
      {view === "terminos" || view === "privacidad" || view === "cookies" || view === "garantias" ? <LegalPage key={view} doc={view} settings={settings} onNavigate={goTo} /> : null}
      {view === "arrepentimiento" ? <RegretPage onNavigate={goTo} /> : null}
      {view === "pedido" ? <OrderPage onNavigate={goTo} /> : null}
      {view === "carrito" ? (
        <CartPage
          items={cart}
          products={products}
          user={user}
          settings={settings}
          onNavigate={goTo}
          onLogin={() => openLogin("ingresar", "carrito")}
          onQty={(variantId, qty) => setCart((current) => current.map((item) => item.variantId === variantId ? { ...item, qty: Math.min(qty, MAX_PER_ITEM, Math.max(1, stockOf(variantId))) } : item))}
          onRemove={(variantId) => setCart((current) => current.filter((item) => item.variantId !== variantId))}
          onOrdered={() => { setCart([]); loadCatalog(); refreshUser(); }}
        />
      ) : null}
      </div>
      <SiteFooter onNavigate={goTo} settings={settings} />
      {account && user ? (
        <AccountDialog
          user={user}
          products={products ?? []}
          onPanel={() => { setAccount(false); setAdminSection("inicio"); navigate("admin"); }}
          onLogout={signOut}
          favorites={favorites}
          onOpen={(slug) => { setAccount(false); openProduct(slug); }}
          onCart={() => { setAccount(false); navigate("carrito"); }}
          onClose={() => setAccount(false)}
        />
      ) : null}
      {product ? <ProductDialog key={product.slug} product={product} settings={settings} inCart={inCart} favorite={favorites.includes(product.slug)} onFavorite={() => toggleFavorite(product.slug)} onAdd={addToCart} onClose={closeProduct} /> : null}
      {info ? <InfoDialog kind={info} example={products?.find((item) => item.featured && item.type === "PRODUCT")} onClose={() => setInfo(null)} onProducts={() => { setInfo(null); browse(); }} /> : null}
      {notice ? <p role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg">{notice}</p> : null}
    </div>
  );
}
