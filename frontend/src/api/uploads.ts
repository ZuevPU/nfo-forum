import { apiRequest } from './client';

export function uploadImage(dataUrl: string) {
  return apiRequest<{ url: string; mediaId: string }>('/api/uploads/image', {
    method: 'POST',
    body: { image: dataUrl },
  });
}

export function uploadImageFromUrl(url: string) {
  return apiRequest<{ url: string; mediaId: string }>('/api/uploads/from-url', {
    method: 'POST',
    body: { url },
  });
}
