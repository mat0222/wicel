import { useState } from "react";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import type { View } from "../data";

const links: [View, string][] = [
  ["home", "Inicio"],
  ["productos", "Productos"],
  ["combos", "Combos"],
  ["canjes", "Canjes"],
  ["contacto", "Contacto"],
];

export function StoreHeader({
  view,
  query,
  cartCount,
  onQuery,
  onNavigate,
  onAccount,
  accountOpen,
  signedIn,
}: {
  signedIn: boolean;
  view: View;
  query: string;
  cartCount: number;
  accountOpen: boolean;
  onQuery: (value: string) => void;
  onNavigate: (view: View) => void;
  onAccount: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (id: View) => { onNavigate(id); setMenuOpen(false); };

  return (
    <header className="sticky top-0 z-30">
      <div className="bg-brand text-[#080808]">
        <div className="mx-auto flex h-9 max-w-[1240px] items-center justify-center gap-6 px-4 text-[13px] font-semibold sm:justify-between">
          <span>10% menos pagando en efectivo o transferencia</span>
          <span className="hidden sm:inline">Retirá en el local el mismo día</span>
        </div>
      </div>
      <div className="bg-black text-white">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-6 px-4">
          <button type="button" onClick={() => go("home")} className="shrink-0" aria-label="wicel, ir al inicio">
            <Logo subtitle="Tu mundo en un solo lugar" />
          </button>
          <nav className="hidden h-full items-stretch gap-1 lg:flex" aria-label="Principal">
            {links.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                aria-current={view === id ? "page" : undefined}
                className={`relative px-3 text-[15px] font-medium ${view === id ? "text-white" : "text-white/70 hover:text-white"}`}
              >
                {label}
                {view === id ? <span className="absolute inset-x-3 bottom-0 h-[3px] bg-brand" /> : null}
              </button>
            ))}
          </nav>
          <form
            className="ml-auto hidden min-w-0 max-w-[340px] flex-1 md:block"
            role="search"
            onSubmit={(event) => { event.preventDefault(); go("productos"); }}
          >
            <label htmlFor="buscar" className="sr-only">Buscar productos, marcas o modelos</label>
            <div className="relative">
              <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input
                id="buscar"
                type="search"
                value={query}
                onChange={(event) => onQuery(event.target.value)}
                placeholder="Buscar celulares, termos, relojes..."
                className="h-10 w-full rounded-full border border-white/15 bg-white/10 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/50 focus:border-brand"
              />
            </div>
          </form>
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <button type="button" aria-label={signedIn ? "Mi cuenta" : "Ingresar"} aria-haspopup="dialog" aria-expanded={accountOpen} onClick={onAccount} className="flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-white/85 hover:text-white">
              <Icon name="user" />
              <span className="hidden xl:inline">{signedIn ? "Mi cuenta" : "Ingresar"}</span>
            </button>
            <button type="button" aria-label={cartCount > 0 ? `Carrito, ${cartCount} ${cartCount === 1 ? "producto" : "productos"}` : "Carrito vacío"} onClick={() => go("carrito")} className="relative grid h-11 w-11 place-items-center rounded-full text-white/85 hover:text-white">
              <Icon name="cart" />
              {cartCount > 0 ? <span className="price absolute right-0.5 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold">{cartCount}</span> : null}
            </button>
            <button type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} aria-controls="menu-movil" onClick={() => setMenuOpen((value) => !value)} className="grid h-11 w-11 place-items-center rounded-full lg:hidden">
              <Icon name={menuOpen ? "close" : "list"} />
            </button>
          </div>
        </div>
      </div>
      {menuOpen ? (
        <div id="menu-movil" className="absolute inset-x-0 top-full border-t border-white/10 bg-black px-4 pb-5 pt-2 text-white shadow-xl lg:hidden">
          <form className="mb-2 md:hidden" role="search" onSubmit={(event) => { event.preventDefault(); go("productos"); }}>
            <label htmlFor="buscar-movil" className="sr-only">Buscar productos, marcas o modelos</label>
            <input id="buscar-movil" type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Buscar celulares, termos, relojes..." className="h-11 w-full rounded-full border border-white/15 bg-white/10 px-4 text-sm text-white outline-none placeholder:text-white/50" />
          </form>
          <nav className="flex flex-col" aria-label="Principal">
            {links.map(([id, label]) => (
              <button key={id} type="button" onClick={() => go(id)} aria-current={view === id ? "page" : undefined} className={`flex h-12 items-center justify-between border-b border-white/10 text-left text-base font-medium ${view === id ? "text-brand" : "text-white"}`}>
                {label}
                <Icon name="chevronRight" className="h-4 w-4 text-white/40" />
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => { onAccount(); setMenuOpen(false); }} className="mt-4 h-11 w-full rounded-full bg-brand text-sm font-semibold">{signedIn ? "Mi cuenta" : "Ingresar o registrarme"}</button>
        </div>
      ) : null}
    </header>
  );
}
