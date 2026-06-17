type ActivityIconVariant = 'schedule' | 'questions' | 'tasks' | 'exchange' | 'neutral' | 'purple';

const VARIANT_BG: Record<ActivityIconVariant, string> = {
  schedule: '#e8eaff',
  questions: '#e2f8f3',
  tasks: '#fff5e8',
  exchange: '#e2f8f3',
  neutral: '#f2f3f9',
  purple: '#f2e8ff',
};

interface Props {
  emoji: string;
  variant?: ActivityIconVariant;
}

export function ActivityIcon({ emoji, variant = 'neutral' }: Props) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 9,
        background: VARIANT_BG[variant],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {emoji}
    </div>
  );
}
