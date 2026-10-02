import { Fragment, useEffect, useState, type ReactNode } from "react";
import { discountPercent, formatPrice, type AdminSection, type Product } from "../../lib/data";
import {
  adjustPoints,
  fetchAccounts,
  fetchAdminOptions,
  fetchCatalog,
  fetchSales,
  fetchAdminRewards,
  fetchMessages,
  fetchSettings,
  fetchStoreSettings,
  registerImei,
  saveBankSettings,
  saveReward,
  saveStoreSettings,
  setMessageStatus,
  setRedemptionStatus,
  setRewardActive,
  setSaleStatus,
  type Account,
  type Brand,
  type ContactMessage,
  type Order,
  type StoreForm,
  type Redemption,
  type Reward,
} from "../../lib/api";
import { shrinkPhoto } from "../../lib/shrinkPhoto";
import { ProductPhoto } from "../../components/RealPhoneArt";
import { useSummary } from "../../lib/useSummary";
import { KpiCards, SalesChart, TopSellers } from "./AdminPages";
import { applyStoreSettings, internationalNumber, storeDefaults } from "../../lib/store";

export function AdminDesk({ section, onCatalogChange }: { section: AdminSection; onCatalogChange: () => void }) {
  if (section === "reportes") return <Reports />;
  if (section === "usuarios") return <AccountsDesk />;
  if (section === "clientes") return <CustomersDesk />;
  if (section === "mensajes") return <MessagesDesk />;
  if (section === "configuracion") return <SettingsDesk />;
  if (section === "ventas") return <SalesDesk onCatalogChange={onCatalogChange} />;
  if (section === "envios") return <SalesDesk shipping onCatalogChange={onCatalogChange} />;
  if (section === "marcas") return <BrandsDesk />;
  if (section === "promociones") return <PromosDesk />;
  if (section === "canjes") return <RewardsDesk />;
  return null;
}

const messageStatus: Record<ContactMessage["status"], { label: string; tone: string }> = {
  NEW: { label: "Nuevo", tone: "bg-[#3a2a00] text-[#FFD83D]" },
  READ: { label: "Leído", tone: "bg-[#10263f] text-[#93c5fd]" },
  REPLIED: { label: "Respondido", tone: "bg-[#123024] text-[#86efac]" },
  CLOSED: { label: "Cerrado", tone: "bg-[#3a3a3a] text-[#A7A7A7]" },
};

const waLink = (phone: string) => `https://wa.me/${internationalNumber(phone)}`;

function MessagesDesk() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    void fetchMessages().then((result) => {
      if (result.ok) setMessages(result.data);
      else {
        setMessages([]);
        setError(result.error);
      }
    });
  }, []);

  const change = async (message: ContactMessage, status: ContactMessage["status"]) => {
    if (message.status === status) return;
    setError("");
    const result = await setMessageStatus(message.id, status);
    if (!result.ok) return setError(result.error);
    setMessages((current) => (current ?? []).map((item) => item.id === message.id ? { ...item, status } : item));
  };

  const open = (message: ContactMessage) => {
    setOpenId(openId === message.id ? null : message.id);
    if (message.status === "NEW") void change(message, "READ");
  };

  const fresh = (messages ?? []).filter((item) => item.status === "NEW").length;
  const reply = (message: ContactMessage) => `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject || "tu consulta en wicel"}`)}&body=${encodeURIComponent(`Hola ${message.name.split(" ")[0]}, `)}`;

  return (
    <Screen title="Mensajes" crumb="Lo que te escriben desde el formulario de Contacto. Respondé por email o WhatsApp y marcalo como Respondido.">
      {error ? <p role="alert" className="mb-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{error}</p> : null}
      {fresh > 0 ? <p className="mb-3 rounded-lg border border-[#FFD83D]/40 bg-[#2b2400] px-3 py-2 text-sm text-[#FFD83D]">Tenés {fresh} {fresh === 1 ? "mensaje nuevo" : "mensajes nuevos"} sin leer.</p> : null}
      {messages === null ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Cargando mensajes...</p> : null}
      {messages !== null && messages.length === 0 && !error ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Todavía nadie escribió desde la página de Contacto.</p> : null}
      <ul className="space-y-2">
        {(messages ?? []).map((message) => (
          <li key={message.id} className={`rounded-xl border p-3 ${message.status === "NEW" ? "border-[#FFD83D]/50" : "border-[#4a4a4a]"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <button type="button" aria-expanded={openId === message.id} onClick={() => open(message)} className="min-w-0 flex-1 text-left">
                <span className="block font-semibold">{message.name} <span className="font-normal text-[#A7A7A7]">· {message.subject || "Sin asunto"}</span></span>
                <span className="block text-xs text-[#A7A7A7]">{new Date(message.date.replace(" ", "T")).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} · {message.email}</span>
                {openId === message.id ? null : <span className="mt-1 block truncate text-sm text-[#d4d4d4]">{message.message}</span>}
              </button>
              <select value={message.status} onChange={(event) => void change(message, event.target.value as ContactMessage["status"])} aria-label={`Estado del mensaje de ${message.name}`} className={`h-8 rounded-lg border-0 px-2 text-xs font-semibold ${messageStatus[message.status].tone}`}>
                {Object.entries(messageStatus).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}
              </select>
            </div>
            {openId === message.id ? (
              <div className="mt-3">
                <p className="whitespace-pre-wrap text-sm text-[#e5e5e5]">{message.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={reply(message)} onClick={() => void change(message, "REPLIED")} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold">Responder por email</a>
                  {message.phone ? <a href={waLink(message.phone)} target="_blank" rel="noreferrer" onClick={() => void change(message, "REPLIED")} className="rounded-lg bg-[#123024] px-3 py-1.5 text-xs font-semibold text-[#86efac]">WhatsApp {message.phone}</a> : null}
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </Screen>
  );
}

const statusTone: Record<Order["status"], string> = {
  PENDING: "bg-[#3a2a00] text-[#FFD83D]",
  PAID: "bg-[#123024] text-[#86efac]",
  SHIPPED: "bg-[#10263f] text-[#93c5fd]",
  DELIVERED: "bg-[#123024] text-[#86efac]",
  CANCELLED: "bg-[#3a1212] text-[#fecaca]",
};

function SalesDesk({ shipping = false, onCatalogChange }: { shipping?: boolean; onCatalogChange: () => void }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [transitions, setTransitions] = useState<Partial<Record<Order["status"], Order["status"][]>>>({});
  const [holdHours, setHoldHours] = useState(48);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const addImei = async (order: Order, itemId: number, imei: string, serial: string) => {
    setError("");
    const result = await registerImei(itemId, imei, serial);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setOrders(result.data);
    setNotice(`IMEI cargado en el pedido ${order.number}. La garantía quedó abierta en Postventa.`);
    return true;
  };

  useEffect(() => {
    void fetchSales().then((result) => {
      if (result.ok) {
        setOrders(result.data.orders);
        setStatuses(result.data.statuses);
        setTransitions(result.data.transitions);
        setHoldHours(result.data.holdHours);
      } else setError(result.error);
    });
  }, []);

  const change = async (order: Order, status: Order["status"]) => {
    if (status === "CANCELLED" && !window.confirm(`¿Cancelar el pedido ${order.number}? El stock vuelve al local y, si ya sumó puntos, se le descuentan al cliente.`)) return;
    setError("");
    const result = await setSaleStatus(order.id, status);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOrders(result.data);
    const updated = result.data.find((item) => item.id === order.id);
    setNotice(
      status === "CANCELLED" ? `Pedido ${order.number} cancelado. El stock volvió al local.`
        : updated && updated.pointsEarned > 0 && order.pointsEarned === 0 ? `Pedido ${order.number}: ${statuses[status]}. ${order.customer} sumó ${updated.pointsEarned} puntos.`
          : `Pedido ${order.number}: ${statuses[status]}.`,
    );
    if (status === "CANCELLED") onCatalogChange();
  };

  const visible = (orders ?? []).filter((order) => (shipping ? order.status !== "CANCELLED" : true) && (!filter || order.status === filter));

  return (
    <Screen
      title={shipping ? "Envíos" : "Ventas"}
      crumb={shipping ? "Pedidos para preparar y entregar. Cambiá el estado cuando sale o llega." : `Pedidos hechos en la tienda. Cuando cobres, marcalo como Pagado: ahí el cliente suma sus puntos. Si en ${holdHours} horas no se marca como pagado, se cancela solo y el stock vuelve.`}
      notice={notice}
      action={(
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filtrar por estado" className="h-9 rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-2 text-sm text-white">
          <option value="">Todos los estados</option>
          {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      )}
    >
      {error ? <p role="alert" className="mb-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[860px] text-left text-sm">
          <thead className="text-xs text-[#A7A7A7]">
            <tr>
              <th className="py-2 font-medium">Pedido</th>
              <th className="font-medium">Cliente</th>
              <th className="font-medium">{shipping ? "Entrega" : "Productos"}</th>
              <th className="font-medium">{shipping ? "WhatsApp" : "Pago"}</th>
              <th className="font-medium">Total</th>
              <th className="font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((order) => (
              <Fragment key={order.id}>
              <tr className="border-t border-[#4a4a4a] align-top">
                <td className="py-3">
                  <span className="font-bold">{order.number}</span>
                  <span className="block text-xs text-[#A7A7A7]">{new Date(order.date.replace(" ", "T")).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
                  <button type="button" aria-expanded={openId === order.id} onClick={() => setOpenId(openId === order.id ? null : order.id)} className="mt-1 text-xs font-semibold text-brand underline">
                    {openId === order.id ? "Ocultar detalle" : "IMEI e historial"}
                  </button>
                </td>
                <td className="py-3">
                  {order.customer}
                  <span className="block text-xs text-[#A7A7A7]">{order.email}</span>
                  <span className="block text-xs text-[#A7A7A7]">{order.registered ? (order.pointsEarned > 0 ? `Sumó ${order.pointsEarned} puntos` : order.pointsPending > 0 ? `Suma ${order.pointsPending} puntos al pagar` : "Cliente registrado") : "Compró sin cuenta"}</span>
                </td>
                <td className="py-3">
                  {shipping ? order.address : order.items.map((item) => <span key={item.name} className="block">{item.qty} × {item.name}</span>)}
                </td>
                <td className="py-3">{shipping ? <a className="text-brand underline" href={`https://wa.me/${order.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{order.phone}</a> : order.payment}</td>
                <td className="py-3 font-bold">{formatPrice(order.total)}</td>
                <td className="py-3">
                  {order.status === "CANCELLED" ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone.CANCELLED}`}>Cancelado</span>
                  ) : (
                    <select value={order.status} onChange={(event) => void change(order, event.target.value as Order["status"])} aria-label={`Estado del pedido ${order.number}`} className={`h-8 rounded-lg border-0 px-2 text-xs font-semibold ${statusTone[order.status]}`}>
                      {[order.status, ...(transitions[order.status] ?? [])].map((key) => <option key={key} value={key}>{statuses[key] ?? key}</option>)}
                    </select>
                  )}
                </td>
              </tr>
              {openId === order.id ? (
                <tr className="bg-[#2b2b2b]">
                  <td colSpan={6} className="p-4">
                    <OrderDetail order={order} onImei={(itemId, imei, serial) => addImei(order, itemId, imei, serial)} />
                  </td>
                </tr>
              ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
        {orders === null && !error ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Cargando pedidos...</p> : null}
        {orders !== null && visible.length === 0 ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Todavía no hay pedidos{filter ? " con ese estado" : ""}.</p> : null}
      </div>
    </Screen>
  );
}

function OrderDetail({ order, onImei }: { order: Order; onImei: (itemId: number, imei: string, serial: string) => Promise<boolean> }) {
  const when = (value: string) => new Date(value.replace(" ", "T")).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-bold">Productos y garantía</h3>
        <p className="text-xs text-[#A7A7A7]">En los celulares, cargá el IMEI al entregarlos (se ve marcando *#06#). Abre la garantía legal: 6 meses si es nuevo, 3 si es usado.</p>
        <ul className="mt-3 space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="rounded-lg border border-[#4a4a4a] p-3">
              <p className="font-semibold">{item.qty} × {item.name}</p>
              {item.devices.map((device) => (
                <p key={device.imei} className="mt-1 text-xs text-[#d4d4d4]">IMEI {device.imei}{device.warranty ? ` · Garantía ${device.warranty} hasta ${new Date(`${device.until}T12:00:00`).toLocaleDateString("es-AR")}` : ""}</p>
              ))}
              {!item.phone ? <p className="mt-1 text-xs text-[#A7A7A7]">No lleva IMEI. La garantía legal corre desde la entrega.</p> : null}
              {item.phone && order.status !== "CANCELLED" && item.devices.length < item.qty ? <ImeiForm onSave={(imei, serial) => onImei(item.id, imei, serial)} /> : null}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-bold">Entrega y aceptación</h3>
        <dl className="mt-2 grid gap-1 text-xs text-[#d4d4d4]">
          <div><dt className="inline text-[#A7A7A7]">Entrega: </dt><dd className="inline">{order.delivery === "PICKUP" ? "Retiro en el local" : order.delivery === "SHIPPING" ? `Envío a ${order.address}` : order.address}</dd></div>
          <div><dt className="inline text-[#A7A7A7]">Términos: </dt><dd className="inline">{order.termsVersion && order.termsAcceptedAt ? `versión ${order.termsVersion}, aceptados el ${when(order.termsAcceptedAt)}` : "pedido anterior a la aceptación de términos"}</dd></div>
        </dl>
        <h3 className="mt-4 text-sm font-bold">Historial</h3>
        {order.events.length === 0 ? <p className="mt-1 text-xs text-[#A7A7A7]">Sin movimientos registrados.</p> : (
          <ol className="mt-2 space-y-1 border-l-2 border-[#4a4a4a] pl-3 text-xs text-[#d4d4d4]">
            {order.events.map((event, index) => <li key={index}><span className="text-[#A7A7A7]">{when(event.date)}</span> · {event.detail}</li>)}
          </ol>
        )}
      </div>
    </div>
  );
}

function ImeiForm({ onSave }: { onSave: (imei: string, serial: string) => Promise<boolean> }) {
  const [imei, setImei] = useState("");
  const [serial, setSerial] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={(event) => {
      event.preventDefault();
      setSaving(true);
      void onSave(imei, serial).then((ok) => {
        setSaving(false);
        if (ok) {
          setImei("");
          setSerial("");
        }
      });
    }}>
      <label className="text-xs font-semibold text-[#d4d4d4]">IMEI<input value={imei} onChange={(event) => setImei(event.target.value)} inputMode="numeric" maxLength={17} placeholder="15 números" className="mt-1 h-9 w-44 rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-2 text-sm text-white" /></label>
      <label className="text-xs font-semibold text-[#d4d4d4]">N.º de serie (opcional)<input value={serial} onChange={(event) => setSerial(event.target.value)} className="mt-1 h-9 w-40 rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-2 text-sm text-white" /></label>
      <button disabled={saving || imei.replace(/\D/g, "").length !== 15} className="h-9 rounded-lg bg-brand px-3 text-xs font-semibold disabled:opacity-50">{saving ? "Guardando..." : "Cargar IMEI"}</button>
    </form>
  );
}

type RewardForm = { id: number | null; name: string; points: string; stock: string; description: string; image: string | null; file: File | null; preview: string | null };
const emptyReward = (): RewardForm => ({ id: null, name: "", points: "", stock: "", description: "", image: null, file: null, preview: null });
const redemptionTone: Record<Redemption["status"], string> = {
  PENDING: "bg-[#3a2a00] text-[#FFD83D]",
  DELIVERED: "bg-[#123024] text-[#86efac]",
  CANCELLED: "bg-[#3a1212] text-[#fecaca]",
};

function RewardsDesk() {
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [perThousand, setPerThousand] = useState(1);
  const [form, setForm] = useState<RewardForm | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchAdminRewards().then((result) => {
      if (result.ok) {
        setRewards(result.data.rewards);
        setRedemptions(result.data.redemptions);
        setStatuses(result.data.statuses);
      } else setError(result.error);
    });
    void fetchSettings().then((settings) => setPerThousand(Number(settings?.points_per_currency ?? 1) || 1));
  }, []);

  const points = Number(form?.points.replace(/\D/g, "") || 0);
  const pending = redemptions.filter((item) => item.status === "PENDING").length;

  const save = async () => {
    if (!form) return;
    setError("");
    if (!form.name.trim()) return setError("Escribí el nombre del premio.");
    if (points <= 0) return setError("Escribí cuántos puntos cuesta.");
    if (form.stock.trim() === "" || !/^\d+$/.test(form.stock.trim())) return setError("Escribí cuántas unidades tenés (puede ser 0).");
    setBusy(true);
    const data = new FormData();
    data.set("data", JSON.stringify({ id: form.id, name: form.name.trim(), points, stock: Number(form.stock), description: form.description.trim() }));
    if (form.file) data.set("foto", await shrinkPhoto(form.file), "foto.webp");
    const result = await saveReward(data);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    setRewards(result.data);
    setNotice(form.id ? `Guardamos los cambios de ${form.name.trim()}.` : `Listo, ${form.name.trim()} ya aparece en Canjes.`);
    setForm(null);
  };

  const toggle = async (reward: Reward) => {
    const result = await setRewardActive(reward.id, !reward.active);
    if (!result.ok) return setError(result.error);
    setRewards(result.data);
    setNotice(reward.active ? `${reward.name} ya no se muestra en la tienda.` : `${reward.name} vuelve a mostrarse en Canjes.`);
  };

  const change = async (item: Redemption, status: Redemption["status"]) => {
    if (status === "CANCELLED" && !window.confirm(`¿Cancelar el canje ${item.code}? Le devolvemos ${item.points} puntos a ${item.customer} y el premio vuelve al stock.`)) return;
    setError("");
    const result = await setRedemptionStatus(item.id, status);
    if (!result.ok) return setError(result.error);
    setRedemptions(result.data.redemptions);
    setRewards(result.data.rewards);
    setNotice(status === "CANCELLED" ? `Canje ${item.code} cancelado. ${item.customer} recuperó sus ${item.points} puntos.` : `Canje ${item.code}: ${statuses[status]}.`);
  };

  return (
    <Screen
      title="Canjes"
      crumb={`Premios que tus clientes cambian por puntos. Cada cliente suma ${perThousand} ${perThousand === 1 ? "punto" : "puntos"} por cada $1.000 que compra.`}
      notice={notice}
      action={<button type="button" onClick={() => { setForm(emptyReward()); setError(""); }} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold">Nuevo premio</button>}
    >
      {error ? <p role="alert" className="mb-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{error}</p> : null}
      {pending > 0 ? <p className="mb-3 rounded-lg border border-[#FFD83D]/40 bg-[#2b2400] px-3 py-2 text-sm text-[#FFD83D]">Tenés {pending} {pending === 1 ? "canje" : "canjes"} para entregar. Escribile al cliente y, cuando se lo lleve, marcalo como Entregado.</p> : null}

      {form ? (
        <div className="mb-5 rounded-xl border border-[#4a4a4a] p-4">
          <h3 className="font-bold">{form.id ? "Editar premio" : "Nuevo premio"}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-[120px_1fr]">
            <div>
              <ProductPhoto src={form.preview ?? form.image} alt="" className="h-28 w-28" />
              <label className="mt-2 block cursor-pointer text-center text-xs font-semibold text-brand">
                {form.preview || form.image ? "Cambiar foto" : "Subir foto"}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setForm({ ...form, file, preview: file ? URL.createObjectURL(file) : null });
                }} />
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-3"><Field label="Nombre del premio (ej.: Termo acero 1 L)" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /></div>
              <div>
                <Field label="Puntos que cuesta" value={form.points} onChange={(value) => setForm({ ...form, points: value })} />
                {points > 0 ? <p className="mt-1 text-[11px] text-[#A7A7A7]">El cliente tiene que haber comprado unos {formatPrice(Math.ceil(points / perThousand) * 1000)} para juntarlos.</p> : null}
              </div>
              <Field label="Unidades para canjear" value={form.stock} onChange={(value) => setForm({ ...form, stock: value })} />
              <label className="block text-xs font-semibold text-[#d4d4d4] md:col-span-3">
                Descripción (opcional)
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-3 py-2 text-sm text-white" />
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? "Guardando..." : "Guardar"}</button>
            <button type="button" onClick={() => setForm(null)} className="rounded-lg border border-[#4a4a4a] px-4 py-2 text-sm font-semibold text-white">Cancelar</button>
          </div>
        </div>
      ) : null}

      <h3 className="font-bold">Premios</h3>
      {rewards !== null && rewards.length === 0 ? <p className="py-4 text-sm text-[#d4d4d4]">Todavía no cargaste premios. Tocá Nuevo premio para sumar el primero (un termo, un reloj, un celular...).</p> : null}
      {rewards && rewards.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-[#A7A7A7]"><tr><th className="py-2 font-medium">Foto</th><th className="font-medium">Premio</th><th className="font-medium">Puntos</th><th className="font-medium">Unidades</th><th className="font-medium">En la tienda</th><th className="font-medium">Acciones</th></tr></thead>
            <tbody>
              {rewards.map((reward) => (
                <tr key={reward.id} className="border-t border-[#4a4a4a]">
                  <td className="py-2"><ProductPhoto src={reward.image} alt="" className="h-12 w-12" /></td>
                  <td className="font-semibold">{reward.name}</td>
                  <td>{reward.points.toLocaleString("es-AR")}</td>
                  <td className={reward.stock <= 0 ? "font-semibold text-[#fca5a5]" : ""}>{reward.stock <= 0 ? "Agotado" : reward.stock}</td>
                  <td><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${reward.active ? "bg-[#123024] text-[#86efac]" : "bg-[#3a3a3a] text-[#A7A7A7]"}`}>{reward.active ? "Visible" : "Oculto"}</span></td>
                  <td className="space-x-1">
                    <IconButton label="Editar" onClick={() => { setError(""); setForm({ id: reward.id, name: reward.name, points: String(reward.points), stock: String(reward.stock), description: reward.description, image: reward.image, file: null, preview: null }); }} />
                    <IconButton label={reward.active ? "Ocultar" : "Mostrar"} danger={reward.active} onClick={() => void toggle(reward)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <h3 className="mt-6 font-bold">Canjes de clientes</h3>
      {redemptions.length === 0 ? <p className="py-4 text-sm text-[#d4d4d4]">Todavía nadie canjeó puntos.</p> : (
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-[#A7A7A7]"><tr><th className="py-2 font-medium">Canje</th><th className="font-medium">Cliente</th><th className="font-medium">Premio</th><th className="font-medium">Puntos</th><th className="font-medium">Estado</th></tr></thead>
            <tbody>
              {redemptions.map((item) => (
                <tr key={item.id} className="border-t border-[#4a4a4a] align-top">
                  <td className="py-3"><span className="font-bold">{item.code}</span><span className="block text-xs text-[#A7A7A7]">{new Date(item.date.replace(" ", "T")).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span></td>
                  <td className="py-3">
                    {item.customer}
                    <span className="block text-xs text-[#A7A7A7]">{item.email}</span>
                    {item.phone ? <a className="block text-xs text-brand underline" href={`https://wa.me/${item.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp {item.phone}</a> : null}
                  </td>
                  <td className="py-3">{item.reward}</td>
                  <td className="py-3">{item.points.toLocaleString("es-AR")}</td>
                  <td className="py-3">
                    {item.status === "CANCELLED" ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${redemptionTone.CANCELLED}`}>Cancelado</span>
                    ) : (
                      <select value={item.status} onChange={(event) => void change(item, event.target.value as Redemption["status"])} aria-label={`Estado del canje ${item.code}`} className={`h-8 rounded-lg border-0 px-2 text-xs font-semibold ${redemptionTone[item.status]}`}>
                        {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  );
}

function BrandsDesk() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetchAdminOptions().then((result) => {
      if (result.ok) setBrands(result.data.brands);
      else setError(result.error);
    });
  }, []);
  return (
    <Screen title="Marcas" crumb="Se crean solas cuando cargás un producto con una marca nueva. La cantidad se cuenta sola.">
      {error ? <p role="alert" className="mb-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{error}</p> : null}
      <table className="admin-table w-full text-left text-sm">
        <thead className="text-xs text-[#A7A7A7]"><tr><th className="py-2 font-medium">Marca</th><th className="font-medium">Productos a la venta</th></tr></thead>
        <tbody>
          {(brands ?? []).map((brand) => (
            <tr key={brand.id} className="border-t border-[#4a4a4a]"><td className="py-3 font-semibold">{brand.name}</td><td>{brand.products}</td></tr>
          ))}
        </tbody>
      </table>
    </Screen>
  );
}

function PromosDesk() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetchCatalog().then((result) => {
      if (result.ok) setProducts(result.data.filter((item) => item.oldPrice));
      else setError(result.error);
    });
  }, []);
  return (
    <Screen title="Promociones" crumb="Productos con precio anterior tachado. Para crear o sacar una promo, editá el precio anterior en Productos.">
      {error ? <p role="alert" className="mb-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-[#A7A7A7]"><tr><th className="py-2 font-medium">Producto</th><th className="font-medium">Antes</th><th className="font-medium">Ahora</th><th className="font-medium">Descuento</th></tr></thead>
          <tbody>
            {(products ?? []).map((product) => (
              <tr key={product.id} className="border-t border-[#4a4a4a]">
                <td className="py-3 font-semibold">{product.name}{product.type === "COMBO" ? <span className="ml-2 text-xs text-[#A7A7A7]">Combo</span> : null}</td>
                <td className="text-[#A7A7A7] line-through">{formatPrice(product.oldPrice ?? 0)}</td>
                <td>{formatPrice(product.price)}</td>
                <td className="font-bold text-[#FFD83D]">{discountPercent(product)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Screen>
  );
}

function useAccounts() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState("");
  const reload = () => {
    void fetchAccounts().then((result) => {
      if (result.ok) {
        setAccounts(result.data);
        setError("");
      } else {
        setAccounts([]);
        setError(result.error);
      }
    });
  };
  useEffect(reload, []);
  return { accounts, error, reload, setAccounts };
}

const registeredOn = (value: string) => new Date(value.replace(" ", "T")).toLocaleDateString("es-AR");

function CustomersDesk() {
  const { accounts, error, setAccounts } = useAccounts();
  const [editing, setEditing] = useState<Account | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const customers = (accounts ?? []).filter((account) => account.role === "cliente");

  const open = (customer: Account) => {
    setEditing(customer);
    setAmount("");
    setReason("");
    setFormError("");
  };

  const save = async (sign: 1 | -1) => {
    if (!editing) return;
    const points = Number(amount);
    if (!Number.isInteger(points) || points <= 0) {
      setFormError("Escribí una cantidad de puntos, sin decimales.");
      return;
    }
    if (!reason.trim()) {
      setFormError("Contá el motivo, por ejemplo: compra en el local.");
      return;
    }
    const result = await adjustPoints(editing.id, points * sign, reason.trim());
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setAccounts((current) => (current ?? []).map((account) => account.id === editing.id ? { ...account, points: result.data } : account));
    setNotice(`${editing.name} ahora tiene ${result.data.toLocaleString("es-AR")} puntos.`);
    setEditing(null);
  };

  return (
    <Screen title="Clientes" crumb="Personas que se registraron en la tienda y sus puntos" notice={notice}>
      {error ? <p role="alert" className="mb-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-[#A7A7A7]">
            <tr><th className="py-2 font-medium">Nombre</th><th className="font-medium">Email</th><th className="font-medium">Puntos</th><th className="font-medium">Se registró</th><th className="font-medium">Acciones</th></tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-t border-[#4a4a4a]">
                <td className="py-3 font-semibold">{customer.name}</td>
                <td>{customer.email}</td>
                <td className="font-bold text-[#FFD83D]">{customer.points.toLocaleString("es-AR")}</td>
                <td>{registeredOn(customer.createdAt)}</td>
                <td><IconButton label="Sumar o restar puntos" onClick={() => open(customer)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {accounts === null ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Cargando clientes...</p> : null}
        {accounts !== null && customers.length === 0 && !error ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Todavía no se registró ningún cliente.</p> : null}
      </div>
      {editing ? (
        <form className="mt-4 grid gap-3 rounded-xl border border-[#4a4a4a] bg-[#242424] p-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); void save(1); }}>
          <p className="text-sm md:col-span-2">Puntos de <strong>{editing.name}</strong>: {editing.points.toLocaleString("es-AR")}</p>
          <label className="text-xs font-semibold text-[#d4d4d4]">Cantidad de puntos
            <input type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-3 text-sm text-white" />
          </label>
          <label className="text-xs font-semibold text-[#d4d4d4]">Motivo
            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Compra en el local, canje, regalo..." className="mt-1 h-10 w-full rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-3 text-sm text-white placeholder:text-[#A7A7A7]" />
          </label>
          {formError ? <p role="alert" className="rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca] md:col-span-2">{formError}</p> : null}
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <button className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold">Sumar puntos</button>
            <button type="button" onClick={() => void save(-1)} className="h-10 rounded-lg bg-[#3a1212] px-4 text-sm font-semibold text-[#fecaca]">Restar puntos</button>
            <button type="button" onClick={() => setEditing(null)} className="h-10 rounded-lg border border-[#4a4a4a] px-4 text-sm text-white">Cancelar</button>
          </div>
        </form>
      ) : null}
    </Screen>
  );
}

function AccountsDesk() {
  const { accounts, error } = useAccounts();
  return (
    <Screen title="Usuarios" crumb="Todas las cuentas. Hay dos roles: administrador (el dueño del local) y cliente.">
      {error ? <p role="alert" className="mb-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{error}</p> : null}
      <div className="overflow-x-auto">
        <table className="admin-table w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs text-[#A7A7A7]">
            <tr><th className="py-2 font-medium">Nombre</th><th className="font-medium">Email</th><th className="font-medium">Rol</th><th className="font-medium">Se registró</th></tr>
          </thead>
          <tbody>
            {(accounts ?? []).map((account) => (
              <tr key={account.id} className="border-t border-[#4a4a4a]">
                <td className="py-3 font-semibold">{account.name}</td>
                <td>{account.email}</td>
                <td>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${account.role === "administrador" ? "bg-[#3a2a00] text-[#FFD83D]" : "bg-[#123024] text-[#86efac]"}`}>
                    {account.role === "administrador" ? "Administrador" : "Cliente"}
                  </span>
                </td>
                <td>{registeredOn(account.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {accounts === null ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Cargando cuentas...</p> : null}
      </div>
    </Screen>
  );
}

function SettingsDesk() {
  const [tab, setTab] = useState("General");
  const [saved, setSaved] = useState("");
  const [perThousand, setPerThousand] = useState<number | null>(null);
  const tabs = ["General", "Pagos", "Envíos", "Puntos"];

  useEffect(() => {
    void fetchSettings().then((settings) => setPerThousand(Number(settings?.points_per_currency ?? 1) || 1));
  }, []);

  return (
    <Screen title="Configuración" crumb="Datos que ve el cliente en la tienda" notice={saved}>
      <div className="flex flex-wrap gap-2 text-sm">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => { setTab(item); setSaved(""); }} className={`rounded-lg px-3 py-1.5 ${tab === item ? "bg-[#3a2a00] font-semibold text-[#FFD83D]" : "text-[#d4d4d4]"}`}>{item}</button>
        ))}
      </div>
      {tab === "General" ? <StoreFormDesk onSaved={setSaved} /> : null}
      {tab === "Pagos" ? <BankForm onSaved={setSaved} /> : null}
      {tab === "Envíos" ? <p className="mt-4 text-sm text-[#d4d4d4]">Los pedidos salen desde el local. La dirección se cambia en General y el estado de cada envío se mira en Envíos.</p> : null}
      {tab === "Puntos" ? (
        <p className="mt-4 text-sm text-[#d4d4d4]">
          {perThousand === null ? "Cargando..." : `Cada $1.000 de compra suma ${perThousand} ${perThousand === 1 ? "punto" : "puntos"}. Se acreditan cuando marcás el pedido como Pagado en Ventas. Los premios se cargan en Canjes.`}
        </p>
      ) : null}
    </Screen>
  );
}

function StoreFormDesk({ onSaved }: { onSaved: (text: string) => void }) {
  const [store, setStore] = useState<StoreForm | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchStoreSettings().then((result) => {
      if (!result.ok) return setError(result.error);
      const filled = { ...result.data };
      for (const key of Object.keys(storeDefaults) as (keyof typeof storeDefaults)[]) filled[key] ||= storeDefaults[key];
      filled.store_name ||= "wicel";
      filled.order_hold_hours ||= "48";
      setStore(filled);
    });
  }, []);

  if (!store) return error ? <p role="alert" className="mt-4 rounded-lg bg-[#3a1212] px-3 py-2 text-sm text-[#fecaca]">{error}</p> : <p className="mt-4 text-sm text-[#A7A7A7]">Cargando...</p>;
  const update = (key: keyof StoreForm, value: string) => setStore({ ...store, [key]: value });

  return (
    <form className="mt-4" onSubmit={(event) => {
      event.preventDefault();
      setError("");
      onSaved("");
      setBusy(true);
      void saveStoreSettings(store).then((result) => {
        setBusy(false);
        if (!result.ok) return setError(result.error);
        applyStoreSettings(store);
        onSaved("Guardado. La tienda ya muestra los datos nuevos.");
      });
    }}>
      <p className="text-sm text-[#d4d4d4]">Se ven en el pie de página, en Contacto, en el botón de WhatsApp y en los emails de pedido.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Nombre de la tienda" value={store.store_name} onChange={(value) => update("store_name", value)} />
        <Field label="Teléfono y WhatsApp del local" value={store.store_phone} onChange={(value) => update("store_phone", value)} hint="Con código de área, sin 0 ni 15. Ej.: 3541 21-9547" />
        <Field label="Email de contacto" value={store.store_email} onChange={(value) => update("store_email", value)} hint="El que ven los clientes." />
        <Field label="Email para avisos de pedidos y mensajes" value={store.notify_email} onChange={(value) => update("notify_email", value)} hint="Si lo dejás vacío, usamos el email de contacto." />
        <Field label="Dirección del local" value={store.store_address} onChange={(value) => update("store_address", value)} hint="Calle y número. Ej.: Obispo Ferreyra 680" />
        <Field label="Ciudad y provincia" value={store.store_city} onChange={(value) => update("store_city", value)} hint="Ej.: Villa del Rosario, Córdoba" />
        <Field label="Instagram" value={store.store_instagram} onChange={(value) => update("store_instagram", value)} hint="El usuario, con o sin @." />
        <Field label="Horas para pagar un pedido" value={store.order_hold_hours} onChange={(value) => update("order_hold_hours", value)} hint="Pasado ese plazo sin marcarlo como Pagado, se cancela solo y el stock vuelve. Vacío = 48." />
      </div>
      {error ? <p role="alert" className="mt-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]">{error}</p> : null}
      <div className="mt-4 flex justify-end">
        <button disabled={busy} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? "Guardando..." : "Guardar cambios"}</button>
      </div>
    </form>
  );
}

function BankForm({ onSaved }: { onSaved: (text: string) => void }) {
  const [bank, setBank] = useState<{ bank_alias: string; bank_cbu: string; bank_holder: string; bank_name: string } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void fetchSettings().then((settings) => {
      if (!settings) {
        setError("No pudimos leer los datos guardados.");
        return;
      }
      setBank({ bank_alias: settings.bank_alias ?? "", bank_cbu: settings.bank_cbu ?? "", bank_holder: settings.bank_holder ?? "", bank_name: settings.bank_name ?? "" });
    });
  }, []);
  if (error) return <p role="alert" className="mt-4 rounded-lg bg-[#3a1212] px-3 py-2 text-sm text-[#fecaca]">{error}</p>;
  if (!bank) return <p className="mt-4 text-sm text-[#A7A7A7]">Cargando...</p>;
  const update = (key: keyof typeof bank, value: string) => setBank({ ...bank, [key]: value });
  return (
    <form className="mt-4" onSubmit={(event) => {
      event.preventDefault();
      void saveBankSettings(bank).then((result) => {
        if (result.ok) onSaved("Datos de transferencia guardados. El cliente los ve al elegir Transferencia.");
        else setError(result.error);
      });
    }}>
      <p className="text-sm text-[#d4d4d4]">Estos datos se muestran al cliente cuando elige pagar con transferencia. Si los dejás vacíos, le decimos que se los pasás por WhatsApp.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <Field label="Alias" value={bank.bank_alias} onChange={(value) => update("bank_alias", value)} />
        <Field label="CBU o CVU" value={bank.bank_cbu} onChange={(value) => update("bank_cbu", value)} />
        <Field label="Titular de la cuenta" value={bank.bank_holder} onChange={(value) => update("bank_holder", value)} />
        <Field label="Banco o billetera" value={bank.bank_name} onChange={(value) => update("bank_name", value)} />
      </div>
      <div className="mt-4 flex justify-end">
        <button className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold">Guardar datos de transferencia</button>
      </div>
    </form>
  );
}

function Reports() {
  const { summary, error } = useSummary();
  return (
    <Screen title="Reportes" crumb="Números reales de la tienda, calculados con los pedidos guardados.">
      {error ? <p role="alert" className="mb-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm text-[#fecaca]">{error}</p> : null}
      {!summary && !error ? <p className="text-sm text-[#A7A7A7]">Cargando...</p> : null}
      {summary ? (
        <>
          <KpiCards summary={summary} />
          <h3 className="mt-5 font-bold">Ventas de los últimos 7 días</h3>
          <SalesChart days={summary.days} />
          <h3 className="mt-5 font-bold">Productos más vendidos</h3>
          <TopSellers summary={summary} />
        </>
      ) : null}
    </Screen>
  );
}

export function Screen({ title, crumb, notice, action, children }: { title: string; crumb: string; notice?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="bg-[#242424] px-6 py-4 pl-16 text-white lg:pl-6"><h1 className="text-xl font-bold">{title}</h1></div>
      <section className="m-5 rounded-2xl bg-[#333333] p-4 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="text-lg font-bold">{title}</h2><p className="text-xs text-[#A7A7A7]">{crumb}</p></div>
          {action}
        </div>
        {notice ? <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{notice}</p> : null}
        <div className="mt-3">{children}</div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (value: string) => void; hint?: string }) {
  return (
    <label className="block text-xs font-semibold text-[#d4d4d4]">{label}
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-3 text-sm text-white" />
      {hint ? <span className="mt-1 block text-[11px] font-normal text-[#A7A7A7]">{hint}</span> : null}
    </label>
  );
}

function IconButton({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return <button type="button" onClick={onClick} className={`rounded-md px-2 py-1 text-xs font-semibold ${danger ? "bg-[#3a1212] text-[#fecaca]" : "bg-[#3a2a00] text-[#FFD83D]"}`}>{label}</button>;
}
