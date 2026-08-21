/**
 * Encodes a file as a base64 data URL and returns it. This keeps the demo
 * self-contained (no external upload host, so nothing can rate-limit or break
 * it), at the cost of embedding the file directly in the document.
 *
 * @warning This function should only be used for development purposes, replace with your own backend!
 */
export const uploadFile_DEV_ONLY = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};
