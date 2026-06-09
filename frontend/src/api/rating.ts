import { apiRequest } from './client';

export function fetchRating(scope: 'track' | 'all' = 'track') {
  return apiRequest<RatingData>(`/api/rating?scope=${scope}`);
}

export interface RatingData {
  list: RatingEntry[];
  me: {
    points: number;
    trackRank: number;
    reflectionLevel: number;
    reflectionPoints: number;
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
