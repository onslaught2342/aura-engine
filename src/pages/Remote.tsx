import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { normalizeRoom, type PresenterState, type RemoteCommand } from "@/lib/remote/protocol";
import { RELAY_URL } from "@/lib/remote/commands";
import { CONFIG } from "@/engine/config";
import { EFFECT_NAMES } from "@/engine/effectNames";
import { getThumb } from "@/lib/videoThumbCache";
import { useRemoteChannel } from "@/lib/remote/useRemoteChannel";

type Tab = "control" | "slides" | "settings";

const panel: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.10)",
};

const Remote = () => {
  const [params, setParams] = useSearchParams();
  const [room, setRoom] = useState(() => normalizeRoom(params.get("room") ?? ""));
  const [pass, setPass] = useState(() => params.get("p") ?? "");
  const [connected, setConnected] = useState(() => !!params.get("room") && !!params.get("p"));
  const [state, setState] = useState<PresenterState | null>(null);
  const [tab, setTab] = useState<Tab>("control");
  const [now, setNow] = useState(Date.now());
  const touchX = useRef<number | null>(null);

  const onState = useCallback((s: PresenterState) => setState(s), []);

  /* The remote is served from the same site as the presentation, so the whole
   * playlist is already here — names and previews never travel over the relay. */
  const slides = useMemo(
    () =>
      CONFIG.video.playlist.map((item, i) => ({
        i,
        name: EFFECT_NAMES[item.background?.type] ?? item.background?.type ?? "Slide",
        src: item.src,
      })),
    []
  );
  const [thumbs, setThumbs] = useState<{ cur: string | null; next: string | null }>({ cur: null, next: null });

  const channel = useRemoteChannel({ room, password: pass, role: "remote", enabled: connected, onState });
  const { send, status, latency, presenterOnline, error } = channel;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const cmd = useCallback(
    (c: RemoteCommand) => {
      if (navigator.vibrate) navigator.vibrate(8);
      send(c);
    },
    [send]
  );

  // Desktop keyboard support
  useEffect(() => {
    if (!connected) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") cmd({ k: "next" });
      if (e.key === "ArrowLeft" || e.key === "PageUp") cmd({ k: "prev" });
      if (e.key === " ") { e.preventDefault(); cmd({ k: "togglePlay" }); }
      if (e.key === "b" || e.key === "B") cmd({ k: "blank", value: !state?.blank });
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cmd, connected, state?.blank]);

  const idx = state?.index ?? 0;
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    const cur = slides[idx]?.src;
    const nxt = slides[idx + 1]?.src ?? slides[0]?.src;
    Promise.all([cur ? getThumb(cur) : null, nxt ? getThumb(nxt) : null])
      .then(([a, b]) => { if (!cancelled) setThumbs({ cur: a ?? null, next: b ?? null }); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [connected, idx, slides]);

  const elapsed = useMemo(() => {
    if (!state) return "0:00";
    const secs = Math.max(0, Math.floor((now - state.startedAt) / 1000));
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }, [state, now]);

  const statusColor =
    status === "connected" ? (presenterOnline ? "#4ade80" : "#fbbf24") : status === "error" ? "#f87171" : "#fbbf24";
  const statusText =
    status === "connected"
      ? presenterOnline
        ? `Connected${latency !== null ? ` · ${latency} ms` : ""}`
        : "Waiting for the screen…"
      : status === "reconnecting"
        ? "Reconnecting…"
        : status === "connecting"
          ? "Connecting…"
          : status === "error"
            ? "Not connected"
            : "Idle";

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 font-mono" style={{ background: "#06060a", color: "rgba(255,255,255,0.85)" }}>
        <div className="w-full max-w-sm rounded-2xl p-6" style={panel}>
          <h1 className="text-lg tracking-widest uppercase mb-1">Slide remote</h1>
          <p className="text-xs opacity-50 mb-6">Enter the code shown on the presentation screen.</p>

          {!RELAY_URL && (
            <p className="text-xs mb-4 leading-relaxed" style={{ color: "#fca5a5" }}>
              No relay configured. Deploy the worker and set VITE_REMOTE_RELAY_URL.
            </p>
          )}

          <label className="block text-[10px] uppercase tracking-wider opacity-50 mb-1">Room code</label>
          <input
            value={room}
            onChange={(e) => setRoom(normalizeRoom(e.target.value))}
            inputMode="text"
            autoCapitalize="characters"
            className="w-full rounded-lg px-3 py-3 mb-4 text-center text-xl tracking-[0.4em] outline-none"
            style={{ ...panel, color: "#fff" }}
          />

          <label className="block text-[10px] uppercase tracking-wider opacity-50 mb-1">Password</label>
          <input
            value={pass}
            onChange={(e) => setPass(e.target.value.slice(0, 32))}
            type="password"
            className="w-full rounded-lg px-3 py-3 mb-6 outline-none"
            style={{ ...panel, color: "#fff" }}
          />

          <button
            disabled={room.length < 4 || pass.length < 3}
            onClick={() => {
              setParams({ room, p: pass });
              setConnected(true);
            }}
            className="w-full rounded-lg py-3 uppercase tracking-widest text-sm disabled:opacity-40"
            style={{ background: "rgba(74,222,128,0.16)", border: "1px solid rgba(74,222,128,0.4)", color: "#86efac" }}
          >
            Connect
          </button>
          {error && <p className="mt-3 text-xs" style={{ color: "#fca5a5" }}>{error}</p>}
        </div>
      </div>
    );
  }

  const total = state?.total ?? slides.length;
  const index = state?.index ?? 0;

  return (
    <div
      className="min-h-screen font-mono select-none flex flex-col"
      style={{ background: "#06060a", color: "rgba(255,255,255,0.88)" }}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 70) cmd(dx < 0 ? { k: "next" } : { k: "prev" });
        touchX.current = null;
      }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ background: "rgba(6,6,10,0.9)", backdropFilter: "blur(10px)" }}>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: statusColor }} />
          <span className="opacity-70">{statusText}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] opacity-60">
          <span>{elapsed}</span>
          <span>{total ? `${index + 1}/${total}` : "—"}</span>
        </div>
      </header>

      {/* Preview */}
      <div className="px-4">
        <div className="rounded-xl overflow-hidden aspect-video flex items-center justify-center relative" style={panel}>
          {state?.blank ? (
            <span className="text-xs tracking-widest uppercase opacity-60">Screen blanked</span>
          ) : thumbs.cur ? (
            <img src={thumbs.cur} alt="Current slide" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs opacity-40">{state ? "No preview" : "Waiting…"}</span>
          )}
          {thumbs.next && !state?.blank && (
            <img
              src={thumbs.next}
              alt="Next slide"
              className="absolute bottom-2 right-2 w-16 rounded border object-cover"
              style={{ borderColor: "rgba(255,255,255,0.25)", aspectRatio: "16/9" }}
            />
          )}
        </div>
        <div className="mt-2 text-[11px] opacity-50 truncate">
          {slides[index]?.name ?? ""}{slides[index + 1] ? ` → ${slides[index + 1].name}` : ""}
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex gap-2 px-4 mt-4">
        {(["control", "slides", "settings"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-lg py-2 text-[11px] uppercase tracking-wider"
            style={{
              ...panel,
              background: tab === t ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.05)",
              color: tab === t ? "#fff" : "rgba(255,255,255,0.55)",
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="flex-1 p-4 pb-8">
        {tab === "control" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <BigButton label="Prev" glyph="←" onClick={() => cmd({ k: "prev" })} />
              <BigButton label="Next" glyph="→" onClick={() => cmd({ k: "next" })} accent />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <SmallButton label={state?.paused ? "Play" : "Pause"} onClick={() => cmd({ k: "togglePlay" })} />
              <SmallButton
                label={state?.muted ? "Unmute" : "Mute"}
                active={state?.muted}
                onClick={() => cmd({ k: "mute", value: !state?.muted })}
              />
              <SmallButton
                label={state?.blank ? "Show" : "Blank"}
                active={state?.blank}
                onClick={() => cmd({ k: "blank", value: !state?.blank })}
              />
            </div>
            <div className="rounded-xl p-3" style={panel}>
              <div className="flex justify-between text-[10px] uppercase tracking-wider opacity-50 mb-2">
                <span>Volume</span>
                <span>{Math.round((state?.volume ?? 0) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((state?.volume ?? 0) * 100)}
                onChange={(e) => send({ k: "volume", value: Number(e.target.value) / 100 })}
                className="w-full accent-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SmallButton
                label={state?.fullscreen ? "Exit full screen" : "Full screen"}
                onClick={() => cmd({ k: "fullscreen", value: !state?.fullscreen })}
              />
              <SmallButton label="Re-sync" onClick={() => cmd({ k: "resync" })} />
            </div>
          </div>
        )}

        {tab === "slides" && (
          <div className="space-y-3">
            <GotoField total={total} onGo={(i) => cmd({ k: "goto", index: i })} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slides.map((s) => (
                <button
                  key={s.i}
                  onClick={() => cmd({ k: "goto", index: s.i })}
                  className="rounded-lg px-3 py-3 text-left"
                  style={{
                    ...panel,
                    background: s.i === index ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="text-sm">{s.i + 1}</div>
                  <div className="text-[10px] opacity-50 truncate">{s.name}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "settings" && state && (
          <div className="space-y-2">
            <Toggle label="Auto advance" value={state.controls.autoAdvance} onChange={(v) => cmd({ k: "setControls", patch: { autoAdvance: v } })} />
            <Stepper
              label="Advance delay"
              suffix="s"
              value={state.controls.autoAdvanceDelay}
              step={1}
              min={0}
              max={120}
              onChange={(v) => send({ k: "setControls", patch: { autoAdvanceDelay: v } })}
            />
            <Toggle label="Loop playlist" value={state.controls.loopPlaylist} onChange={(v) => cmd({ k: "setControls", patch: { loopPlaylist: v } })} />
            <Toggle label="Random transitions" value={state.controls.randomTransitions} onChange={(v) => cmd({ k: "setControls", patch: { randomTransitions: v } })} />
            <Stepper
              label="Transition"
              suffix="ms"
              value={state.controls.transitionDuration}
              step={100}
              min={0}
              max={5000}
              onChange={(v) => send({ k: "setControls", patch: { transitionDuration: v } })}
            />
            <Toggle label="Slide number" value={state.controls.showSlideNumber} onChange={(v) => cmd({ k: "setControls", patch: { showSlideNumber: v } })} />
            <Toggle label="Progress bar" value={state.controls.showProgressBar} onChange={(v) => cmd({ k: "setControls", patch: { showProgressBar: v } })} />
            <Toggle label="Hide UI when idle" value={state.controls.idleHideUI} onChange={(v) => cmd({ k: "setControls", patch: { idleHideUI: v } })} />
            <Toggle label="Arrow keys on screen" value={state.controls.arrowNavigation} onChange={(v) => cmd({ k: "setControls", patch: { arrowNavigation: v } })} />
            <Toggle label="Swipe on screen" value={state.controls.swipeNavigation} onChange={(v) => cmd({ k: "setControls", patch: { swipeNavigation: v } })} />
            <div className="rounded-xl p-3 flex items-center justify-between" style={panel}>
              <span className="text-xs">Video fit</span>
              <div className="flex gap-2">
                {(["contain", "cover"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => cmd({ k: "setVideo", patch: { fit: f } })}
                    className="rounded px-3 py-1.5 text-[11px]"
                    style={{
                      ...panel,
                      background: state.fit === f ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => { setConnected(false); setParams({}); }}
              className="w-full rounded-lg py-3 mt-4 text-[11px] uppercase tracking-widest"
              style={{ ...panel, color: "#fca5a5", borderColor: "rgba(248,113,113,0.35)" }}
            >
              Disconnect
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

const BigButton = ({ label, glyph, onClick, accent }: { label: string; glyph: string; onClick: () => void; accent?: boolean }) => (
  <button
    onClick={onClick}
    className="rounded-2xl py-10 flex flex-col items-center gap-1 active:scale-[0.98] transition-transform"
    style={{
      background: accent ? "rgba(74,222,128,0.14)" : "rgba(255,255,255,0.06)",
      border: `1px solid ${accent ? "rgba(74,222,128,0.4)" : "rgba(255,255,255,0.12)"}`,
      color: accent ? "#86efac" : "rgba(255,255,255,0.85)",
    }}
  >
    <span className="text-4xl leading-none">{glyph}</span>
    <span className="text-[11px] uppercase tracking-widest opacity-70">{label}</span>
  </button>
);

const SmallButton = ({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }) => (
  <button
    onClick={onClick}
    className="rounded-xl py-4 text-[11px] uppercase tracking-wider active:scale-[0.98] transition-transform"
    style={{
      background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.12)",
      color: "rgba(255,255,255,0.85)",
    }}
  >
    {label}
  </button>
);

const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!value)}
    className="w-full rounded-xl p-3 flex items-center justify-between"
    style={panel}
  >
    <span className="text-xs">{label}</span>
    <span
      className="w-10 h-6 rounded-full relative transition-colors"
      style={{ background: value ? "rgba(74,222,128,0.6)" : "rgba(255,255,255,0.15)" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
        style={{ left: value ? 18 : 2 }}
      />
    </span>
  </button>
);

const Stepper = ({
  label, value, onChange, step, min, max, suffix,
}: { label: string; value: number; onChange: (v: number) => void; step: number; min: number; max: number; suffix: string }) => (
  <div className="rounded-xl p-3 flex items-center justify-between" style={panel}>
    <span className="text-xs">{label}</span>
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-9 h-9 rounded-lg"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >−</button>
      <span className="text-xs w-16 text-center tabular-nums">{value}{suffix}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-9 h-9 rounded-lg"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >+</button>
    </div>
  </div>
);

const GotoField = ({ total, onGo }: { total: number; onGo: (i: number) => void }) => {
  const [v, setV] = useState("");
  const n = parseInt(v, 10);
  const valid = Number.isFinite(n) && n >= 1 && n <= total;
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => { e.preventDefault(); if (valid) { onGo(n - 1); setV(""); } }}
    >
      <input
        value={v}
        onChange={(e) => setV(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        placeholder={`Slide number (1–${total || "?"})`}
        className="flex-1 rounded-lg px-3 py-3 outline-none text-sm"
        style={{ ...panel, color: "#fff" }}
      />
      <button
        disabled={!valid}
        className="rounded-lg px-5 text-[11px] uppercase tracking-widest disabled:opacity-40"
        style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        Go
      </button>
    </form>
  );
};

export default Remote;
