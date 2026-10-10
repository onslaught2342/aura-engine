import { memo, useState } from "react";
import type { VideoItem } from "@/engine/config";
import { RehearsePanel } from "@/components/remote/RehearsePanel";

const area = "w-full rounded border border-white/15 bg-black/40 px-3 py-2 text-[12px] font-mono text-white/90 outline-none focus:border-white/40 leading-relaxed";
const lbl = "block text-[10px] font-mono uppercase tracking-wider text-white/50 mb-1";

/** Per-slide speaker notes, teleprompter script and rehearsal target,
 *  with a live preview of how the phone remote will show them. */
export const SpeakerTab = memo(function SpeakerTab({ slide, onPatch }: {
  slide: VideoItem; onPatch: (k: string, v: unknown) => void;
}) {
  const [view, setView] = useState<"notes" | "rehearse">("notes");
  const notes = slide.notes ?? "";
  const script = slide.script ?? "";
  const target = slide.targetSeconds ?? null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <label className="block">
          <span className={lbl}>Speaker notes — short reminders (Notes tab on the phone)</span>
          <textarea className={area} rows={4} value={notes} onChange={(e) => onPatch("notes", e.target.value)} placeholder="Key points for this slide…" />
        </label>
        <label className="block">
          <span className={lbl}>Teleprompter script — full words to read (Rehearse tab). Empty = uses notes</span>
          <textarea className={area} rows={10} value={script} onChange={(e) => onPatch("script", e.target.value)} placeholder="Everything you'll say on this slide…" />
        </label>
        <label className="block">
          <span className={lbl}>Target time on this slide (seconds) — empty = phone's own setting</span>
          <input type="number" min={0} max={3600} className={area + " w-40"} value={target ?? ""}
            onChange={(e) => { const n = Number(e.target.value); onPatch("targetSeconds", e.target.value && n > 0 ? n : null); }} />
        </label>
      </div>

      <div>
        <div className="flex gap-1 mb-2">
          {(["notes", "rehearse"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`h-6 px-2 text-[10px] font-mono uppercase tracking-wider rounded ${view === v ? "bg-white/15 text-white" : "text-white/50 hover:text-white"}`}>
              Phone · {v}
            </button>
          ))}
        </div>
        <div className="rounded-[28px] border border-white/20 bg-black p-3 font-mono text-white/90" style={{ maxHeight: 620, overflowY: "auto" }}>
          {view === "notes" ? (
            <div className="rounded-xl p-4 min-h-[120px] whitespace-pre-wrap text-sm leading-relaxed bg-white/5 border border-white/10">
              {notes || <span className="opacity-40">No notes for this slide.</span>}
            </div>
          ) : (
            <RehearsePanel preview index={0} notes={script || notes} label={slide.label || "This slide"}
              targetSeconds={target} onNext={() => {}} onPrev={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
});
