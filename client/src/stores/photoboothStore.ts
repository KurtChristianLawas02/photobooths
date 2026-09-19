import { create } from 'zustand';
import type { SettingsState, TemplateOption } from '../types';

interface SessionPhoto {
  id: string;
  dataUrl: string;
  createdAt: string;
}

interface PhotoboothState {
  step: 'home' | 'session' | 'review' | 'final' | 'admin';
  selectedTemplateId: string | null;
  templates: TemplateOption[];
  photos: SessionPhoto[];
  countdown: number;
  settings: SettingsState;
  setStep: (step: PhotoboothState['step']) => void;
  setTemplates: (templates: TemplateOption[]) => void;
  addPhoto: (photo: SessionPhoto) => void;
  updatePhoto: (photoId: string, photo: SessionPhoto) => void;
  clearPhotos: () => void;
  setSettings: (settings: SettingsState) => void;
  setSelectedTemplate: (templateId: string | null) => void;
  setCountdown: (countdown: number) => void;
}

const defaultSettings: SettingsState = {
  businessName: 'Studio Booth',
  countdownDuration: 3,
  mirrorCamera: false,
  outputFormat: 'jpeg',
  photoQuality: 95,
  enableQr: true,
  autoReturnSeconds: 20,
  primaryColor: '#d5c28b',
  secondaryColor: '#8db3a2',
  defaultPrintSize: '4x6',
  defaultOrientation: 'portrait',
  dpi: 300,
  enablePng: true,
  enabledPrintSizes: ['2x6', '4x6', '5x7', '6x8'],
};

export const usePhotoboothStore = create<PhotoboothState>((set) => ({
  step: 'home',
  selectedTemplateId: null,
  templates: [],
  photos: [],
  countdown: 3,
  settings: defaultSettings,
  setStep: (step) => set({ step }),
  setTemplates: (templates) => set({ templates }),
  addPhoto: (photo) => set((state) => ({ photos: [...state.photos, photo] })),
  updatePhoto: (photoId, photo) => set((state) => ({ photos: state.photos.map((item) => item.id === photoId ? photo : item) })),
  clearPhotos: () => set({ photos: [] }),
  setSettings: (settings) => set({ settings }),
  setSelectedTemplate: (templateId) => set({ selectedTemplateId: templateId }),
  setCountdown: (countdown) => set({ countdown }),
}));
