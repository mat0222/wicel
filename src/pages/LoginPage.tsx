import { useState, type FormEvent, type ReactNode } from "react";
import { Icon as StoreIcon } from "../components/Icon";
import { Logo } from "../components/Logo";
import { login, register, type Account } from "../lib/api";
import { fullAddress } from "../lib/store";

export type LoginMode = "ingresar" | "registro";

const REMEMBER_KEY = "wicel-recordar-email";

const rememberedEmail = () => {
  try {
    localStorage.removeItem("wicel-login-email");
    return localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
};

function Icon({ children, className = "h-4 w-4" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const benefits = [
  { title: "Sumás puntos", text: "Por cada $1.000 de compra. Se acreditan cuando se confirma el pago." },
  { title: "Los canjeás por premios", text: "Elegís el premio en la sección Canjes y lo retirás sin pagar nada." },
  { title: "Seguís tus pedidos", text: "Ves el estado de cada compra y los puntos que te dio." },
  { title: "Guardás favoritos", text: "Marcás los productos que te interesan para verlos después." },
];

const field =
  "h-12 w-full rounded-xl border border-[#cfcfca] bg-white px-4 text-[15px] text-ink placeholder:text-[#85857f] transition focus:border-ink focus:shadow-[0_0_0_3px_rgb(255_216_61/45%)] focus:outline-none";

export function LoginPage({
  initialMode = "ingresar",
  onLogin,
  onBack,
}: {
  initialMode?: LoginMode;
  onLogin: (account: Account, created: boolean) => void;
  onBack: () => void;
}) {
  const [mode, setMode] = useState<LoginMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(() => email !== "");
  const [reset, setReset] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const signup = mode === "registro";

  const switchMode = (next: LoginMode) => {
    setMode(next);
    setError("");
    setReset(false);
    setPassword("");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (signup && !name.trim()) {
      setError("Escribí tu nombre.");
      return;
    }
    if (!email.trim() || !password) {
      setError("Escribí tu email y tu contraseña.");
      return;
    }
    if (signup && (password.length < 8 || !/\p{L}/u.test(password) || !/\d/.test(password))) {
      setError("La contraseña tiene que tener al menos 8 caracteres, con letras y números.");
      return;
    }

    setSending(true);
    setError("");
    const result = signup ? await register(name.trim(), email.trim(), password) : await login(email.trim(), password);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    try {
      if (!signup && remember) localStorage.setItem(REMEMBER_KEY, result.data.email);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* la sesión sigue aunque el navegador bloquee el guardado */
    }
    onLogin(result.data, signup);
  };

  return (
    <div className="store grid min-h-screen lg:grid-cols-[1fr_1fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12 lg:px-16 xl:px-24">
        <button type="button" onClick={onBack} className="flex w-fit items-center gap-1 text-sm font-medium text-muted hover:text-ink">
          <StoreIcon name="chevronLeft" className="h-4 w-4" />
          Volver a la tienda
        </button>

        <form onSubmit={submit} className="my-auto w-full max-w-[420px] py-10" noValidate>
          <div className="mb-8 inline-flex rounded-2xl bg-black px-4 py-3 lg:hidden">
            <Logo />
          </div>
          <h1 className="display text-4xl font-bold leading-tight">{signup ? "Creá tu cuenta" : "Ingresá a tu cuenta"}</h1>
          <p className="mt-3 leading-relaxed text-muted">
            {signup ? "Registrate para sumar puntos con cada compra y canjearlos por premios." : "Mirá tus puntos y tus pedidos. Si sos el dueño, entrás al panel del local."}
          </p>

          <div className="mt-8 flex rounded-full bg-[#e6e6e2] p-1 text-sm font-semibold" role="group" aria-label="Elegí una opción">
            <button type="button" aria-pressed={!signup} onClick={() => switchMode("ingresar")} className={`h-10 flex-1 rounded-full ${signup ? "text-muted hover:text-ink" : "bg-white shadow-sm"}`}>Ingresar</button>
            <button type="button" aria-pressed={signup} onClick={() => switchMode("registro")} className={`h-10 flex-1 rounded-full ${signup ? "bg-white shadow-sm" : "text-muted hover:text-ink"}`}>Crear cuenta</button>
          </div>

          <div className="mt-6 flex flex-col gap-4">
            {signup ? (
              <label htmlFor="login-name" className="text-sm font-semibold">
                Nombre
                <input id="login-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Tu nombre y apellido" className={`${field} mt-1.5`} />
              </label>
            ) : null}

            <label htmlFor="login-email" className="text-sm font-semibold">
              Email
              <input id="login-email" type="email" autoComplete={signup ? "email" : "username"} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" className={`${field} mt-1.5`} />
            </label>

            <div>
              <label htmlFor="login-password" className="text-sm font-semibold">Contraseña</label>
              <span className="relative mt-1.5 block">
                <input
                  id="login-password"
                  autoComplete={signup ? "new-password" : "current-password"}
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={signup ? "8 o más, con letras y números" : "Tu contraseña"}
                  className={`${field} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShow((value) => !value)}
                  className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center text-muted hover:text-ink"
                  aria-pressed={show}
                  aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  <Icon className="h-5 w-5">
                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="2.5" />
                    {show ? <path d="M4 20 20 4" /> : null}
                  </Icon>
                </button>
              </span>
            </div>
          </div>

          {error ? <p role="alert" className="mt-4 rounded-xl bg-bad-soft px-4 py-3 text-sm font-medium text-bad">{error}</p> : null}

          {signup ? null : (
            <label className="mt-5 flex cursor-pointer items-start gap-2.5 text-sm text-muted">
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#151515]" />
              Recordar mi email en esta computadora (no lo marques si es compartida)
            </label>
          )}

          <button type="submit" disabled={sending} className="mt-6 h-12 w-full rounded-full bg-ink text-[15px] font-semibold text-white hover:bg-black disabled:cursor-wait disabled:opacity-70">
            {sending ? "Un momento..." : signup ? "Crear cuenta" : "Ingresar"}
          </button>

          {signup ? null : (
            <button type="button" onClick={() => setReset((value) => !value)} className="mt-4 w-full text-center text-sm text-muted hover:text-ink" aria-expanded={reset}>
              ¿Olvidaste tu contraseña?
            </button>
          )}
          {reset ? <p role="status" className="mt-3 rounded-xl bg-brand-soft px-4 py-3 text-center text-sm leading-relaxed">Todavía no se puede recuperar la clave desde la web. Escribinos por WhatsApp y te ayudamos.</p> : null}
        </form>
      </div>

      <aside className="hidden flex-col justify-between bg-black p-16 text-white lg:flex xl:p-20">
        <Logo />
        <div>
          <h2 className="display max-w-md text-4xl font-bold leading-tight">Con tu cuenta, cada compra suma.</h2>
          <ul className="mt-10 max-w-md space-y-6">
            {benefits.map((item) => (
              <li key={item.title} className="flex gap-4">
                <StoreIcon name="star" filled className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <span>
                  <span className="block font-semibold">{item.title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-white/65">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/50">{fullAddress}</p>
      </aside>
    </div>
  );
}
