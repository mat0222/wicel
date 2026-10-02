import { useEffect, useState } from "react";
import { Icon, type IconName } from "../../components/Icon";
import { financing, INSTALLMENTS, type View } from "../../lib/data";
import { sendContact } from "../../lib/api";
import { address, city, directions, email, hours, instagram, instagramUser, mapQuery, phone, phoneHref, shiftsText, storeStatus, storeTime, whatsapp } from "../../lib/store";

export function ContactPage({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [now, setNow] = useState(storeTime);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(storeTime()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const status = storeStatus(now);
  const copyAddress = () => {
    void navigator.clipboard?.writeText(`${address}, ${city}`).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  const channels: { icon: IconName; title: string; text: string; action: string; href?: string; view?: View }[] = [
    { icon: "chat", title: "WhatsApp", text: "Consultá stock, precios y financiación.", action: "Escribir ahora", href: whatsapp("Hola wicel, quiero consultar por un producto.") },
    { icon: "phone", title: "Llamada", text: "Hablá directamente con un asesor.", action: "Llamar ahora", href: phoneHref },
    { icon: "instagram", title: "Instagram", text: `Seguinos en ${instagramUser} para ver novedades y accesorios.`, action: "Ver Instagram", href: instagram },
    { icon: "pin", title: "Visitar el local", text: `Vení a conocernos en ${address}.`, action: "Ver ubicación", href: "#sucursal" },
    { icon: "box", title: "Retiro en local", text: "Comprá online y retiralo en el local el mismo día si está en stock.", action: "Ver productos", view: "productos" },
  ];

  return (
    <main>
      <div className="mx-auto max-w-[1240px] px-4 pt-8">
        <p className="text-sm text-muted">
          <button type="button" className="hover:text-ink hover:underline" onClick={() => onNavigate("home")}>Inicio</button>
          <span aria-hidden="true"> / </span>
          <span className="text-ink">Contacto</span>
        </p>
        <h1 className="display mt-3 text-3xl font-bold sm:text-4xl">Contacto</h1>
        <p className="mt-2 max-w-2xl leading-relaxed text-muted">Consultanos por stock, envíos o financiación. Un asesor de wicel te responde de lunes a sábado.</p>

        <section id="sucursal" className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <div className="relative min-h-[340px] overflow-hidden rounded-[28px] border border-line bg-white">
            <iframe
              title={`Mapa: ${address}, ${city}`}
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
              className="absolute inset-0 h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <div className="rounded-[28px] border border-line bg-white p-6 sm:p-7">
            <h2 className="display text-2xl font-bold">wicel Villa del Rosario</h2>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className={`h-2.5 w-2.5 rounded-full ${status.open ? "bg-ok" : "bg-bad"}`} aria-hidden="true" />
              {status.open ? "Abierto ahora" : "Cerrado ahora"}
              {status.text ? <span className="font-normal text-muted">{status.text}</span> : null}
            </p>
            <ul className="mt-5 space-y-3 text-sm">
              <li className="flex items-start gap-3"><Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-muted" /><span>{address}<span className="block text-muted">{city}</span></span></li>
              <li className="flex items-center gap-3"><Icon name="phone" className="h-4 w-4 shrink-0 text-muted" /><a href={phoneHref} className="hover:underline">{phone}</a></li>
              <li className="flex items-center gap-3"><Icon name="mail" className="h-4 w-4 shrink-0 text-muted" /><a href={`mailto:${email}`} className="break-all hover:underline">{email}</a></li>
              <li className="flex items-center gap-3"><Icon name="instagram" className="h-4 w-4 shrink-0 text-muted" /><a href={instagram} target="_blank" rel="noreferrer" className="hover:underline">{instagramUser}</a></li>
            </ul>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <a href={directions} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white hover:bg-black"><Icon name="send" className="h-4 w-4" /> Cómo llegar</a>
              <button type="button" onClick={copyAddress} className="flex h-11 items-center justify-center gap-2 rounded-full border border-ink/20 text-sm font-semibold hover:border-ink"><Icon name="copy" className="h-4 w-4" /> {copied ? "¡Copiada!" : "Copiar dirección"}</button>
            </div>

            <div id="horarios" className="mt-6 border-t border-line pt-5">
              <h3 className="font-semibold">Horarios de atención</h3>
              <dl className="mt-3 space-y-1 text-sm">
                {hours.map((row) => {
                  const today = row.days.includes(now.day);
                  return (
                    <div key={row.label} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${today ? "bg-paper font-semibold" : "text-muted"}`}>
                      <dt>{row.label}{today ? " (hoy)" : ""}</dt>
                      <dd className="price text-right">{shiftsText(row.shifts)}</dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </section>
      </div>

      <section aria-labelledby="canales-titulo" className="mt-14 bg-black py-14 text-white">
        <div className="mx-auto max-w-[1240px] px-4">
          <h2 id="canales-titulo" className="display text-3xl font-bold">Elegí cómo contactarnos</h2>
          <div className="mt-8 grid gap-px overflow-hidden rounded-[28px] bg-white/10 sm:grid-cols-2 lg:grid-cols-5">
            {channels.map((item) => {
              const action = <>{item.action} <Icon name="chevronRight" className="h-4 w-4" /></>;
              const actionClass = "mt-6 inline-flex h-11 w-fit items-center gap-1 rounded-full bg-brand px-5 text-sm font-semibold";
              return (
                <div key={item.title} className="flex flex-col bg-black p-6">
                  <Icon name={item.icon} className={`h-7 w-7 ${item.icon === "chat" ? "text-[#25D366]" : item.icon === "instagram" ? "text-[#f56040]" : "text-brand"}`} />
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-white/65">{item.text}</p>
                  {item.view ? (
                    <button type="button" onClick={() => onNavigate(item.view as View)} className={actionClass}>{action}</button>
                  ) : (
                    <a href={item.href} target={item.href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className={actionClass}>{action}</a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1240px] items-start gap-5 px-4 py-14 lg:grid-cols-2">
        <ContactForm />
        <aside className="rounded-[28px] border border-line bg-white p-6 sm:p-7">
          <h2 className="display text-2xl font-bold">Preguntas frecuentes</h2>
          <div className="mt-5 divide-y divide-line border-y border-line">
            {[
              ["¿Tienen financiación?", financing.on
                ? `Pagando en efectivo o transferencia tenés 10% menos. Con tarjeta podés pagar en 1 pago al precio de lista o en ${INSTALLMENTS} cuotas con ${Math.round(financing.rate * 1000) / 10}% de recargo (CFTEA ${financing.cftea}%).`
                : "Pagando en efectivo o transferencia tenés 10% menos. Con tarjeta pagás el precio de lista en 1 pago."],
              ["¿Puedo consultar stock por WhatsApp?", `Sí. Escribinos al ${phone} y te decimos si tenemos el modelo y el color que buscás.`],
              ["¿Hacen envíos?", "Sí, hacemos envíos a domicilio. El costo y el plazo los coordinamos con vos antes de que pagues."],
              ["¿Puedo retirar mi compra en el local?", `Sí, en ${address}, ${city}. Si el equipo está en stock, lo retirás el mismo día.`],
            ].map(([question, answer]) => (
              <details key={question} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 font-medium">
                  {question}
                  <Icon name="plus" className="h-5 w-5 shrink-0 text-muted transition group-open:rotate-45" />
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-muted">{answer}</p>
              </details>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-brand p-5 text-[#080808]">
            <p className="font-semibold">¿Viste un producto que te interesa?</p>
            <p className="mt-1 text-sm">Consultá el stock por WhatsApp antes de venir al local.</p>
            <a href={whatsapp("Hola wicel, quiero consultar stock de un producto.")} target="_blank" rel="noreferrer" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-[#080808] px-5 text-sm font-semibold text-white">
              <Icon name="chat" className="h-4 w-4" /> Consultar stock
            </a>
          </div>
        </aside>
      </div>
    </main>
  );
}

type FormField = "nombre" | "email" | "mensaje";

function ContactForm() {
  const [sent, setSent] = useState("");
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const invalid = (field: FormField) => ({
    "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `contacto-${field}-error` : undefined,
  });
  const fieldError = (field: FormField) => errors[field] ? <span id={`contacto-${field}-error`} className="mt-1 block text-sm font-medium text-bad">{errors[field]}</span> : null;

  return (
    <form
      className="rounded-[28px] border border-line bg-white p-6 sm:p-7"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        const nombre = String(data.get("nombre") ?? "").trim();
        const correo = String(data.get("email") ?? "").trim();
        const mensaje = String(data.get("mensaje") ?? "").trim();
        const next: Partial<Record<FormField, string>> = {};
        if (!nombre) next.nombre = "Escribí tu nombre.";
        if (!correo) next.email = "Escribí tu email.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) next.email = "Revisá que el email esté completo.";
        if (!mensaje) next.mensaje = "Contanos tu consulta.";
        setErrors(next);
        if (Object.keys(next).length > 0) {
          window.setTimeout(() => document.getElementById("contacto-errors")?.focus(), 0);
          return;
        }
        setSent("");
        setSending(true);
        void sendContact({
          name: nombre,
          email: correo,
          phone: String(data.get("telefono") ?? "").trim(),
          subject: String(data.get("motivo") ?? "").trim(),
          message: mensaje,
        }).then((result) => {
          setSending(false);
          if (!result.ok) {
            setErrors({ mensaje: result.error });
            window.setTimeout(() => document.getElementById("contacto-errors")?.focus(), 0);
            return;
          }
          setSent("Mensaje enviado. Te respondemos a " + correo + ".");
          form.reset();
        });
      }}
    >
      <h2 className="display text-2xl font-bold">¿Tenés alguna consulta?</h2>
      <p className="mt-1 text-sm text-muted">Completá el formulario y te respondemos por email.</p>
      {Object.keys(errors).length > 0 ? (
        <div id="contacto-errors" tabIndex={-1} role="alert" className="mt-4 rounded-xl border border-bad/30 bg-bad-soft p-4">
          <h3 className="font-semibold text-bad">Faltan datos</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-bad">
            {(Object.keys(errors) as FormField[]).map((field) => <li key={field}><a className="underline" href={`#contacto-${field}`}>{errors[field]}</a></li>)}
          </ul>
        </div>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium" htmlFor="contacto-nombre">Nombre <span className="text-bad">*</span>
          <input id="contacto-nombre" name="nombre" autoComplete="name" {...invalid("nombre")} className="field" placeholder="Tu nombre" />
          {fieldError("nombre")}
        </label>
        <label className="text-sm font-medium" htmlFor="contacto-email">Email <span className="text-bad">*</span>
          <input id="contacto-email" name="email" type="email" autoComplete="email" {...invalid("email")} className="field" placeholder="tu@email.com" />
          {fieldError("email")}
        </label>
        <label className="text-sm font-medium" htmlFor="contacto-telefono">WhatsApp <span className="font-normal text-muted">(opcional)</span>
          <input id="contacto-telefono" name="telefono" type="tel" autoComplete="tel" className="field" placeholder="351 000-0000" />
        </label>
        <label className="text-sm font-medium" htmlFor="contacto-motivo">Motivo
          <select id="contacto-motivo" name="motivo" className="field" defaultValue="Stock">
            <option>Stock</option>
            <option>Envío</option>
            <option>Financiación</option>
            <option>Garantía</option>
            <option>Otra consulta</option>
          </select>
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium" htmlFor="contacto-mensaje">Mensaje <span className="text-bad">*</span>
        <textarea id="contacto-mensaje" name="mensaje" {...invalid("mensaje")} className="field min-h-32 py-3" placeholder="Ej.: ¿Tienen el iPhone 15 128GB en negro?" />
        {fieldError("mensaje")}
      </label>
      <button disabled={sending} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-sm font-semibold text-white hover:bg-black disabled:opacity-60">
        <Icon name="send" className="h-4 w-4" /> {sending ? "Enviando..." : "Enviar consulta"}
      </button>
      {sent ? <p role="status" className="mt-3 text-sm font-medium text-ok">{sent}</p> : null}
    </form>
  );
}
