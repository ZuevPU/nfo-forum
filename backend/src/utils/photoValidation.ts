const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function isValidHttpsPhotoUrl(photo: string): boolean {
  try {
    const url = new URL(photo);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    return url.hostname.length > 0;
  } catch {
    return false;
  }
}

export function validatePhotos(photos?: string[]) {
  if (!photos?.length) return;
  if (photos.length > MAX_PHOTOS) throw new Error(`Maximum ${MAX_PHOTOS} photos allowed`);

  for (const photo of photos) {
    if (photo.startsWith('data:')) {
      const base64 = photo.split(',')[1] ?? '';
      const bytes = Math.ceil((base64.length * 3) / 4);
      if (bytes > MAX_PHOTO_BYTES) throw new Error('Photo exceeds 10 MB limit');
      if (!/^data:image\/(jpeg|jpg|png);/i.test(photo)) {
        throw new Error('Only jpg and png images are allowed');
      }
    } else if (!isValidHttpsPhotoUrl(photo)) {
      throw new Error('Invalid photo URL');
    }
  }
}
