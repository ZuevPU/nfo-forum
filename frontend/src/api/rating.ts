import { apiRequest } from './client';

export function fetchRating(scope: 'track' | 'all' = 'track') {
  return apiRequest<RatingData>(`/api/rating?scope=${scope}`);
}

export function fetchPointsHistory() {
  return apiRequest<{ history: PointsHistoryItem[] }>('/api/rating/history');
}

export function fetchReflectionLevel() {
  return apiRequest<ReflectionLevelData>('/api/rating/reflection-level');
}

export interface ReflectionLevelData {
  level: number;
  reflectionPoints: number;
  history: { id: number; oldLevel: number; newLevel: number; createdAt: string }[];
}

export interface PointsHistoryItem {
  id: number;
  points: number;
  source: string;
  comment: string | null;
  createdAt: string;
}

export interface RatingData {
  list: RatingEntry[];
  me: {
    points: number;
    trackRank: number;
    reflectionLevel: number;
    reflectionPoints: number;
    reflectionLevelName?: string;
    nextLevelPoints?: number | null;
  };
}

export interface RatingEntry {
  position: number;
  id: number;
  firstName: string;
  lastName: string | null;
  track: string | null;
  points: number;
  isMe: boolean;
}
