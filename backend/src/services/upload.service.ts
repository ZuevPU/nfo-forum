export function parseDataUrlImage(dataUrl: string): { buffer: Buffer; ext: string } {
  const match = /^data:image\/(jpeg|jpg|png);base64,(.+)$/i.exec(dataUrl);
  if (!match) {
    throw new Error('Only jpg and png images are allowed');
  }
  const ext = match[1].toLowerCase() === 'png' ? 'png' : 'jpg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('Photo exceeds 10 MB limit');
  }
  return { buffer, ext };
}
