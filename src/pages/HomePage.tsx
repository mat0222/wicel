import { useEffect, useState } from "react";
import { BrandBar } from "../components/BrandBar";
import { Icon } from "../components/Icon";
import { ProductPhoto } from "../components/RealPhoneArt";
import { cardOffer, cashPrice, financing, formatPrice, INSTALLMENTS, type Product, type View } from "../data";
import { address, directions, fullAddress, hours, shiftsText, storeStatus, storeTime, whatsapp } from "../lib/store";
import { publicUrl } from "../publicUrl";
import { ProductCard } from "./CatalogPage";

export function HomePage({
  products,
  onNavigate,
  onBrand,
  onPromos,
  onOpen,
  onInfo,
  favorites,
  onFavorite,
}: {
  products: Product[] | null;
  onNavigate: (view: View) => void;
  onBrand: (brand: string) => void;
  onPromos: () => void;
  onOpen: (name: string) => void;
  onInfo: (kind: "puntos" | "cuotas") => void;
  favorites: string[];
  onFavorite: (name: string) => void;
}) {
  const all = products ?? [];
  const items = all.filter((product) => product.type === "PRODUCT");
  const ranked = [...items.filter((product) => product.featured), ...items.filter((product) => !product.featured)];
  const inStock = ranked.filter((product) => product.stock > 0);
  const hero = inStock[0] ?? ranked[0];
  const example = inStock.find((product) => product !== hero) ?? hero;
  const featured = ranked.slice(0, 4);
  const combos = all.filter((product) => product.type === "COMBO");
  const brandNames = [...new Set(items.map((product) => product.brand))];
  const brandText = brandNames.length > 1 ? `${brandNames.slice(0, -1).join(", ")} y ${brandNames[brandNames.length - 1]}` : brandNames[0];

  return (
    <main>
      <section className="mx-auto grid max-w-[1240px] items-center gap-8 px-4 pb-4 pt-10 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div className="wicel-rise max-w-xl">
          <h1 className="display text-[2.6rem] font-bold leading-[1.02] sm:text-6xl">
            Tu próxima compra, con 10% menos de contado.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            {brandText ? `${brandText}. ` : ""}Te asesoramos por WhatsApp y lo retirás en el local el mismo día.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => onNavigate("productos")} className="h-12 rounded-full bg-ink px-7 text-[15px] font-semibold text-white hover:bg-black">
              Ver productos
            </button>
            <a href={whatsapp("Hola wicel, quiero consultar por un producto.")} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-full border border-ink/20 bg-white px-6 text-[15px] font-semibold hover:border-ink">
              <Icon name="chat" className="h-5 w-5 text-[#1a9e4b]" />
              Consultar por WhatsApp
            </a>
          </div>
          <ul className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-line pt-6 text-sm">
            <li><span className="block font-semibold">Retiro en el día</span><span className="text-muted">en {address}</span></li>
            <li><span className="block font-semibold">{financing.on ? `${INSTALLMENTS} cuotas` : "Tarjeta"}</span><span className="text-muted">{financing.on ? `CFTEA ${financing.cftea}%` : "en 1 pago"}</span></li>
            <li><span className="block font-semibold">Puntos</span><span className="text-muted">en cada compra</span></li>
          </ul>
        </div>

        {hero ? (
          <article className="wicel-rise group relative overflow-hidden rounded-[28px] border border-line bg-white p-6 [animation-delay:120ms] sm:p-8">
            <ProductPhoto src={hero.image} alt={hero.name} className="h-[280px] w-full transition duration-500 group-hover:scale-[1.03] sm:h-[360px]" />
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted">{hero.brand}</p>
                <h2 className="display text-2xl font-bold">
                  <button type="button" onClick={() => onOpen(hero.slug)} className="text-left after:absolute after:inset-0">{hero.name}</button>
                </h2>
                <p className="price mt-1 text-sm text-muted">
                  Tarjeta {hero.oldPrice ? <s className="mr-1">{formatPrice(hero.oldPrice)}</s> : null}{cardOffer(hero.price)}
                </p>
              </div>
              <div className="sm:text-right">
                <p className="price text-3xl font-bold">{formatPrice(cashPrice(hero.price))}</p>
                <p className="text-xs font-medium text-gold">efectivo o transferencia</p>
              </div>
            </div>
          </article>
        ) : (
          <div className="h-[420px] rounded-[28px] border border-line bg-white" aria-hidden="true" />
        )}
      </section>

      <BrandBar products={all} onBrand={onBrand} />

      <section aria-labelledby="destacados-titulo" className="mx-auto max-w-[1240px] px-4 pt-16">
        <div className="flex items-end justify-between gap-4">
          <h2 id="destacados-titulo" className="display text-2xl font-bold sm:text-3xl">Destacados</h2>
          <button type="button" onClick={() => onNavigate("productos")} className="text-sm font-semibold underline-offset-4 hover:underline">
            Ver todos los productos
          </button>
        </div>
        {products === null ? <p className="mt-6 text-sm text-muted">Cargando productos...</p> : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.slug} product={product} favorite={favorites.includes(product.slug)} onOpen={() => onOpen(product.slug)} onFavorite={() => onFavorite(product.slug)} />
          ))}
        </div>
      </section>

      {example ? (
        <section aria-labelledby="contado-titulo" className="mt-16 bg-brand text-[#080808]">
          <div className="mx-auto grid max-w-[1240px] items-center gap-8 px-4 py-12 md:grid-cols-[1.2fr_1fr] lg:py-14">
            <div>
              <h2 id="contado-titulo" className="display text-3xl font-bold leading-tight sm:text-5xl">Pagá de contado y te llevás 10% menos.</h2>
              <p className="mt-4 max-w-lg text-base leading-relaxed">
                Aplica en efectivo en el local o por transferencia, en todos los productos y combos. Con tarjeta pagás el precio de lista en 1 pago{financing.on ? ` o en ${INSTALLMENTS} cuotas (CFTEA ${financing.cftea}%)` : ""}.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button type="button" onClick={() => onInfo("cuotas")} className="h-12 rounded-full bg-[#080808] px-7 text-[15px] font-semibold text-white hover:bg-black">Ver formas de pago</button>
                <button type="button" onClick={onPromos} className="h-12 rounded-full border border-[#080808]/30 px-6 text-[15px] font-semibold hover:border-[#080808]">Productos con descuento</button>
              </div>
            </div>
            <div className="flex items-center gap-5 rounded-3xl bg-white p-5">
              <ProductPhoto src={example.image} alt="" className="h-40 w-28 shrink-0" />
              <dl className="min-w-0 flex-1 text-sm">
                <dt className="sr-only">Ejemplo</dt>
                <dd className="text-base font-semibold">{example.name}</dd>
                <div className="mt-3 flex justify-between gap-3 text-muted"><dt>Con tarjeta</dt><dd className="price">{formatPrice(example.price)}</dd></div>
                <div className="mt-1 flex justify-between gap-3 font-semibold"><dt>De contado</dt><dd className="price">{formatPrice(cashPrice(example.price))}</dd></div>
                <div className="mt-3 flex justify-between gap-3 border-t border-line pt-3 font-bold"><dt>Ahorrás</dt><dd className="price">{formatPrice(example.price - cashPrice(example.price))}</dd></div>
              </dl>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-[1240px] gap-4 px-4 pt-16 lg:grid-cols-2">
        <article className="relative flex min-h-[300px] overflow-hidden rounded-[28px] bg-black p-8 text-white">
          <div className="relative z-10 max-w-[58%]">
            <h2 className="display text-3xl font-bold leading-tight">Combos listos para usar</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">El celular sale con cargador, funda y vidrio templado, más barato que comprarlos por separado.</p>
            <button type="button" onClick={() => onNavigate("combos")} className="mt-6 h-11 rounded-full bg-brand px-6 text-sm font-semibold">
              Ver {combos.length > 0 ? `los ${combos.length} combos` : "combos"}
            </button>
          </div>
          <div className="absolute bottom-0 right-4 flex items-end gap-2 sm:right-8">
            {combos.slice(0, 2).map((combo) => (
              <div key={combo.slug} className="rounded-t-2xl bg-white px-3 pt-4">
                <ProductPhoto src={combo.image} alt="" className="h-36 w-20 sm:h-44 sm:w-24" />
              </div>
            ))}
          </div>
        </article>
        <article className="flex min-h-[300px] flex-col rounded-[28px] border border-line bg-white p-8">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand"><Icon name="star" className="h-6 w-6" filled /></span>
          <h2 className="display mt-5 text-3xl font-bold leading-tight">Tus compras suman puntos</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">Por cada $1.000 de compra sumás puntos que se acreditan cuando se confirma el pago. Después los canjeás por premios sin pagar nada.</p>
          <div className="mt-auto flex flex-wrap gap-3 pt-6">
            <button type="button" onClick={() => onNavigate("canjes")} className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-black">Ver premios</button>
            <button type="button" onClick={() => onInfo("puntos")} className="h-11 rounded-full border border-ink/20 px-5 text-sm font-semibold hover:border-ink">Cómo funciona</button>
          </div>
        </article>
      </section>

      <section aria-labelledby="local-mas-titulo" className="mx-auto max-w-[1240px] px-4 pt-4">
        <div className="grid overflow-hidden rounded-[28px] border border-line bg-white md:grid-cols-[1.4fr_1fr]">
          <img src={publicUrl("/brand/inicio-banner.jpg")} alt="Celulares, fundas, relojes y termos" loading="lazy" decoding="async" width={1600} height={802} className="h-64 w-full object-cover object-[22%_center] md:h-full md:min-h-[300px]" />
          <div className="flex flex-col justify-center p-8">
            <h2 id="local-mas-titulo" className="display text-3xl font-bold leading-tight">En el local hay más</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">Tenemos fundas, relojes, termos y más. Preguntanos por WhatsApp qué hay hoy.</p>
            <a href={whatsapp("Hola wicel, ¿qué accesorios tienen hoy?")} target="_blank" rel="noreferrer" className="mt-6 flex h-11 w-fit items-center gap-2 rounded-full border border-ink/20 px-5 text-sm font-semibold hover:border-ink">
              <Icon name="chat" className="h-5 w-5 text-[#1a9e4b]" />
              Preguntar por accesorios
            </a>
          </div>
        </div>
      </section>

      <VisitStore onContact={() => onNavigate("contacto")} />
    </main>
  );
}

function VisitStore({ onContact }: { onContact: () => void }) {
  const [now, setNow] = useState(storeTime);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(storeTime()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const status = storeStatus(now);

  return (
    <section aria-labelledby="visita-titulo" className="mx-auto max-w-[1240px] px-4 py-16">
      <div className="grid gap-8 border-t border-line pt-12 md:grid-cols-[1fr_1fr_auto] md:items-start">
        <div>
          <h2 id="visita-titulo" className="display text-3xl font-bold">Vení al local</h2>
          <p className="mt-3 text-muted">{fullAddress}</p>
          <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <span className={`h-2.5 w-2.5 rounded-full ${status.open ? "bg-ok" : "bg-bad"}`} aria-hidden="true" />
            {status.open ? "Abierto ahora" : "Cerrado ahora"}
            {status.text ? <span className="font-normal text-muted">{status.text}</span> : null}
          </p>
        </div>
        <dl className="space-y-2 text-sm">
          {hours.map((row) => (
            <div key={row.label} className={`flex justify-between gap-6 ${row.days.includes(now.day) ? "font-semibold" : "text-muted"}`}>
              <dt>{row.label}</dt>
              <dd className="price text-right">{shiftsText(row.shifts)}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-3 md:flex-col">
          <a href={directions} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-black">
            <Icon name="pin" className="h-4 w-4" />
            Cómo llegar
          </a>
          <button type="button" onClick={onContact} className="h-11 rounded-full border border-ink/20 px-6 text-sm font-semibold hover:border-ink">Más formas de contacto</button>
        </div>
      </div>
    </section>
  );
}
