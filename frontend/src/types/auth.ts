import type { Track } from '../constants/tracks';

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
}

export interface VkUserInfo {
  id: number;
  first_name: string;
  last_name?: string;
  photo_100?: string;
  photo_200?: string;
}

export interface LoginResponseRegistered {
  registered: true;
  user: UserDto;
}

export interface LoginResponseNotRegistered {
  registered: false;
}

export type LoginResponse = LoginResponseRegistered | LoginResponseNotRegistered;

export interface RegisterPayload {
  vkId: string;
  firstName: string;
  lastName?: string;
  track: Track;
}

export type AppLifecycleState = 'active' | 'background';

export type AuthStatus = 'loading' | 'authenticated' | 'needs_registration' | 'error';
