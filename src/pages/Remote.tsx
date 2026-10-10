import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { normalizeRoom, type PresenterState, type RemoteCommand } from "@/lib/remote/protocol";
import { RELAY_URL, TRANSITION_TYPES, timerElapsed } from "@/lib/remote/commands";
import { CONFIG } from "@/engine/config";
import { EFFECT_NAMES } from "@/engine/effectNames";
import { getThumb } from "@/lib/videoThumbCache";
import { useRemoteChannel } from "@/lib/remote/useRemoteChannel";
import { RehearsePanel } from "@/components/remote/RehearsePanel";
import { MiniStage } from "@/components/builder/MiniStage";

type Tab = "control" | "notes" | "rehearse" | "pointer" | "look" | "slides" | "settings";
const TABS: Tab[] = ["control", "notes", "rehearse", "pointer", "look", "slides", "settings"];
const fmt = (ms: number) => { const t = Math.floor(Math.abs(ms) / 1000); const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return `${ms < 0 ? "-" : ""}${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${String(s).padStart(2, "0")}`; };

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
  const { send, status, latency, presenterOnline, error, pointer, reconnect } = channel;

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

  const [visible, setVisible] = useState(!document.hidden);
  useEffect(() => {
    const v = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", v);
    return () => document.removeEventListener("visibilitychange", v);
  }, []);
  const effectKey = state?.effect;
  const previewSlide = useMemo(() => {
    const base = CONFIG.video.playlist[idx];
    if (!base) return null;
    return effectKey && effectKey !== base.background.type ? { ...base, background: { ...base.background, type: effectKey } } : base;
  }, [idx, effectKey]);

  const elapsedMs = state?.timer ? timerElapsed(state.timer, now) : state ? now - state.startedAt : 0;
  const elapsed = fmt(elapsedMs);
  const remainMs = state?.timer?.countdown ? state.timer.countdown * 1000 - elapsedMs : null;
  const remainColor = remainMs === null ? undefined : remainMs < 60000 ? "#f87171" : remainMs < 300000 ? "#fbbf24" : "#86efac";

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

  if (status === "waiting" || status === "denied" || status === "kicked") {
    const msg = status === "waiting"
      ? { h: "Waiting for approval", p: "Ask the presenter to press Allow on the presentation screen." }
      : status === "denied"
        ? { h: "Request denied", p: "The presenter declined this device. You can ask again." }
        : { h: "Disconnected", p: "The presenter removed this device. They need to unblock it before you can rejoin." };
    return (
      <div className="min-h-screen flex items-center justify-center p-6 font-mono" style={{ background: "#06060a", color: "rgba(255,255,255,0.85)" }}>
        <div className="w-full max-w-sm rounded-2xl p-6 text-center" style={panel}>
          {status === "waiting" && <div className="mx-auto mb-4 w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(255,255,255,0.15)", borderTopColor: "#fbbf24" }} />}
          <h1 className="text-base tracking-widest uppercase mb-2" style={{ color: status === "waiting" ? "#fcd34d" : "#fca5a5" }}>{msg.h}</h1>
          <p className="text-xs opacity-60 mb-6">{msg.p}</p>
          {status !== "waiting" && (
            <button onClick={reconnect} className="w-full rounded-lg py-3 mb-2 text-[11px] uppercase tracking-widest" style={{ ...panel, color: "#86efac" }}>Ask again</button>
          )}
          <button onClick={() => { setConnected(false); setParams({}); }} className="w-full rounded-lg py-3 text-[11px] uppercase tracking-widest" style={panel}>Leave</button>
        </div>
      </div>
    );
  }

  const total = state?.total ?? slides.length;
  const index = state?.index ?? 0;

  return (
    <div
      className="font-mono select-none flex flex-col mx-auto w-full max-w-xl md:max-w-7xl pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-6"
      style={{ minHeight: "100dvh", background: "#06060a", color: "rgba(255,255,255,0.88)", touchAction: "manipulation", WebkitTapHighlightColor: "transparent", overscrollBehavior: "none" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 sticky top-0 z-10" style={{ background: "rgba(6,6,10,0.92)", paddingTop: "calc(12px + env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: statusColor }} />
          <span className="opacity-70">{statusText}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] opacity-60">
          <span>{elapsed}</span>
          {remainMs !== null && <span style={{ color: remainColor }}>{fmt(remainMs)}</span>}
          <span>{total ? `${index + 1}/${total}` : "—"}</span>
        </div>
      </header>

      {/* Tabs — fixed bottom bar on phones, top bar on tablets/PC */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-7 md:static md:mx-4 md:mb-4 md:rounded-xl md:overflow-hidden" style={{ background: "rgba(6,6,10,0.96)", border: "1px solid rgba(255,255,255,0.1)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="py-3 text-[9px] sm:text-[11px] md:text-xs uppercase tracking-wide truncate hover:bg-white/5"
            style={{ color: tab === t ? "#fff" : "rgba(255,255,255,0.45)", borderTop: `2px solid ${tab === t ? "#86efac" : "transparent"}` }}>
            {t}
          </button>
        ))}
      </nav>

      <div className="flex-1 md:grid md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-2 md:items-start">
      {/* Preview (left column on tablet/PC) */}
      <div className="px-4 md:sticky md:top-20 md:space-y-3">
        <div
          className="rounded-xl overflow-hidden aspect-video relative"
          style={{ ...panel, touchAction: "pan-y" }}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(dx) > 60) cmd(dx < 0 ? { k: "next" } : { k: "prev" });
            touchX.current = null;
          }}
        >
          {state?.blank ? (
            <div className="absolute inset-0 flex items-center justify-center text-xs tracking-widest uppercase opacity-60">Screen blanked</div>
          ) : previewSlide ? (
            <MiniStage slide={previewSlide} transitionDuration={300} active={visible} maxFps={24} videoLoop={!!previewSlide.loop} paused={!!state?.paused} className="absolute inset-0 w-full h-full" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs opacity-40">{state ? "No preview" : "Waiting…"}</div>
          )}
          {thumbs.next && !state?.blank && (
            <img src={thumbs.next} alt="Next slide" className="absolute bottom-2 right-2 w-16 md:w-28 rounded border object-contain bg-black"
              style={{ borderColor: "rgba(255,255,255,0.25)", aspectRatio: "16/9", zIndex: 5 }} />
          )}
        </div>
        <div className="mt-2 text-[11px] md:text-sm opacity-50 truncate">
          {state?.label ?? slides[index]?.name ?? ""}{(state?.nextLabel ?? slides[index + 1]?.name) ? ` → ${state?.nextLabel ?? slides[index + 1]?.name}` : ""}
        </div>
        {/* Desktop/tablet: always-visible notes + quick nav under the preview */}
        <div className="hidden md:block rounded-xl p-4 max-h-[32vh] overflow-auto whitespace-pre-wrap text-sm leading-relaxed" style={panel}>
          <div className="text-[10px] uppercase tracking-wider opacity-50 mb-2">Speaker notes</div>
          {state?.notes || CONFIG.video.playlist[idx]?.notes || <span className="opacity-40">No notes for this slide.</span>}
        </div>
        {tab !== "control" && (
          <div className="hidden md:grid grid-cols-2 gap-3">
            <BigButton label="Prev" glyph="←" onClick={() => cmd({ k: "prev" })} />
            <BigButton label="Next" glyph="→" onClick={() => cmd({ k: "next" })} accent />
          </div>
        )}
      </div>

      <main className="flex-1 p-4 md:pt-0">
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

        {tab === "notes" && (
          <div className="space-y-3">
            <div className="rounded-xl p-4 min-h-[120px] whitespace-pre-wrap text-sm leading-relaxed" style={panel}>
              {state?.notes ? state.notes : <span className="opacity-40">No notes for this slide.</span>}
            </div>
            <div className="rounded-xl p-3 flex items-center gap-3" style={panel}>
              {thumbs.next ? <img src={thumbs.next} alt="Next slide" className="w-24 rounded object-contain bg-black" style={{ aspectRatio: "16/9" }} /> : null}
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider opacity-50">Next up</div>
                <div className="text-xs truncate">{state?.nextLabel || "End of show"}</div>
              </div>
            </div>
            <TimerPanel
              elapsed={elapsed} remain={remainMs !== null ? fmt(remainMs) : null} remainColor={remainColor}
              running={!!state?.timer?.running} countdown={state?.timer?.countdown ?? 0} now={now}
              onCmd={(action, seconds) => cmd({ k: "timer", action, seconds })}
            />
            <div className="grid grid-cols-2 gap-3">
              <BigButton label="Prev" glyph="←" onClick={() => cmd({ k: "prev" })} />
              <BigButton label="Next" glyph="→" onClick={() => cmd({ k: "next" })} accent />
            </div>
          </div>
        )}

        {tab === "rehearse" && (
          <RehearsePanel
            index={idx}
            notes={CONFIG.video.playlist[idx]?.script || state?.notes || CONFIG.video.playlist[idx]?.notes || ""}
            targetSeconds={CONFIG.video.playlist[idx]?.targetSeconds ?? null}
            label={state?.label ?? slides[idx]?.name ?? ""}
            onNext={() => cmd({ k: "next" })}
            onPrev={() => cmd({ k: "prev" })}
          />
        )}

        {tab === "pointer" && <PointerPad onPointer={pointer} />}

        {tab === "look" && state && (
          <div className="space-y-3">
            <div className="rounded-xl p-3" style={panel}>
              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-2">Background effect (this slide)</div>
              <select
                value={state.effect}
                onChange={(e) => cmd({ k: "setSlideEffect", effect: e.target.value })}
                className="w-full rounded-lg px-3 py-3 text-sm outline-none"
                style={{ background: "#14141a", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                {Object.entries(EFFECT_NAMES).sort((a, b) => a[1].localeCompare(b[1])).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
              </select>
            </div>
            <div className="rounded-xl p-3" style={panel}>
              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-2">Transition (this slide)</div>
              <div className="grid grid-cols-3 gap-1.5">
                {TRANSITION_TYPES.map((t) => (
                  <button key={t} onClick={() => cmd({ k: "setTransition", type: t })} className="rounded px-1 py-2 text-[10px] truncate"
                    style={{ ...panel, background: state.transition === t ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)" }}>{t}</button>
                ))}
              </div>
            </div>
            <div className="rounded-xl p-3 flex items-center justify-between" style={panel}>
              <span className="text-xs">Video fit</span>
              <div className="flex gap-2">
                {(["contain", "cover"] as const).map((f) => (
                  <button key={f} onClick={() => cmd({ k: "setVideo", patch: { fit: f } })} className="rounded px-3 py-1.5 text-[11px]"
                    style={{ ...panel, background: state.fit === f ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.05)" }}>{f}</button>
                ))}
              </div>
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
    </div>
  );
};

const BigButton = ({ label, glyph, onClick, accent }: { label: string; glyph: string; onClick: () => void; accent?: boolean }) => (
  <button
    onClick={onClick}
    className="rounded-2xl py-8 flex flex-col items-center gap-1 active:scale-[0.98] transition-transform"
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

const TimerPanel = ({ elapsed, remain, remainColor, running, countdown, now, onCmd }: {
  elapsed: string; remain: string | null; remainColor?: string; running: boolean; countdown: number; now: number;
  onCmd: (a: "start" | "pause" | "reset" | "countdown", s?: number) => void;
}) => (
  <div className="rounded-xl p-3 space-y-3" style={panel}>
    <div className="flex items-end justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-wider opacity-50">Elapsed</div>
        <div className="text-2xl tabular-nums">{elapsed}</div>
      </div>
      {remain && (
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider opacity-50">Left</div>
          <div className="text-2xl tabular-nums" style={{ color: remainColor }}>{remain}</div>
        </div>
      )}
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider opacity-50">Clock</div>
        <div className="text-2xl tabular-nums">{new Date(now).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <SmallButton label={running ? "Pause timer" : "Start timer"} onClick={() => onCmd(running ? "pause" : "start")} />
      <SmallButton label="Reset" onClick={() => onCmd("reset")} />
    </div>
    <div className="flex gap-1.5 items-center">
      <span className="text-[10px] uppercase opacity-50 mr-1">Countdown</span>
      {[0, 5, 10, 15, 20, 30, 45, 60].map((m) => (
        <button key={m} onClick={() => onCmd("countdown", m * 60)} className="flex-1 rounded py-1.5 text-[10px]"
          style={{ ...panel, background: countdown === m * 60 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)" }}>{m === 0 ? "off" : m}</button>
      ))}
    </div>
  </div>
);

const LASER_COLORS = ["#ff3b3b", "#22c55e", "#3b82f6", "#facc15", "#ffffff"];

const PointerPad = ({ onPointer }: { onPointer: (p: { x: number; y: number; down: boolean; color?: string; size?: number }) => void }) => {
  const [color, setColor] = useState(LASER_COLORS[0]);
  const [size, setSize] = useState(18);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const emit = (e: React.PointerEvent, down: boolean) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    onPointer({ x, y, down, color, size });
  };
  return (
    <div className="space-y-3">
      <div
        ref={ref}
        className="rounded-xl aspect-video relative touch-none flex items-center justify-center"
        style={{ ...panel, background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)" }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); setActive(true); emit(e, true); }}
        onPointerMove={(e) => { if (active) emit(e, true); }}
        onPointerUp={(e) => { setActive(false); emit(e, false); }}
        onPointerCancel={(e) => { setActive(false); emit(e, false); }}
      >
        <span className="text-xs opacity-40 pointer-events-none">{active ? "Pointing…" : "Drag here to point on the screen"}</span>
      </div>
      <div className="rounded-xl p-3 flex items-center justify-between" style={panel}>
        <span className="text-xs">Colour</span>
        <div className="flex gap-2">
          {LASER_COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-label={`Colour ${c}`} className="w-7 h-7 rounded-full"
              style={{ background: c, outline: color === c ? "2px solid #fff" : "none", outlineOffset: 2 }} />
          ))}
        </div>
      </div>
      <div className="rounded-xl p-3" style={panel}>
        <div className="flex justify-between text-[10px] uppercase tracking-wider opacity-50 mb-2"><span>Dot size</span><span>{size}px</span></div>
        <input type="range" min={6} max={60} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-white" />
      </div>
    </div>
  );
};

export default Remote;
