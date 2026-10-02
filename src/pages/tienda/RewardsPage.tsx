import { useEffect, useState } from "react";
import { ProductPhoto } from "../../components/RealPhoneArt";
import { formatPrice, type View } from "../../lib/data";
import { fetchMyRedemptions, fetchRewards, redeemReward, type Account, type PlacedRedemption, type Redemption, type Reward, type StoreSettings } from "../../lib/api";

const statusTone: Record<Redemption["status"], string> = {
  PENDING: "bg-brand-soft text-gold",
  DELIVERED: "bg-ok-soft text-ok",
  CANCELLED: "bg-bad-soft text-bad",
};

export function RewardsPage({
  user,
  settings,
  onNavigate,
  onLogin,
  onRedeemed,
}: {
  user: Account | null;
  settings: StoreSettings | null;
  onNavigate: (view: View) => void;
  onLogin: (mode: "ingresar" | "registro") => void;
  onRedeemed: () => void;
}) {
  const [rewards, setRewards] = useState<Reward[] | null>(null);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<Redemption[]>([]);
  const [chosen, setChosen] = useState<Reward | null>(null);
  const [done, setDone] = useState<PlacedRedemption | null>(null);
  const [known, setKnown] = useState<number | null>(null);

  const customer = user?.role === "cliente";
  const balance = customer ? known ?? user.points : 0;
  const perThousand = Number(settings?.points_per_currency ?? 1) || 1;

  useEffect(() => {
    void fetchRewards().then((result) => {
      if (result.ok) setRewards(result.data);
      else setError(result.error);
    });
  }, []);

  useEffect(() => {
    if (!customer) return;
    void fetchMyRedemptions().then((result) => {
      if (result.ok) setMine(result.data);
    });
  }, [customer, done]);

  const cheapest = (rewards ?? []).filter((reward) => reward.stock > 0 && reward.points > balance).sort((a, b) => a.points - b.points)[0];

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-8">
      <p className="text-sm text-muted">
        <button type="button" className="hover:text-ink hover:underline" onClick={() => onNavigate("home")}>Inicio</button> / Canjes
      </p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="display text-3xl font-bold sm:text-4xl">Canjeá tus puntos</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Cada compra suma puntos. Cuando juntes los que pide un premio, lo canjeás acá y te lo llevás sin pagar nada.
          </p>
        </div>
        <PointsBox user={user} balance={balance} next={cheapest} perThousand={perThousand} onLogin={onLogin} />
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["1", "Sumá puntos", `Por cada $1.000 de compra sumás ${perThousand} ${perThousand === 1 ? "punto" : "puntos"}. Se acreditan cuando se confirma el pago.`],
          ["2", "Elegí tu premio", "Si te alcanzan los puntos, tocá Canjear. Los puntos se descuentan en el momento."],
          ["3", "Retiralo", "Te escribimos por WhatsApp para coordinar el retiro en el local o el envío."],
        ].map(([n, title, text]) => (
          <li key={n} className="flex gap-3 rounded-2xl border border-line bg-white p-4">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-[#080808]">{n}</span>
            <span>
              <span className="block font-bold text-ink">{title}</span>
              <span className="mt-1 block text-sm text-muted">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      <h2 className="mt-8 display text-xl font-bold text-ink">Premios disponibles</h2>
      {error ? <p role="alert" className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
      {rewards === null && !error ? <p className="mt-3 text-sm text-muted">Cargando premios...</p> : null}
      {rewards !== null && rewards.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-line bg-white p-5 text-sm text-muted">
          Estamos preparando los premios. Mientras tanto, seguí sumando puntos con tus compras.
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(rewards ?? []).map((reward) => {
          const missing = reward.points - balance;
          const progress = Math.min(100, Math.round((balance / reward.points) * 100));
          return (
            <article key={reward.id} className="wicel-card flex flex-col rounded-2xl p-4">
              <div className="flex h-48 items-center justify-center rounded-xl bg-white">
                <ProductPhoto src={reward.image} alt={reward.name} className={`h-36 w-36 ${reward.stock <= 0 ? "opacity-50" : ""}`} />
              </div>
              <h3 className="mt-4 text-lg font-bold text-ink">{reward.name}</h3>
              {reward.description ? <p className="mt-1 whitespace-pre-line text-sm text-muted">{reward.description}</p> : null}
              <p className="price mt-3 text-2xl font-bold">{reward.points.toLocaleString("es-AR")} puntos</p>
              <p className={`text-xs font-semibold ${reward.stock <= 0 ? "text-bad" : reward.stock <= 3 ? "text-gold" : "text-ok"}`}>
                {reward.stock <= 0 ? "Agotado por ahora" : reward.stock <= 3 ? `¡${reward.stock === 1 ? "Queda 1" : `Quedan ${reward.stock}`}!` : "Disponible"}
              </p>
              {customer && missing > 0 ? (
                <div className="mt-3">
                  <div className="h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`Tenés el ${progress}% de los puntos`}>
                    <div className="h-full rounded-full bg-brand" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">Te faltan {missing.toLocaleString("es-AR")} puntos (unos {formatPrice(Math.ceil(missing / perThousand) * 1000)} en compras).</p>
                </div>
              ) : null}
              <div className="mt-auto pt-4">
                {!user ? (
                  <button type="button" onClick={() => onLogin("ingresar")} className="w-full rounded-full border border-ink/30 py-2.5 text-sm font-semibold">Ingresá para canjear</button>
                ) : !customer ? (
                  <p className="text-center text-xs text-muted">Los canjes son para clientes.</p>
                ) : (
                  <button
                    type="button"
                    disabled={reward.stock <= 0 || missing > 0}
                    onClick={() => setChosen(reward)}
                    className="w-full rounded-full bg-ink py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 text-white hover:bg-black"
                  >
                    {reward.stock <= 0 ? "Agotado" : missing > 0 ? "Todavía no te alcanza" : "Canjear"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {customer && mine.length > 0 ? (
        <section className="mt-10">
          <h2 className="display text-xl font-bold text-ink">Tus canjes</h2>
          <ul className="mt-3 space-y-2">
            {mine.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-3 text-sm">
                <span className="font-bold text-ink">{item.code}</span>
                <span className="flex-1 text-muted">{item.reward}</span>
                <span className="text-muted">{item.points.toLocaleString("es-AR")} puntos</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[item.status]}`}>{item.statusLabel}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {chosen && customer ? (
        <RedeemDialog
          reward={chosen}
          balance={balance}
          onClose={() => setChosen(null)}
          onDone={(result) => {
            setChosen(null);
            setDone(result);
            setKnown(result.balance);
            setRewards((list) => list?.map((item) => item.id === chosen.id ? { ...item, stock: item.stock - 1 } : item) ?? null);
            onRedeemed();
          }}
        />
      ) : null}
      {done ? <DoneDialog result={done} onClose={() => setDone(null)} /> : null}
    </main>
  );
}

function PointsBox({ user, balance, next, perThousand, onLogin }: { user: Account | null; balance: number; next?: Reward; perThousand: number; onLogin: (mode: "ingresar" | "registro") => void }) {
  if (!user) {
    return (
      <div className="w-full max-w-sm rounded-2xl bg-brand p-5 text-[#080808]">
        <p className="text-sm font-semibold text-ink">¿Todavía no tenés cuenta?</p>
        <p className="mt-1 text-sm">Registrate gratis: los puntos se suman solos con cada compra.</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => onLogin("registro")} className="flex-1 rounded-full bg-ink py-2 text-sm font-semibold text-white hover:bg-black">Registrarme</button>
          <button type="button" onClick={() => onLogin("ingresar")} className="flex-1 rounded-full border border-[#080808]/30 py-2 text-sm font-semibold hover:border-[#080808]">Ingresar</button>
        </div>
      </div>
    );
  }
  if (user.role !== "cliente") return null;
  return (
    <div className="w-full max-w-sm rounded-2xl bg-brand p-5 text-[#080808]">
      <p className="text-sm font-medium">Tus puntos</p>
      <p className="price display text-4xl font-bold">{balance.toLocaleString("es-AR")}</p>
      <p className="mt-1 text-xs text-muted">
        {next ? `Te faltan ${(next.points - balance).toLocaleString("es-AR")} para ${next.name} (unos ${formatPrice(Math.ceil((next.points - balance) / perThousand) * 1000)} en compras).` : "Te alcanza para cualquiera de los premios disponibles."}
      </p>
    </div>
  );
}

function RedeemDialog({ reward, balance, onClose, onDone }: { reward: Reward; balance: number; onClose: () => void; onDone: (result: PlacedRedemption) => void }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="canje-titulo"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          void redeemReward(reward.id, phone).then((result) => {
            setBusy(false);
            if (result.ok) onDone(result.data);
            else setError(result.error);
          });
        }}
      >
        <p className="text-xs font-semibold text-gold">Confirmá el canje</p>
        <h2 id="canje-titulo" className="mt-1 display text-2xl font-bold text-ink">{reward.name}</h2>
        <dl className="mt-4 space-y-2 rounded-xl bg-paper p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">Tus puntos</dt><dd className="font-semibold text-ink">{balance.toLocaleString("es-AR")}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">Este premio</dt><dd className="font-semibold text-ink">− {reward.points.toLocaleString("es-AR")}</dd></div>
          <div className="flex justify-between border-t border-line pt-2"><dt className="text-muted">Te quedan</dt><dd className="font-bold">{(balance - reward.points).toLocaleString("es-AR")}</dd></div>
        </dl>
        <label htmlFor="canje-telefono" className="mt-4 block text-sm font-semibold text-ink">Tu WhatsApp</label>
        <input id="canje-telefono" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="351 000-0000" inputMode="tel" autoComplete="tel" className="mt-1 h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-ink placeholder:text-[#85857f]" />
        <p className="mt-1 text-xs text-muted">Te escribimos para coordinar el retiro o el envío.</p>
        {error ? <p role="alert" className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p> : null}
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-line py-2.5 text-sm font-semibold text-ink">Volver</button>
          <button disabled={busy} className="flex-1 rounded-full bg-ink py-2.5 text-sm font-semibold disabled:opacity-60 text-white hover:bg-black">{busy ? "Canjeando..." : "Canjear"}</button>
        </div>
      </form>
    </div>
  );
}

function DoneDialog({ result, onClose }: { result: PlacedRedemption; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4" onClick={onClose}>
      <article role="dialog" aria-modal="true" aria-labelledby="canje-listo" className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <p className="text-xs font-bold text-gold">Canje {result.code}</p>
        <h2 id="canje-listo" className="mt-2 display text-2xl font-bold text-ink">¡Listo! {result.reward} es tuyo</h2>
        <p className="mt-2 text-sm text-muted">Te escribimos por WhatsApp para coordinar la entrega. Guardá el código del canje.</p>
        <p className="mt-4 rounded-xl bg-paper p-3 text-sm text-muted">Te quedan <span className="font-bold">{result.balance.toLocaleString("es-AR")}</span> puntos.</p>
        <button type="button" onClick={onClose} className="mt-5 w-full rounded-full bg-ink py-2.5 text-sm font-semibold text-white hover:bg-black">Seguir</button>
      </article>
    </div>
  );
}
