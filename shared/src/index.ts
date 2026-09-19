export type Orientation = 'portrait' | 'landscape';
export type OutputFormat = 'png' | 'jpeg';
export type PrintSizeId = '2x6' | '4x6' | '5x7' | '6x8';
export type SlotFit = 'cover' | 'contain';
export type TemplateElementType = 'photo' | 'text' | 'image' | 'logo' | 'sticker' | 'shape' | 'qr';

export interface PrintSizeDefinition {
  id: PrintSizeId;
  label: string;
  widthInches: number;
  heightInches: number;
  widthPixels: number;
  heightPixels: number;
  aspectRatio: string;
}

export const PRINT_SIZES: Record<PrintSizeId, PrintSizeDefinition> = {
  '2x6': { id: '2x6', label: '2 × 6', widthInches: 2, heightInches: 6, widthPixels: 1200, heightPixels: 3600, aspectRatio: '1:3' },
  '4x6': { id: '4x6', label: '4 × 6', widthInches: 4, heightInches: 6, widthPixels: 2400, heightPixels: 3600, aspectRatio: '2:3' },
  '5x7': { id: '5x7', label: '5 × 7', widthInches: 5, heightInches: 7, widthPixels: 3000, heightPixels: 4200, aspectRatio: '5:7' },
  '6x8': { id: '6x8', label: '6 × 8', widthInches: 6, heightInches: 8, widthPixels: 3600, heightPixels: 4800, aspectRatio: '3:4' },
};

export interface EditorViewport {
  width: number;
  height: number;
}

export function calculateDisplayScale(actualWidth: number, actualHeight: number, available: EditorViewport) {
  if (actualWidth <= 0 || actualHeight <= 0 || available.width <= 0 || available.height <= 0) {
    return 0;
  }
  return Math.min(available.width / actualWidth, available.height / actualHeight);
}

export function isValidTemplateDimensions(template: Pick<PrintTemplate, 'physicalWidth' | 'physicalHeight' | 'widthPixels' | 'heightPixels' | 'dpi' | 'orientation' | 'aspectRatio'>) {
  if (template.physicalWidth <= 0 || template.physicalHeight <= 0 || template.widthPixels <= 0 || template.heightPixels <= 0) {
    return false;
  }
  if (template.dpi !== 300 && template.dpi !== 600) {
    return false;
  }
  if (template.orientation === 'portrait' && template.widthPixels >= template.heightPixels) {
    return false;
  }
  if (template.orientation === 'landscape' && template.widthPixels <= template.heightPixels) {
    return false;
  }
  const [ratioWidth, ratioHeight] = template.aspectRatio.split(':').map(Number);
  return Number.isFinite(ratioWidth) && Number.isFinite(ratioHeight) && ratioWidth > 0 && ratioHeight > 0
    && Math.abs((template.widthPixels / template.heightPixels) - (ratioWidth / ratioHeight)) < 0.02;
}

export interface PhotoSlot {
  id: string;
  type: 'photo';
  x: number;
  y: number;
  width: number;
  height: number;
  fit: SlotFit;
  photoIndex?: number;
  position?: { x: number; y: number };
  rotation?: number;
  borderRadius?: number;
}

export interface PrintTemplate {
  id: string;
  name: string;
  description: string | null;
  printSize: PrintSizeId;
  physicalWidth: number;
  physicalHeight: number;
  widthPixels: number;
  heightPixels: number;
  dpi: 300 | 600;
  orientation: Orientation;
  aspectRatio: string;
  thumbnailUrl?: string | null;
  background: string;
  slots: PhotoSlot[];
  headerText?: string;
  footerText?: string;
  theme?: string;
  accentColor?: string;
  active: boolean;
}

export interface TemplateElement {
  id: string;
  type: TemplateElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  visible?: boolean;
  [property: string]: unknown;
}

export interface TemplateConfig {
  width: number;
  height: number;
  background: string;
  elements: TemplateElement[];
}

export interface TemplateSummary {
  id: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  orientation: Orientation;
  requiredPhotos: number;
  isActive: boolean;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface PhotoboothSettings {
  businessName: string;
  countdownDuration: 0 | 3 | 5 | 10;
  mirrorCamera: boolean;
  outputFormat: OutputFormat;
  photoQuality: number;
  enableQr: boolean;
  autoReturnSeconds: number;
  defaultPrintSize: PrintSizeId;
  defaultOrientation: Orientation;
  dpi: 300 | 600;
  enablePng: boolean;
  enabledPrintSizes: PrintSizeId[];
}
