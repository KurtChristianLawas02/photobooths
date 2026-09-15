import { useEffect, useMemo, useState } from 'react';
import { PRINT_SIZES, type Orientation, type PrintSizeId, type PrintTemplate } from '@photobooth/shared';
import { Camera, CheckCheck, ChevronRight, Download, ImageIcon, Maximize, Printer, RefreshCcw, Settings2, Sparkles, TimerReset } from 'lucide-react';
import QRCode from 'qrcode';
import { useCamera } from './hooks/useCamera';
import { usePhotoboothStore } from './stores/photoboothStore';
import type { TemplateOption } from './types';
import { renderTemplate } from './services/renderService';
import { TemplateEditor } from './components/TemplateEditor';

const workflowSteps = ['Event', 'Camera', 'Capture', 'Review', 'Print'];

const photoStyles = [
  { id: 'golden-strip', name: 'Golden Gala', description: 'Warm lights and elegant type', layout: 'golden', theme: 'golden', filter: 'sepia(.18) saturate(1.14) contrast(1.06)', background: '#161411', accent: '#f1d58a', title: 'A MOMENT TO KEEP', footer: 'MAKE IT MEMORABLE' },
  { id: 'birthday-pop', name: 'Birthday Pop', description: 'Balloons, confetti, and a big celebration', layout: 'birthday', theme: 'birthday', filter: 'saturate(1.14) contrast(1.04)', background: '#fff0f4', accent: '#ed4d76', title: 'HAPPY BIRTHDAY', footer: 'MAKE A WISH' },
  { id: 'wedding-romance', name: 'Wedding Romance', description: 'Soft blush tones and elegant florals', layout: 'wedding', theme: 'wedding', filter: 'sepia(.08) saturate(.94) contrast(1.03)', background: '#f8eee8', accent: '#a85f6e', title: 'FOREVER & ALWAYS', footer: 'LOVE IS IN THE AIR' },
  { id: 'graduation', name: 'Graduation', description: 'Bold school colors for the big milestone', layout: 'graduation', theme: 'graduation', filter: 'saturate(1.2) contrast(1.1)', background: '#101a35', accent: '#f1c75b', title: 'CLASS OF 2026', footer: 'THE FUTURE STARTS NOW' },
  { id: 'pool-blue', name: 'Poolside', description: 'Bright blue with a clean finish', layout: 'pool', theme: 'pool', filter: 'saturate(.92) contrast(1.04)', background: '#dff1f2', accent: '#b24444', title: 'GOOD TIMES', footer: 'ONE FOR THE ALBUM' },
  { id: 'purple-night', name: 'Purple Night', description: 'Bold color for late nights', layout: 'purple', theme: 'purple', filter: 'saturate(1.12) contrast(1.08)', background: '#120d18', accent: '#d5a9ff', title: 'PURPLE NIGHT', footer: 'MAKE SOME MEMORIES' },
  { id: 'neon-party', name: 'Neon Party', description: 'Electric color for an unforgettable night', layout: 'neon', theme: 'neon', filter: 'saturate(1.28) contrast(1.12)', background: '#10101f', accent: '#55f2df', title: 'NIGHT OUT', footer: 'TURN UP THE FUN' },
  { id: 'retro-film', name: 'Retro Film', description: 'Warm grain and a nostalgic finish', layout: 'retro', theme: 'retro', filter: 'sepia(.3) saturate(.82) contrast(1.12)', background: '#f0d6a4', accent: '#783d2f', title: 'GOOD OLD DAYS', footer: 'A LITTLE BIT OF MAGIC' },
  { id: 'tailgate', name: 'Tailgate', description: 'Playful editorial event poster', layout: 'tailgate', theme: 'tailgate', filter: 'sepia(.08) saturate(1.06) contrast(1.04)', background: '#e7e4d2', accent: '#9d1721', title: 'THE GOOD TIMES', footer: 'PHOTO BOOTH EDITION' },
];

type PhotoStyle = (typeof photoStyles)[number];

function PhotoLayout({ photos, style, compact = false, copies = 1 }: { photos: Array<{ id: string; dataUrl: string }>; style: PhotoStyle; compact?: boolean; copies?: number }) {
  return (
    <div className={`photo-layout layout-${style.layout} ${compact ? 'compact' : ''}`}>
      <div className="layout-title">{style.title}</div>
      <div className="layout-copies">
        {Array.from({ length: copies }, (_, copyIndex) => (
          <div className="layout-photos" key={`copy-${copyIndex}`}>
            {photos.map((photo) => <img key={`${copyIndex}-${photo.id}`} src={photo.dataUrl} alt="Captured booth photo" style={{ filter: style.filter }} />)}
          </div>
        ))}
      </div>
      <div className="layout-footer">{style.footer}</div>
    </div>
  );
}

function createPortraitStripSlots(widthPixels: number, heightPixels: number, photoCount: number, copies: number) {
  const outerMargin = Math.round(widthPixels * 0.035);
  const columnGap = Math.round(widthPixels * 0.025);
  const stripWidth = Math.floor((widthPixels - outerMargin * 2 - columnGap * (copies - 1)) / copies);
  const topSpace = Math.round(heightPixels * 0.07);
  const bottomSpace = Math.round(heightPixels * 0.09);
  const gap = Math.max(12, Math.round(heightPixels * 0.006));
  const photoHeight = Math.floor((heightPixels - topSpace - bottomSpace - gap * (photoCount - 1)) / photoCount);

  return Array.from({ length: copies }, (_, copyIndex) => Array.from({ length: photoCount }, (_, photoIndex) => ({
    id: `strip-${copyIndex + 1}-${photoIndex + 1}`,
    type: 'photo' as const,
    x: outerMargin + copyIndex * (stripWidth + columnGap),
    y: topSpace + photoIndex * (photoHeight + gap),
    width: stripWidth,
    height: photoHeight,
    fit: 'cover' as const,
    photoIndex,
  }))).flat();
}

const templateSeed: TemplateOption[] = [
  {
    id: 'classic-portrait',
    name: 'Classic Portrait',
    description: 'Classic portrait layout with a central pose and a full-body compliment.',
    printSize: '4x6',
    physicalWidth: PRINT_SIZES['4x6'].widthInches,
    physicalHeight: PRINT_SIZES['4x6'].heightInches,
    widthPixels: PRINT_SIZES['4x6'].widthPixels,
    heightPixels: PRINT_SIZES['4x6'].heightPixels,
    dpi: 300,
    orientation: 'portrait',
    aspectRatio: PRINT_SIZES['4x6'].aspectRatio,
    background: '#efe5d6',
    requiredPhotos: 4,
    isActive: true,
    slots: createPortraitStripSlots(2400, 3600, 4, 2),
  },
  {
    id: 'golden-moment',
    name: 'Golden Moment',
    description: 'Warm photo set for weddings, parties, and premium events.',
    printSize: '4x6',
    physicalWidth: PRINT_SIZES['4x6'].widthInches,
    physicalHeight: PRINT_SIZES['4x6'].heightInches,
    widthPixels: PRINT_SIZES['4x6'].widthPixels,
    heightPixels: PRINT_SIZES['4x6'].heightPixels,
    dpi: 300,
    orientation: 'portrait',
    aspectRatio: PRINT_SIZES['4x6'].aspectRatio,
    background: '#f3ead8',
    requiredPhotos: 4,
    isActive: true,
    slots: createPortraitStripSlots(2400, 3600, 4, 2),
  },
];

const additionalTemplates: TemplateOption[] = [
  {
    id: 'classic-2x6-strip', name: 'Classic 2×6 Strip', description: 'A tall three-frame keepsake strip.', printSize: '2x6',
    physicalWidth: 2, physicalHeight: 6, widthPixels: 1200, heightPixels: 3600, dpi: 300, orientation: 'portrait', aspectRatio: '1:3', background: '#161411', requiredPhotos: 4, isActive: true,
    slots: createPortraitStripSlots(1200, 3600, 4, 1),
  },
  {
    id: 'event-5x7', name: 'Event 5×7', description: 'A generous event layout for larger prints.', printSize: '5x7',
    physicalWidth: 5, physicalHeight: 7, widthPixels: 3000, heightPixels: 4200, dpi: 300, orientation: 'portrait', aspectRatio: '5:7', background: '#e7e4d2', requiredPhotos: 4, isActive: true,
    slots: createPortraitStripSlots(3000, 4200, 4, 2),
  },
  {
    id: 'premium-6x8', name: 'Premium 6×8', description: 'A premium four-photo composition.', printSize: '6x8',
    physicalWidth: 6, physicalHeight: 8, widthPixels: 3600, heightPixels: 4800, dpi: 300, orientation: 'portrait', aspectRatio: '3:4', background: '#f3ead8', requiredPhotos: 4, isActive: true,
    slots: createPortraitStripSlots(3600, 4800, 4, 2),
  },
  {
    id: 'classic-4x6-landscape', name: 'Classic 4×6 Landscape', description: 'Wide landscape event card.', printSize: '4x6',
    physicalWidth: 6, physicalHeight: 4, widthPixels: 3600, heightPixels: 2400, dpi: 300, orientation: 'landscape', aspectRatio: '3:2', background: '#efe5d6', requiredPhotos: 3, isActive: true,
    slots: [1, 2, 3].map((index) => ({ id: `landscape-${index}`, type: 'photo' as const, x: 150 + (index - 1) * 1120, y: 260, width: 1000, height: 1880, fit: 'cover' as const })),
  },
  {
    id: 'event-5x7-landscape', name: 'Event 5×7 Landscape', description: 'Wide 5×7 event composition.', printSize: '5x7',
    physicalWidth: 7, physicalHeight: 5, widthPixels: 4200, heightPixels: 3000, dpi: 300, orientation: 'landscape', aspectRatio: '7:5', background: '#e7e4d2', requiredPhotos: 3, isActive: true,
    slots: [1, 2, 3].map((index) => ({ id: `event-landscape-${index}`, type: 'photo' as const, x: 180 + (index - 1) * 1300, y: 300, width: 1140, height: 2400, fit: 'cover' as const })),
  },
  {
    id: 'premium-6x8-landscape', name: 'Premium 6×8 Landscape', description: 'Wide premium composition for large prints.', printSize: '6x8',
    physicalWidth: 8, physicalHeight: 6, widthPixels: 4800, heightPixels: 3600, dpi: 300, orientation: 'landscape', aspectRatio: '4:3', background: '#f3ead8', requiredPhotos: 4, isActive: true,
    slots: [1, 2, 3, 4].map((index) => ({ id: `premium-landscape-${index}`, type: 'photo' as const, x: 180 + (index - 1) * 1120, y: 260, width: 980, height: 3080, fit: 'cover' as const })),
  },
];

const namedFourBySixPresets: TemplateOption[] = ['Wedding 4×6', 'Birthday 4×6', 'Graduation 4×6', 'Minimalist 4×6'].map((name, index) => ({
  ...templateSeed[index % templateSeed.length],
  id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  name,
}));

function PrintSizeSelector({ value, onChange }: { value: PrintSizeId; onChange: (value: PrintSizeId) => void }) {
  return (
    <div className="print-size-selector" aria-label="Print size">
      {Object.values(PRINT_SIZES).map((size) => (
        <button type="button" key={size.id} className={value === size.id ? 'selected' : ''} onClick={() => onChange(size.id)}>
          <strong>{size.label}</strong>
          <span>{size.widthPixels} × {size.heightPixels} px</span>
        </button>
      ))}
    </div>
  );
}

function OrientationSelector({ value, onChange }: { value: Orientation; onChange: (value: Orientation) => void }) {
  return (
    <div className="orientation-selector" aria-label="Template orientation">
      {(['portrait', 'landscape'] as const).map((orientation) => (
        <button type="button" key={orientation} className={value === orientation ? 'selected' : ''} onClick={() => onChange(orientation)}>
          {orientation === 'portrait' ? 'Portrait' : 'Landscape'}
        </button>
      ))}
    </div>
  );
}

function App() {
  const { templates, selectedTemplateId, setTemplates, setSelectedTemplate, photos, addPhoto, clearPhotos, countdown, setCountdown, step, setStep, settings, setSettings } = usePhotoboothStore();
  const [isPreparing, setIsPreparing] = useState(false);
  const [countdownValue, setCountdownValue] = useState(settings.countdownDuration || 3);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedPrintSize, setSelectedPrintSize] = useState<PrintSizeId>(settings.defaultPrintSize);
  const [selectedOrientation, setSelectedOrientation] = useState<Orientation>(settings.defaultOrientation);
  const [selectedStyle, setSelectedStyle] = useState('golden-strip');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [printPreview, setPrintPreview] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const { videoRef, status, error, devices, ensureCamera, capture, stopCamera } = useCamera();

  useEffect(() => {
    const allTemplates = [...templateSeed, ...namedFourBySixPresets, ...additionalTemplates];
    setTemplates(allTemplates);
    if (!selectedTemplateId && allTemplates[0]) {
      setSelectedTemplate(allTemplates[0].id);
    }
  }, [selectedTemplateId, setSelectedTemplate, setTemplates]);

  useEffect(() => {
    setCountdownValue(settings.countdownDuration || 3);
    setCountdown(settings.countdownDuration || 3);
  }, [setCountdown, settings.countdownDuration]);

  useEffect(() => {
    setCameraError(error ?? null);
  }, [error]);

  const visibleTemplates = useMemo(
    () => templates.filter((template) => template.printSize === selectedPrintSize && template.orientation === selectedOrientation && template.isActive),
    [selectedOrientation, selectedPrintSize, templates],
  );
  const activeTemplate = useMemo(
    () => visibleTemplates.find((template) => template.id === selectedTemplateId) ?? visibleTemplates[0],
    [selectedTemplateId, visibleTemplates],
  );

  useEffect(() => {
    if (activeTemplate && activeTemplate.id !== selectedTemplateId) {
      setSelectedTemplate(activeTemplate.id);
    }
  }, [activeTemplate, selectedTemplateId, setSelectedTemplate]);

  const countdownSequence = Array.from({ length: Math.max(countdownValue, 1) }, (_, index) => countdownValue - index);
  const activeStyle = photoStyles.find((style) => style.id === selectedStyle) ?? photoStyles[0];
  const renderTemplateConfig: PrintTemplate | null = activeTemplate ? {
    ...activeTemplate,
    active: activeTemplate.isActive,
    thumbnailUrl: null,
    headerText: activeStyle.title,
    footerText: activeStyle.footer,
    theme: activeStyle.theme,
  } : null;

  const startSession = async () => {
    if (!activeTemplate) {
      return;
    }

    setIsPreparing(true);
    try {
      await ensureCamera(selectedDeviceId || undefined);
      setStep('session');
    } catch (captureError) {
      const message = captureError instanceof Error ? captureError.message : 'Camera unavailable.';
      setCameraError(message);
    } finally {
      setIsPreparing(false);
    }
  };

  const takePhoto = async () => {
    if (!videoRef.current || isCapturing || !activeTemplate || photos.length >= activeTemplate.requiredPhotos) {
      return;
    }

    setIsCapturing(true);
    const sequence = countdownValue > 0
      ? Array.from({ length: countdownValue }, (_, index) => countdownValue - index)
      : [];

    for (const value of sequence) {
      setCountdown(value);
      await new Promise((resolve) => window.setTimeout(resolve, 700));
    }

    setCountdown(0);
    const dataUrl = capture();
    addPhoto({ id: `photo-${Date.now()}`, dataUrl, createdAt: new Date().toISOString() });
    const nextPhotoCount = photos.length + 1;
    if (nextPhotoCount >= activeTemplate.requiredPhotos) {
      setStep('review');
    }
    setIsCapturing(false);
  };

  const resetSession = () => {
    clearPhotos();
    setSelectedStyle('golden-strip');
    setIsCapturing(false);
    setPrintPreview(null);
    setQrCode(null);
    stopCamera();
    setStep('home');
    setCountdown(settings.countdownDuration || 3);
  };

  const tryAgain = () => {
    clearPhotos();
    setCountdown(settings.countdownDuration || 3);
    setStep('session');
  };

  const downloadLayout = async () => {
    if (!renderTemplateConfig) return;
    const styledLayout = await renderFinalLayout();
    const link = document.createElement('a');
    link.href = styledLayout;
    link.download = `${settings.businessName.toLowerCase().replace(/\s+/g, '-')}-${activeStyle.id}.${settings.outputFormat}`;
    link.click();
  };

  const renderFinalLayout = async () => {
    if (!renderTemplateConfig) {
      throw new Error('No print template is selected.');
    }
    return renderTemplate(renderTemplateConfig, photos, activeStyle.filter, settings.outputFormat, settings.photoQuality / 100);
  };

  const openPrintPreview = async () => {
    setIsRendering(true);
    try {
      const styledLayout = await renderFinalLayout();
      setPrintPreview(styledLayout);
    } finally {
      setIsRendering(false);
    }
  };

  const printLayout = async () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      return;
    }
    if (!renderTemplateConfig) return;
    const styledLayout = await renderFinalLayout();
    printWindow.document.write(`
      <!doctype html><html><head><title>${settings.businessName} photos</title>
      <style>@page{size:${renderTemplateConfig.orientation};margin:0}body{margin:0;padding:24px;background:#fff;text-align:center}img{width:min(100%,500px);height:auto;display:block;margin:auto}@media print{body{padding:0}img{width:auto;max-width:100%;max-height:100vh}}</style>
      </head><body><img src="${styledLayout}" alt="Photobooth layout"></body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const publishForQr = async () => {
    if (!renderTemplateConfig) return;
    setIsRendering(true);
    try {
      const styledLayout = await renderFinalLayout();
      const response = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: renderTemplateConfig.id, fileUrl: styledLayout }),
      });
      if (!response.ok) throw new Error('Could not publish the photo.');
      const photo = await response.json() as { id: string; qrToken: string };
      setQrCode(await QRCode.toDataURL(`${window.location.origin}/photos/${photo.id}`));
    } finally {
      setIsRendering(false);
    }
  };

  const applySettings = async () => {
    const response = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (response.ok) {
      const savedSettings = await response.json();
      setSettings(savedSettings);
    }
    setSelectedPrintSize(settings.defaultPrintSize);
    setSelectedOrientation(settings.defaultOrientation);
    setShowSettings(false);
  };

  return (
    <main className="booth-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={18} /></div>
          <span>{settings.businessName}</span>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" aria-label="Enter fullscreen" onClick={() => document.documentElement.requestFullscreen?.()}><Maximize size={20} /></button>
          <button className="icon-button" aria-label="Open settings" onClick={() => setShowSettings(true)}><Settings2 size={20} /></button>
        </div>
      </header>

      {step === 'home' && (
        <section className="welcome-grid">
          <div className="welcome-copy">
            <p className="eyebrow">Self-service photo studio</p>
            <h1>Make a moment<br /><em>worth keeping.</em></h1>
            <p className="intro">Choose a look, step into the frame, and let the booth handle the rest.</p>
            <div className="print-size-heading"><span>Print size</span><strong>{PRINT_SIZES[selectedPrintSize].label}</strong></div>
            <PrintSizeSelector value={selectedPrintSize} onChange={setSelectedPrintSize} />
            <div className="print-size-heading"><span>Orientation</span><strong>{selectedOrientation}</strong></div>
            <OrientationSelector value={selectedOrientation} onChange={setSelectedOrientation} />
            <div className="template-picker">
              {visibleTemplates.map((template) => (
                <button
                  type="button"
                  key={template.id}
                  className={`template-card ${selectedTemplateId === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <span className="template-name">{template.name}</span>
                  <span className="template-meta">{template.requiredPhotos} photos</span>
                </button>
              ))}
            </div>
            <button className="primary-button" onClick={startSession} disabled={isPreparing || !activeTemplate}>
              {isPreparing ? 'Preparing camera...' : 'Start a session'} <ChevronRight size={21} />
            </button>
            {cameraError && <div className="error-box">{cameraError}</div>}
            <div className="trust-note"><span className="status-dot" /> Camera ready for your next story</div>
          </div>

          <div className="preview-panel">
            <div className="preview-label"><Camera size={15} /> Live preview</div>
            <div className="preview-window">
              {status === 'ready' ? <video ref={videoRef} autoPlay playsInline muted className="camera-video" /> : <div className="preview-grid" />}
              <div className="preview-silhouette"><span>YOUR<br />PREVIEW</span></div>
              <div className="preview-corner corner-tl" /><div className="preview-corner corner-tr" />
              <div className="preview-corner corner-bl" /><div className="preview-corner corner-br" />
            </div>
            <div className="preview-footer">
              <span>{status === 'ready' ? 'Live' : 'Ready when you are'}</span>
              <span>{activeTemplate ? `${activeTemplate.widthPixels} × ${activeTemplate.heightPixels}` : '2400 × 3600'}</span>
            </div>
            <div className="device-row">
              <label>
                Camera:
                <select value={selectedDeviceId} onChange={(event) => setSelectedDeviceId(event.target.value)}>
                  <option value="">Default camera</option>
                  {devices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>{device.label || 'Camera'}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>
      )}

      {step === 'session' && (
        <section className="session-screen">
          <div className="session-topline">
            <span>Photo booth session</span>
            <span>{activeTemplate ? activeTemplate.name : 'Template'}</span>
          </div>
          <div className="session-panel">
            <div className="session-preview-wrapper">
              <video ref={videoRef} autoPlay playsInline muted className="capture-video" />
              {countdown > 0 && (
                <div className="countdown-overlay">
                  <div className="countdown-badge">{countdown}</div>
                </div>
              )}
            </div>
            <div className="session-actions">
              <button className="secondary-button" onClick={resetSession}><RefreshCcw size={18} /> Exit Session</button>
              <button className="primary-button" onClick={takePhoto} disabled={isCapturing || photos.length >= (activeTemplate?.requiredPhotos ?? 1)}><Camera size={18} /> {isCapturing ? 'Get ready...' : `Capture ${photos.length + 1} of ${activeTemplate?.requiredPhotos ?? 1}`}</button>
            </div>
            <div className="countdown-strip">
              {countdownSequence.map((value) => (
                <span key={value} className={value === countdown ? 'active' : ''}>{value}</span>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 'review' && (
        <section className="review-screen">
          <div className="review-header">
            <span>Review your photo</span>
            <span>{photos.length} / {activeTemplate?.requiredPhotos ?? 1}</span>
          </div>
          <div className="style-picker">
            <div>
              <p className="eyebrow">Make it yours</p>
              <h2>Choose a style</h2>
              <p className="style-helper">Your look is applied to every captured photo.</p>
            </div>
            <div className="style-options">
              {photoStyles.map((style) => (
                <button
                  type="button"
                  key={style.id}
                  className={`style-card ${selectedStyle === style.id ? 'selected' : ''}`}
                  onClick={() => setSelectedStyle(style.id)}
                >
                  <PhotoLayout photos={photos} style={style} compact />
                  <span className="style-name">{style.name}</span>
                  <span className="style-description">{style.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="review-grid">
            <PhotoLayout photos={photos} style={activeStyle} copies={activeTemplate?.printSize === '2x6' ? 1 : 2} />
          </div>
          <div className="review-actions">
            <button className="secondary-button" onClick={tryAgain}><RefreshCcw size={18} /> Try again</button>
            <button className="primary-button" onClick={() => setStep('final')}><CheckCheck size={18} /> Continue</button>
          </div>
        </section>
      )}

      {step === 'final' && (
        <section className="final-screen">
          <div className="success-card">
            <div className="success-icon"><ImageIcon size={28} /></div>
            <h2>Your photo is ready.</h2>
            <p>{photos.length} photos · {activeStyle.name} style</p>
            <div className="final-gallery"><PhotoLayout photos={photos} style={activeStyle} copies={activeTemplate?.printSize === '2x6' ? 1 : 2} /></div>
            <div className="final-actions">
              <button className="secondary-button" onClick={() => void downloadLayout()}><Download size={18} /> Download layout</button>
              <button className="secondary-button" onClick={() => void openPrintPreview()} disabled={isRendering}><Printer size={18} /> Print preview</button>
              <button className="secondary-button" onClick={() => void publishForQr()} disabled={isRendering}><Sparkles size={18} /> QR code</button>
              <button className="primary-button" onClick={resetSession}><TimerReset size={18} /> Return to start</button>
            </div>
            {qrCode && <div className="qr-result"><img src={qrCode} alt="QR code for your high-resolution photo" /><span>Scan to open your high-resolution photo</span></div>}
          </div>
        </section>
      )}

      {showSettings && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowSettings(false)}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><p className="eyebrow">Admin settings</p><h2 id="settings-title">Print output</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings">×</button></div>
            <label className="setting-field">Default print size<select value={settings.defaultPrintSize} onChange={(event) => setSettings({ ...settings, defaultPrintSize: event.target.value as PrintSizeId })}>{Object.values(PRINT_SIZES).map((size) => <option key={size.id} value={size.id}>{size.label} · {size.widthPixels} × {size.heightPixels} px</option>)}</select></label>
            <label className="setting-field">Default orientation<select value={settings.defaultOrientation} onChange={(event) => setSettings({ ...settings, defaultOrientation: event.target.value as Orientation })}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
            <label className="setting-field">DPI<select value={settings.dpi} onChange={(event) => setSettings({ ...settings, dpi: Number(event.target.value) as 300 | 600 })}><option value="300">300 DPI</option><option value="600">600 DPI</option></select></label>
            <label className="setting-field">Output format<select value={settings.outputFormat} onChange={(event) => setSettings({ ...settings, outputFormat: event.target.value as 'jpeg' | 'png' })}><option value="jpeg">JPEG</option><option value="png" disabled={!settings.enablePng}>PNG</option></select></label>
            <label className="setting-field">JPEG quality<select value={settings.photoQuality} onChange={(event) => setSettings({ ...settings, photoQuality: Number(event.target.value) })}><option value="80">80%</option><option value="90">90%</option><option value="95">95%</option><option value="100">100%</option></select></label>
            <label className="setting-check"><input type="checkbox" checked={settings.enablePng} onChange={(event) => setSettings({ ...settings, enablePng: event.target.checked })} /> Enable PNG export</label>
            <button className="secondary-button" onClick={() => { setShowEditor(true); setShowSettings(false); }}>Open template editor</button>
            <button className="primary-button" onClick={() => void applySettings()}>Apply settings</button>
          </section>
        </div>
      )}

      {showEditor && renderTemplateConfig && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowEditor(false)}>
          <section className="editor-modal" role="dialog" aria-modal="true" aria-labelledby="editor-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><p className="eyebrow">Template editor</p><h2 id="editor-title">{activeTemplate?.name}</h2></div><button className="icon-button" onClick={() => setShowEditor(false)} aria-label="Close template editor">×</button></div>
            <TemplateEditor
              template={renderTemplateConfig}
              availableWidth={640}
              availableHeight={620}
              onSave={(slots) => {
                setTemplates(templates.map((template) => template.id === renderTemplateConfig.id ? { ...template, slots } : template));
                setShowEditor(false);
              }}
            />
          </section>
        </div>
      )}

      {printPreview && renderTemplateConfig && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPrintPreview(null)}>
          <section className="print-preview-modal" role="dialog" aria-modal="true" aria-labelledby="print-preview-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><p className="eyebrow">Print preview</p><h2 id="print-preview-title">Ready to print</h2></div><button className="icon-button" onClick={() => setPrintPreview(null)} aria-label="Close print preview">×</button></div>
            <div className="print-preview-meta"><span>Physical size: {renderTemplateConfig.physicalWidth} × {renderTemplateConfig.physicalHeight} in</span><span>Resolution: {renderTemplateConfig.widthPixels} × {renderTemplateConfig.heightPixels} px</span><span>Orientation: {renderTemplateConfig.orientation}</span></div>
            <img className="print-preview-image" src={printPreview} alt="High-resolution print preview" />
            <div className="final-actions"><button className="secondary-button" onClick={() => void printLayout()}><Printer size={18} /> Print</button><button className="secondary-button" onClick={() => void downloadLayout()}><Download size={18} /> Download</button><button className="primary-button" onClick={() => setPrintPreview(null)}>Back</button></div>
          </section>
        </div>
      )}

      <nav className="workflow" aria-label="Session progress">
        {workflowSteps.map((stepName, index) => (
          <div className={`workflow-step ${step === 'home' && index === 0 ? 'active' : ''}`} key={stepName}>
            <span className="step-number">0{index + 1}</span><span>{stepName}</span>
          </div>
        ))}
      </nav>
    </main>
  );
}

export default App;
