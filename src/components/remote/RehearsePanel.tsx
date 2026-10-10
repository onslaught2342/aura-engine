import { useEffect, useRef, useState } from "react";
import { CONFIG } from "@/engine/config";
import { normalizeConfig, serializeConfig } from "@/lib/configNormalize";

/**
 * Rehearsal tools for the phone remote: auto-scrolling teleprompter,
 * per-slide pacing alerts, and offline deck backup. Phone-local only —
 * nothing here travels over the relay.
 */

const LS = "remote.rehearse";
interface Prefs { target: number; speed: number; size: number; alerts: boolean; vibrate: boolean; mirror: boolean }
const DEFAULTS: Prefs = { target: 60, speed: 1, size: 22, alerts: true, vibrate: true, mirror: false };

function loadPrefs(): Prefs {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LS) ?? "{}") }; } catch { return DEFAULTS; }
}

const panel: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" };
const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(Math.abs(ms) / 1000));
  return `${ms < 0 ? "-" : ""}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function RehearsePanel({ index, notes, label, onNext, onPrev, targetSeconds = null, preview = false }: {
  index: number; notes: string; label: string; onNext: () => void; onPrev: () => void;
  /** Per-slide target from the Builder; overrides the phone's own setting. */
  targetSeconds?: number | null;
  /** Builder preview: no vibration, no saving prefs. */
  preview?: boolean;
}) {
  const [prefs, setP] = useState<Prefs>(loadPrefs);
  const p = targetSeconds ? { ...prefs, target: targetSeconds, vibrate: preview ? false : prefs.vibrate } : preview ? { ...prefs, vibrate: false } : prefs;
  const [playing, setPlaying] = useState(true);
  const [slideStart, setSlideStart] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  const [log, setLog] = useState<Record<number, number>>({});
  const scroller = useRef<HTMLDivElement>(null);
  const warned = useRef<0 | 1 | 2>(0);
  const prevIdx = useRef(index);

  useEffect(() => { if (!preview) localStorage.setItem(LS, JSON.stringify(prefs)); }, [prefs, preview]);
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setP((o) => ({ ...o, [k]: v }));

  // Slide change: record time spent, reset scroll & alerts
  useEffect(() => {
    if (prevIdx.current !== index) {
      const spent = Date.now() - slideStart;
      const was = prevIdx.current;
      setLog((l) => ({ ...l, [was]: (l[was] ?? 0) + spent }));
      prevIdx.current = index;
    }
    setSlideStart(Date.now());
    warned.current = 0;
    if (scroller.current) scroller.current.scrollTop = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll paced so the script finishes at the target duration
  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const tick = (t: number) => {
      const el = scroller.current;
      if (el) {
        const dist = el.scrollHeight - el.clientHeight;
        if (dist > 0) el.scrollTop += (dist / (p.target * 1000)) * (t - last) * p.speed;
      }
      last = t;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, p.target, p.speed, index]);

  const spent = now - slideStart;
  const ratio = spent / (p.target * 1000);
  const level: 0 | 1 | 2 = !p.alerts ? 0 : ratio >= 1 ? 2 : ratio >= 0.8 ? 1 : 0;

  useEffect(() => {
    if (level > warned.current) {
      warned.current = level;
      if (p.vibrate && navigator.vibrate) navigator.vibrate(level === 2 ? [200, 100, 200] : 120);
    }
  }, [level, p.vibrate]);

  const color = level === 2 ? "#f87171" : level === 1 ? "#fbbf24" : "#86efac";
  const playlist = CONFIG.video.playlist;

  const exportDeck = () => {
    const cfg = normalizeConfig(CONFIG);
    download(`deck-backup-${new Date().toISOString().slice(0, 10)}.json`, serializeConfig(cfg, false), "application/json");
  };
  const exportScript = () => {
    const text = playlist.map((it, i) => `## Slide ${i + 1}${it.label ? ` — ${it.label}` : ""}\n\n${it.notes ?? "(no notes)"}\n`).join("\n");
    download("speaker-script.md", text, "text/markdown");
  };
  const exportReport = () => {
    const rows = ["slide,label,seconds"].concat(
      Object.entries(log).map(([i, ms]) => `${+i + 1},"${(playlist[+i]?.label ?? "").replace(/"/g, "'")}",${Math.round(ms / 1000)}`)
    );
    download("rehearsal-timing.csv", rows.join("\n"), "text/csv");
  };

  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-3 flex items-center justify-between transition-colors"
        style={{ ...panel, borderColor: level ? color : panel.border as string, boxShadow: level === 2 ? `0 0 0 2px ${color}55` : undefined }}
      >
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider opacity-50">On this slide</div>
          <div className="text-2xl tabular-nums" style={{ color }}>{fmt(spent)} <span className="text-sm opacity-50">/ {fmt(p.target * 1000)}</span></div>
          <div className="text-xs opacity-60 truncate">{label}</div>
        </div>
        <div className="text-right text-xs" style={{ color }}>
          {level === 2 ? "Over time — move on" : level === 1 ? "Wrap up soon" : "On pace"}
        </div>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div style={{ width: `${Math.min(100, ratio * 100)}%`, height: "100%", background: color, transition: "width .25s linear" }} />
      </div>

      <div
        ref={scroller}
        onTouchStart={() => setPlaying(false)}
        onWheel={() => setPlaying(false)}
        className={`rounded-xl p-5 ${preview ? "h-64" : "h-[45vh]"} overflow-y-auto whitespace-pre-wrap leading-relaxed`}
        style={{ ...panel, fontSize: p.size, transform: p.mirror ? "scaleX(-1)" : undefined }}
      >
        <div style={{ height: preview ? 40 : "15vh" }} />
        {notes || <span className="opacity-40">No notes for this slide. Add notes to slides in the Builder.</span>}
        <div style={{ height: preview ? 80 : "30vh" }} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Btn onClick={onPrev}>← Prev</Btn>
        <Btn onClick={() => setPlaying((v) => !v)} active={playing}>{playing ? "Pause scroll" : "Scroll"}</Btn>
        <Btn onClick={onNext} active>Next →</Btn>
      </div>

      <div className="rounded-xl p-3 space-y-3" style={panel}>
        <Range label={targetSeconds ? "Target (set in Builder)" : "Target per slide"} value={p.target} min={10} max={600} step={5} suffix="s" onChange={(v) => set("target", v)} />
        <Range label="Scroll speed" value={p.speed} min={0.25} max={3} step={0.25} suffix="×" onChange={(v) => set("speed", v)} />
        <Range label="Text size" value={p.size} min={14} max={48} step={1} suffix="px" onChange={(v) => set("size", v)} />
        <div className="grid grid-cols-3 gap-2">
          <Btn active={p.alerts} onClick={() => set("alerts", !p.alerts)}>Alerts</Btn>
          <Btn active={p.vibrate} onClick={() => set("vibrate", !p.vibrate)}>Vibrate</Btn>
          <Btn active={p.mirror} onClick={() => set("mirror", !p.mirror)}>Mirror</Btn>
        </div>
      </div>

      <div className="rounded-xl p-3 space-y-2" style={panel}>
        <div className="text-[10px] uppercase tracking-wider opacity-50">Offline backup</div>
        <div className="grid grid-cols-3 gap-2">
          <Btn onClick={exportDeck}>Deck</Btn>
          <Btn onClick={exportScript}>Script</Btn>
          <Btn onClick={exportReport}>Timings</Btn>
        </div>
      </div>
    </div>
  );
}

function Btn({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className="rounded-lg py-3 text-xs"
      style={{ ...panel, background: active ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.05)" }}>
      {children}
    </button>
  );
}

function Range({ label, value, min, max, step, suffix, onChange }: {
  label: string; value: number; min: number; max: number; step: number; suffix: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-[10px] uppercase tracking-wider opacity-50 mb-1">
        <span>{label}</span><span>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-white" />
    </label>
  );
}
