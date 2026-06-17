import { env } from '../config/env.js';
type VkApiError = { error_code?: number; error_msg?: string };

type VkUploadResponse = {
  server?: number;
  photo?: string;
  hash?: string;
};

export async function uploadPhotoForMessage(
  buffer: Buffer,
  filename = 'photo.jpg',
): Promise<{ attachment: string } | { error: VkApiError }> {
  if (!env.VK_GROUP_TOKEN || !env.VK_GROUP_ID) {
    return { error: { error_code: 0, error_msg: 'VK_GROUP_TOKEN or VK_GROUP_ID not set' } };
  }

  const groupId = env.VK_GROUP_ID;

  const uploadServerParams = new URLSearchParams({
    group_id: groupId,
    access_token: env.VK_GROUP_TOKEN,
    v: '5.199',
  });

  const uploadServerRes = await fetch(
    `https://api.vk.com/method/photos.getMessagesUploadServer?${uploadServerParams}`,
  );
  const uploadServerData = (await uploadServerRes.json()) as {
    error?: VkApiError;
    response?: { upload_url?: string };
  };

  if (uploadServerData.error || !uploadServerData.response?.upload_url) {
    return {
      error: uploadServerData.error ?? { error_code: 0, error_msg: 'No upload_url from VK' },
    };
  }

  const form = new FormData();
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  form.append('photo', blob, filename);

  const uploadRes = await fetch(uploadServerData.response.upload_url, {
    method: 'POST',
    body: form,
  });
  const uploadData = (await uploadRes.json()) as VkUploadResponse;

  if (!uploadData.server || !uploadData.photo || !uploadData.hash) {
    return { error: { error_code: 0, error_msg: 'Invalid VK upload response' } };
  }

  const saveParams = new URLSearchParams({
    group_id: groupId,
    server: String(uploadData.server),
    photo: uploadData.photo,
    hash: uploadData.hash,
    access_token: env.VK_GROUP_TOKEN,
    v: '5.199',
  });

  const saveRes = await fetch(`https://api.vk.com/method/photos.saveMessagesPhoto?${saveParams}`);
  const saveData = (await saveRes.json()) as {
    error?: VkApiError;
    response?: Array<{ owner_id: number; id: number }>;
  };

  if (saveData.error || !saveData.response?.[0]) {
    return { error: saveData.error ?? { error_code: 0, error_msg: 'photos.saveMessagesPhoto failed' } };
  }

  const photo = saveData.response[0];
  return { attachment: `photo${photo.owner_id}_${photo.id}` };
}
