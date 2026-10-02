export const address = "Obispo Ferreyra 680";
export const city = "Villa del Rosario, Córdoba";
export const fullAddress = `${address}, ${city}`;
export const phone = "3541 21-9547";
export const phoneHref = "tel:+5493541219547";
export const email = "accesorioswicel@gmail.com";
export const instagram = "https://www.instagram.com/wicel_wicel/";
export const instagramUser = "@wicel_wicel";
export const mapQuery = encodeURIComponent("Obispo Ferreyra 680, Villa del Rosario, Córdoba, Argentina");
export const directions = `https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`;
export const whatsapp = (text: string) => `https://wa.me/5493541219547?text=${encodeURIComponent(text)}`;

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
