export const TRACKS = [
  'Просветительские программы',
  'НФО и образование',
  'Обучение тренеров',
  'Аттестация тренеров',
  'Действующий состав АТ РСМ',
] as const;

export type Track = (typeof TRACKS)[number];
