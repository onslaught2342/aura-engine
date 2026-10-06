import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EngineConfig, VideoItem } from "@/engine/config";
import { makeRoomCode, normalizeRoom, type PointerFrame, type RemoteCommand, type TimerState } from "@/lib/remote/protocol";
import { RELAY_URL, applyCommand, buildSnapshot, type LocalPresenterState } from "@/lib/remote/commands";
import { useRemoteChannel } from "@/lib/remote/useRemoteChannel";

interface Props {
  config: EngineConfig;
  playlist: VideoItem[];
  currentSlide: number;
  onConfigChange: (c: EngineConfig) => void;
  onPlaylistChange: (p: VideoItem[]) => void;
  blank: boolean;
  onBlankChange: (v: boolean) => void;
}

const LS_KEY = "remote.session";
const IDLE_MS = 2500;

const loadSession = (): { room: string; pass: string } => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { room?: string; pass?: string };
      if (p.room && p.pass) return { room: normalizeRoom(p.room), pass: p.pass };
    }
  } catch { /* ignore */ }
  return { room: makeRoomCode(), pass: Math.random().toString(36).slice(2, 6) };
};

const ago = (t: number, now: number) => {
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};

const box: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" };
const btn = (tone: "green" | "red" | "plain" = "plain"): React.CSSProperties => ({
  background: tone === "green" ? "rgba(74,222,128,0.15)" : tone === "red" ? "rgba(248,113,113,0.14)" : "rgba(255,255,255,0.07)",
  border: `1px solid ${tone === "green" ? "rgba(74,222,128,0.4)" : tone === "red" ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.14)"}`,
  color: tone === "green" ? "#86efac" : tone === "red" ? "#fca5a5" : "rgba(255,255,255,0.85)",
});

export const PresenterLink = ({ config, playlist, currentSlide, onConfigChange, onPlaylistChange, blank, onBlankChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(loadSession);
  const [live, setLive] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [timer, setTimer] = useState<TimerState>(() => ({ running: true, base: 0, at: Date.now(), countdown: 0 }));
  const [ptr, setPtr] = useState<PointerFrame | null>(null);
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [idle, setIdle] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState<string | null>(null);
  const startedAt = useRef(Date.now());

  const stateRef = useRef({ config, playlist, currentSlide, blank, paused, timer });
  stateRef.current = { config, playlist, currentSlide, blank, paused, timer };

  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(session)); }, [session]);

  useEffect(() => {
    const onPlay = (e: Event) => setPaused(!!(e as CustomEvent<{ paused: boolean }>).detail?.paused);
    window.addEventListener("slide:playstate", onPlay as EventListener);
    return () => window.removeEventListener("slide:playstate", onPlay as EventListener);
  }, []);

  // Visibility: hidden in fullscreen, fades out when the mouse rests
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    let t = 0;
    const wake = () => { setIdle(false); clearTimeout(t); t = window.setTimeout(() => setIdle(true), IDLE_MS); };
    wake();
    window.addEventListener("mousemove", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      window.removeEventListener("mousemove", wake);
      window.removeEventListener("pointerdown", wake);
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  const remoteUrl = useMemo(
    () => `${window.location.origin}/remote?room=${session.room}&p=${encodeURIComponent(session.pass)}`,
    [session]
  );

  useEffect(() => {
    if (!open || !live) return;
    let cancelled = false;
    import("qrcode")
      .then((m) => m.default.toDataURL(remoteUrl, { margin: 1, width: 360, color: { dark: "#000000", light: "#ffffff" } }))
      .then((url) => { if (!cancelled) setQr(url); })
      .catch(() => { if (!cancelled) setQr(null); });
    return () => { cancelled = true; };
  }, [open, live, remoteUrl]);

  const handleCommand = useCallback(
    (cmd: RemoteCommand) => {
      const s = stateRef.current;
      const local: LocalPresenterState = {
        index: s.currentSlide,
        paused: s.paused,
        muted: s.config.audio.globalMute,
        volume: s.config.video.globalVolume,
        blank: s.blank,
        fullscreen: !!document.fullscreenElement,
      };
      const res = applyCommand(cmd, s.config, local, s.playlist.length, s.playlist, s.timer);
      if (res.config) onConfigChange(res.config);
      if (res.playlist) onPlaylistChange(res.playlist);
      if (res.timer) setTimer(res.timer);
      if (typeof res.jump === "number") window.dispatchEvent(new CustomEvent("slide:jump", { detail: { index: res.jump } }));
      if (res.playback) window.dispatchEvent(new CustomEvent("slide:playback", { detail: { action: res.playback } }));
      if (res.local && typeof res.local.blank === "boolean") onBlankChange(res.local.blank);
      if (typeof res.fullscreen === "boolean") {
        if (res.fullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
        if (!res.fullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
      }
    },
    [onConfigChange, onPlaylistChange, onBlankChange]
  );

  const ptrTimer = useRef(0);
  const onPointer = useCallback((p: PointerFrame) => {
    clearTimeout(ptrTimer.current);
    if (!p.down) { setPtr(null); return; }
    setPtr(p);
    ptrTimer.current = window.setTimeout(() => setPtr(null), 1500); // safety if the lift frame is lost
  }, []);

  const channel = useRemoteChannel({
    room: session.room, password: session.pass, role: "presenter", enabled: live, onCommand: handleCommand, onPointer,
  });
  const { publish, status: channelStatus, devices, blocked, autoAdmit, admin } = channel;

  useEffect(() => {
    if (!live || channelStatus !== "connected") return;
    const id = window.setTimeout(() => {
      publish(buildSnapshot(config, {
        index: currentSlide, paused, muted: config.audio.globalMute, volume: config.video.globalVolume, blank, fullscreen,
      }, playlist.length, startedAt.current, playlist, timer));
    }, 120);
    return () => window.clearTimeout(id);
  }, [live, publish, channelStatus, config, currentSlide, paused, blank, playlist, timer, fullscreen]);

  const pending = devices.filter((d) => d.status === "pending");
  const admitted = devices.filter((d) => d.status === "admitted");

  const statusLabel =
    channelStatus === "connected" ? "Live"
      : channelStatus === "reconnecting" ? "Reconnecting…"
        : channelStatus === "connecting" ? "Connecting…"
          : channelStatus === "error" ? "Problem" : "Off";
  const dot = channelStatus === "connected" ? "#4ade80" : channelStatus === "error" ? "#f87171" : live ? "#fbbf24" : "#6b7280";

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(what); setTimeout(() => setCopied(null), 1200); }).catch(() => {});
  };

  const showButton = !fullscreen && (!idle || open);

  return (
    <>
      {/* Laser dot — always on top of slides, never blocks clicks */}
      {ptr && (
        <div
          className="fixed rounded-full"
          style={{
            zIndex: 45, pointerEvents: "none",
            left: `${ptr.x * 100}%`, top: `${ptr.y * 100}%`,
            width: ptr.size ?? 18, height: ptr.size ?? 18,
            transform: "translate(-50%,-50%)",
            background: ptr.color ?? "#ff3b3b",
            boxShadow: `0 0 ${(ptr.size ?? 18)}px ${(ptr.size ?? 18) / 2}px ${ptr.color ?? "#ff3b3b"}88`,
            transition: "left 40ms linear, top 40ms linear",
          }}
        />
      )}

      {/* Join requests — visible even in fullscreen so they're never missed */}
      {pending.length > 0 && !open && (
        <div className="fixed font-mono text-xs space-y-2" style={{ zIndex: 46, right: 16, bottom: 16, width: 280 }}>
          {pending.slice(0, 3).map((d) => (
            <div key={d.id} className="rounded-xl p-3" style={{ background: "rgba(8,8,12,0.94)", border: "1px solid rgba(251,191,36,0.45)", color: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)" }}>
              <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "#fcd34d" }}>Remote wants to connect</div>
              <div className="mb-2 truncate">{d.name}</div>
              <div className="flex gap-2">
                <button onClick={() => admin("admit", d.id)} className="flex-1 rounded py-1.5" style={btn("green")}>Allow</button>
                <button onClick={() => admin("deny", d.id)} className="flex-1 rounded py-1.5" style={btn("red")}>Deny</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed font-mono text-[11px] tracking-wide rounded-full px-3 py-1.5"
        style={{
          zIndex: 40, top: 16, left: 16,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.75)",
          opacity: showButton ? 1 : 0, pointerEvents: showButton ? "auto" : "none",
          transition: "opacity 0.4s",
        }}
        aria-label="Remote control"
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: dot }} />
        Remote
        {live && channelStatus === "connected" && <span className="ml-2 opacity-60">{admitted.length}</span>}
        {pending.length > 0 && <span className="ml-2 rounded-full px-1.5" style={{ background: "#fbbf24", color: "#000" }}>{pending.length}</span>}
      </button>

      {open && !fullscreen && (
        <div
          className="fixed rounded-2xl font-mono text-xs w-[380px] max-w-[94vw] overflow-y-auto"
          style={{
            zIndex: 41, top: 52, left: 16, maxHeight: "calc(100vh - 70px)",
            background: "rgba(8,8,12,0.94)", backdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.14)", color: "rgba(255,255,255,0.86)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Status */}
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: dot }} />
              <span className="uppercase tracking-widest text-[10px]">{statusLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] opacity-60">
              <span>{admitted.length} connected</span>
              <span>{channel.latency !== null ? `${channel.latency} ms` : "—"}</span>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-sm opacity-80">✕</button>
            </div>
          </div>

          <div className="p-4 space-y-4">
            {!RELAY_URL && <p style={{ color: "#fca5a5" }}>No relay set. Deploy <code>worker/</code> and set VITE_REMOTE_RELAY_URL.</p>}

            {/* Pairing */}
            <section className="space-y-2">
              <h3 className="text-[10px] uppercase tracking-widest opacity-50">Pairing</h3>
              {live && qr && <img src={qr} alt="Scan to open the remote" className="w-full rounded-lg" style={{ imageRendering: "pixelated" }} />}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-2" style={box}>
                  <div className="text-[9px] uppercase opacity-50 mb-1">Room code</div>
                  <input
                    value={session.room}
                    onChange={(e) => setSession((s) => ({ ...s, room: normalizeRoom(e.target.value) }))}
                    className="w-full bg-transparent outline-none text-base tracking-[0.2em]"
                  />
                  <button onClick={() => copy(session.room, "code")} className="text-[10px] underline opacity-60">{copied === "code" ? "copied" : "copy"}</button>
                </div>
                <div className="rounded-lg p-2" style={box}>
                  <div className="text-[9px] uppercase opacity-50 mb-1">Password</div>
                  <input
                    value={session.pass}
                    onChange={(e) => setSession((s) => ({ ...s, pass: e.target.value.slice(0, 32) }))}
                    className="w-full bg-transparent outline-none text-base"
                  />
                  <button onClick={() => copy(session.pass, "pass")} className="text-[10px] underline opacity-60">{copied === "pass" ? "copied" : "copy"}</button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setLive((v) => !v)} className="col-span-2 rounded-lg py-2 uppercase tracking-wider text-[11px]" style={btn(live ? "red" : "green")}>
                  {live ? "Stop remote" : "Start remote"}
                </button>
                <button
                  onClick={() => { setLive(false); setSession({ room: makeRoomCode(), pass: Math.random().toString(36).slice(2, 6) }); }}
                  className="rounded-lg py-2 text-[11px]" style={btn()} title="New code (disconnects every remote)"
                >↻ New code</button>
              </div>
              {live && (
                <div className="flex justify-between text-[10px] opacity-60">
                  <button onClick={() => copy(remoteUrl, "link")} className="underline">{copied === "link" ? "link copied" : "copy remote link"}</button>
                  <button onClick={channel.reconnect} className="underline">reconnect</button>
                </div>
              )}
              {channel.error && <p className="text-[10px]" style={{ color: "#fca5a5" }}>{channel.error}</p>}
            </section>

            {live && (
              <>
                {/* Waiting */}
                <section className="space-y-2">
                  <h3 className="text-[10px] uppercase tracking-widest opacity-50">Waiting to join ({pending.length})</h3>
                  {pending.length === 0 && <p className="opacity-40 text-[11px]">No one is waiting.</p>}
                  {pending.map((d) => (
                    <div key={d.id} className="rounded-lg p-2 flex items-center gap-2" style={{ ...box, borderColor: "rgba(251,191,36,0.4)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{d.name}</div>
                        <div className="text-[10px] opacity-50">waiting {ago(d.since, now)}</div>
                      </div>
                      <button onClick={() => admin("admit", d.id)} className="rounded px-2.5 py-1.5" style={btn("green")}>Allow</button>
                      <button onClick={() => admin("deny", d.id)} className="rounded px-2.5 py-1.5" style={btn("red")}>Deny</button>
                    </div>
                  ))}
                </section>

                {/* Connected */}
                <section className="space-y-2">
                  <h3 className="text-[10px] uppercase tracking-widest opacity-50">Connected ({admitted.length})</h3>
                  {admitted.length === 0 && <p className="opacity-40 text-[11px]">No remotes connected.</p>}
                  {admitted.map((d) => (
                    <div key={d.id} className="rounded-lg p-2 flex items-center gap-2" style={box}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{d.name}</div>
                        <div className="text-[10px] opacity-50">for {ago(d.since, now)}</div>
                      </div>
                      <button onClick={() => admin("kick", d.id)} className="rounded px-2.5 py-1.5" style={btn("red")}>Disconnect</button>
                    </div>
                  ))}
                </section>

                {blocked.length > 0 && (
                  <section className="space-y-2">
                    <h3 className="text-[10px] uppercase tracking-widest opacity-50">Blocked ({blocked.length})</h3>
                    {blocked.map((b) => (
                      <div key={b.id} className="rounded-lg p-2 flex items-center gap-2" style={box}>
                        <div className="flex-1 truncate opacity-70">{b.name}</div>
                        <button onClick={() => admin("unblock", b.id)} className="rounded px-2.5 py-1.5" style={btn()}>Unblock</button>
                      </div>
                    ))}
                  </section>
                )}

                <label className="flex items-center justify-between rounded-lg p-2 cursor-pointer" style={box}>
                  <span>
                    Auto-allow anyone with the password
                    <span className="block text-[10px] opacity-50">Off = you approve every new device</span>
                  </span>
                  <input type="checkbox" checked={autoAdmit} onChange={(e) => admin("autoAdmit", undefined, e.target.checked)} className="w-4 h-4 accent-emerald-400" />
                </label>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
