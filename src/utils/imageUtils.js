/**
 * Memory-efficient image compression utility.
 * Uses URL.createObjectURL/revokeObjectURL instead of FileReader to minimize RAM usage.
 */
export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    type = 'image/jpeg',
    timeout = 8000
  } = options;

  return new Promise((resolve, reject) => {
    // 1. Setup a timeout to prevent infinite loading
    const timer = setTimeout(() => {
      console.warn('Compression timed out, returning original file');
      resolve(file);
    }, timeout);

    // 2. Create an object URL from the file
    // This is MUCH more memory efficient than FileReader.readAsDataURL
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // 3. Convert canvas back to Blob/File
        canvas.toBlob((blob) => {
          // Cleanup
          URL.revokeObjectURL(objectUrl);
          clearTimeout(timer);

          if (!blob) {
            console.error('Canvas toBlob failed');
            resolve(file); // Fallback to original
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: type,
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        }, type, quality);
      } catch (err) {
        // Cleanup on error
        URL.revokeObjectURL(objectUrl);
        clearTimeout(timer);
        console.error('Compression processing error:', err);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      clearTimeout(timer);
      console.error('Image load failed');
      resolve(file);
    };

    img.src = objectUrl;
  });
};
