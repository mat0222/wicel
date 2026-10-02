import { Logo } from "./Logo";
import type { View } from "../lib/data";
import type { StoreSettings } from "../lib/api";
import { consumerDefenseUrl } from "../lib/legal";
import { email, fullAddress, hours, instagram, instagramUser, phone, phoneHref, shiftsText, whatsapp } from "../lib/store";

export function SiteFooter({ onNavigate, settings }: { onNavigate: (view: View) => void; settings: StoreSettings | null }) {
  const link = "text-left text-white/65 hover:text-white";
  const storeName = settings?.store_name ?? "wicel";
  const identity = [settings?.legal_name, settings?.legal_cuit ? `CUIT ${settings.legal_cuit}` : "", settings?.legal_tax_status].filter(Boolean).join(" · ");
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.1fr_1fr_0.8fr_1fr]">
        <div>
          <Logo subtitle="Tu mundo en un solo lugar" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/65">
            Productos, combos y accesorios en Villa del Rosario, con atención personal en el local y por WhatsApp.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Visitanos</h2>
          <p className="mt-4 text-sm text-white/65">{fullAddress}</p>
          <dl className="mt-3 space-y-2 text-sm">
            {hours.map((row) => (
              <div key={row.label} className="text-white/65">
                <dt className="font-medium text-white/85">{row.label}</dt>
                <dd className="price">{shiftsText(row.shifts)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Hablemos</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><a className={link} href={whatsapp("Hola wicel, quiero hacer una consulta.")} target="_blank" rel="noreferrer">WhatsApp {phone}</a></li>
            <li><a className={link} href={phoneHref}>Llamar al {phone}</a></li>
            <li><a className={`${link} break-all`} href={`mailto:${email}`}>{email}</a></li>
            <li><a className={link} href={instagram} target="_blank" rel="noreferrer">Instagram {instagramUser}</a></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Comprá</h2>
          <div className="mt-4 flex flex-col items-start gap-2.5 text-sm">
            <button type="button" className={link} onClick={() => onNavigate("productos")}>Productos</button>
            <button type="button" className={link} onClick={() => onNavigate("combos")}>Combos</button>
            <button type="button" className={link} onClick={() => onNavigate("canjes")}>Canjear puntos</button>
            <button type="button" className={link} onClick={() => onNavigate("carrito")}>Tu carrito</button>
            <button type="button" className={link} onClick={() => onNavigate("pedido")}>Seguí tu pedido</button>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Ayuda y legales</h2>
          <div className="mt-4 flex flex-col items-start gap-2.5 text-sm">
            <button type="button" className={link} onClick={() => onNavigate("garantias")}>Garantías, cambios y devoluciones</button>
            <button type="button" className={link} onClick={() => onNavigate("terminos")}>Términos y condiciones</button>
            <button type="button" className={link} onClick={() => onNavigate("privacidad")}>Política de privacidad</button>
            <button type="button" className={link} onClick={() => onNavigate("cookies")}>Política de cookies</button>
            <a className={link} href={consumerDefenseUrl} target="_blank" rel="noreferrer">Defensa de las y los consumidores. Para reclamos ingresá aquí</a>
            <button type="button" className="mt-1 rounded-md bg-brand px-2.5 py-1.5 text-left text-xs font-bold text-[#080808] hover:bg-white" onClick={() => onNavigate("arrepentimiento")}>BOTÓN DE ARREPENTIMIENTO</button>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs text-white/50">
          <p>Todos los derechos reservados {storeName}. Desarrollado por Nexosync</p>
          {identity ? <p>{identity}</p> : null}
        </div>
      </div>
    </footer>
  );
}
