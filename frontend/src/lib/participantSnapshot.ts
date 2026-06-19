import { fetchHome, type HomeData } from '../api/home';

export type NavBadges = {
  tasks: number;
  questions: number;
};

export async function refreshParticipantSnapshot(): Promise<HomeData> {
  return fetchHome();
}

export function navBadgesFromHome(data: HomeData): NavBadges {
  return {
    tasks: data.stats.tasksAvailable,
    questions: data.stats.activeQuestions,
  };
}
