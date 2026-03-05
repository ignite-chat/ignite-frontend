import { useEffect, useState } from 'react';

/**
 * Extracts the average color from an image URL.
 * Returns a hex color string or null while loading/on failure.
 */
export function useAverageColor(imageUrl) {
  const [color, setColor] = useState(null);

  useEffect(() => {
    if (!imageUrl) {
      setColor(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Sample at a small size for performance
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Skip fully transparent pixels
          if (data[i + 3] < 128) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        if (count === 0) {
          setColor(null);
          return;
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        setColor(`#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`);
      } catch {
        setColor(null);
      }
    };

    img.onerror = () => setColor(null);
    img.src = imageUrl;
  }, [imageUrl]);

  return color;
}
