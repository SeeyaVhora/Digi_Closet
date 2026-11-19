export const lookTitle = (look) =>
  look.style?.name || look.clothingItems?.map((item) => item.name).join(' + ') || 'My look';

// Saves an image to the user's device. Fetching it first makes the
// `download` attribute work for cross-origin URLs (e.g. Firebase Storage).
export async function downloadImage(url, filename) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Download failed.');
  const blob = await response.blob();
  const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type.split('/')[1] || 'png';
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${filename}.${ext}`;
  link.click();
  URL.revokeObjectURL(objectUrl);
}
