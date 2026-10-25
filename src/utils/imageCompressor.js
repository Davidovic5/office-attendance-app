// Client-side image compressor using HTML5 Canvas
// Scales images to max 400x400 for fast mobile uploading
export function compressImage(file, maxSize = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error("لم يتم تحديد ملف."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("فشل قراءة ملف الصورة."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("ملف الصورة غير صالح أو غير مدعوم."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
