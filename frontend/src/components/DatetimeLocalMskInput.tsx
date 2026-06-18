import { FormItem, Input } from '@vkontakte/vkui';

interface Props {
  value: string;
  onChange: (value: string) => void;
  top?: string;
  hint?: string;
}

function splitDatetimeLocal(value: string): { date: string; time: string } {
  if (!value) return { date: '', time: '' };
  const [date, time] = value.split('T');
  return { date: date ?? '', time: time ?? '' };
}

/** Date + time inputs (MSK wall time), time picker starts at 00:00 instead of current time. */
export function DatetimeLocalMskInput({ value, onChange, top, hint }: Props) {
  const { date, time } = splitDatetimeLocal(value);

  const update = (nextDate: string, nextTime: string) => {
    if (!nextDate && !nextTime) {
      onChange('');
      return;
    }
    if (!nextDate) {
      onChange('');
      return;
    }
    onChange(`${nextDate}T${nextTime || '00:00'}`);
  };

  return (
    <FormItem
      top={top}
      bottom={hint ?? 'Дата и время по Москве. Время можно ввести вручную или выбрать с 00:00.'}
    >
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Input
          type="date"
          style={{ flex: '1 1 140px' }}
          value={date}
          onChange={(e) => update(e.target.value, time || '00:00')}
        />
        <Input
          type="time"
          style={{ flex: '0 1 120px' }}
          value={time || '00:00'}
          onChange={(e) => update(date, e.target.value)}
          disabled={!date}
        />
      </div>
    </FormItem>
  );
}
