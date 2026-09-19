import type { OutputFormat, PhotoSlot, PrintTemplate } from '@photobooth/shared';

export interface RenderPhoto {
  dataUrl: string;
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load captured photo.'));
    image.src = dataUrl;
  });
}

function drawPhotoSlot(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  slot: PhotoSlot,
  filter: string,
) {
  const position = slot.position ?? { x: 0.5, y: 0.5 };
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const slotRatio = slot.width / slot.height;
  const fit = slot.fit === 'contain'
    ? Math.min(slot.width / image.naturalWidth, slot.height / image.naturalHeight)
    : Math.max(slot.width / image.naturalWidth, slot.height / image.naturalHeight);
  const drawWidth = image.naturalWidth * fit;
  const drawHeight = image.naturalHeight * fit;
  const cropWidth = slot.width / fit;
  const cropHeight = slot.height / fit;
  const sourceX = slot.fit === 'contain'
    ? 0
    : (image.naturalWidth - cropWidth) * position.x;
  const sourceY = slot.fit === 'contain'
    ? 0
    : (image.naturalHeight - cropHeight) * position.y;
  const offsetX = slot.fit === 'contain' ? (slot.width - drawWidth) / 2 : 0;
  const offsetY = slot.fit === 'contain' ? (slot.height - drawHeight) / 2 : 0;

  void sourceRatio;
  void slotRatio;
  context.save();
  if (slot.borderRadius) {
    const radius = Math.min(slot.borderRadius, slot.width / 2, slot.height / 2);
    context.beginPath();
    context.roundRect(slot.x, slot.y, slot.width, slot.height, radius);
    context.clip();
  }
  context.filter = filter;
  if (slot.fit === 'contain') {
    context.drawImage(image, slot.x + offsetX, slot.y + offsetY, drawWidth, drawHeight);
  } else {
    context.drawImage(image, sourceX, sourceY, cropWidth, cropHeight, slot.x, slot.y, slot.width, slot.height);
  }
  context.restore();
}

function drawTheme(context: CanvasRenderingContext2D, template: PrintTemplate) {
  const width = context.canvas.width;
  const height = context.canvas.height;
  const theme = template.theme;
  if (theme === 'birthday') {
    const colors = ['#ed4d76', '#f5b83d', '#5b8def', '#54c7a2'];
    colors.forEach((color, index) => {
      context.fillStyle = color;
      context.beginPath();
      context.arc(width * (0.08 + index * 0.28), height * 0.035, width * 0.025, 0, Math.PI * 2);
      context.fill();
      context.fillRect(width * (0.08 + index * 0.28), height * 0.06, Math.max(4, width * 0.002), height * 0.025);
    });
    context.fillStyle = '#ed4d76';
    for (let index = 0; index < 16; index += 1) {
      context.fillRect(width * (0.06 + (index * 0.071) % 0.9), height * (0.1 + (index % 3) * 0.012), Math.max(5, width * 0.004), Math.max(12, height * 0.008));
    }
  } else if (theme === 'wedding') {
    context.strokeStyle = '#d79ba8';
    context.lineWidth = Math.max(5, width * 0.006);
    context.strokeRect(width * 0.025, height * 0.025, width * 0.95, height * 0.95);
    context.strokeStyle = '#e8bdc5';
    context.lineWidth = Math.max(3, width * 0.003);
    context.strokeRect(width * 0.04, height * 0.04, width * 0.92, height * 0.92);
  } else if (theme === 'graduation') {
    context.fillStyle = '#f1c75b';
    context.fillRect(width * 0.04, height * 0.045, width * 0.92, Math.max(8, height * 0.006));
    context.fillRect(width * 0.04, height * 0.949, width * 0.92, Math.max(8, height * 0.006));
  } else if (theme === 'neon') {
    context.strokeStyle = '#55f2df';
    context.lineWidth = Math.max(6, width * 0.008);
    context.strokeRect(width * 0.025, height * 0.025, width * 0.95, height * 0.95);
    context.strokeStyle = '#f266d8';
    context.lineWidth = Math.max(3, width * 0.004);
    context.strokeRect(width * 0.04, height * 0.04, width * 0.92, height * 0.92);
  } else if (theme === 'retro') {
    context.fillStyle = 'rgba(120, 61, 47, .18)';
    for (let index = 0; index < 9; index += 1) {
      context.fillRect(width * 0.04, height * (0.12 + index * 0.1), width * 0.92, Math.max(4, height * 0.003));
    }
  }
}

export async function renderTemplate(
  template: PrintTemplate,
  photos: RenderPhoto[],
  filter = 'none',
  outputFormat: OutputFormat = 'jpeg',
  quality = 0.95,
) {
  const images = await Promise.all(photos.map((photo) => loadImage(photo.dataUrl)));
  const canvas = document.createElement('canvas');
  const portrait = template.orientation === 'portrait';
  const widthPixels = portrait
    ? Math.min(template.widthPixels, template.heightPixels)
    : Math.max(template.widthPixels, template.heightPixels);
  const heightPixels = portrait
    ? Math.max(template.widthPixels, template.heightPixels)
    : Math.min(template.widthPixels, template.heightPixels);
  canvas.width = widthPixels;
  canvas.height = heightPixels;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create the high-resolution render canvas.');
  }

  context.fillStyle = template.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawTheme(context, template);
  context.fillStyle = template.accentColor ?? '#202020';
  context.textAlign = 'center';
  if (template.headerText) {
    context.font = `700 ${Math.max(24, Math.round(canvas.width * 0.018))}px Arial`;
    context.fillText(template.headerText, canvas.width / 2, Math.round(canvas.height * 0.035));
  }
  template.slots.forEach((slot, index) => {
    const image = images[(slot.photoIndex ?? index) % Math.max(images.length, 1)];
    if (image) {
      drawPhotoSlot(context, image, slot, filter);
    }
  });

  if (template.footerText) {
    context.font = `700 ${Math.max(22, Math.round(canvas.width * 0.016))}px Arial`;
    context.fillText(template.footerText, canvas.width / 2, canvas.height - Math.round(canvas.height * 0.025));
  }

  const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(mimeType, outputFormat === 'png' ? undefined : quality);
}
