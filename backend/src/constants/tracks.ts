export const TRACKS = [
  'Просветительские программы',
  'НФО и образование',
  'Обучение тренеров',
  'Аттестация тренеров',
  'Действующий состав АТ РСМ',
] as const;

export type Track = (typeof TRACKS)[number];

export function isValidTrack(value: string): value is Track {
  return (TRACKS as readonly string[]).includes(value);
}
