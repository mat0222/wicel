import type { PaymentId, Product } from "./data";

export type StoreSettings = {
  store_name?: string;
  store_phone?: string;
  store_email?: string;
  store_address?: string;
  store_city?: string;
  store_instagram?: string;
  notify_email?: string;
  order_hold_hours?: string;
  currency?: string;
  points_per_currency?: string;
  usd_exchange_rate?: string;
  bank_alias?: string;
  bank_cbu?: string;
  bank_holder?: string;
  bank_name?: string;
  legal_name?: string;
  legal_cuit?: string;
  legal_tax_status?: string;
  vat_rate?: string;
  installments_rate?: string;
  installments_cftea?: string;
  warranty_extra?: string;
  exchange_policy?: string;
};

export type LegalSettings = Required<Pick<StoreSettings, "legal_name" | "legal_cuit" | "legal_tax_status" | "vat_rate" | "installments_rate" | "installments_cftea" | "warranty_extra" | "exchange_policy">>;

export type OrderEvent = { detail: string; date: string };

export type Account = {
  id: number;
  name: string;
  email: string;
  role: "administrador" | "cliente";
  points: number;
  createdAt: string;
};

export type Order = {
  id: number;
  number: string;
  status: "PENDING" | "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  statusLabel: string;
  customer: string;
  email: string;
  phone: string;
  address: string;
  delivery: "PICKUP" | "SHIPPING" | null;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  events: OrderEvent[];
  registered: boolean;
  total: number;
  payment: string;
  date: string;
  items: { id: number; name: string; qty: number; subtotal: number; phone: boolean; devices: { imei: string; warranty: string | null; until: string | null }[] }[];
  pointsEarned: number;
  pointsPending: number;
};

export type OrderReceipt = {
  number: string;
  date: string;
  status: Order["status"];
  statusLabel: string;
  customer: string;
  delivery: "PICKUP" | "SHIPPING" | null;
  address: string;
  payment: string;
  total: number;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  snapshot: { listTotal: number; adjustment: number; cftea: string | null; financeRate: number | null; shipping: string | null } | null;
  items: { name: string; qty: number; unitPrice: number; subtotal: number }[];
  events: OrderEvent[];
  requests: { code: string; type: string; status: string; date: string }[];
};

export type RequestType = "ARREPENTIMIENTO" | "GARANTIA" | "CAMBIO" | "CANCELACION";
export type PlacedRequest = { code: string; type: string; number: string; date: string; existing: boolean };

export type AfterSalesRequest = {
  id: number;
  code: string;
  type: RequestType;
  typeLabel: string;
  number: string;
  saleStatus: string;
  soldAt: string;
  deliveredAt: string | null;
  customer: string;
  email: string;
  phone: string | null;
  reason: string | null;
  status: "RECEIVED" | "ACCEPTED" | "RESOLVED" | "REJECTED";
  note: string | null;
  date: string;
};

export type WarrantyClaim = { id: number; number: string; issue: string; diagnosis: string; resolution: string; status: string; receivedAt: string; resolvedAt: string | null };
export type Warranty = {
  id: number;
  number: string;
  saleNumber: string;
  customer: string;
  phone: string;
  product: string | null;
  imei: string | null;
  serial: string | null;
  start: string;
  end: string;
  expired: boolean;
  claimed: boolean;
  notes: string | null;
  claims: WarrantyClaim[];
};

export type AuditEntry = { id: number; action: string; entity: string; entityId: number | null; detail: string; ip: string | null; user: string; date: string };

export type PlacedOrder = {
  number: string;
  total: number;
  payment: PaymentId;
  paymentLabel: string;
  installments: number;
  installmentAmount: number | null;
  points: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  delivery: "PICKUP" | "SHIPPING";
  cftea: string | null;
  holdHours: number;
};

export type Category = { id: number; name: string; slug: string; description: string; phoneSpecs: boolean; products: number };
export type Brand = { id: number; name: string; products: number };
export type AdminOptions = { categories: Category[]; brands: Brand[]; colors: { name: string; hex: string | null }[]; storages: string[] };
export type Summary = {
  todayTotal: number;
  todayOrders: number;
  newCustomers: number;
  pendingOrders: number;
  stock: number;
  days: { label: string; total: number }[];
  top: { name: string; units: number; image: string | null }[];
  low: { name: string; stock: number }[];
};

export type Reward = { id: number; name: string; description: string; image: string | null; points: number; stock: number; active: boolean };
export type Redemption = {
  id: number;
  code: string;
  reward: string;
  image: string | null;
  points: number;
  status: "PENDING" | "DELIVERED" | "CANCELLED";
  statusLabel: string;
  customer: string;
  email: string;
  phone: string;
  date: string;
};
export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: "NEW" | "READ" | "REPLIED" | "CLOSED";
  date: string;
};
export type StoreForm = {
  store_name: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  store_city: string;
  store_instagram: string;
  notify_email: string;
  order_hold_hours: string;
};
export type PlacedRedemption = { code: string; reward: string; points: number; balance: number };

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const offline = import.meta.env.DEV
  ? "No hay conexión con el servidor. Si estás probando en tu compu, fijate que Docker Desktop esté abierto y corré npm run dev de nuevo."
  : "No hay conexión con el servidor. Probá de nuevo en un rato.";

async function request<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const response = await fetch(`/api${path}`, {
      ...init,
      credentials: "same-origin",
      headers: { "X-Requested-With": "wicel", ...(typeof init?.body === "string" ? { "Content-Type": "application/json" } : {}) },
    });
    const text = await response.text();
    let data: (T & { error?: string }) | null = null;
    try {
      data = JSON.parse(text) as T & { error?: string };
    } catch {
      data = null;
    }
    if (data === null) return { ok: false, error: response.status >= 500 ? offline : "Algo salió mal. Probá de nuevo." };
    if (!response.ok) return { ok: false, error: data.error ?? "Algo salió mal. Probá de nuevo." };
    return { ok: true, data };
  } catch {
    return { ok: false, error: offline };
  }
}

const post = <T,>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

const pick = async <T, K extends keyof T>(promise: Promise<Result<T>>, key: K): Promise<Result<T[K]>> => {
  const result = await promise;
  return result.ok ? { ok: true, data: result.data[key] } : result;
};

export async function fetchSettings(): Promise<StoreSettings | null> {
  const result = await request<{ settings: StoreSettings }>("/settings");
  return result.ok ? result.data.settings : null;
}

export async function fetchSession(): Promise<Account | null> {
  const result = await request<{ user: Account | null }>("/sesion");
  return result.ok ? result.data.user : null;
}

export const login = (email: string, password: string) => pick(post<{ user: Account }>("/login", { email, password }), "user");
export const register = (name: string, email: string, password: string) => pick(post<{ user: Account }>("/registro", { name, email, password }), "user");

export async function logout(): Promise<void> {
  await post("/logout", {});
}

export const fetchCatalog = () => pick(request<{ products: Product[] }>("/catalogo"), "products");

export const placeOrder = (order: {
  items: { variantId: number; qty: number }[];
  payment: PaymentId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  delivery: "PICKUP" | "SHIPPING";
  acceptTerms: boolean;
  termsVersion: string;
  marketing: boolean;
}) => pick(post<{ order: PlacedOrder }>("/pedidos", order), "order");

export const lookupOrder = (number: string, email: string) => pick(post<{ order: OrderReceipt }>("/pedido/consulta", { number, email }), "order");
export const sendRequest = (request: { type: RequestType; number: string; email: string; phone: string; reason: string }) => pick(post<{ request: PlacedRequest }>("/postventa", request), "request");

export const fetchMyOrders = () => pick(request<{ orders: Order[] }>("/mis-pedidos"), "orders");

export const fetchRewards = () => pick(request<{ rewards: Reward[] }>("/canjes"), "rewards");
export const redeemReward = (rewardId: number, phone: string) => pick(post<{ redemption: PlacedRedemption }>("/canjes", { reward_id: rewardId, phone }), "redemption");
export const fetchMyRedemptions = () => pick(request<{ redemptions: Redemption[] }>("/mis-canjes"), "redemptions");

export const fetchAccounts = () => pick(request<{ accounts: Account[] }>("/admin/cuentas"), "accounts");
export const adjustPoints = (userId: number, points: number, reason: string) => pick(post<{ points: number }>("/admin/puntos", { user_id: userId, points, reason }), "points");
export const fetchAdminOptions = () => request<AdminOptions>("/admin/opciones");
export const saveProduct = (form: FormData) => request<{ id: number }>("/admin/productos", { method: "POST", body: form });
export const saveCombo = (combo: { id: number | null; name: string; price: number; oldPrice: number | null; description: string; featured: boolean; items: { variantId: number; quantity: number }[] }) => post<{ id: number }>("/admin/combos", combo);
export const deleteProduct = (id: number) => post<{ ok: true; pausedCombos: number }>("/admin/productos/eliminar", { id });
export const saveCategory = (category: { id?: number; name: string; description: string; phoneSpecs: boolean }) => pick(post<{ categories: Category[] }>("/admin/categorias", category), "categories");
export const deleteCategory = (id: number) => pick(post<{ categories: Category[] }>("/admin/categorias/eliminar", { id }), "categories");
export const fetchSales = () => request<{ orders: Order[]; statuses: Record<Order["status"], string>; transitions: Record<Order["status"], Order["status"][]>; holdHours: number }>("/admin/ventas");
export const setSaleStatus = (id: number, status: Order["status"]) => pick(post<{ orders: Order[] }>("/admin/ventas/estado", { id, status }), "orders");
export const fetchAdminRewards = () => request<{ rewards: Reward[]; redemptions: Redemption[]; statuses: Record<Redemption["status"], string> }>("/admin/canjes");
export const saveReward = (form: FormData) => pick(request<{ rewards: Reward[] }>("/admin/canjes/premio", { method: "POST", body: form }), "rewards");
export const setRewardActive = (id: number, active: boolean) => pick(post<{ rewards: Reward[] }>("/admin/canjes/visible", { id, active }), "rewards");
export const setRedemptionStatus = (id: number, status: Redemption["status"]) => post<{ redemptions: Redemption[]; rewards: Reward[] }>("/admin/canjes/estado", { id, status });
export const fetchSummary = () => request<Summary>("/admin/resumen");
export const saveBankSettings = (settings: Pick<StoreSettings, "bank_alias" | "bank_cbu" | "bank_holder" | "bank_name">) => post<{ ok: true }>("/admin/ajustes", settings);
export const saveLegalSettings = (settings: LegalSettings) => post<{ ok: true }>("/admin/ajustes", settings);
export const fetchStoreSettings = () => pick(request<{ settings: StoreForm }>("/admin/ajustes"), "settings");
export const saveStoreSettings = (settings: StoreForm) => post<{ ok: true }>("/admin/ajustes", settings);
export const fetchMessages = () => pick(request<{ messages: ContactMessage[] }>("/admin/mensajes"), "messages");
export const setMessageStatus = (id: number, status: ContactMessage["status"]) => post<{ ok: true }>("/admin/mensajes/estado", { id, status });
export const registerImei = (saleItemId: number, imei: string, serial: string) => pick(post<{ orders: Order[] }>("/admin/ventas/imei", { saleItemId, imei, serial }), "orders");
export const fetchAfterSales = () => request<{ requests: AfterSalesRequest[]; requestStatuses: Record<AfterSalesRequest["status"], string>; warranties: Warranty[]; claimStatuses: Record<string, string> }>("/admin/postventa");
export const setRequestStatus = (id: number, status: AfterSalesRequest["status"], note: string) => pick(post<{ requests: AfterSalesRequest[] }>("/admin/postventa/estado", { id, status, note }), "requests");
export const openClaim = (warrantyId: number, issue: string) => pick(post<{ warranties: Warranty[] }>("/admin/garantias/reclamo", { warrantyId, issue }), "warranties");
export const updateClaim = (claim: { id: number; status: string; diagnosis: string; resolution: string }) => pick(post<{ warranties: Warranty[] }>("/admin/garantias/reclamo/estado", claim), "warranties");
export const fetchAudit = () => pick(request<{ entries: AuditEntry[] }>("/admin/auditoria"), "entries");

export async function sendContact(message: {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await post<{ ok: true }>("/contacto", message);
  return result.ok ? { ok: true } : result;
}
