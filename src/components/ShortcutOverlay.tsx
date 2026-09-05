interface Props {
  visible: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: "Navigation", items: [
    { key: "← →", desc: "Previous / Next slide" },
    { key: "⌘/Ctrl + G", desc: "Jump to slide by number" },
    { key: "T", desc: "Toggle thumbnail strip" },
    { key: "?", desc: "Toggle this overlay" },
  ]},
  { category: "Playback", items: [
    { key: "Space", desc: "Play / Pause" },
    { key: "F", desc: "Toggle fullscreen" },
  ]},
  { category: "Tools", items: [
    { key: "/builder", desc: "Open Config Builder" },
  ]},
];

export const ShortcutOverlay = ({ visible, onClose }: Props) => {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 100, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-8 max-w-md w-full mx-4"
        style={{ background: "rgba(20,20,20,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-mono tracking-wider mb-6" style={{ color: "rgba(255,255,255,0.8)" }}>
          Keyboard Shortcuts
        </h2>
        {shortcuts.map((group) => (
          <div key={group.category} className="mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
              {group.category}
            </h3>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div key={item.key} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{item.desc}</span>
                  <kbd
                    className="font-mono text-xs px-2 py-1 rounded"
                    style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
                  >
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="text-xs mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>
          Press <kbd className="font-mono">?</kbd> or click anywhere to close
        </p>
      </div>
    </div>
  );
};
