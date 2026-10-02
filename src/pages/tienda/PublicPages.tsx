import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "../../components/Icon";
import { ProductPhoto } from "../../components/RealPhoneArt";
import { cardOffer, cashPrice, financedTotal, financing, formatPrice, installmentAmount, INSTALLMENTS, MAX_PER_ITEM, payable, stockLabel, type CartItem, type PaymentId, type Product, type View } from "../../lib/data";
import { placeOrder, type Account, type PlacedOrder, type StoreSettings } from "../../lib/api";
import { LEGAL_VERSION, netOfTaxes, rememberOrder } from "../../lib/legal";
import { fullAddress, whatsapp } from "../../lib/store";

export function CombosPage({ products, inCart, onAdd, onNavigate }: { products: Product[] | null; inCart: (variantId: number) => number; onAdd: (variantId: number) => void; onNavigate: (view: View) => void }) {
  const combos = (products ?? []).filter((product) => product.type === "COMBO");
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-8">
      <p className="text-sm text-muted">
        <button type="button" className="hover:text-ink hover:underline" onClick={() => onNavigate("home")}>Inicio</button><span aria-hidden="true"> / </span><span className="text-ink">Combos</span>
      </p>
      <div className="mt-3 max-w-2xl">
        <h1 className="display text-3xl font-bold sm:text-4xl">Combos listos para usar</h1>
        <p className="mt-2 leading-relaxed text-muted">
          El celular sale con cargador, funda y vidrio templado, más barato que comprarlos por separado.
        </p>
      </div>
      {products === null ? <p className="mt-6 text-sm text-muted">Cargando combos...</p> : null}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {combos.map((combo) => {
          const variant = combo.colors[0];
          const left = variant.stock - inCart(variant.variantId);
          const stock = stockLabel(variant.stock);
          return (
            <article key={combo.slug} className="wicel-card flex flex-col rounded-2xl p-3">
              <div className="flex h-48 items-center justify-center rounded-xl bg-white">
                <ProductPhoto src={combo.image} alt={combo.name} className={`h-40 w-full ${variant.stock <= 0 ? "opacity-50" : ""}`} />
              </div>
              {combo.oldPrice ? <p className="price mx-2 mt-3 w-fit rounded-full bg-brand px-2.5 py-1 text-xs font-bold">Ahorrás {formatPrice(combo.oldPrice - combo.price)}</p> : null}
              <div className="flex flex-1 flex-col px-2 pb-2">
              <h2 className="mt-3 text-lg font-semibold">{combo.name}</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                <li>Celular</li>
                {combo.specs.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <p className="price mt-auto pt-4 text-2xl font-bold">{formatPrice(cashPrice(combo.price))}</p>
              <p className="text-xs font-medium text-gold">Precio en efectivo o transferencia</p>
              <p className="price mt-1 text-sm text-muted">Tarjeta {combo.oldPrice ? <s className="mr-1">{formatPrice(combo.oldPrice)}</s> : null}{cardOffer(combo.price)}</p>
              <p className={`mt-1 text-xs font-semibold ${stock.tone}`}>{stock.text}</p>
              <button type="button" disabled={left <= 0} onClick={() => onAdd(variant.variantId)} className="mt-4 h-11 rounded-full bg-ink text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">
                {variant.stock <= 0 ? "Sin stock" : left <= 0 ? "Ya está todo en tu carrito" : "Agregar al carrito"}
              </button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}

const payments: { id: PaymentId; title: string; text: (list: number) => string }[] = [
  { id: "transferencia", title: "Transferencia", text: (list) => `10% menos: ${formatPrice(cashPrice(list))}` },
  { id: "efectivo", title: "Efectivo en el local", text: (list) => `10% menos: ${formatPrice(cashPrice(list))}` },
  { id: "tarjeta-1", title: "Tarjeta en 1 pago", text: (list) => `Precio de lista: ${formatPrice(list)}` },
  { id: "tarjeta-12", title: `Tarjeta en ${INSTALLMENTS} cuotas`, text: (list) => `${INSTALLMENTS} × ${formatPrice(installmentAmount(list))} (total ${formatPrice(financedTotal(list))}). CFTEA ${financing.cftea}%` },
];

type Field = "nombre" | "apellido" | "email" | "telefono" | "direccion" | "terminos";
type Delivery = "PICKUP" | "SHIPPING";
const legalBase = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");

function BankDetails({ settings }: { settings: StoreSettings | null }) {
  const rows = [
    ["Alias", settings?.bank_alias],
    ["CBU / CVU", settings?.bank_cbu],
    ["Titular", settings?.bank_holder],
    ["Banco", settings?.bank_name],
  ].filter((row): row is [string, string] => Boolean(row[1]));
  if (rows.length === 0) {
    return <p className="text-sm text-muted">Te pasamos el alias y el CBU por WhatsApp apenas recibimos el pedido.</p>;
  }
  return (
    <dl className="grid gap-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="select-all text-right font-semibold text-ink">{value}</dd></div>
      ))}
    </dl>
  );
}

export function CartPage({
  items,
  products,
  user,
  settings,
  onNavigate,
  onLogin,
  onQty,
  onRemove,
  onOrdered,
}: {
  items: CartItem[];
  products: Product[] | null;
  user: Account | null;
  settings: StoreSettings | null;
  onNavigate: (view: View) => void;
  onLogin: () => void;
  onQty: (variantId: number, qty: number) => void;
  onRemove: (variantId: number) => void;
  onOrdered: () => void;
}) {
  const [checkout, setCheckout] = useState(false);
  const [pago, setPago] = useState<PaymentId>("transferencia");
  const [delivery, setDelivery] = useState<Delivery>("PICKUP");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [serverError, setServerError] = useState("");
  const [sending, setSending] = useState(false);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const thanksRef = useRef<HTMLHeadingElement>(null);
  const [firstName, ...rest] = (user?.role === "cliente" ? user.name : "").split(" ");

  const lines = items.flatMap((item) => {
    const product = products?.find((entry) => entry.colors.some((color) => color.variantId === item.variantId));
    const color = product?.colors.find((entry) => entry.variantId === item.variantId);
    return product && color ? [{ ...item, product, color }] : [];
  });
  const listTotal = lines.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const total = payable(listTotal, pago);
  const overStock = lines.filter((line) => line.qty > Math.min(line.color.stock, MAX_PER_ITEM));
  const holdHours = Number(settings?.order_hold_hours) || 48;
  const methods = payments.filter((method) => (method.id !== "tarjeta-12" || financing.on) && (method.id !== "efectivo" || delivery === "PICKUP"));
  const net = netOfTaxes(total, settings);

  const chooseDelivery = (next: Delivery) => {
    setDelivery(next);
    if (next === "SHIPPING" && pago === "efectivo") setPago("transferencia");
  };

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: Field) => String(data.get(key) ?? "").trim();
    const next: Partial<Record<Field, string>> = {};
    if (!value("nombre")) next.nombre = "Escribí tu nombre.";
    if (!value("apellido")) next.apellido = "Escribí tu apellido.";
    if (!value("email")) next.email = "Escribí tu email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value("email"))) next.email = "Revisá que el email esté completo, por ejemplo nombre@hotmail.com.";
    if (!value("telefono")) next.telefono = "Escribí tu WhatsApp.";
    else if (value("telefono").replace(/\D/g, "").length < 8) next.telefono = "Revisá el número, con código de área.";
    if (delivery === "SHIPPING" && !value("direccion")) next.direccion = "Escribí la dirección de entrega.";
    if (data.get("terminos") !== "si") next.terminos = "Para confirmar tenés que aceptar los Términos y condiciones y la Política de privacidad.";
    setErrors(next);
    setServerError("");
    if (Object.keys(next).length > 0) {
      window.setTimeout(() => document.getElementById("checkout-errors")?.focus(), 0);
      return;
    }
    setSending(true);
    const result = await placeOrder({
      items: lines.map((line) => ({ variantId: line.variantId, qty: line.qty })),
      payment: pago,
      firstName: value("nombre"),
      lastName: value("apellido"),
      email: value("email"),
      phone: value("telefono"),
      address: delivery === "SHIPPING" ? value("direccion") : "",
      delivery,
      acceptTerms: true,
      termsVersion: LEGAL_VERSION,
      marketing: data.get("promociones") === "si",
    });
    setSending(false);
    if (!result.ok) {
      setServerError(result.error);
      window.setTimeout(() => document.getElementById("checkout-errors")?.focus(), 0);
      return;
    }
    rememberOrder(result.data.number, result.data.email);
    setOrder(result.data);
    onOrdered();
  };

  useEffect(() => {
    if (!order) return;
    const frame = window.requestAnimationFrame(() => thanksRef.current?.focus());
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const dialog = thanksRef.current?.closest("[role='dialog']");
      if (!dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea")].filter((item) => !item.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
    };
  }, [order]);

  const hasErrors = Object.keys(errors).length > 0 || serverError !== "";

  return (
    <main className="mx-auto min-h-[calc(100vh-100px)] max-w-[1240px] px-4 pb-16 pt-8">
      <p className="text-sm text-muted"><button type="button" className="hover:text-ink hover:underline" onClick={() => onNavigate("home")}>Inicio</button><span aria-hidden="true"> / </span><span className="text-ink">Carrito</span></p>
      <h1 className="display mt-3 text-3xl font-bold sm:text-4xl">Carrito</h1>
      {products === null && items.length > 0 ? <p className="mt-6 text-sm text-muted">Cargando tu carrito...</p> : null}
      {lines.length === 0 ? (order || (products === null && items.length > 0) ? null : (
        <div className="mt-6 rounded-[28px] border border-line bg-white p-10 text-center">
          <p className="text-lg font-semibold">Tu carrito está vacío.</p>
          <p className="mt-1 text-sm text-muted">Mirá los productos o los combos listos para usar.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={() => onNavigate("productos")} className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-black">Ver productos</button>
            <button type="button" onClick={() => onNavigate("combos")} className="h-11 rounded-full border border-ink/20 px-6 text-sm font-semibold hover:border-ink">Ver combos</button>
          </div>
        </div>
      )) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            {lines.map((item) => {
              const title = item.product.name + (item.color.name ? `, ${item.color.name}` : "");
              return (
                <article key={item.variantId} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-white p-4">
                  <div className="flex w-24 items-center">
                    <ProductPhoto src={item.color.image ?? item.product.image} alt="" className="h-24 w-14" />
                  </div>
                  <div className="min-w-[190px] flex-1">
                    <h2 className="font-semibold">{title}</h2>
                    <p className="text-sm text-muted">{[item.product.brand, item.product.storage].filter(Boolean).join(", ")}</p>
                    <p className="price mt-2 text-lg font-bold">{formatPrice(cashPrice(item.product.price))}</p>
                    <p className="price text-xs text-muted">Efectivo o transferencia. Tarjeta {formatPrice(item.product.price)}</p>
                    {item.qty > item.color.stock ? (
                      <p role="alert" className="mt-1 text-xs font-semibold text-bad">{item.color.stock === 0 ? "Se quedó sin stock. Sacalo para seguir." : `Solo quedan ${item.color.stock}. Bajá la cantidad.`}</p>
                    ) : item.qty > MAX_PER_ITEM ? (
                      <p role="alert" className="mt-1 text-xs font-semibold text-bad">Por pedido se pueden llevar hasta {MAX_PER_ITEM}. Bajá la cantidad o escribinos por WhatsApp.</p>
                    ) : item.color.stock <= 5 ? <p className="mt-1 text-xs font-semibold text-gold">Quedan {item.color.stock}</p> : null}
                  </div>
                  <div className="flex items-center rounded-full border border-line">
                    <button className="h-11 w-11" aria-label={`Quitar una unidad de ${title}`} onClick={() => onQty(item.variantId, Math.max(1, item.qty - 1))}><Icon name="minus" className="mx-auto h-4 w-4" /></button>
                    <span className="price w-6 text-center font-semibold">{item.qty}</span>
                    <button className="h-11 w-11 disabled:opacity-40" disabled={item.qty >= Math.min(item.color.stock, MAX_PER_ITEM)} aria-label={`Agregar una unidad de ${title}`} onClick={() => onQty(item.variantId, item.qty + 1)}><Icon name="plus" className="mx-auto h-4 w-4" /></button>
                  </div>
                  <button type="button" onClick={() => onRemove(item.variantId)} className="text-sm font-medium text-bad hover:underline">Quitar</button>
                </article>
              );
            })}
          </div>
          <aside className={`price h-fit rounded-[28px] border border-line bg-white p-6 ${checkout ? "" : "lg:sticky lg:top-28"}`}>
            <h2 className="display text-xl font-bold">Resumen</h2>
            <div className="mt-5 flex justify-between text-sm text-muted"><span>Efectivo o transferencia</span><span className="font-semibold text-ink">{formatPrice(cashPrice(listTotal))}</span></div>
            <div className="mt-3 flex justify-between text-sm text-muted"><span>Tarjeta en 1 pago</span><span>{formatPrice(listTotal)}</span></div>
            {financing.on ? <div className="mt-3 flex justify-between gap-3 text-sm text-muted"><span>Tarjeta en {INSTALLMENTS} cuotas</span><span className="text-right">{INSTALLMENTS} × {formatPrice(installmentAmount(listTotal))}<span className="block text-[11px]">total {formatPrice(financedTotal(listTotal))}</span><span className="block text-[11px] font-bold text-ink">CFTEA {financing.cftea}%</span></span></div> : null}
            <div className="mt-3 flex justify-between gap-3 text-sm text-muted"><span>Entrega</span><span className="text-right">Retiro en el local o envío a coordinar</span></div>
            <div className="mt-5 flex justify-between gap-3 border-t border-line pt-4 font-bold"><span>Total con {payments.find((method) => method.id === pago)?.title.toLowerCase()}</span><span className="shrink-0">{formatPrice(total)}</span></div>
            {net !== null ? <p className="mt-1 text-right text-xs text-muted">Precio sin impuestos nacionales: {formatPrice(net)}</p> : null}
            <button type="button" disabled={overStock.length > 0} onClick={() => { setCheckout(true); window.setTimeout(() => document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth", block: "start" }), 40); }} className="mt-5 h-12 w-full rounded-full bg-ink text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40">{checkout ? "Completar datos" : "Continuar compra"}</button>
            {user === null ? (
              <p className="mt-3 text-xs text-muted">
                <button type="button" onClick={onLogin} className="font-semibold text-ink underline">Ingresá o registrate</button> antes de comprar para sumar puntos.
              </p>
            ) : null}
          </aside>
          {checkout ? (
            <form id="checkout" className="rounded-[28px] border border-line bg-white p-6 sm:p-8 lg:col-span-2" onSubmit={(event) => void confirm(event)} noValidate>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="display text-xl font-bold text-ink">Tus datos, entrega y pago</h2>
                  <p className="mt-1 text-sm text-muted">Completá tus datos, elegí cómo lo recibís y cómo pagás. Antes de confirmar ves el resumen final.</p>
                </div>
                <button type="button" onClick={() => { setCheckout(false); setErrors({}); setServerError(""); }} className="text-sm font-semibold underline-offset-2 hover:underline">Volver al resumen</button>
              </div>
              <p className="mt-3 text-sm text-muted">Paso 2 de 2: tus datos</p>
              {hasErrors ? (
                <div id="checkout-errors" tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-bad/30 bg-bad-soft p-4">
                  <h3 className="font-semibold text-bad">{serverError ? "No pudimos registrar el pedido" : "Revisá estos datos"}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-bad">
                    {serverError ? <li>{serverError}</li> : null}
                    {(["nombre", "apellido", "email", "telefono", "direccion", "terminos"] as Field[]).map((key) => errors[key] ? <li key={key}><a className="underline" href={`#${key}`}>{errors[key]}</a></li> : null)}
                  </ul>
                </div>
              ) : null}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <CheckoutField id="nombre" label="Nombre" autoComplete="given-name" placeholder="Tu nombre" defaultValue={firstName} error={errors.nombre} />
                <CheckoutField id="apellido" label="Apellido" autoComplete="family-name" placeholder="Tu apellido" defaultValue={rest.join(" ")} error={errors.apellido} />
                <CheckoutField id="email" label="Email" type="email" autoComplete="email" placeholder="tu@email.com" defaultValue={user?.role === "cliente" ? user.email : ""} error={errors.email} />
                <CheckoutField id="telefono" label="Teléfono / WhatsApp" type="tel" autoComplete="tel" placeholder="351 000-0000" error={errors.telefono} />
              </div>
              <fieldset className="mt-5">
                <legend className="text-sm font-medium text-ink">Entrega</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {([
                    ["PICKUP", "Retiro en el local", fullAddress],
                    ["SHIPPING", "Envío a domicilio", "El costo y el plazo te los pasamos por WhatsApp antes de que pagues."],
                  ] as [Delivery, string, string][]).map(([id, title, text]) => (
                    <label key={id} className={`cursor-pointer rounded-xl border px-4 py-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink ${delivery === id ? "border-ink bg-brand-soft" : "border-line bg-white hover:border-[#c9c9c4]"}`}>
                      <input type="radio" name="entrega" value={id} checked={delivery === id} onChange={() => chooseDelivery(id)} className="sr-only" />
                      <span className="block font-semibold">{title}</span>
                      <span className="mt-1 block text-sm text-muted">{text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {delivery === "SHIPPING" ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <CheckoutField id="direccion" label="Dirección de entrega" autoComplete="street-address" placeholder="Calle, número, ciudad" error={errors.direccion} wide />
                </div>
              ) : null}
              <fieldset className="mt-5">
                <legend className="text-sm font-medium text-ink">Método de pago</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {methods.map((method) => (
                    <label key={method.id} className={`cursor-pointer rounded-xl border px-4 py-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink ${pago === method.id ? "border-ink bg-brand-soft" : "border-line bg-white hover:border-[#c9c9c4]"}`}>
                      <input type="radio" name="pago" value={method.id} checked={pago === method.id} onChange={() => setPago(method.id)} className="sr-only" />
                      <span className="block font-semibold">{method.title}</span>
                      <span className="mt-1 block text-sm text-muted">{method.text(listTotal)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {pago === "transferencia" ? (
                <div className="mt-4 rounded-xl border border-line bg-paper p-4">
                  <p className="mb-2 text-sm font-bold text-ink">Datos para transferir {formatPrice(total)}</p>
                  <BankDetails settings={settings} />
                  <p className="mt-2 text-xs text-muted">Cuando transfieras, mandanos el comprobante por WhatsApp con tu número de pedido.</p>
                </div>
              ) : null}
              {pago === "efectivo" ? <p className="mt-4 text-sm text-muted">Pagás al retirar en {fullAddress}. Te guardamos el equipo {holdHours} horas: si no pasás en ese plazo, el pedido se cancela solo.</p> : null}
              {pago.startsWith("tarjeta") ? <p className="mt-4 text-sm text-muted">Te mandamos el link de pago por WhatsApp. No te pedimos datos de la tarjeta en esta página.</p> : null}
              <section aria-labelledby="resumen-final" className="price mt-6 rounded-xl border border-line bg-paper p-4 text-sm">
                <h3 id="resumen-final" className="font-bold text-ink">Resumen final</h3>
                <ul className="mt-2 space-y-1">
                  {lines.map((line) => (
                    <li key={line.variantId} className="flex justify-between gap-3">
                      <span>{line.qty} × {line.product.name}{line.color.name ? `, ${line.color.name}` : ""}</span>
                      <span className="shrink-0">{formatPrice(line.product.price * line.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 space-y-1 border-t border-line pt-2 text-muted">
                  <div className="flex justify-between gap-3"><span>Precio de lista</span><span>{formatPrice(listTotal)}</span></div>
                  {total !== listTotal ? (
                    <div className="flex justify-between gap-3">
                      <span>{total < listTotal ? "Descuento efectivo o transferencia (10%)" : `Recargo ${INSTALLMENTS} cuotas (${Math.round(financing.rate * 1000) / 10}%)`}</span>
                      <span>{total < listTotal ? "-" : "+"}{formatPrice(Math.abs(total - listTotal))}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3"><span>Entrega</span><span className="text-right">{delivery === "PICKUP" ? "Retiro en el local, sin costo" : "Envío a domicilio, costo a coordinar antes de pagar"}</span></div>
                  {pago === "tarjeta-12" ? <div className="flex justify-between gap-3"><span>{INSTALLMENTS} cuotas de</span><span>{formatPrice(installmentAmount(listTotal))} · CFTEA {financing.cftea}%</span></div> : null}
                </div>
                <div className="mt-2 flex justify-between gap-3 border-t border-line pt-2 text-base font-bold text-ink"><span>Total a pagar</span><span>{formatPrice(total)}</span></div>
              </section>
              <div className="mt-5 space-y-3 text-sm">
                <label htmlFor="terminos" className="flex items-start gap-3">
                  <input id="terminos" name="terminos" type="checkbox" value="si" aria-invalid={Boolean(errors.terminos)} aria-describedby={errors.terminos ? "terminos-error" : undefined} className="mt-0.5 h-5 w-5 shrink-0 accent-[#151515]" />
                  <span>
                    Leí y acepto los <a href={`${legalBase}/terminos`} target="_blank" rel="noreferrer" className="font-semibold underline">Términos y condiciones</a> y la <a href={`${legalBase}/privacidad`} target="_blank" rel="noreferrer" className="font-semibold underline">Política de privacidad</a>.
                    {errors.terminos ? <span id="terminos-error" className="mt-1 block font-medium text-red-600">{errors.terminos}</span> : null}
                  </span>
                </label>
                <label htmlFor="promociones" className="flex items-start gap-3 text-muted">
                  <input id="promociones" name="promociones" type="checkbox" value="si" className="mt-0.5 h-5 w-5 shrink-0 accent-[#151515]" />
                  <span>Quiero recibir promociones de wicel por WhatsApp o email (opcional).</span>
                </label>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button disabled={sending || overStock.length > 0} className="h-12 rounded-full bg-ink px-7 text-sm font-semibold text-white hover:bg-black disabled:cursor-wait disabled:opacity-60">{sending ? "Registrando pedido..." : `Confirmar pedido por ${formatPrice(total)}`}</button>
              </div>
            </form>
          ) : null}
        </div>
      )}
      {order ? (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-auto bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="gracias-titulo">
          <article className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-white px-8 pb-6 pt-10 text-center text-ink">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand">
                <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="#080808" strokeWidth="2.4" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <p className="mt-5 text-sm font-semibold text-muted">Pedido {order.number}</p>
              <h2 id="gracias-titulo" ref={thanksRef} tabIndex={-1} className="mt-2 display text-2xl font-bold outline-none">¡Gracias, {order.name}! Recibimos tu pedido</h2>
              <p className="mt-2 text-sm text-muted">Te escribimos por WhatsApp al {order.phone} para coordinar el pago y la entrega. Guardá el número de pedido. Te reservamos los productos {order.holdHours} horas: si para entonces no registramos el pago, el pedido se cancela solo.</p>
            </div>
            <div className="space-y-3 px-8 pb-6 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted">Entrega</span><span className="max-w-[220px] text-right font-semibold text-ink">{order.delivery === "PICKUP" ? `Retiro en ${fullAddress}` : `Envío a ${order.address}. Costo a coordinar antes de pagar`}</span></div>
              <div className="flex justify-between gap-4"><span className="text-muted">Pago</span><span className="text-right font-semibold text-ink">{order.paymentLabel}{order.installmentAmount ? `, ${order.installments} × ${formatPrice(order.installmentAmount)}, CFTEA ${order.cftea}%` : ""}</span></div>
              <div className="flex justify-between gap-4 border-t border-line pt-3"><span className="text-muted">Total</span><span className="price text-lg font-bold">{formatPrice(order.total)}</span></div>
              {order.payment === "transferencia" ? (
                <div className="rounded-xl bg-paper p-3">
                  <p className="mb-2 font-bold text-ink">Datos para transferir</p>
                  <BankDetails settings={settings} />
                </div>
              ) : null}
              <p className="rounded-xl bg-brand-soft p-3 text-ink">
                {order.points > 0
                  ? `Vas a sumar ${order.points.toLocaleString("es-AR")} puntos cuando confirmemos el pago. Los ves en Mi cuenta.`
                  : "Este pedido no suma puntos porque lo hiciste sin ingresar a tu cuenta."}
              </p>
              <p className="text-xs text-muted">Tenés 10 días corridos para arrepentirte de la compra desde el Botón de arrepentimiento, al pie de la página.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" onClick={() => onNavigate("pedido")} className="h-12 rounded-full border border-ink/20 text-sm font-semibold hover:border-ink">Ver comprobante</button>
                <a href={whatsapp(`Hola wicel, hice el pedido ${order.number} por ${formatPrice(order.total)} (${order.paymentLabel}).`)} target="_blank" rel="noreferrer" className="grid h-12 place-items-center rounded-full border border-ink/20 text-sm font-semibold hover:border-ink">Enviar por WhatsApp</a>
              </div>
              <button type="button" onClick={() => onNavigate("home")} className="h-12 w-full rounded-full bg-ink text-sm font-semibold text-white hover:bg-black">Seguir comprando</button>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  );
}

function CheckoutField({ id, label, error, wide = false, ...input }: { id: Field; label: string; error?: string; wide?: boolean; type?: string; autoComplete: string; placeholder: string; defaultValue?: string }) {
  return (
    <label className={`text-sm font-medium text-ink ${wide ? "sm:col-span-2" : ""}`} htmlFor={id}>{label}
      <input id={id} name={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="field" {...input} />
      {error ? <span id={`${id}-error`} className="mt-1 block text-sm font-medium text-red-600">{error}</span> : null}
    </label>
  );
}
