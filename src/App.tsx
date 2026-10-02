import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { SiteFooter } from "./components/SiteFooter";
import { fetchCatalog, fetchSession, fetchSettings, logout, type Account, type StoreSettings } from "./lib/api";
import { AccountDialog, InfoDialog, ProductDialog } from "./components/ShopDialogs";
import { StoreHeader } from "./components/StoreHeader";
import { setFinancing, type AdminSection, type CartItem, type Product, type View } from "./data";
import { whatsapp } from "./lib/store";
import { CatalogPage } from "./pages/CatalogPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage, type LoginMode } from "./pages/LoginPage";
import { ContactPage } from "./pages/ContactPage";
import { CartPage, CombosPage } from "./pages/PublicPages";
import { LegalPage, OrderPage, RegretPage } from "./pages/LegalPages";
import { RewardsPage } from "./pages/RewardsPage";

const AdminApp = lazy(() => import("./pages/AdminPages").then((module) => ({ default: module.AdminApp })));

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

function viewFromLocation(): View {
  const hash = window.location.hash.replace(/^#\/?/, "").replace(/\/+$/, "");
  const fromHash = Object.entries(paths).find(([, path]) => hash && path === `/${hash}`);
  if (fromHash) return fromHash[0] as View;
  const path = window.location.pathname.slice(base.length).replace(/\/+$/, "") || "/";
  return (Object.entries(paths).find(([, value]) => value === path)?.[0] as View | undefined) ?? "home";
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
  const [promos, setPromos] = useState(false);
  const [active, setActive] = useState<string | null>(null);
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
      setSettings(found);
      if (found?.store_name) document.title = found.store_name;
    });
  }, []);

  useEffect(() => {
    const onPop = () => setView(viewFromLocation());
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
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
  const count = cart.reduce((total, item) => total + item.qty, 0);
  const inCart = (variantId: number) => cart.find((item) => item.variantId === variantId)?.qty ?? 0;
  const stockOf = (variantId: number) => products?.flatMap((item) => item.colors).find((color) => color.variantId === variantId)?.stock ?? 0;

  const notify = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  const addToCart = (variantId: number, qty: number) => {
    const room = stockOf(variantId) - inCart(variantId);
    if (room <= 0) {
      notify("No queda más stock de ese producto.");
      return;
    }
    const amount = Math.min(qty, room);
    setCart((current) => {
      const found = current.find((item) => item.variantId === variantId);
      if (!found) return [...current, { variantId, qty: amount }];
      return current.map((item) => item.variantId === variantId ? { ...item, qty: item.qty + amount } : item);
    });
    setActive(null);
    notify(amount < qty ? `Agregamos ${amount}: es todo el stock que queda.` : "Agregado al carrito.");
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
      <StoreHeader signedIn={user !== null} view={view} query={query} cartCount={count} accountOpen={account} onQuery={setQuery} onNavigate={navigate} onAccount={() => { if (user) { refreshUser(); setAccount(true); } else openLogin("ingresar", view); }} />
      <div id="contenido">
      {view === "home" ? (
        <HomePage
          products={products}
          onNavigate={navigate}
          onBrand={(value) => { setBrand(value); setPromos(false); navigate("productos"); }}
          onPromos={() => { setBrand(""); setPromos(true); navigate("productos"); }}
          onOpen={setActive}
          onInfo={setInfo}
          favorites={favorites}
          onFavorite={toggleFavorite}
        />
      ) : null}
      {view === "productos" ? (
        <CatalogPage
          key={`${brand}-${promos}`}
          products={products}
          loadError={catalogError}
          query={query}
          brand={brand}
          promos={promos}
          favorites={favorites}
          onNavigate={navigate}
          onOpen={setActive}
          onFavorite={toggleFavorite}
          onReset={() => { setBrand(""); setPromos(false); }}
          onRetry={loadCatalog}
        />
      ) : null}
      {view === "combos" ? <CombosPage products={products} inCart={inCart} onNavigate={navigate} onAdd={(variantId) => addToCart(variantId, 1)} /> : null}
      {view === "canjes" ? <RewardsPage user={user} settings={settings} onNavigate={navigate} onLogin={(mode) => openLogin(mode, "canjes")} onRedeemed={refreshUser} /> : null}
      {view === "contacto" ? <ContactPage onNavigate={navigate} /> : null}
      {view === "terminos" || view === "privacidad" || view === "cookies" || view === "garantias" ? <LegalPage key={view} doc={view} settings={settings} onNavigate={navigate} /> : null}
      {view === "arrepentimiento" ? <RegretPage onNavigate={navigate} /> : null}
      {view === "pedido" ? <OrderPage onNavigate={navigate} /> : null}
      {view === "carrito" ? (
        <CartPage
          items={cart}
          products={products}
          user={user}
          settings={settings}
          onNavigate={navigate}
          onLogin={() => openLogin("ingresar", "carrito")}
          onQty={(variantId, qty) => setCart((current) => current.map((item) => item.variantId === variantId ? { ...item, qty: Math.min(qty, Math.max(1, stockOf(variantId))) } : item))}
          onRemove={(variantId) => setCart((current) => current.filter((item) => item.variantId !== variantId))}
          onOrdered={() => { setCart([]); loadCatalog(); refreshUser(); }}
        />
      ) : null}
      </div>
      <SiteFooter onNavigate={navigate} settings={settings} />
      {account && user ? (
        <AccountDialog
          user={user}
          products={products ?? []}
          onPanel={() => { setAccount(false); setAdminSection("inicio"); navigate("admin"); }}
          onLogout={signOut}
          favorites={favorites}
          onOpen={(slug) => { setAccount(false); setActive(slug); }}
          onCart={() => { setAccount(false); navigate("carrito"); }}
          onClose={() => setAccount(false)}
        />
      ) : null}
      {product ? <ProductDialog key={product.slug} product={product} settings={settings} inCart={inCart} favorite={favorites.includes(product.slug)} onFavorite={() => toggleFavorite(product.slug)} onAdd={addToCart} onClose={() => setActive(null)} /> : null}
      {info ? <InfoDialog kind={info} example={products?.find((item) => item.featured && item.type === "PRODUCT")} onClose={() => setInfo(null)} onProducts={() => { setInfo(null); setPromos(false); navigate("productos"); }} /> : null}
      {notice ? <p role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white shadow-lg">{notice}</p> : null}
      <a href={whatsapp("Hola wicel, quiero consultar por un producto.")} target="_blank" rel="noreferrer" aria-label="Escribinos por WhatsApp" className="fixed bottom-5 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-[#1a9e4b] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgb(0_0_0/18%)] hover:bg-[#15853f]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true"><path d="M12.04 2C6.58 2 2.15 6.4 2.15 11.83c0 1.74.46 3.44 1.34 4.94L2 22l5.39-1.4a10 10 0 0 0 4.65 1.18h.01c5.46 0 9.89-4.4 9.89-9.83C21.94 6.4 17.5 2 12.04 2Zm5.76 14.16c-.24.68-1.4 1.3-1.94 1.38-.5.08-1.12.11-1.81-.11-.41-.14-.95-.31-1.64-.61-2.88-1.24-4.76-4.14-4.9-4.33-.14-.19-1.16-1.54-1.16-2.94s.73-2.08 1-2.37c.24-.27.64-.39 1.02-.39.12 0 .23 0 .33.01.3.01.44.03.64.49.24.58.82 2 .89 2.15.07.14.12.32.02.51-.1.19-.14.31-.29.48-.14.17-.3.37-.43.5-.14.14-.29.29-.12.56.17.27.74 1.22 1.59 1.98 1.09.97 2.01 1.27 2.3 1.41.29.14.46.12.63-.07.17-.19.73-.85.92-1.14.2-.29.39-.24.64-.14.26.1 1.64.77 1.92.91.29.15.48.22.55.34.07.12.07.7-.17 1.38Z" /></svg>
        WhatsApp
      </a>
    </div>
  );
}
