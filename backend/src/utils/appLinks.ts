const VK_APP_ID = process.env.VK_APP_ID ?? '54627015';
const VK_GROUP_ID = process.env.VK_GROUP_ID ?? '';

export function entityLink(type: 'tasks' | 'questions' | 'exchange' | 'home' | 'schedule' | 'checkin' | 'nfo-day' | 'diagnostics', id?: number): string {
  if (id != null) return `${type}/${id}`;
  return type;
}

export function formatAppLink(hash: string, label = 'Открыть приложение'): string {
  const fragment = hash.startsWith('#') ? hash.slice(1).replace(/^\//, '') : hash.replace(/^\//, '');
  const appPath = VK_GROUP_ID ? `app${VK_APP_ID}_-${VK_GROUP_ID}` : `app${VK_APP_ID}`;
  return `[https://vk.com/${appPath}#${fragment}|${label}]`;
}

export function appendAppLink(message: string, hash?: string, label?: string): string {
  if (!hash) return message;
  const normalized = hash.startsWith('#') ? hash.slice(1) : hash;
  return `${message}\n${formatAppLink(normalized, label)}`;
}
