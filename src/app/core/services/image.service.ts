import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ImageService {
  async uploadImage(file: File, maxPx = 800, quality = 0.8): Promise<string> {
    const blob = await this.resizeToBlob(file, maxPx, quality);
    const formData = new FormData();
    formData.append('file', blob, 'image.jpg');
    formData.append('upload_preset', environment.cloudinary.uploadPreset);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${environment.cloudinary.cloudName}/image/upload`,
      { method: 'POST', body: formData },
    );
    if (!res.ok) throw new Error('Upload failed');
    const json = await res.json();
    return json.secure_url as string;
  }

  private resizeToBlob(file: File, maxPx: number, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > maxPx || height > maxPx) {
            if (width > height) {
              height = Math.round((height * maxPx) / width);
              width = maxPx;
            } else {
              width = Math.round((width * maxPx) / height);
              height = maxPx;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')),
            'image/jpeg',
            quality,
          );
        };
        img.onerror = reject;
        img.src = e.target!.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
