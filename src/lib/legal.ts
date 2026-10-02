import type { Product } from "../data";
import type { StoreSettings } from "./api";
import { fullAddress } from "./store";

/** Cambiar junto con Legal::VERSION en api/src/Legal.php cada vez que cambian los textos legales. */
export const LEGAL_VERSION = "2026-09-30";
export const LEGAL_DATE = "30/09/2026";

export const consumerDefenseUrl = "https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario";

export const deliveryText = () => `Retiro en el local (${fullAddress}) o envío a domicilio a coordinar. El costo y el plazo del envío se informan antes de pagar.`;

export const warrantyMonths = (condition: Product["condition"]) => (condition === "Usados" ? 3 : 6);

export function netOfTaxes(price: number, settings: StoreSettings | null) {
  const rate = Number((settings?.vat_rate ?? "").replace(",", "."));
  if (settings?.legal_tax_status !== "Responsable Inscripto" || !settings.vat_rate || !Number.isFinite(rate) || rate <= 0) return null;
  return Math.round(price / (1 + rate / 100));
}

const LAST_ORDER = "wicel-ultimo-pedido";

export function rememberOrder(number: string, email: string) {
  try {
    sessionStorage.setItem(LAST_ORDER, JSON.stringify({ number, email }));
  } catch {
    /* sin almacenamiento el cliente escribe los datos */
  }
}

export function lastOrder(): { number: string; email: string } {
  try {
    const saved = JSON.parse(sessionStorage.getItem(LAST_ORDER) ?? "null") as { number?: string; email?: string } | null;
    return { number: saved?.number ?? "", email: saved?.email ?? "" };
  } catch {
    return { number: "", email: "" };
  }
}
