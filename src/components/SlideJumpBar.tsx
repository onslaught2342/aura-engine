import { useEffect, useRef, useState } from "react";

interface Props {
  total: number;
}

const isTypingTarget = (t: EventTarget | null) => {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable;
};

export const SlideJumpBar = ({ total }: Props) => {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const maxLen = String(Math.max(1, total)).length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ctrl/Cmd+G — open
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "g") {
        if (isTypingTarget(e.target) && !open) return;
        e.preventDefault();
        setOpen((o) => !o);
        setValue("");
        setError(null);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const triggerShake = () => {
    setShake(true);
    window.setTimeout(() => setShake(false), 320);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = value.trim();
    if (!raw) {
      setError("Enter a slide number");
      triggerShake();
      return;
    }
    if (!/^\d+$/.test(raw)) {
      setError("Digits only");
      triggerShake();
      return;
    }
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1 || n > total) {
      setError(`Out of range (1 – ${total})`);
      triggerShake();
      return;
    }
    window.dispatchEvent(new CustomEvent("slide:jump", { detail: { index: n - 1 } }));
    setOpen(false);
    setValue("");
    setError(null);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-start justify-center pt-[20vh] pointer-events-auto"
      style={{ zIndex: 80, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)" }}
      onClick={() => setOpen(false)}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-2 px-5 py-4 rounded-xl"
        style={{
          background: "rgba(15,15,18,0.95)",
          border: `1px solid ${error ? "rgba(239,68,68,0.7)" : "rgba(255,255,255,0.15)"}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          minWidth: 360,
          animation: shake ? "jumpbar-shake 0.32s ease-in-out" : undefined,
        }}
      >
        <style>{`@keyframes jumpbar-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}`}</style>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono tracking-wider text-white/40 uppercase">Jump to</span>
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={maxLen}
            value={value}
            onChange={(e) => {
              const next = e.target.value.replace(/[^0-9]/g, "").slice(0, maxLen);
              setValue(next);
              if (error) setError(null);
            }}
            placeholder={`1 – ${total}`}
            className="flex-1 bg-transparent outline-none text-white text-lg font-mono placeholder:text-white/25"
          />
          <span className="text-[10px] font-mono text-white/30">↵ go · esc</span>
        </div>
        {error && (
          <div className="text-[11px] font-mono text-red-400/90 pl-[68px]">{error}</div>
        )}
      </form>
    </div>
  );
};
