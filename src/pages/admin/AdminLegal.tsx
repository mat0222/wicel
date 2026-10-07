import { useEffect, useState, type FormEvent } from "react";
import {
  fetchAfterSales,
  fetchAudit,
  fetchSettings,
  openClaim,
  saveLegalSettings,
  setRequestStatus,
  updateClaim,
  type AfterSalesRequest,
  type AuditEntry,
  type LegalSettings,
  type Warranty,
  type WarrantyClaim,
} from "../../lib/api";
import { Screen } from "./AdminDesk";

const input = "mt-1 h-10 w-full rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-3 text-sm text-white placeholder:text-[#7a7a7a]";
const textarea = "mt-1 w-full rounded-lg border border-[#4a4a4a] bg-[#1a1a1a] px-3 py-2 text-sm text-white placeholder:text-[#7a7a7a]";
const alertBox = "mb-3 rounded-lg bg-[#3a1212] px-3 py-2 text-sm font-medium text-[#fecaca]";
const day = (value: string) => new Date(value.replace(" ", "T"));
const shortDate = (value: string) => day(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const plainDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("es-AR");

const requestTone: Record<AfterSalesRequest["status"], string> = {
  RECEIVED: "bg-[#3a2a00] text-[#FFD83D]",
  ACCEPTED: "bg-[#10263f] text-[#93c5fd]",
  RESOLVED: "bg-[#123024] text-[#86efac]",
  REJECTED: "bg-[#3a1212] text-[#fecaca]",
};

export function AfterSalesDesk() {
  const [tab, setTab] = useState<"solicitudes" | "garantias">("solicitudes");
  const [requests, setRequests] = useState<AfterSalesRequest[] | null>(null);
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({});
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [claimStatuses, setClaimStatuses] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void fetchAfterSales().then((result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRequests(result.data.requests);
      setRequestStatuses(result.data.requestStatuses);
      setWarranties(result.data.warranties);
      setClaimStatuses(result.data.claimStatuses);
    });
  }, []);

  const changeRequest = async (request: AfterSalesRequest, status: AfterSalesRequest["status"]) => {
    const note = window.prompt(`Nota para el registro de ${request.code} (opcional). Por ejemplo: reintegro hecho por transferencia.`, request.note ?? "");
    if (note === null) return;
    setError("");
    const result = await setRequestStatus(request.id, status, note);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRequests(result.data);
    setNotice(`Solicitud ${request.code}: ${requestStatuses[status]}. Quedó en el historial del pedido ${request.number}.`);
  };

  const newClaim = async (warranty: Warranty) => {
    const issue = window.prompt(`¿Qué falla tiene el equipo de la garantía ${warranty.number}?`);
    if (!issue?.trim()) return;
    setError("");
    const result = await openClaim(warranty.id, issue);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setWarranties(result.data);
    setNotice(`Reclamo ingresado para la garantía ${warranty.number}.`);
  };

  const saveClaim = async (claim: WarrantyClaim) => {
    setError("");
    const result = await updateClaim(claim);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setWarranties(result.data);
    setNotice(`Reclamo ${claim.number}: ${claimStatuses[claim.status]}.`);
  };

  const open = (requests ?? []).filter((item) => item.status === "RECEIVED" || item.status === "ACCEPTED").length;
  const term = search.trim().toLowerCase();
  const visibleWarranties = warranties.filter((item) => !term || [item.number, item.saleNumber, item.customer, item.imei ?? "", item.serial ?? ""].some((value) => value.toLowerCase().includes(term)));

  return (
    <Screen
      title="Postventa"
      crumb="Arrepentimientos, cancelaciones y reclamos de garantía. Cada cambio queda en el historial del pedido."
      notice={notice}
    >
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {([["solicitudes", `Solicitudes${open ? ` (${open} abiertas)` : ""}`], ["garantias", `Garantías (${warranties.length})`]] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-lg px-3 py-1.5 ${tab === id ? "bg-[#3a2a00] font-semibold text-[#FFD83D]" : "text-[#d4d4d4]"}`}>{label}</button>
        ))}
      </div>
      {error ? <p role="alert" className={alertBox}>{error}</p> : null}
      {requests === null && !error ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Cargando...</p> : null}

      {tab === "solicitudes" && requests ? (
        <div className="overflow-x-auto">
          <table className="admin-table w-full min-w-[900px] text-left text-sm">
            <thead className="text-xs text-[#A7A7A7]">
              <tr><th className="py-2 font-medium">Código</th><th className="font-medium">Pedido</th><th className="font-medium">Cliente</th><th className="font-medium">Motivo</th><th className="font-medium">Estado</th></tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const from = request.deliveredAt && day(request.deliveredAt) > day(request.soldAt) ? request.deliveredAt : request.soldAt;
                const days = Math.floor((day(request.date).getTime() - day(from).getTime()) / 86_400_000);
                return (
                  <tr key={request.id} className="border-t border-[#4a4a4a] align-top">
                    <td className="py-3">
                      <span className="font-bold">{request.code}</span>
                      <span className="block text-xs text-[#A7A7A7]">{request.typeLabel}</span>
                      <span className="block text-xs text-[#A7A7A7]">{shortDate(request.date)}</span>
                    </td>
                    <td className="py-3">
                      {request.number}
                      <span className="block text-xs text-[#A7A7A7]">{request.saleStatus}</span>
                      {request.type === "ARREPENTIMIENTO" ? (
                        <span className={`block text-xs font-semibold ${days > 10 ? "text-[#fecaca]" : "text-[#86efac]"}`}>
                          Pedido a los {days} días de la {request.deliveredAt ? "entrega" : "compra"}{days > 10 ? " (más de 10)" : ""}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3">
                      {request.customer}
                      <span className="block text-xs text-[#A7A7A7]">{request.email}</span>
                      {request.phone ? <a className="block text-xs text-brand underline" href={`https://wa.me/${request.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{request.phone}</a> : null}
                    </td>
                    <td className="max-w-[260px] py-3 text-[#d4d4d4]">
                      {request.reason || <span className="text-[#A7A7A7]">Sin comentario</span>}
                      {request.note ? <span className="mt-1 block text-xs text-[#A7A7A7]">Nota: {request.note}</span> : null}
                    </td>
                    <td className="py-3">
                      <select value={request.status} onChange={(event) => void changeRequest(request, event.target.value as AfterSalesRequest["status"])} aria-label={`Estado de ${request.code}`} className={`h-8 rounded-lg border-0 px-2 text-xs font-semibold ${requestTone[request.status]}`}>
                        {Object.entries(requestStatuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {requests.length === 0 ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Todavía no hay solicitudes.</p> : null}
        </div>
      ) : null}

      {tab === "garantias" && requests ? (
        <>
          <p className="text-sm text-[#d4d4d4]">Las garantías se abren al cargar el IMEI de un equipo vendido, desde Ventas: 6 meses si es nuevo y 3 si es usado. Al cerrar un reclamo, los días que el equipo estuvo en el local se suman al plazo.</p>
          <label className="mt-3 block max-w-sm text-xs font-semibold text-[#d4d4d4]">Buscar por IMEI, garantía, pedido o cliente
            <input value={search} onChange={(event) => setSearch(event.target.value)} className={input} />
          </label>
          <div className="mt-4 space-y-3">
            {visibleWarranties.map((warranty) => (
              <article key={warranty.id} className="rounded-xl border border-[#4a4a4a] bg-[#242424] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{warranty.number} · {warranty.product ?? "Producto"}</p>
                    <p className="text-xs text-[#A7A7A7]">IMEI {warranty.imei ?? "-"}{warranty.serial ? ` · Serie ${warranty.serial}` : ""} · Pedido {warranty.saleNumber} · {warranty.customer} · {warranty.phone}</p>
                    <p className="text-xs text-[#A7A7A7]">Del {plainDate(warranty.start)} al {plainDate(warranty.end)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${warranty.claimed ? "bg-[#3a2a00] text-[#FFD83D]" : warranty.expired ? "bg-[#3a1212] text-[#fecaca]" : "bg-[#123024] text-[#86efac]"}`}>
                      {warranty.claimed ? "Con reclamo abierto" : warranty.expired ? "Vencida" : "Vigente"}
                    </span>
                    {!warranty.claimed ? <button type="button" onClick={() => void newClaim(warranty)} className="rounded-md bg-[#3a2a00] px-2 py-1 text-xs font-semibold text-[#FFD83D]">Abrir reclamo</button> : null}
                  </div>
                </div>
                {warranty.claims.map((claim) => <ClaimRow key={`${claim.id}-${claim.status}`} claim={claim} statuses={claimStatuses} onSave={saveClaim} />)}
              </article>
            ))}
            {visibleWarranties.length === 0 ? <p className="py-6 text-center text-sm text-[#d4d4d4]">{warranties.length === 0 ? "Todavía no hay garantías. Se crean al cargar el IMEI en Ventas." : "No hay garantías con esa búsqueda."}</p> : null}
          </div>
        </>
      ) : null}
    </Screen>
  );
}

function ClaimRow({ claim, statuses, onSave }: { claim: WarrantyClaim; statuses: Record<string, string>; onSave: (claim: WarrantyClaim) => Promise<void> }) {
  const [draft, setDraft] = useState(claim);
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    await onSave(draft);
    setSaving(false);
  };
  return (
    <form onSubmit={(event) => void submit(event)} className="mt-3 grid gap-3 rounded-lg border border-[#4a4a4a] bg-[#1f1f1f] p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
      <div className="text-sm md:col-span-4">
        <span className="font-semibold">{claim.number}</span> <span className="text-xs text-[#A7A7A7]">ingresó el {shortDate(claim.receivedAt)}{claim.resolvedAt ? `, resuelto el ${shortDate(claim.resolvedAt)}` : ""}</span>
        <p className="mt-1 text-[#d4d4d4]">{claim.issue}</p>
      </div>
      <label className="text-xs font-semibold text-[#d4d4d4]">Estado
        <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className={input}>
          {Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <label className="text-xs font-semibold text-[#d4d4d4]">Diagnóstico
        <input value={draft.diagnosis} onChange={(event) => setDraft({ ...draft, diagnosis: event.target.value })} className={input} />
      </label>
      <label className="text-xs font-semibold text-[#d4d4d4]">Resolución
        <input value={draft.resolution} onChange={(event) => setDraft({ ...draft, resolution: event.target.value })} className={input} />
      </label>
      <div className="flex items-end">
        <button disabled={saving} className="h-10 rounded-lg bg-brand px-4 text-sm font-semibold disabled:opacity-60">{saving ? "Guardando..." : "Guardar"}</button>
      </div>
    </form>
  );
}

const emptyLegal: LegalSettings = { legal_name: "", legal_cuit: "", legal_tax_status: "", vat_rate: "", installments_rate: "", installments_cftea: "", warranty_extra: "", exchange_policy: "" };

export function LegalDesk() {
  const [form, setForm] = useState<LegalSettings | null>(null);
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSettings().then((settings) => {
      if (!settings) {
        setError("No pudimos leer los datos guardados.");
        return;
      }
      setForm(Object.fromEntries(Object.keys(emptyLegal).map((key) => [key, settings[key as keyof LegalSettings] ?? ""])) as LegalSettings);
    });
    void fetchAudit().then((result) => {
      if (result.ok) setEntries(result.data);
      else setError(result.error);
    });
  }, []);

  const update = (key: keyof LegalSettings, value: string) => setForm((current) => (current ? { ...current, [key]: value } : current));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    const result = await saveLegalSettings(form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice("Guardado. La tienda lo muestra la próxima vez que se abre o se recarga.");
    void fetchAudit().then((audit) => audit.ok && setEntries(audit.data));
  };

  const pending = form
    ? [
        !form.legal_name && "Titular o razón social",
        !form.legal_cuit && "CUIT",
        !form.legal_tax_status && "Condición frente al IVA",
        form.legal_tax_status === "Responsable Inscripto" && !form.vat_rate && "IVA incluido en los precios",
        !form.installments_cftea && "CFTEA de las cuotas (las cuotas se muestran igual; este dato figura al lado cuando lo cargás)",
      ].filter((item): item is string => Boolean(item))
    : [];

  return (
    <Screen title="Legal y auditoría" crumb="Datos que aparecen en los Términos, la Política de privacidad, el pie de página y la ficha de cada producto." notice={notice}>
      {error ? <p role="alert" className={alertBox}>{error}</p> : null}
      {!form && !error ? <p className="text-sm text-[#A7A7A7]">Cargando...</p> : null}
      {form ? (
        <form onSubmit={(event) => void submit(event)}>
          {pending.length > 0 ? (
            <div className="mb-4 rounded-lg border border-[#5a4500] bg-[#2a2100] p-3 text-sm text-[#FFD83D]">
              <p className="font-semibold">Falta cargar antes de publicar</p>
              <ul className="mt-1 list-disc pl-5">{pending.map((item) => <li key={item}>{item}</li>)}</ul>
              <p className="mt-2 text-xs text-[#d4d4d4]">Mientras falten, las páginas legales muestran "dato pendiente de carga". Conviene que un abogado o contador revise los textos antes de publicar.</p>
            </div>
          ) : null}
          <h3 className="font-bold">Quién vende</h3>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-[#d4d4d4]">Titular o razón social<input value={form.legal_name} onChange={(event) => update("legal_name", event.target.value)} className={input} /></label>
            <label className="text-xs font-semibold text-[#d4d4d4]">CUIT<input value={form.legal_cuit} onChange={(event) => update("legal_cuit", event.target.value)} placeholder="20-12345678-9" className={input} /></label>
            <label className="text-xs font-semibold text-[#d4d4d4]">Condición frente al IVA
              <select value={form.legal_tax_status} onChange={(event) => update("legal_tax_status", event.target.value)} className={input}>
                <option value="">Sin cargar</option>
                <option>Monotributo</option>
                <option>Responsable Inscripto</option>
                <option>Exento</option>
              </select>
            </label>
            {form.legal_tax_status === "Responsable Inscripto" ? (
              <label className="text-xs font-semibold text-[#d4d4d4]">IVA incluido en los precios (%)<input value={form.vat_rate} onChange={(event) => update("vat_rate", event.target.value)} inputMode="decimal" placeholder="Lo confirma tu contador" className={input} />
                <span className="mt-1 block font-normal text-[#A7A7A7]">Con este dato se muestra el "precio sin impuestos nacionales".</span>
              </label>
            ) : null}
          </div>

          <h3 className="mt-6 font-bold">Cuotas con tarjeta</h3>
          <p className="mt-1 text-sm text-[#d4d4d4]">Con el recargo cargado, la tienda ofrece 12 cuotas. El CFTEA lo informa tu procesador de pagos: si lo completás, aparece junto a la cuota.</p>
          <div className="mt-2 grid gap-3 md:grid-cols-3">
            <label className="text-xs font-semibold text-[#d4d4d4]">Recargo total de las cuotas (%)<input value={form.installments_rate} onChange={(event) => update("installments_rate", event.target.value)} inputMode="decimal" className={input} /></label>
            <label className="text-xs font-semibold text-[#d4d4d4]">CFTEA (%)<input value={form.installments_cftea} onChange={(event) => update("installments_cftea", event.target.value)} inputMode="decimal" placeholder="Opcional" className={input} /></label>
          </div>

          <h3 className="mt-6 font-bold">Garantía y cambios</h3>
          <p className="mt-1 text-sm text-[#d4d4d4]">La garantía legal (6 meses nuevos, 3 usados) ya se muestra siempre. Completá esto solo si ofrecés algo más.</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <label className="text-xs font-semibold text-[#d4d4d4]">Garantía adicional (opcional)
              <textarea value={form.warranty_extra} onChange={(event) => update("warranty_extra", event.target.value)} rows={3} placeholder="Vacío: no se menciona" className={textarea} />
            </label>
            <label className="text-xs font-semibold text-[#d4d4d4]">Política de cambios comerciales (opcional)
              <textarea value={form.exchange_policy} onChange={(event) => update("exchange_policy", event.target.value)} rows={3} placeholder="Vacío: la tienda no ofrece cambios comerciales" className={textarea} />
            </label>
          </div>
          <div className="mt-4 flex justify-end">
            <button disabled={saving} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold disabled:opacity-60">{saving ? "Guardando..." : "Guardar datos legales"}</button>
          </div>
        </form>
      ) : null}

      <h3 className="mt-8 font-bold">Registro de actividad</h3>
      <p className="text-xs text-[#A7A7A7]">Cada cambio hecho desde el panel: quién, qué y cuándo. No se puede editar ni borrar desde acá.</p>
      <div className="mt-2 overflow-x-auto">
        <table className="admin-table w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs text-[#A7A7A7]"><tr><th className="py-2 font-medium">Fecha</th><th className="font-medium">Usuario</th><th className="font-medium">Acción</th><th className="font-medium">Detalle</th><th className="font-medium">IP</th></tr></thead>
          <tbody>
            {(entries ?? []).map((entry) => (
              <tr key={entry.id} className="border-t border-[#4a4a4a] align-top">
                <td className="whitespace-nowrap py-2 pr-3">{shortDate(entry.date)}</td>
                <td className="pr-3">{entry.user}</td>
                <td className="pr-3">{entry.action}<span className="block text-xs text-[#A7A7A7]">{entry.entity}{entry.entityId ? ` #${entry.entityId}` : ""}</span></td>
                <td className="max-w-[320px] break-words pr-3 font-mono text-xs text-[#d4d4d4]">{entry.detail}</td>
                <td className="text-xs text-[#A7A7A7]">{entry.ip ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries !== null && entries.length === 0 ? <p className="py-6 text-center text-sm text-[#d4d4d4]">Todavía no hay cambios registrados.</p> : null}
      </div>
    </Screen>
  );
}
