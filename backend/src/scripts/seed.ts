import { count } from 'drizzle-orm';
import { db, closeDatabase } from '../db/index.js';
import { events, reflectionQuestions, systemSettings, tasks } from '../db/schema.js';
import { TRACKS } from '../constants/tracks.js';

const today = new Date();
today.setHours(0, 0, 0, 0);

function at(hour: number, minute: number): Date {
  const d = new Date(today);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seed() {
  console.log('Seeding database...');

  const expectedEvents = TRACKS.length * 4;
  const [eventsCount] = await db.select({ value: count() }).from(events);
  if ((eventsCount?.value ?? 0) < expectedEvents) {
    if ((eventsCount?.value ?? 0) > 0) {
      console.log(`Events count ${eventsCount?.value} < ${expectedEvents}, skipping insert (run seed:dedupe first).`);
    } else {
  for (const track of TRACKS) {
    await db.insert(events).values([
      {
        title: 'Открытие дня',
        description: 'Приветствие и программа',
        startTime: at(9, 0),
        endTime: at(9, 30),
        place: 'Корпус А',
        track,
        isKeyBlock: true,
      },
      {
        title: 'Рабочий блок',
        description: 'Основная программа трека',
        startTime: at(10, 0),
        endTime: at(12, 0),
        place: 'Корпус А',
        track,
        isKeyBlock: false,
      },
      {
        title: 'Обед + Обмен опытом',
        startTime: at(13, 0),
        endTime: at(14, 30),
        place: 'Столовая',
        track: null,
        isKeyBlock: false,
      },
      {
        title: 'Рефлексия дня в направлении',
        startTime: at(19, 30),
        endTime: at(20, 0),
        place: 'Корпус А',
        track,
        isKeyBlock: true,
      },
    ]);
  }
    }
  } else {
    console.log(`Events OK (${eventsCount?.value} >= ${expectedEvents}), skipping.`);
  }

  const [tasksCount] = await db.select({ value: count() }).from(tasks);
  if ((tasksCount?.value ?? 0) === 0) {
  await db.insert(tasks).values([
    {
      title: 'Дневник участника',
      description: 'Запиши одну важную мысль после каждого блока',
      points: 20,
      track: null,
      autoApprove: true,
    },
    {
      title: 'Познакомься с 3 участниками',
      description: 'Из разных треков — обменяйтесь контактами',
      points: 30,
      track: null,
    },
    {
      title: 'Ответь на вопрос участника',
      description: '1 вопрос ждёт твоего ответа в ленте',
      points: 15,
      track: null,
    },
  ]);
  }

  const [rqCount] = await db.select({ value: count() }).from(reflectionQuestions);
  if ((rqCount?.value ?? 0) === 0) {
  await db.insert(reflectionQuestions).values([
    {
      text: 'Что для тебя значит неформальное образование?',
      type: 'daily',
      track: null,
      publishTime: at(12, 0),
      points: 10,
    },
    {
      text: 'Какой инсайт ты вынес из сегодняшнего дня?',
      type: 'evening',
      track: null,
      publishTime: at(19, 30),
      points: 15,
    },
    {
      text: 'Что бы ты изменил в своём подходе к обучению?',
      type: 'evening',
      track: null,
      publishTime: at(19, 30),
      points: 15,
    },
    {
      text: 'Какой момент дня запомнился больше всего?',
      type: 'evening',
      track: null,
      publishTime: at(19, 30),
      points: 15,
    },
  ]);
  }

  const [settingsCount] = await db.select({ value: count() }).from(systemSettings);
  if ((settingsCount?.value ?? 0) === 0) {
    await db.insert(systemSettings).values({
      key: 'daily_focus',
      value: {
        title: 'Неформальное = настоящее?',
        description:
          'Сегодня обращай внимание на моменты, когда обучение происходит само собой — без программы и плана.',
      },
    });
  }

  console.log('Seed complete.');
  await closeDatabase();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
