const CLOUDINARY_CLOUD_NAME = 'm7ciqzwb';
const CLOUDINARY_UPLOAD_PRESET = 'brokage_chat_images';

export async function uploadImageToCloudinary(
  uri: string,
): Promise<string> {
  const formData = new FormData();

  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: `chat-${Date.now()}.jpg`,
  } as any);

  formData.append(
    'upload_preset',
    CLOUDINARY_UPLOAD_PRESET,
  );

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/m7ciqzwb/image/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );

  const data = await response.json();

  if (!response.ok || !data.secure_url) {
    throw new Error(
      data?.error?.message ?? 'Cloudinary upload failed',
    );
  }

  return data.secure_url;
}