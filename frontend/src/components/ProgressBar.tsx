interface Props {
  value: number;
  max?: number;
  color?: string;
}

export function ProgressBar({ value, max = 100, color = 'var(--nfo-accent)' }: Props) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div style={{ background: '#f0f2f8', borderRadius: 4, height: 5, overflow: 'hidden' }}>
      <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: 4 }} />
    </div>
  );
}
