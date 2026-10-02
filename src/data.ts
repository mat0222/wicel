import { publicUrl } from "./publicUrl";

export type View =
  | "home"
  | "productos"
  | "combos"
  | "canjes"
  | "contacto"
  | "carrito"
  | "login"
  | "admin"
  | "terminos"
  | "privacidad"
  | "cookies"
  | "garantias"
  | "arrepentimiento"
  | "pedido";

export type AdminSection =
  | "inicio"
  | "ventas"
  | "productos"
  | "combos"
  | "marcas"
  | "clientes"
  | "proveedores"
  | "inventario"
  | "promociones"
  | "envios"
  | "cupones"
  | "canjes"
  | "reportes"
  | "usuarios"
  | "postventa"
  | "legal"
  | "configuracion";

export type ProductColor = { variantId: number; name: string; hex: string; stock: number; image: string | null };

export type Product = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: string;
  categoryId: number;
  categorySlug: string;
  type: "PRODUCT" | "COMBO";
  /** La categoría lleva almacenamiento, RAM e IMEI. */
  phone: boolean;
  storage: string;
  ram: string;
  condition: "Nuevos" | "Usados";
  price: number;
  oldPrice: number | null;
  description: string;
  specs: string[];
  featured: boolean;
  image: string | null;
  colors: ProductColor[];
  stock: number;
  items: { variantId: number; quantity: number }[];
  createdAt: string;
};

export type CartItem = { variantId: number; qty: number };

export const CASH_OFF = 0.1;
export const INSTALLMENTS = 12;
export const LOW_STOCK = 5;

/** Se completa con la configuración del panel: sin CFTEA cargado no se ofrecen cuotas. */
export const financing = { on: false, rate: 0, cftea: "" };

export function setFinancing(settings: { installments_rate?: string; installments_cftea?: string } | null) {
  const rate = (settings?.installments_rate ?? "").trim().replace(",", ".");
  financing.cftea = (settings?.installments_cftea ?? "").trim();
  financing.rate = Number(rate) / 100;
  financing.on = financing.cftea !== "" && rate !== "" && Number.isFinite(financing.rate);
}

export function cashPrice(list: number) {
  return Math.round(list * (1 - CASH_OFF));
}

export function financedTotal(list: number) {
  return Math.round(list * (1 + financing.rate));
}

export function cardOffer(list: number) {
  return financing.on
    ? `${formatPrice(list)} en 1 pago o ${INSTALLMENTS} cuotas de ${formatPrice(installmentAmount(list))} (CFTEA ${financing.cftea}%)`
    : `${formatPrice(list)} en 1 pago`;
}

export function installmentAmount(list: number) {
  return Math.round(financedTotal(list) / INSTALLMENTS);
}

export type PaymentId = "tarjeta-1" | "tarjeta-12" | "transferencia" | "efectivo";

export function payable(list: number, method: PaymentId) {
  if (method === "tarjeta-1") return list;
  if (method === "tarjeta-12") return financedTotal(list);
  return cashPrice(list);
}

export function formatPrice(value: number) {
  return "$" + value.toLocaleString("es-AR");
}

export function discountPercent(product: Pick<Product, "price" | "oldPrice">) {
  return product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;
}

export function imageUrl(url: string | null) {
  if (!url) return null;
  return url.startsWith("/api/") || url.startsWith("http") ? url : publicUrl(url);
}

export function stockLabel(stock: number) {
  if (stock <= 0) return { text: "Sin stock", tone: "text-bad" };
  if (stock <= LOW_STOCK) return { text: stock === 1 ? "Queda 1 unidad" : `Quedan ${stock} unidades`, tone: "text-gold" };
  return { text: "En stock", tone: "text-ok" };
}

export function productBadge(product: Product) {
  if (product.condition === "Usados") return { label: "Usado", tone: "green" as const };
  const off = discountPercent(product);
  if (off > 0) return { label: `-${off}%`, tone: "red" as const };
  return { label: "Nuevo", tone: "blue" as const };
}

export const rams = ["4 GB", "6 GB", "8 GB", "12 GB"];
export const conditions = ["Nuevos", "Usados"];

export const adminNav: { id: AdminSection; label: string }[] = [
  { id: "inicio", label: "Inicio" },
  { id: "ventas", label: "Ventas" },
  { id: "productos", label: "Productos" },
  { id: "combos", label: "Combos" },
  { id: "marcas", label: "Marcas" },
  { id: "clientes", label: "Clientes" },
  { id: "proveedores", label: "Proveedores" },
  { id: "promociones", label: "Promociones" },
  { id: "envios", label: "Envíos" },
  { id: "cupones", label: "Puntos y cupones" },
  { id: "canjes", label: "Canjes" },
  { id: "reportes", label: "Reportes" },
  { id: "usuarios", label: "Usuarios" },
  { id: "postventa", label: "Postventa" },
  { id: "legal", label: "Legal y auditoría" },
  { id: "configuracion", label: "Configuración" },
];

export const pointSteps = [
  { n: "1", title: "Registrate", text: "Creá tu cuenta en la tienda." },
  { n: "2", title: "Comprá", text: "Por cada $1.000, sumás 1 punto." },
  { n: "3", title: "Acumulá", text: "Los puntos se acreditan cuando se confirma el pago." },
  { n: "4", title: "Canjeá", text: "Elegí un premio en la sección Canjes." },
];
