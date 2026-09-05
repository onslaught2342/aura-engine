import { useEffect, useState } from "react";

export const KeyboardHint = () => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 font-mono text-xs tracking-widest select-none pointer-events-none transition-opacity duration-1000"
      style={{
        zIndex: 10,
        color: "rgba(255,255,255,0.3)",
        opacity: visible ? 1 : 0,
      }}
    >
      ← → navigate videos
    </div>
  );
};
