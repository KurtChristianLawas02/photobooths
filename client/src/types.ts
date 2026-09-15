import type { Orientation, PhotoSlot, PrintSizeId } from '@photobooth/shared';

export type StepName = 'home' | 'session' | 'review' | 'final' | 'admin';

export interface TemplateOption {
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
  background: string;
  requiredPhotos: number;
  isActive: boolean;
  slots: PhotoSlot[];
}

export interface PhotoRecord {
  id: string;
  templateId: string;
  fileUrl: string;
  createdAt: string;
}

export interface SettingsState {
  businessName: string;
  countdownDuration: 0 | 3 | 5 | 10;
  mirrorCamera: boolean;
  outputFormat: 'png' | 'jpeg';
  photoQuality: number;
  enableQr: boolean;
  autoReturnSeconds: number;
  primaryColor: string;
  secondaryColor: string;
  defaultPrintSize: PrintSizeId;
  defaultOrientation: Orientation;
  dpi: 300 | 600;
  enablePng: boolean;
  enabledPrintSizes: PrintSizeId[];
}
