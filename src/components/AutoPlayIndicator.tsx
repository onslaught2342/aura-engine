interface Props {
  active: boolean;
  progress: number; // 0-1
  visible: boolean;
}

export const AutoPlayIndicator = ({ active, progress, visible }: Props) => {
  if (!active || !visible) return null;

  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  return (
    <div
      className="fixed bottom-6 left-6 pointer-events-none select-none"
      style={{ zIndex: 10 }}
    >
      <svg width="32" height="32" viewBox="0 0 32 32">
        <circle
          cx="16" cy="16" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="2"
        />
        <circle
          cx="16" cy="16" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 16 16)"
          style={{ transition: "stroke-dashoffset 0.1s linear" }}
        />
      </svg>
    </div>
  );
};
