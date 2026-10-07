import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";
import { ProductPhoto } from "./RealPhoneArt";
import { cashPrice, financedTotal, financing, formatPrice, installmentAmount, installmentCost, INSTALLMENTS, MAX_PER_ITEM, pointSteps, stockLabel, type Product } from "../lib/data";
import { fetchMyOrders, type Account, type Order, type StoreSettings } from "../lib/api";
import { deliveryText, netOfTaxes, warrantyMonths } from "../lib/legal";

export function PriceBreakdown({ price, compact = false }: { price: number; compact?: boolean }) {
  return (
    <dl className={`price grid gap-2 ${compact ? "text-xs" : "text-sm"}`}>
      <div className="flex justify-between gap-3"><dt>Efectivo o transferencia <span className="text-ok">(10% menos)</span></dt><dd className="font-bold">{formatPrice(cashPrice(price))}</dd></div>
      <div className="flex justify-between gap-3 text-muted"><dt>Tarjeta en 1 pago</dt><dd className="font-semibold text-ink">{formatPrice(price)}</dd></div>
      {financing.on ? (
        <div className="flex justify-between gap-3 text-muted">
          <dt>Tarjeta en {INSTALLMENTS} cuotas</dt>
          <dd className="text-right font-semibold text-ink">
            {INSTALLMENTS} × {formatPrice(installmentAmount(price))}
            <span className="block text-xs font-normal text-muted">total {formatPrice(financedTotal(price))}</span>
            {financing.cftea ? <span className="block font-bold">CFTEA {financing.cftea}%</span> : null}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}

function Overlay({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  /** Escape cierra, el foco entra al diálogo al abrir y vuelve a donde estaba al cerrar. */
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>("button, a[href], input, select, textarea")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div ref={panel} className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onClick={onClose}>
      {children}
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper hover:bg-line">
      <Icon name="close" className="h-5 w-5" />
    </button>
  );
}

export function ProductDialog({
  product,
  settings,
  inCart,
  favorite,
  onFavorite,
  onAdd,
  onClose,
}: {
  product: Product;
  settings: StoreSettings | null;
  inCart: (variantId: number) => number;
  favorite: boolean;
  onFavorite: () => void;
  onAdd: (variantId: number, qty: number) => void;
  onClose: () => void;
}) {
  const firstAvailable = product.colors.find((item) => item.stock > 0) ?? product.colors[0];
  const [variantId, setVariantId] = useState(firstAvailable.variantId);
  const [qty, setQty] = useState(1);
  const color = product.colors.find((item) => item.variantId === variantId) ?? firstAvailable;
  const left = Math.max(0, Math.min(color.stock, MAX_PER_ITEM) - inCart(color.variantId));
  const atLimit = color.stock > 0 && inCart(color.variantId) >= Math.min(color.stock, MAX_PER_ITEM);
  const stock = stockLabel(color.stock);
  const photo = color.image ?? product.image;
  const facts = [product.storage, product.ram ? `${product.ram} RAM` : "", product.condition === "Usados" ? "Usado" : "Nuevo"].filter(Boolean);
  const net = netOfTaxes(cashPrice(product.price), settings);

  return (
    <Overlay onClose={onClose}>
      <article role="dialog" aria-modal="true" aria-labelledby="producto-titulo" className="grid max-h-[92vh] w-full max-w-4xl overflow-auto rounded-[28px] bg-white text-ink shadow-2xl md:grid-cols-[1fr_1.05fr]" onClick={(event) => event.stopPropagation()}>
        <div className="flex flex-col items-center justify-center border-b border-line p-6 md:border-b-0 md:border-r">
          <ProductPhoto src={photo} alt={`${product.name}${color.name ? ` color ${color.name}` : ""}`} className="h-72 w-full md:h-96" />
          {color.name && !color.image ? <p className="mt-2 text-center text-xs text-muted">Todavía no hay foto de este color.</p> : null}
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">{product.brand}</p>
              <h2 id="producto-titulo" className="display mt-0.5 text-2xl font-bold sm:text-3xl">{product.name}</h2>
            </div>
            <CloseButton onClose={onClose} />
          </div>
          {facts.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {facts.map((fact) => <li key={fact} className="rounded-full bg-paper px-3 py-1 text-xs font-medium">{fact}</li>)}
            </ul>
          ) : null}

          <div className="mt-6">
            <p className="price text-4xl font-bold">{formatPrice(cashPrice(product.price))}</p>
            <p className="text-sm font-medium text-gold">Precio final en efectivo o transferencia</p>
            {net !== null ? <p className="price mt-1 text-xs text-muted">Precio sin impuestos nacionales: {formatPrice(net)}</p> : null}
            {product.oldPrice ? <p className="price mt-1 text-sm text-muted">Precio de lista anterior <s>{formatPrice(product.oldPrice)}</s></p> : null}
          </div>
          <div className="mt-4 rounded-2xl bg-paper p-4">
            <PriceBreakdown price={product.price} />
          </div>

          {product.type === "PRODUCT" ? (
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold">Color{color.name ? `: ${color.name}` : ""}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.colors.map((item) => (
                  <button key={item.variantId} type="button" aria-pressed={item.variantId === variantId} onClick={() => { setVariantId(item.variantId); setQty(1); }} className={`flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium ${item.variantId === variantId ? "border-ink" : "border-line text-muted hover:border-[#c9c9c4]"}`}>
                    <span className="h-4 w-4 rounded-full border border-black/15" style={{ background: item.hex }} />
                    {item.name}
                    {item.stock <= 0 ? <span className="text-xs font-normal">(sin stock)</span> : null}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}
          <p className={`mt-4 text-sm font-semibold ${stock.tone}`}>{stock.text}</p>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex h-12 items-center rounded-full border border-line">
              <button type="button" aria-label="Una unidad menos" className="grid h-12 w-11 place-items-center" onClick={() => setQty((value) => Math.max(1, value - 1))}><Icon name="minus" className="h-4 w-4" /></button>
              <span className="price w-6 text-center font-semibold">{qty}</span>
              <button type="button" aria-label="Una unidad más" disabled={qty >= left} className="grid h-12 w-11 place-items-center disabled:opacity-40" onClick={() => setQty((value) => Math.min(left, value + 1))}><Icon name="plus" className="h-4 w-4" /></button>
            </div>
            <button type="button" disabled={left <= 0} className="h-12 flex-1 rounded-full bg-ink px-5 font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onAdd(color.variantId, Math.min(qty, left))}>
              {color.stock <= 0 ? "Sin stock" : atLimit ? (color.stock > MAX_PER_ITEM ? `Máximo ${MAX_PER_ITEM} por pedido` : "Ya tenés todo el stock en el carrito") : "Agregar al carrito"}
            </button>
            <button type="button" aria-label={favorite ? "Quitar de favoritos" : "Guardar en favoritos"} aria-pressed={favorite} className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border ${favorite ? "border-bad/30 text-bad" : "border-line text-muted hover:text-ink"}`} onClick={onFavorite}>
              <Icon name="heart" filled={favorite} />
            </button>
          </div>

          {product.specs.length > 0 ? (
            <div className="mt-7 border-t border-line pt-5">
              <h3 className="text-sm font-semibold">{product.type === "COMBO" ? "Incluye" : "Características"}</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                {product.specs.map((spec) => <li key={spec}>{spec}</li>)}
              </ul>
            </div>
          ) : null}
          <dl className="mt-7 grid gap-3 border-t border-line pt-5 text-sm">
            <div>
              <dt className="font-semibold">Garantía</dt>
              <dd className="mt-0.5 text-muted">
                {warrantyMonths(product.condition)} meses de garantía legal por ser {product.condition === "Usados" ? "usado" : "nuevo"} (Ley 24.240).
                {settings?.warranty_extra ? ` ${settings.warranty_extra}` : ""}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Entrega</dt>
              <dd className="mt-0.5 text-muted">{deliveryText()}</dd>
            </div>
            <div>
              <dt className="font-semibold">Arrepentimiento</dt>
              <dd className="mt-0.5 text-muted">Comprando por la web tenés 10 días corridos para arrepentirte, sin explicar el motivo.</dd>
            </div>
          </dl>
        </div>
      </article>
    </Overlay>
  );
}

const statusTone: Record<Order["status"], string> = {
  PENDING: "bg-brand-soft text-gold",
  PAID: "bg-ok-soft text-ok",
  SHIPPED: "bg-[#e8effd] text-[#1d4ed8]",
  DELIVERED: "bg-ok-soft text-ok",
  CANCELLED: "bg-bad-soft text-bad",
};

export function AccountDialog({
  user,
  products,
  onPanel,
  onLogout,
  favorites,
  onOpen,
  onCart,
  onClose,
}: {
  user: Account;
  products: Product[];
  onPanel: () => void;
  onLogout: () => void;
  favorites: string[];
  onOpen: (slug: string) => void;
  onCart: () => void;
  onClose: () => void;
}) {
  const saved = products.filter((item) => favorites.includes(item.slug));
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState("");
  const customer = user.role === "cliente";

  useEffect(() => {
    if (!customer) return;
    void fetchMyOrders().then((result) => {
      if (result.ok) setOrders(result.data);
      else setError(result.error);
    });
  }, [customer]);

  const pending = (orders ?? []).reduce((sum, order) => sum + order.pointsPending, 0);

  return (
    <Overlay onClose={onClose}>
      <article role="dialog" aria-modal="true" aria-labelledby="cuenta-titulo" className="max-h-[90vh] w-full max-w-md overflow-auto rounded-[28px] bg-white p-6 text-ink shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="cuenta-titulo" className="display text-2xl font-bold">Hola, {user.name.split(" ")[0]}</h2>
            <p className="mt-1 text-sm text-muted">{user.email}</p>
          </div>
          <CloseButton onClose={onClose} />
        </div>
        {customer ? (
          <>
            <div className="mt-5 rounded-2xl bg-brand p-5 text-[#080808]">
              <p className="text-sm font-medium">Tus puntos</p>
              <p className="price display mt-1 text-4xl font-bold">{user.points.toLocaleString("es-AR")}</p>
              <p className="mt-2 text-sm">
                {pending > 0
                  ? `Tenés ${pending.toLocaleString("es-AR")} puntos más en camino: se acreditan cuando el local confirma el pago.`
                  : user.points === 0
                    ? "Todavía no sumaste. Por cada $1.000 de compra sumás 1 punto."
                    : "Canjealos por premios en la sección Canjes."}
              </p>
            </div>
            <h3 className="mt-6 font-semibold">Tus pedidos</h3>
            {error ? <p role="alert" className="mt-2 rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
            {orders === null && !error ? <p className="mt-2 text-sm text-muted">Cargando pedidos...</p> : null}
            {orders !== null && orders.length === 0 ? <p className="mt-2 text-sm text-muted">Todavía no hiciste ningún pedido.</p> : null}
            {orders && orders.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {orders.map((order) => (
                  <li key={order.id} className="rounded-2xl border border-line p-4 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">Pedido {order.number}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone[order.status]}`}>{order.statusLabel}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{new Date(order.date.replace(" ", "T")).toLocaleDateString("es-AR")}, {order.payment}</p>
                    <ul className="mt-2 space-y-0.5 text-muted">
                      {order.items.map((item) => <li key={item.name}>{item.qty} × {item.name}</li>)}
                    </ul>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-gold">
                        {order.pointsEarned > 0 ? `+${order.pointsEarned} puntos sumados` : order.pointsPending > 0 ? `+${order.pointsPending} puntos al confirmarse el pago` : ""}
                      </span>
                      <span className="price font-bold">{formatPrice(order.total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <button type="button" onClick={onPanel} className="mt-5 h-12 w-full rounded-full bg-ink text-sm font-semibold text-white hover:bg-black">Ir al panel del local</button>
        )}
        <h3 className="mt-6 font-semibold">Favoritos</h3>
        {saved.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Todavía no guardaste ningún producto. Tocá el corazón en un producto.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {saved.map((item) => (
              <li key={item.slug}>
                <button type="button" onClick={() => onOpen(item.slug)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-2 pr-4 text-left hover:border-[#c9c9c4]">
                  <ProductPhoto src={item.image} alt="" className="h-14 w-12 shrink-0" />
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="price shrink-0 text-sm font-bold">{formatPrice(cashPrice(item.price))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 grid gap-2">
          <button type="button" onClick={onCart} className="h-12 rounded-full bg-ink text-sm font-semibold text-white hover:bg-black">Ver carrito</button>
          <button type="button" onClick={onLogout} className="h-12 rounded-full border border-line text-sm font-semibold hover:border-ink">Cerrar sesión</button>
        </div>
      </article>
    </Overlay>
  );
}

export function InfoDialog({ kind, example, onClose, onProducts }: { kind: "puntos" | "cuotas"; example?: Product; onClose: () => void; onProducts: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <article role="dialog" aria-modal="true" aria-labelledby="info-titulo" className="w-full max-w-lg rounded-[28px] bg-white p-6 text-ink shadow-2xl sm:p-8" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="info-titulo" className="display text-2xl font-bold">{kind === "puntos" ? "Cómo obtener puntos" : "Formas de pago"}</h2>
          <CloseButton onClose={onClose} />
        </div>
        {kind === "puntos" ? (
          <ol className="mt-6 space-y-4">
            {pointSteps.map((step) => (
              <li key={step.n} className="flex items-start gap-4">
                <span className="price grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold">{step.n}</span>
                <span><strong className="block font-semibold">{step.title}</strong><span className="text-sm text-muted">{step.text}</span></span>
              </li>
            ))}
          </ol>
        ) : (
          <>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Efectivo y transferencia tienen 10% de descuento. Con tarjeta pagás el precio de lista en 1 pago
              {financing.on ? `, o en ${INSTALLMENTS} cuotas ${installmentCost()}.` : "."}
            </p>
            {example ? (
              <div className="mt-5 rounded-2xl bg-paper p-4">
                <p className="mb-3 text-sm font-semibold">Ejemplo: {example.name}</p>
                <PriceBreakdown price={example.price} />
              </div>
            ) : null}
          </>
        )}
        <button type="button" className="mt-7 h-12 w-full rounded-full bg-ink text-sm font-semibold text-white hover:bg-black" onClick={onProducts}>Ver productos</button>
      </article>
    </Overlay>
  );
}
