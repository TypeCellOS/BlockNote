/**
 * Create a Blob from a File object
 * @param file
 * @returns Blob or null
 */
export function createBlobFromFile(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!file) {
      resolve(null);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      fetch(result)
        .then((res) => res.blob())
        .then((blob) => {
          resolve(blob);
        })
        .catch(() => {
          resolve(null);
        });
    };

    reader.readAsDataURL(file);
  });
}
