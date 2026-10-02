import { useState, type FormEvent, type ReactNode } from "react";
import { CASH_OFF, financing, formatPrice, INSTALLMENTS, type View } from "../data";
import { lookupOrder, sendRequest, type OrderReceipt, type PlacedRequest, type RequestType, type StoreSettings } from "../lib/api";
import { consumerDefenseUrl, deliveryText, lastOrder, LEGAL_DATE } from "../lib/legal";
import { email, fullAddress, hours, phone, shiftsText, whatsapp } from "../lib/store";

type Doc = "terminos" | "privacidad" | "cookies" | "garantias";

const titles: Record<Doc | "arrepentimiento" | "pedido", string> = {
  terminos: "Términos y condiciones",
  privacidad: "Política de privacidad",
  cookies: "Política de cookies",
  garantias: "Garantías, cambios y devoluciones",
  arrepentimiento: "Botón de arrepentimiento",
  pedido: "Seguí tu pedido",
};

const dateTime = (value: string) => new Date(value.replace(" ", "T")).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

function Pending() {
  return <em className="text-muted">dato pendiente de carga</em>;
}

function Shell({ title, onNavigate, children, intro }: { title: string; onNavigate: (view: View) => void; children: ReactNode; intro?: ReactNode }) {
  return (
    <main className="mx-auto max-w-[860px] px-4 pb-16 pt-8">
      <p className="text-sm text-muted">
        <button type="button" className="hover:text-ink hover:underline" onClick={() => onNavigate("home")}>Inicio</button><span aria-hidden="true"> / </span><span className="text-ink">{title}</span>
      </p>
      <h1 className="display mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
      {intro}
      <div className="mt-6 space-y-5">{children}</div>
    </main>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: ReactNode }) {
  return (
    <section id={id} className="rounded-[28px] border border-line bg-white p-6 sm:p-7">
      <h2 className="display text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted [&_strong]:text-ink">{children}</div>
    </section>
  );
}

function Identity({ settings }: { settings: StoreSettings | null }) {
  return (
    <dl className="grid gap-1.5 text-sm sm:grid-cols-[180px_1fr]">
      <dt className="font-medium text-ink">Titular o razón social</dt><dd>{settings?.legal_name || <Pending />}</dd>
      <dt className="font-medium text-ink">CUIT</dt><dd>{settings?.legal_cuit || <Pending />}</dd>
      <dt className="font-medium text-ink">Condición frente al IVA</dt><dd>{settings?.legal_tax_status || <Pending />}</dd>
      <dt className="font-medium text-ink">Nombre comercial</dt><dd>wicel</dd>
      <dt className="font-medium text-ink">Domicilio</dt><dd>{fullAddress}</dd>
      <dt className="font-medium text-ink">Contacto</dt><dd>WhatsApp {phone} · {email}</dd>
    </dl>
  );
}

function Version() {
  return <p className="mt-2 text-sm text-muted">Versión vigente desde el {LEGAL_DATE}.</p>;
}

function NavLink({ to, onNavigate, children }: { to: View; onNavigate: (view: View) => void; children: ReactNode }) {
  return <button type="button" onClick={() => onNavigate(to)} className="font-semibold text-ink underline underline-offset-2">{children}</button>;
}

export function LegalPage({ doc, settings, onNavigate }: { doc: Doc; settings: StoreSettings | null; onNavigate: (view: View) => void }) {
  const points = Math.max(1, Number(settings?.points_per_currency ?? 1) || 1);
  const off = Math.round(CASH_OFF * 100);

  if (doc === "terminos") {
    return (
      <Shell title={titles.terminos} onNavigate={onNavigate} intro={<Version />}>
        <Section title="Quién vende">
          <Identity settings={settings} />
        </Section>
        <Section title="Aceptación">
          <p>Para comprar tenés que aceptar estos términos y la <NavLink to="privacidad" onNavigate={onNavigate}>Política de privacidad</NavLink> marcando la casilla del último paso de la compra. La casilla nunca viene marcada.</p>
          <p>Guardamos junto con tu pedido la versión que aceptaste, la fecha y la hora. Si después cambiamos estos términos, tu pedido sigue rigiéndose por la versión que aceptaste.</p>
        </Section>
        <Section title="Precios y stock">
          <p>Los precios están en pesos argentinos y son precios finales. El precio de lista es el de tarjeta en 1 pago. Pagando en efectivo en el local o por transferencia tenés {off}% de descuento.</p>
          {financing.on
            ? <p>Con tarjeta también podés pagar en {INSTALLMENTS} cuotas con un recargo total del {Math.round(financing.rate * 1000) / 10}% sobre el precio de lista. Costo financiero total efectivo anual (CFTEA): <strong>{financing.cftea}%</strong>.</p>
            : <p>Por ahora no ofrecemos pago en cuotas por la web.</p>}
          <p>El stock que ves es el real del local. Si al confirmar un producto se quedó sin stock, te avisamos y el pedido no se registra.</p>
        </Section>
        <Section title="Cómo se hace un pedido">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Agregás los productos al carrito.</li>
            <li>Completás tus datos y elegís retiro en el local o envío a domicilio.</li>
            <li>Elegís la forma de pago.</li>
            <li>Revisás el resumen final con el total.</li>
            <li>Aceptás estos términos y confirmás.</li>
          </ol>
          <p>Al confirmar te mostramos el número de pedido. Con ese número y tu email podés ver el comprobante en <NavLink to="pedido" onNavigate={onNavigate}>Seguí tu pedido</NavLink>. El pedido queda pendiente hasta que se acredita el pago; te escribimos por WhatsApp para coordinar el pago y la entrega.</p>
        </Section>
        <Section title="Formas de pago">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Transferencia:</strong> te mostramos los datos al confirmar o te los pasamos por WhatsApp.</li>
            <li><strong>Efectivo:</strong> solo retirando en el local.</li>
            <li><strong>Tarjeta:</strong> te mandamos un link de pago por WhatsApp. En este sitio no pedimos ni guardamos datos de tarjetas.</li>
          </ul>
        </Section>
        <Section title="Entrega">
          <p>{deliveryText} Si el costo del envío no te sirve, podés cancelar el pedido antes de pagar.</p>
          <p>Horario del local: {hours.map((row) => `${row.label.toLowerCase()}: ${shiftsText(row.shifts).toLowerCase()}`).join("; ")}.</p>
        </Section>
        <Section title="Derecho de arrepentimiento">
          <p>Tenés <strong>10 días corridos</strong> para arrepentirte de la compra, contados desde que recibiste el producto o desde la compra, lo que ocurra último (Ley 24.240, art. 34, y Código Civil y Comercial, art. 1110). No tenés que explicar el motivo y no tiene costo ni penalidad.</p>
          <p>Hacelo desde el <NavLink to="arrepentimiento" onNavigate={onNavigate}>BOTÓN DE ARREPENTIMIENTO</NavLink>, sin registrarte. Te damos un código de trámite en el momento. Los gastos de devolución corren por nuestra cuenta y te reintegramos lo que pagaste por el mismo medio de pago.</p>
        </Section>
        <Section title="Garantía, cambios y cancelaciones">
          <p>Los equipos nuevos tienen 6 meses de garantía legal y los usados 3 meses (Ley 24.240, art. 11). Todo el detalle y el formulario están en <NavLink to="garantias" onNavigate={onNavigate}>Garantías, cambios y devoluciones</NavLink>.</p>
          <p>Mientras el pedido esté pendiente podés pedir que lo cancelemos desde esa misma página o por WhatsApp.</p>
        </Section>
        <Section title="Puntos">
          <p>Si comprás con tu cuenta, sumás {points === 1 ? "1 punto" : `${points} puntos`} por cada $1.000. Los puntos se acreditan cuando se confirma el pago y se descuentan si el pedido se cancela. Se canjean en la sección Canjes.</p>
        </Section>
        <Section title="Consultas y reclamos">
          <p>Escribinos por <a className="font-semibold text-ink underline" href={whatsapp("Hola wicel, tengo un reclamo sobre mi pedido.")} target="_blank" rel="noreferrer">WhatsApp</a> o a <a className="font-semibold text-ink underline" href={`mailto:${email}`}>{email}</a>. También podés hacer un reclamo ante <a className="font-semibold text-ink underline" href={consumerDefenseUrl} target="_blank" rel="noreferrer">Defensa de las y los consumidores</a>.</p>
        </Section>
      </Shell>
    );
  }

  if (doc === "privacidad") {
    return (
      <Shell title={titles.privacidad} onNavigate={onNavigate} intro={<Version />}>
        <Section title="Responsable de tus datos">
          <Identity settings={settings} />
        </Section>
        <Section title="Qué datos guardamos">
          <ul className="list-disc space-y-1 pl-5">
            <li><strong>Cuenta:</strong> nombre, email y contraseña (guardada cifrada, nadie puede leerla).</li>
            <li><strong>Pedidos:</strong> nombre, apellido, email, WhatsApp, dirección si elegís envío, productos, forma de pago y la versión de los términos que aceptaste.</li>
            <li><strong>Garantía:</strong> el IMEI o número de serie del equipo que compraste, para identificar su garantía.</li>
            <li><strong>Consultas y solicitudes:</strong> lo que nos escribís en el formulario de contacto o en las solicitudes de arrepentimiento, garantía o cancelación.</li>
            <li><strong>Datos técnicos:</strong> la dirección IP desde la que aceptás los términos o enviás una solicitud, como constancia.</li>
            <li><strong>Puntos y canjes</strong> de tu cuenta.</li>
          </ul>
          <p>No guardamos datos de tarjetas.</p>
        </Section>
        <Section title="Para qué los usamos">
          <p>Para preparar, cobrar y entregar tus pedidos, atender garantías, arrepentimientos y reclamos, llevar tus puntos, responder tus consultas y cumplir obligaciones legales y fiscales.</p>
          <p>Solo te mandamos promociones si nos das permiso aparte, con la casilla opcional del checkout. Ese permiso se guarda con la fecha y lo podés retirar cuando quieras escribiéndonos.</p>
        </Section>
        <Section title="Con quién los compartimos">
          <p>No vendemos ni cedemos tus datos. Solo los compartimos cuando hace falta para tu pedido: si pagás con tarjeta, la empresa del link de pago recibe lo que cargues ahí; si elegís envío, le pasamos al transporte tu nombre, teléfono y dirección. También los entregamos si una autoridad competente lo exige.</p>
        </Section>
        <Section title="Cuánto tiempo los guardamos">
          <p>Mientras tengas tu cuenta o mientras hagan falta para el pedido, su garantía y sus reclamos, y durante el tiempo que exijan las normas contables y fiscales.</p>
        </Section>
        <Section title="Cómo los cuidamos">
          <p>Las contraseñas se guardan cifradas, la sesión usa una cookie que no puede leer ningún script y solo el dueño del local accede al panel con los datos de los pedidos.</p>
        </Section>
        <Section title="Tus derechos">
          <p>Podés pedir acceder a tus datos, corregirlos, actualizarlos o borrarlos escribiendo a <a className="font-semibold text-ink underline" href={`mailto:${email}`}>{email}</a> o por WhatsApp al {phone} (Ley 25.326, arts. 14 a 16). Respondemos el pedido de acceso dentro de los 10 días corridos y las correcciones o bajas dentro de los 5 días hábiles.</p>
          <p>El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita a intervalos no inferiores a seis meses, salvo que se acredite un interés legítimo al efecto conforme lo establecido en el artículo 14, inciso 3 de la Ley N° 25.326. La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.</p>
        </Section>
        <Section title="Cookies">
          <p>Lo que guardamos en tu navegador está explicado en la <NavLink to="cookies" onNavigate={onNavigate}>Política de cookies</NavLink>.</p>
        </Section>
      </Shell>
    );
  }

  if (doc === "cookies") {
    return (
      <Shell title={titles.cookies} onNavigate={onNavigate} intro={<Version />}>
        <Section title="Qué guardamos en tu navegador">
          <p>Solo lo necesario para que la tienda funcione. No usamos cookies de publicidad ni de analítica.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-ink"><tr><th className="py-2 pr-3 font-semibold">Nombre</th><th className="pr-3 font-semibold">Para qué sirve</th><th className="font-semibold">Cuánto dura</th></tr></thead>
              <tbody>
                <tr className="border-t border-line"><td className="py-2 pr-3 font-mono text-xs">wicel_sesion</td><td className="pr-3">Cookie que mantiene tu sesión iniciada.</td><td>Hasta que cerrás el navegador o la sesión.</td></tr>
                <tr className="border-t border-line"><td className="py-2 pr-3 font-mono text-xs">wicel-carrito</td><td className="pr-3">Guarda los productos de tu carrito.</td><td>Hasta que comprás o lo vaciás.</td></tr>
                <tr className="border-t border-line"><td className="py-2 pr-3 font-mono text-xs">wicel-recordar-email</td><td className="pr-3">Recuerda tu email si marcaste "Recordarme" al ingresar.</td><td>Hasta que lo desmarcás.</td></tr>
                <tr className="border-t border-line"><td className="py-2 pr-3 font-mono text-xs">wicel-ultimo-pedido</td><td className="pr-3">Completa los datos de tu último pedido en Seguí tu pedido.</td><td>Hasta que cerrás la pestaña.</td></tr>
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Mapa de Google">
          <p>En la página de Contacto mostramos un mapa de Google Maps con la ubicación del local. Al cargarlo, Google puede usar sus propias cookies según su política de privacidad.</p>
        </Section>
        <Section title="Cómo borrarlas">
          <p>Podés borrar las cookies y los datos del sitio desde la configuración de tu navegador. Si lo hacés, se cierra tu sesión y se vacía el carrito.</p>
        </Section>
      </Shell>
    );
  }

  return (
    <Shell title={titles.garantias} onNavigate={onNavigate} intro={<Version />}>
      <Section title="Garantía legal">
        <p>Los equipos <strong>nuevos tienen 6 meses</strong> de garantía y los <strong>usados 3 meses</strong>, contados desde la entrega (Ley 24.240, art. 11). Cubre los defectos y fallas de funcionamiento del equipo.</p>
        <p>Registramos el IMEI del equipo junto con tu compra para identificar su garantía. El tiempo que el equipo esté en reparación se suma al plazo de la garantía (art. 16). Si la reparación no queda bien, podés pedir el cambio por otro equipo igual, la devolución de lo pagado o una quita en el precio (art. 17).</p>
        {settings?.warranty_extra ? <p><strong>Garantía adicional:</strong> {settings.warranty_extra}</p> : null}
      </Section>
      <Section title="Arrepentimiento (10 días)">
        <p>Si te arrepentiste de una compra hecha por la web, tenés 10 días corridos desde que recibiste el producto o desde la compra, lo que ocurra último. No tenés que explicar el motivo. Hacelo desde el <NavLink to="arrepentimiento" onNavigate={onNavigate}>BOTÓN DE ARREPENTIMIENTO</NavLink>.</p>
      </Section>
      <Section title="Cancelación de un pedido">
        <p>Mientras el pedido esté pendiente de pago podés pedir que lo cancelemos con el formulario de abajo o por WhatsApp. Si ya pagaste, te reintegramos lo pagado por el mismo medio.</p>
      </Section>
      {settings?.exchange_policy ? (
        <Section title="Cambios comerciales">
          <p className="whitespace-pre-line">{settings.exchange_policy}</p>
        </Section>
      ) : null}
      <Section title="Hacer una solicitud" id="solicitud">
        <p>Elegí qué necesitás. Te damos un código de trámite y te escribimos por WhatsApp o email.</p>
        <RequestForm types={settings?.exchange_policy ? ["GARANTIA", "CANCELACION", "CAMBIO"] : ["GARANTIA", "CANCELACION"]} onNavigate={onNavigate} />
      </Section>
    </Shell>
  );
}

const typeLabels: Record<RequestType, string> = {
  ARREPENTIMIENTO: "Me arrepiento de la compra",
  GARANTIA: "El equipo tiene una falla (garantía)",
  CANCELACION: "Quiero cancelar mi pedido",
  CAMBIO: "Quiero hacer un cambio",
};

function RequestForm({ types, onNavigate }: { types: RequestType[]; onNavigate: (view: View) => void }) {
  const saved = lastOrder();
  const [type, setType] = useState<RequestType>(types[0]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<PlacedRequest | null>(null);
  const regret = type === "ARREPENTIMIENTO";

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    if (!value("numero") || !value("email")) {
      setError("Escribí el número de pedido y el email con el que compraste.");
      return;
    }
    if (type === "GARANTIA" && !value("motivo")) {
      setError("Contanos qué falla tiene el equipo.");
      return;
    }
    setError("");
    setSending(true);
    const result = await sendRequest({ type, number: value("numero"), email: value("email"), phone: value("telefono"), reason: value("motivo") });
    setSending(false);
    if (result.ok) setDone(result.data);
    else setError(result.error);
  };

  if (done) {
    return (
      <div role="status" className="rounded-2xl border border-ok/30 bg-ok-soft p-5 text-ink">
        <p className="text-sm font-semibold text-ok">{done.existing ? "Ya tenías una solicitud abierta para este pedido" : "Recibimos tu solicitud"}</p>
        <p className="mt-1 text-sm">{done.type} · Pedido {done.number}</p>
        <p className="price display mt-3 text-3xl font-bold">{done.code}</p>
        <p className="mt-1 text-sm">Código de trámite registrado el {dateTime(done.date)}</p>
        <p className="mt-1 text-sm">Guardalo: lo vas a necesitar para cualquier consulta.</p>
        <p className="mt-3 text-sm">Te escribimos por WhatsApp o email para coordinar los próximos pasos. El estado lo ves en <NavLink to="pedido" onNavigate={onNavigate}>Seguí tu pedido</NavLink>.</p>
      </div>
    );
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void submit(event)} noValidate>
      {types.length > 1 ? (
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-ink">¿Qué necesitás?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {types.map((item) => (
              <label key={item} className={`cursor-pointer rounded-xl border px-4 py-3 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink ${type === item ? "border-ink bg-brand-soft text-ink" : "border-line text-muted hover:border-[#c9c9c4]"}`}>
                <input type="radio" name="tipo" value={item} checked={type === item} onChange={() => setType(item)} className="sr-only" />
                {typeLabels[item]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <label className="text-sm font-medium text-ink" htmlFor={`numero-${type}`}>Número de pedido
        <input id={`numero-${type}`} name="numero" defaultValue={saved.number} placeholder="WI-00012" autoComplete="off" className="field" />
      </label>
      <label className="text-sm font-medium text-ink" htmlFor={`email-${type}`}>Email con el que compraste
        <input id={`email-${type}`} name="email" type="email" defaultValue={saved.email} placeholder="tu@email.com" autoComplete="email" className="field" />
      </label>
      <label className="text-sm font-medium text-ink" htmlFor={`telefono-${type}`}>WhatsApp (opcional)
        <input id={`telefono-${type}`} name="telefono" type="tel" placeholder="351 000-0000" autoComplete="tel" className="field" />
      </label>
      <label className="text-sm font-medium text-ink sm:col-span-2" htmlFor={`motivo-${type}`}>{type === "GARANTIA" ? "¿Qué falla tiene el equipo?" : "Comentario (opcional)"}
        <textarea id={`motivo-${type}`} name="motivo" rows={3} placeholder={regret ? "No hace falta que expliques el motivo." : type === "GARANTIA" ? "Por ejemplo: no carga, se reinicia solo." : ""} className="field py-2" />
      </label>
      {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-medium text-bad sm:col-span-2">{error}</p> : null}
      <div className="sm:col-span-2">
        <button disabled={sending} className="h-12 rounded-full bg-ink px-7 text-sm font-semibold text-white hover:bg-black disabled:cursor-wait disabled:opacity-60">
          {sending ? "Enviando..." : regret ? "Arrepentirme de la compra" : "Enviar solicitud"}
        </button>
      </div>
      <p className="text-xs text-muted sm:col-span-2">¿No tenés el número de pedido? Escribinos por <a className="font-semibold text-ink underline" href={whatsapp("Hola wicel, necesito ayuda con una compra y no tengo el número de pedido.")} target="_blank" rel="noreferrer">WhatsApp</a> o a {email}.</p>
    </form>
  );
}

export function RegretPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  return (
    <Shell
      title={titles.arrepentimiento}
      onNavigate={onNavigate}
      intro={<p className="mt-2 max-w-2xl leading-relaxed text-muted">Si compraste por la web, tenés 10 días corridos desde que recibiste el producto o desde la compra para arrepentirte, sin explicar el motivo y sin costo (Ley 24.240, art. 34). No necesitás cuenta.</p>}
    >
      <Section title="Pedí la revocación de tu compra">
        <RequestForm types={["ARREPENTIMIENTO"]} onNavigate={onNavigate} />
      </Section>
      <Section title="Qué pasa después">
        <ol className="list-decimal space-y-1 pl-5">
          <li>Te damos un código de trámite en el momento.</li>
          <li>Te escribimos para coordinar la devolución del producto. Los gastos de devolución corren por nuestra cuenta.</li>
          <li>Te reintegramos lo que pagaste por el mismo medio de pago.</li>
        </ol>
        <p>Más información en los <NavLink to="terminos" onNavigate={onNavigate}>Términos y condiciones</NavLink>.</p>
      </Section>
    </Shell>
  );
}

export function OrderPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const saved = lastOrder();
  const [order, setOrder] = useState<OrderReceipt | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const number = String(data.get("numero") ?? "").trim();
    const mail = String(data.get("email") ?? "").trim();
    if (!number || !mail) {
      setError("Escribí el número de pedido y el email con el que compraste.");
      return;
    }
    setError("");
    setLoading(true);
    const result = await lookupOrder(number, mail);
    setLoading(false);
    if (result.ok) setOrder(result.data);
    else setError(result.error);
  };

  return (
    <Shell title={titles.pedido} onNavigate={onNavigate} intro={<p className="mt-2 text-muted">Mirá el comprobante y el estado de tu pedido con el número y el email que usaste al comprar.</p>}>
      <form className="grid gap-4 rounded-[28px] border border-line bg-white p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end print:hidden" onSubmit={(event) => void submit(event)} noValidate>
        <label className="text-sm font-medium text-ink" htmlFor="pedido-numero">Número de pedido
          <input id="pedido-numero" name="numero" defaultValue={saved.number} placeholder="WI-00012" autoComplete="off" className="field" />
        </label>
        <label className="text-sm font-medium text-ink" htmlFor="pedido-email">Email
          <input id="pedido-email" name="email" type="email" defaultValue={saved.email} placeholder="tu@email.com" autoComplete="email" className="field" />
        </label>
        <button disabled={loading} className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-black disabled:opacity-60">{loading ? "Buscando..." : "Ver pedido"}</button>
        {error ? <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-medium text-bad sm:col-span-3">{error}</p> : null}
      </form>
      {order ? <Receipt order={order} onNavigate={onNavigate} /> : null}
    </Shell>
  );
}

function Receipt({ order, onNavigate }: { order: OrderReceipt; onNavigate: (view: View) => void }) {
  const snapshot = order.snapshot;
  return (
    <article className="rounded-[28px] border border-line bg-white p-6 sm:p-8" aria-labelledby="comprobante-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Comprobante de pedido · no válido como factura</p>
          <h2 id="comprobante-titulo" className="display mt-1 text-2xl font-bold">Pedido {order.number}</h2>
          <p className="text-sm text-muted">{dateTime(order.date)} · {order.customer}</p>
        </div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-ink">{order.statusLabel}</span>
      </div>
      <table className="price mt-5 w-full text-left text-sm">
        <thead className="text-muted"><tr><th className="py-2 font-medium">Producto</th><th className="text-right font-medium">Cant.</th><th className="text-right font-medium">Precio</th><th className="text-right font-medium">Subtotal</th></tr></thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.name} className="border-t border-line"><td className="py-2 pr-2">{item.name}</td><td className="text-right">{item.qty}</td><td className="text-right">{formatPrice(item.unitPrice)}</td><td className="text-right">{formatPrice(item.subtotal)}</td></tr>
          ))}
        </tbody>
      </table>
      <dl className="price mt-4 grid gap-1.5 border-t border-line pt-4 text-sm">
        {snapshot ? <div className="flex justify-between"><dt className="text-muted">Precio de lista</dt><dd>{formatPrice(snapshot.listTotal)}</dd></div> : null}
        {snapshot && snapshot.adjustment !== 0 ? <div className="flex justify-between"><dt className="text-muted">{snapshot.adjustment < 0 ? "Descuento por forma de pago" : `Recargo por cuotas (${snapshot.financeRate}%)`}</dt><dd>{snapshot.adjustment < 0 ? "-" : "+"}{formatPrice(Math.abs(snapshot.adjustment))}</dd></div> : null}
        <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        <div className="flex justify-between gap-4"><dt className="text-muted">Pago</dt><dd className="text-right">{order.payment}</dd></div>
        {snapshot?.cftea ? <div className="flex justify-between"><dt className="text-muted">CFTEA</dt><dd className="font-semibold">{snapshot.cftea}%</dd></div> : null}
        <div className="flex justify-between gap-4"><dt className="text-muted">Entrega</dt><dd className="text-right">{order.delivery === "SHIPPING" ? `Envío a ${order.address}` : order.delivery === "PICKUP" ? `Retiro en ${fullAddress}` : order.address}</dd></div>
        {snapshot?.shipping ? <div className="flex justify-between gap-4"><dt className="text-muted">Envío</dt><dd className="text-right">{snapshot.shipping}</dd></div> : null}
        {order.termsVersion && order.termsAcceptedAt ? <div className="flex justify-between gap-4"><dt className="text-muted">Términos aceptados</dt><dd className="text-right">Versión {order.termsVersion}, el {dateTime(order.termsAcceptedAt)}</dd></div> : null}
      </dl>
      {order.events.length > 0 ? (
        <>
          <h3 className="mt-6 font-semibold">Historial</h3>
          <ol className="mt-2 space-y-1.5 border-l-2 border-line pl-4 text-sm">
            {order.events.map((event, index) => <li key={index}><span className="text-muted">{dateTime(event.date)}</span> · {event.detail}</li>)}
          </ol>
        </>
      ) : null}
      {order.requests.length > 0 ? (
        <>
          <h3 className="mt-6 font-semibold">Solicitudes</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {order.requests.map((request) => <li key={request.code}><span className="font-semibold">{request.code}</span> · {request.type} · {request.status} <span className="text-muted">({dateTime(request.date)})</span></li>)}
          </ul>
        </>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} className="h-11 rounded-full bg-ink px-6 text-sm font-semibold text-white hover:bg-black">Imprimir o guardar PDF</button>
        {order.status !== "CANCELLED" ? <button type="button" onClick={() => onNavigate("arrepentimiento")} className="h-11 rounded-full border border-ink/20 px-6 text-sm font-semibold hover:border-ink">Botón de arrepentimiento</button> : null}
        <button type="button" onClick={() => onNavigate("garantias")} className="h-11 rounded-full border border-ink/20 px-6 text-sm font-semibold hover:border-ink">Garantía o cancelación</button>
      </div>
    </article>
  );
}
