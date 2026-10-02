import type { StoreSettings } from "./api";

export const storeDefaults = {
  store_phone: "3541 21-9547",
  store_email: "accesorioswicel@gmail.com",
  store_address: "Obispo Ferreyra 680",
  store_city: "Villa del Rosario, Córdoba",
  store_instagram: "wicel_wicel",
};

export let address = storeDefaults.store_address;
export let city = storeDefaults.store_city;
export let fullAddress = "";
export let phone = storeDefaults.store_phone;
export let phoneHref = "";
export let email = storeDefaults.store_email;
export let instagram = "";
export let instagramUser = "";
export let mapQuery = "";
export let directions = "";
let waNumber = "";

/** Convierte "3541 21-9547" en "5493541219547": formato internacional de un celular argentino. */
export function internationalNumber(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("54")) digits = digits.slice(2);
  if (digits.startsWith("9")) digits = digits.slice(1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return `549${digits}`;
}

/** Los datos del local se editan en el panel (Configuración → General). Sin datos guardados quedan los de fábrica. */
export function applyStoreSettings(settings: StoreSettings | null) {
  const pick = (key: keyof typeof storeDefaults) => settings?.[key]?.trim() || storeDefaults[key];
  address = pick("store_address");
  city = pick("store_city");
  phone = pick("store_phone");
  email = pick("store_email");
  const user = pick("store_instagram").replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
  fullAddress = `${address}, ${city}`;
  waNumber = internationalNumber(phone);
  phoneHref = `tel:+${waNumber}`;
  instagram = `https://www.instagram.com/${user}/`;
  instagramUser = `@${user}`;
  mapQuery = encodeURIComponent(`${fullAddress}, Argentina`);
  directions = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
}

applyStoreSettings(null);

export const whatsapp = (text: string) => `https://wa.me/${waNumber}?text=${encodeURIComponent(text)}`;

type Shift = [open: number, close: number];

export const hours: { label: string; days: number[]; shifts: Shift[] }[] = [
  { label: "Lunes a sábado", days: [1, 2, 3, 4, 5, 6], shifts: [[9.5, 12.5], [17, 21]] },
  { label: "Domingo", days: [0], shifts: [] },
];

const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export const clock = (hour: number) => `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`;

export const shiftsText = (shifts: Shift[]) => shifts.length ? shifts.map(([open, close]) => `${clock(open)} a ${clock(close)}`).join(" y ") : "Cerrado";

const shiftsOf = (day: number) => hours.find((row) => row.days.includes(day))?.shifts ?? [];

export function storeTime() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Argentina/Cordoba", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), hour: Number(get("hour")) + Number(get("minute")) / 60 };
}

export function storeStatus({ day, hour }: { day: number; hour: number }) {
  const today = shiftsOf(day);
  const current = today.find(([open, close]) => hour >= open && hour < close);
  if (current) return { open: true, text: `Cerramos a las ${clock(current[1])}` };
  const later = today.find(([open]) => hour < open);
  if (later) return { open: false, text: `Abrimos hoy a las ${clock(later[0])}` };
  for (let step = 1; step <= 7; step += 1) {
    const next = (day + step) % 7;
    const first = shiftsOf(next)[0];
    if (first) return { open: false, text: `Abrimos ${step === 1 ? "mañana" : `el ${dayNames[next]}`} a las ${clock(first[0])}` };
  }
  return { open: false, text: "" };
}
