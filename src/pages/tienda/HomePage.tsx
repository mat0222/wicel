import { useEffect, useState } from "react";
import { BrandBar } from "../../components/BrandBar";
import { Icon, type IconName } from "../../components/Icon";
import { Logo } from "../../components/Logo";
import { ProductPhoto } from "../../components/RealPhoneArt";
import { CASH_OFF, cardOffer, cashPrice, financing, formatPrice, installmentAmount, INSTALLMENTS, pointSteps, type Product, type View } from "../../lib/data";
import { warrantyMonths } from "../../lib/legal";
import { address, city, directions, fullAddress, hours, shiftsText, storeStatus, storeTime, whatsapp } from "../../lib/store";
import { publicUrl } from "../../lib/publicUrl";
import { ProductCard } from "./CatalogPage";

const cashOff = `${Math.round(CASH_OFF * 100)}%`;
const warranty = warrantyMonths("Nuevos");
const banner = publicUrl("/brand/inicio-banner.jpg");

/** El reloj del local late una vez por minuto: lo comparten el hero y la banda de visita. */
function useStoreClock() {
  const [now, setNow] = useState(storeTime);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(storeTime()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return { now, status: storeStatus(now) };
}

export function HomePage({
  products,
  onNavigate,
  onBrand,
  onCategory,
  onPromos,
  onOpen,
  onInfo,
  favorites,
  onFavorite,
}: {
  products: Product[] | null;
  onNavigate: (view: View) => void;
  onBrand: (brand: string) => void;
  onCategory: (categorySlug: string) => void;
  onPromos: () => void;
  onOpen: (name: string) => void;
  onInfo: (kind: "puntos" | "cuotas") => void;
  favorites: string[];
  onFavorite: (name: string) => void;
}) {
  const clock = useStoreClock();
  const all = products ?? [];
  const items = all.filter((product) => product.type === "PRODUCT");
  const ranked = [...items.filter((product) => product.featured), ...items.filter((product) => !product.featured)];
  const inStock = ranked.filter((product) => product.stock > 0 && !product.askPrice);
  const deals = inStock.filter((product) => product.oldPrice);
  const offers = (deals.length > 0 ? deals : ranked).slice(0, 4);
  const sample = inStock.find((product) => product.oldPrice) ?? inStock[0];
  const comboList = all.filter((product) => product.type === "COMBO");
  const combos = comboList.slice(0, 3);

  const categories = [...new Map(items.map((product) => [product.categorySlug, product.category])).entries()]
    .map(([slug, name]) => ({ slug, name, count: items.filter((product) => product.categorySlug === slug).length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);

  /** Los combos son su propia góndola: entran al estante junto a las categorías del catálogo. */
  const shelves = [
    ...categories.map((category) => ({
      key: category.slug,
      name: category.name,
      detail: `${category.count} ${category.count === 1 ? "modelo" : "modelos"}`,
      go: () => onCategory(category.slug),
    })),
    ...(comboList.length > 0
      ? [{
          key: "combos",
          name: "Combos",
          detail: `${comboList.length} ${comboList.length === 1 ? "armado" : "armados"}`,
          go: () => onNavigate("combos"),
        }]
      : []),
  ];

  /** Un modelo por marca: la tira muestra productos distintos y cada celda se llena igual en todo ancho. */
  const shelfModels = [...new Map(
    [...items].sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || Number(b.featured) - Number(a.featured)).map((product) => [product.brand, product]),
  ).values()].slice(0, 4);

  const heroFacts: { icon: IconName; title: string; text: string }[] = [
    { icon: "store", title: "Local con dirección", text: `${address}.` },
    { icon: "chat", title: "Te atiende una persona", text: "Por WhatsApp o en el local." },
    items.length > 0
      ? { icon: "grid", title: `${items.length} ${items.length === 1 ? "modelo" : "modelos"} publicados`, text: `${inStock.length} con stock hoy.` }
      : { icon: "truck", title: "Envíos a todo el país", text: "Costo a coordinar." },
  ];

  /** La barra amarilla del header ya anuncia el 10% y el retiro: esta franja no los repite. */
  const promises: { icon: IconName; text: string }[] = [
    { icon: "truck", text: "Envíos a tu domicilio" },
    { icon: "shield", text: `${warranty} meses de garantía en equipos nuevos` },
    financing.on
      ? { icon: "card", text: `${INSTALLMENTS} cuotas con tarjeta` }
      : { icon: "card", text: "Transferencia, efectivo o tarjeta" },
  ];

  /** Dos encuadres del mismo material del dueño, con zoom sobre los productos: accesorios a la izquierda, relojes y termos a la derecha. */
  const localViews = [
    { size: "554% auto", position: "14% 91%", label: "Fundas de cuero y silicona con un cable trenzado sobre el mostrador" },
    { size: "330% auto", position: "93% 100%", label: "Termos y relojes sobre el mostrador" },
  ];

  const reasons: { icon: IconName; title: string; text: string }[] = [
    { icon: "store", title: "Un local con dirección", text: `Estamos en ${fullAddress}. Venís, lo ves en la mano y te lo llevás.` },
    { icon: "chat", title: "Te contesta una persona", text: "Por WhatsApp te decimos qué hay en stock y te ayudamos a elegir el modelo." },
    { icon: "card", title: "El precio viene con la cuenta hecha", text: `En cada producto ves cuánto sale de contado y cuánto con tarjeta${financing.on ? ", cuota por cuota" : ""}.` },
    { icon: "shield", title: `Equipos nuevos con ${warranty} meses de garantía`, text: "En los celulares queda registrada con el IMEI y la gestionás con nosotros." },
    { icon: "star", title: "Cada compra te acerca a un premio", text: "Los puntos se acreditan solos cuando se confirma el pago." },
  ];

  return (
    <main>
      <section className="wicel-dark relative isolate overflow-hidden bg-[#080808] text-white">
        <span className="wicel-charge" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-4 pb-14 pt-10 lg:grid-cols-[1.18fr_1fr] lg:gap-14 lg:pb-16 lg:pt-12">
          <div className="wicel-rise">
            <h1 className="display-xl text-[clamp(2.4rem,6vw,3.9rem)] font-bold">
              Tu mundo<br />
              <em className="text-brand">en un solo lugar</em>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
              Celulares, accesorios, relojes y termos en {city}. Te atiende una persona y pagás {cashOff} menos de contado.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => onNavigate("productos")} className="flex h-13 items-center gap-2 rounded-full bg-brand px-7 text-[15px] font-bold">
                Ver todo el catálogo
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
              <a href={whatsapp("Hola wicel, quiero consultar por un producto.")} target="_blank" rel="noreferrer" className="flex h-13 items-center gap-2 rounded-full border border-white/25 px-6 text-[15px] font-semibold hover:border-white hover:bg-white/5">
                <Icon name="chat" className="h-5 w-5 text-brand" />
                Consultar por WhatsApp
              </a>
            </div>
            <ul className="mt-8 grid gap-4 border-t border-white/15 pt-6 sm:grid-cols-3">
              {heroFacts.map((fact) => (
                <li key={fact.title}>
                  <Icon name={fact.icon} className="h-5 w-5 text-brand" />
                  <p className="mt-2 text-sm font-semibold leading-snug">{fact.title}</p>
                  <p className="text-sm text-white/60">{fact.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="wicel-rise relative [animation-delay:160ms]">
            <img
              src={banner}
              alt="Celulares, fundas, auriculares, cargadores, relojes y termos del catálogo de wicel"
              width={1600}
              height={802}
              className="w-full rounded-[28px] shadow-[0_34px_80px_-26px_rgb(0_0_0/85%)]"
            />
            <p className="absolute -bottom-5 left-4 flex items-center gap-2.5 rounded-full bg-brand px-4 py-2.5 text-[13px] font-bold text-[#080808] shadow-[0_14px_34px_-10px_rgb(0_0_0/70%)] sm:left-7">
              <span className={`h-2.5 w-2.5 rounded-full ${clock.status.open ? "bg-[#0c6e2e]" : "bg-[#8f1a11]"}`} aria-hidden="true" />
              {clock.status.open ? "Abierto ahora" : "Cerrado ahora"}
              {clock.status.text ? <span className="hidden font-semibold text-[#080808]/75 sm:inline">{clock.status.text}</span> : null}
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Formas de pago y entrega" className="bg-brand text-[#080808]">
        <div className="mx-auto flex max-w-[1240px] flex-col divide-y divide-[#080808]/15 px-4 sm:flex-row sm:divide-x sm:divide-y-0">
          {promises.map((promise) => (
            <p key={promise.text} className="flex flex-1 items-center gap-3 py-4 text-[13px] font-bold uppercase leading-tight tracking-[0.06em] sm:justify-center sm:px-5 sm:text-center">
              <Icon name={promise.icon} className="h-5 w-5 shrink-0" />
              {promise.text}
            </p>
          ))}
        </div>
      </section>

      <section aria-labelledby="catalogo-titulo" className="mx-auto max-w-[1240px] px-4 pt-14 sm:pt-16">
        <div className="max-w-2xl">
          <h2 id="catalogo-titulo" className="display text-3xl font-bold leading-[1.08] sm:text-[2.5rem]">Esto es lo que hay en wicel</h2>
          <p className="mt-3 leading-relaxed text-muted">Lo que está publicado lo comprás ahora. Lo que no, está en el mostrador: preguntá y te decimos qué tenemos.</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_0.78fr]">
          {/* El estante online es la acción primaria: lleva el campo amarillo de marca y el ancho. */}
          <article className="flex flex-col rounded-[28px] bg-brand p-6 text-[#080808] sm:p-8">
            <h3 className="display text-xl font-bold">En la tienda online</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#080808]/75">
              {items.length > 0 ? "Cada ficha trae el precio de contado y con tarjeta, el stock y los colores." : "Estamos cargando el catálogo."}
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {shelfModels.map((product) => (
                <li key={product.slug}>
                  <button type="button" onClick={() => onOpen(product.slug)} className="group block w-full overflow-hidden rounded-xl bg-white text-left">
                    <div className="aspect-[3/4] w-full overflow-hidden">
                      <ProductPhoto src={product.image} alt="" className="h-full w-full p-2 transition duration-500 group-hover:scale-105" />
                    </div>
                    <span className="block border-t border-[#080808]/10 px-3 py-2 text-xs font-semibold leading-snug group-hover:underline">{product.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            <ul className="mt-5 flex flex-wrap gap-2">
              {shelves.map((shelf) => (
                <li key={shelf.key}>
                  <button type="button" onClick={shelf.go} className="flex h-11 items-baseline gap-2 rounded-full border border-[#080808]/25 px-4 pt-3 text-sm font-semibold hover:border-[#080808]">
                    {shelf.name}
                    <span className="price text-xs text-[#080808]/65">{shelf.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
            {/* Los dos botones de la banda apoyan en el piso de su panel, así ninguno deja campo muerto debajo. */}
            <div className="mt-auto pt-7">
              <button type="button" onClick={() => onNavigate("productos")} className="flex h-12 w-fit items-center gap-2 rounded-full bg-[#080808] px-6 text-sm font-semibold text-white hover:bg-black">
                Ver el catálogo completo
                <Icon name="chevronRight" className="h-4 w-4" />
              </button>
            </div>
          </article>
          <article className="flex flex-col rounded-[28px] border border-line bg-white p-6 sm:p-8">
            <h3 className="display text-xl font-bold">En el local, además</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Accesorios y regalos que no siempre llegamos a publicar. Escribinos y te contamos qué hay hoy en el mostrador.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {localViews.map((view) => (
                <div
                  key={view.label}
                  role="img"
                  aria-label={view.label}
                  className="aspect-square w-full rounded-2xl bg-paper bg-no-repeat"
                  style={{ backgroundImage: `url(${banner})`, backgroundSize: view.size, backgroundPosition: view.position }}
                />
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold leading-relaxed">
              Fundas · Vidrios templados · Cargadores y cables · Auriculares · Relojes · Termos
            </p>
            <div className="mt-auto pt-7">
              <a href={whatsapp("Hola wicel, ¿qué accesorios tienen hoy en el local?")} target="_blank" rel="noreferrer" className="flex h-12 w-fit items-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-black">
                <Icon name="chat" className="h-5 w-5 text-[#25d366]" />
                Preguntar qué hay hoy
              </a>
            </div>
          </article>
        </div>
      </section>

      <section aria-labelledby="puntos-titulo" className="wicel-dark mt-14 bg-[#080808] text-white sm:mt-16">
        <div className="mx-auto grid max-w-[1240px] gap-11 px-4 py-14 lg:grid-cols-[0.85fr_1fr_0.8fr] lg:items-center lg:gap-12 lg:py-18">
          <div>
            <h2 id="puntos-titulo" className="display-xl text-[clamp(2rem,5.4vw,2.9rem)] font-bold">
              Sumá puntos y <em className="text-brand">canjealos por premios</em>
            </h2>
            <p className="mt-5 max-w-sm leading-relaxed text-white/75">
              Comprás como siempre y cada compra te deja puntos. Después elegís un premio del catálogo de canjes y lo retirás sin pagar nada.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => onNavigate("canjes")} className="h-12 rounded-full bg-brand px-6 text-sm font-bold">¡Quiero mis puntos!</button>
            </div>
          </div>

          <ol className="divide-y divide-white/10 border-y border-white/10">
            {pointSteps.map((step) => (
              <li key={step.n} className="flex items-start gap-4 py-4">
                <span className="price grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-[#080808]">{step.n}</span>
                <div>
                  <p className="font-semibold leading-snug">{step.title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/65">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto w-full max-w-[340px] -rotate-[2.5deg] rounded-[22px] bg-brand p-6 text-[#080808] shadow-[0_26px_56px_-26px_rgb(255_216_61/28%)]">
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-xl bg-[#080808] px-3 py-2"><Logo /></span>
              <Icon name="star" filled className="h-7 w-7" />
            </div>
            <p className="display mt-8 text-3xl font-bold uppercase tracking-tight">Puntos</p>
            <p className="price mt-1 text-sm font-semibold">1 punto por cada $1.000 de compra</p>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.2em] text-[#080808]/70">Comprá · Sumá · Canjeá</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="ofertas-titulo" className="mx-auto max-w-[1240px] px-4 pt-14 sm:pt-16">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <h2 id="ofertas-titulo" className="display text-3xl font-bold leading-[1.08] sm:text-[2.5rem]">
              {deals.length > 0 ? "Ofertas destacadas" : "Lo más elegido"}
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              {deals.length > 0
                ? `${deals.length} ${deals.length === 1 ? "producto" : "productos"} con el descuento ya aplicado, y otro ${cashOff} menos si pagás de contado.`
                : "Los modelos que más salen del local, con el precio de contado a la vista."}
            </p>
          </div>
          <button type="button" onClick={deals.length > 0 ? onPromos : () => onNavigate("productos")} className="h-11 rounded-full border border-ink/20 px-5 text-sm font-semibold hover:border-ink">
            {deals.length > 0 ? "Ver todas las ofertas" : "Ver todos los productos"}
          </button>
        </div>
        {products === null ? <p className="mt-6 text-sm text-muted">Cargando productos...</p> : null}
        {products !== null && offers.length === 0 ? <p className="mt-6 text-sm text-muted">Todavía no hay productos publicados. Escribinos por WhatsApp y te contamos qué hay en el local.</p> : null}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {offers.map((product) => (
            <ProductCard key={product.slug} product={product} favorite={favorites.includes(product.slug)} onOpen={() => onOpen(product.slug)} onFavorite={() => onFavorite(product.slug)} />
          ))}
        </div>
      </section>

      {combos.length > 0 ? (
        <section aria-labelledby="combos-titulo" className="wicel-dark mt-14 bg-[#080808] text-white sm:mt-16">
          <div className="mx-auto max-w-[1240px] px-4 py-14">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div className="max-w-xl">
                <h2 id="combos-titulo" className="display-xl text-[clamp(2rem,5.4vw,2.9rem)] font-bold">
                  Combos <em className="text-brand">imperdibles</em>
                </h2>
                <p className="mt-4 leading-relaxed text-white/70">El celular sale con cargador, funda y vidrio templado: más barato que comprarlos por separado.</p>
              </div>
              <button type="button" onClick={() => onNavigate("combos")} className="h-11 rounded-full border border-white/25 px-5 text-sm font-semibold hover:border-white hover:bg-white/5">
                Ver todos los combos
              </button>
            </div>
            <ul className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {combos.map((combo) => (
                <li key={combo.slug} className="group relative flex flex-col rounded-[22px] border border-white/10 bg-white/[0.04] p-4 transition hover:border-white/30">
                  <div className="rounded-2xl bg-white p-3">
                    <ProductPhoto src={combo.image} alt={combo.name} className="h-40 w-full transition duration-300 group-hover:scale-[1.04]" />
                  </div>
                  {combo.oldPrice ? (
                    <p className="price mt-4 w-fit rounded-full bg-brand px-3 py-1 text-xs font-bold">Ahorrás {formatPrice(combo.oldPrice - combo.price)}</p>
                  ) : null}
                  <h3 className="mt-3 text-lg font-semibold leading-snug">
                    <button type="button" onClick={() => onNavigate("combos")} className="text-left after:absolute after:inset-0 after:rounded-[22px]">{combo.name}</button>
                  </h3>
                  {combo.specs.length > 0 ? (
                    <p className="mt-1.5 text-sm leading-relaxed text-white/60">{combo.specs.join(" · ")}</p>
                  ) : null}
                  <p className="price mt-auto pt-5 text-2xl font-bold">{formatPrice(cashPrice(combo.price))}</p>
                  <p className="text-xs font-semibold text-brand">efectivo o transferencia</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="elegirnos-titulo" className="mx-auto max-w-[1240px] px-4 pt-14 sm:pt-16">
        <div className="grid gap-11 lg:grid-cols-[1fr_0.82fr] lg:gap-14">
          <div>
            <h2 id="elegirnos-titulo" className="display text-3xl font-bold leading-[1.08] sm:text-[2.5rem]">¿Por qué comprar en wicel?</h2>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {reasons.map((reason) => (
                <li key={reason.title} className="flex items-start gap-4 py-5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand"><Icon name={reason.icon} className="h-5 w-5" /></span>
                  <div>
                    <p className="font-semibold leading-snug">{reason.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{reason.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {sample ? (
            <aside aria-labelledby="cuenta-titulo" className="h-fit rounded-[28px] border border-line bg-white p-6 sm:p-7 lg:sticky lg:top-20">
              <h3 id="cuenta-titulo" className="display text-xl font-bold">La cuenta, sin sorpresas</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">Un ejemplo con un producto del catálogo de hoy.</p>
              <div className="mt-5 flex items-center gap-4 border-t border-line pt-5">
                <ProductPhoto src={sample.image} alt="" className="h-24 w-16 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug">{sample.name}</p>
                  <p className="text-xs text-muted">{sample.brand}</p>
                </div>
              </div>
              <dl className="mt-5 space-y-2.5 text-sm">
                <div className="flex justify-between gap-4 text-muted">
                  <dt>Con tarjeta</dt>
                  <dd className="price">{formatPrice(sample.price)}</dd>
                </div>
                {financing.on ? (
                  <div className="flex justify-between gap-4 text-muted">
                    <dt>{INSTALLMENTS} cuotas</dt>
                    <dd className="price text-right">{INSTALLMENTS} × {formatPrice(installmentAmount(sample.price))}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4 font-semibold">
                  <dt>De contado o transferencia</dt>
                  <dd className="price">{formatPrice(cashPrice(sample.price))}</dd>
                </div>
                <div className="flex justify-between gap-4 rounded-xl bg-brand-soft px-3 py-2.5 font-bold">
                  <dt>Ahorrás</dt>
                  <dd className="price">{formatPrice(sample.price - cashPrice(sample.price))}</dd>
                </div>
              </dl>
              <p className="price mt-4 text-xs leading-relaxed text-muted">Tarjeta: {cardOffer(sample.price)}.</p>
              <button type="button" onClick={() => onInfo("cuotas")} className="mt-5 h-11 w-full rounded-full bg-ink text-sm font-semibold text-white hover:bg-black">
                Ver todas las formas de pago
              </button>
            </aside>
          ) : null}
        </div>
        <div className="mt-14">
          <BrandBar products={all} onBrand={onBrand} />
        </div>
      </section>

      <VisitStore clock={clock} onContact={() => onNavigate("contacto")} />
    </main>
  );
}

function VisitStore({ clock, onContact }: { clock: ReturnType<typeof useStoreClock>; onContact: () => void }) {
  const { now, status } = clock;

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
