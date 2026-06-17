import type { Track } from '../constants/tracks.js';

export interface NotificationPrefs {
  program: boolean;
  questions: boolean;
  tasks: boolean;
  exchange: boolean;
  points: boolean;
}

export interface UserDto {
  id: number;
  vkId: string;
  firstName: string;
  lastName: string | null;
  role: string;
  track: string | null;
  points: number;
  reflectionLevel: number;
  reflectionPoints: number;
  notificationsEnabled: boolean;
  messagesFromGroupAllowed?: boolean;
  notificationPrefs?: NotificationPrefs | null;
  createdAt?: string;
}

export interface LoginRequest {
  vkId: string;
}

export interface LoginResponseRegistered {
  registered: true;
  user: UserDto;
}

export interface LoginResponseNotRegistered {
  registered: false;
}

export type LoginResponse = LoginResponseRegistered | LoginResponseNotRegistered;

export interface RegisterRequest {
  vkId: string;
  firstName: string;
  lastName?: string;
  track: Track;
}

export interface RegisterResponse {
  user: UserDto;
}

export interface ApiError {
  error: string;
}
