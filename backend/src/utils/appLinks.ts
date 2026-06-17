const VK_APP_ID = process.env.VK_APP_ID ?? '54627015';

export function formatAppLink(hash: string, label = 'Открыть приложение'): string {
  const fragment = hash.startsWith('#') ? hash : `#${hash}`;
  return `[https://vk.com/app${VK_APP_ID}${fragment}|${label}]`;
}

export function appendAppLink(message: string, hash?: string, label?: string): string {
  if (!hash) return message;
  return `${message}\n${formatAppLink(hash, label)}`;
}
