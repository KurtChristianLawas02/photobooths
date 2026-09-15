import 'dotenv/config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { isValidTemplateDimensions, PRINT_SIZES, type Orientation, type PrintSizeId } from '@photobooth/shared';
import { randomUUID } from 'node:crypto';

declare global {
  // Express request augmentation requires a namespace declaration.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { email: string };
    }
  }
}

const app = express();
const defaultPort = Number(process.env.PORT ?? 3001);

const jwtSecret = process.env.JWT_SECRET ?? 'photobooth-dev-secret';

function startServer(port: number) {
  const server = app.listen(port, () => {
    console.log(`Photobooth API listening on port ${port}`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} is busy; retrying on ${nextPort}.`);
      startServer(nextPort);
      return;
    }

    throw error;
  });
}

type TemplateRecord = {
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
  slots: Array<{ id: string; type: 'photo'; x: number; y: number; width: number; height: number; fit: 'cover' | 'contain'; }>;
  active: boolean;
};

type PhotoRecord = {
  id: string;
  templateId: string;
  fileUrl: string;
  qrToken: string;
  createdAt: string;
};

type SettingRecord = {
  businessName: string;
  countdownDuration: 0 | 3 | 5 | 10;
  mirrorCamera: boolean;
  outputFormat: 'png' | 'jpeg';
  photoQuality: number;
  defaultPrintSize: PrintSizeId;
  defaultOrientation: Orientation;
  dpi: 300 | 600;
  enablePng: boolean;
  enabledPrintSizes: PrintSizeId[];
  enableQr: boolean;
  autoReturnSeconds: number;
  primaryColor: string;
  secondaryColor: string;
};

const settingsStore: SettingRecord = {
  businessName: 'Studio Booth',
  countdownDuration: 3,
  mirrorCamera: true,
  outputFormat: 'jpeg',
  photoQuality: 95,
  defaultPrintSize: '4x6',
  defaultOrientation: 'portrait',
  dpi: 300,
  enablePng: true,
  enabledPrintSizes: ['2x6', '4x6', '5x7', '6x8'],
  enableQr: true,
  autoReturnSeconds: 20,
  primaryColor: '#d5c28b',
  secondaryColor: '#8db3a2',
};

const templateStore: TemplateRecord[] = [
  {
    id: 'classic-portrait',
    name: 'Classic Portrait',
    description: 'Clean studio composition for portraits.',
    printSize: '4x6',
    physicalWidth: 4,
    physicalHeight: 6,
    widthPixels: 2400,
    heightPixels: 3600,
    dpi: 300,
    orientation: 'portrait',
    aspectRatio: PRINT_SIZES['4x6'].aspectRatio,
    background: '#efe5d6',
    requiredPhotos: 2,
    active: true,
    slots: [
      { id: 'slot-1', type: 'photo', x: 190, y: 180, width: 960, height: 1400, fit: 'cover' },
      { id: 'slot-2', type: 'photo', x: 1250, y: 2020, width: 960, height: 1200, fit: 'cover' },
    ],
  },
  {
    id: 'golden-moment',
    name: 'Golden Moment',
    description: 'Warm, premium portrait layout for events.',
    printSize: '4x6',
    physicalWidth: 4,
    physicalHeight: 6,
    widthPixels: 2400,
    heightPixels: 3600,
    dpi: 300,
    orientation: 'portrait',
    aspectRatio: PRINT_SIZES['4x6'].aspectRatio,
    background: '#f3ead8',
    requiredPhotos: 3,
    active: true,
    slots: [
      { id: 'slot-1', type: 'photo', x: 150, y: 160, width: 900, height: 1100, fit: 'cover' },
      { id: 'slot-2', type: 'photo', x: 1350, y: 160, width: 900, height: 1100, fit: 'cover' },
      { id: 'slot-3', type: 'photo', x: 750, y: 1500, width: 900, height: 1100, fit: 'cover' },
    ],
  },
];

const photoStore: PhotoRecord[] = [];
const adminUser = {
  email: 'admin@studio.local',
  passwordHash: bcrypt.hashSync('admin123', 10),
};

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(4) });

function createToken(payload: Record<string, unknown>) {
  return jwt.sign(payload, jwtSecret, { expiresIn: '8h' });
}

function requireAdmin(request: Request, response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    response.status(401).json({ message: 'Authentication required.' });
    return;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = jwt.verify(token, jwtSecret) as { email: string };
    request.user = payload;
    next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    response.status(401).json({ message: 'Invalid token.' });
  }
}

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '50mb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'photobooth-api' });
});

app.get('/api/auth/me', requireAdmin, (request, response) => {
  response.json({ email: (request.user as { email: string }).email });
});

app.post('/api/auth/login', (request, response) => {
  const parsed = loginSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: 'Email and password are required.' });
    return;
  }

  const { email, password } = parsed.data;

  if (email !== adminUser.email || !bcrypt.compareSync(password, adminUser.passwordHash)) {
    response.status(401).json({ message: 'Invalid admin credentials.' });
    return;
  }

  response.json({ token: createToken({ email }), user: { email } });
});

app.get('/api/templates', (_request, response) => {
  response.json(templateStore.filter((template) => template.active));
});

app.get('/api/templates/:id', (request, response) => {
  const template = templateStore.find((item) => item.id === request.params.id);

  if (!template) {
    response.status(404).json({ message: 'Template not found.' });
    return;
  }

  response.json(template);
});

app.post('/api/templates', requireAdmin, (request, response) => {
  const schema = z.object({
    name: z.string().min(2),
    description: z.string().default(''),
    printSize: z.enum(['2x6', '4x6', '5x7', '6x8']),
    physicalWidth: z.number().positive(),
    physicalHeight: z.number().positive(),
    widthPixels: z.number().int().positive(),
    heightPixels: z.number().int().positive(),
    dpi: z.union([z.literal(300), z.literal(600)]),
    orientation: z.enum(['portrait', 'landscape']),
    aspectRatio: z.string().min(3),
    requiredPhotos: z.number().int().min(1).max(12),
    background: z.string().default('#ffffff'),
    slots: z.array(z.object({ id: z.string(), type: z.literal('photo'), x: z.number().nonnegative(), y: z.number().nonnegative(), width: z.number().positive(), height: z.number().positive(), fit: z.enum(['cover', 'contain']) })).default([]),
  });

  const parsed = schema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: 'Template payload is invalid.' });
    return;
  }

  if (!isValidTemplateDimensions(parsed.data)) {
    response.status(400).json({ message: 'Template dimensions, orientation, DPI, or aspect ratio are invalid.' });
    return;
  }

  const template = {
    id: `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    ...parsed.data,
    active: true,
  };

  templateStore.push(template);
  response.status(201).json(template);
});

app.get('/api/settings', (_request, response) => {
  response.json(settingsStore);
});

app.put('/api/settings', requireAdmin, (request, response) => {
  const schema = z.object({
    businessName: z.string().min(2).optional(),
    countdownDuration: z.union([z.literal(0), z.literal(3), z.literal(5), z.literal(10)]).optional(),
    mirrorCamera: z.boolean().optional(),
    outputFormat: z.enum(['png', 'jpeg']).optional(),
    photoQuality: z.number().min(1).max(100).optional(),
    defaultPrintSize: z.enum(['2x6', '4x6', '5x7', '6x8']).optional(),
    defaultOrientation: z.enum(['portrait', 'landscape']).optional(),
    dpi: z.union([z.literal(300), z.literal(600)]).optional(),
    enablePng: z.boolean().optional(),
    enabledPrintSizes: z.array(z.enum(['2x6', '4x6', '5x7', '6x8'])).optional(),
    enableQr: z.boolean().optional(),
    autoReturnSeconds: z.number().min(0).optional(),
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
  });

  const parsed = schema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: 'Settings payload is invalid.' });
    return;
  }

  Object.assign(settingsStore, parsed.data);
  response.json(settingsStore);
});

app.get('/api/photos', (_request, response) => {
  response.json(photoStore);
});

app.post('/api/photos', (request, response) => {
  const schema = z.object({
    templateId: z.string(),
    fileUrl: z.string().min(10),
  });

  const parsed = schema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({ message: 'Photo payload is invalid.' });
    return;
  }

  const photo = {
    id: `photo-${Date.now()}`,
    templateId: parsed.data.templateId,
    fileUrl: parsed.data.fileUrl,
    qrToken: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  photoStore.unshift(photo);
  response.status(201).json(photo);
});

app.get('/api/photos/:id', (request, response) => {
  const photo = photoStore.find((item) => item.id === request.params.id || item.qrToken === request.params.id);
  if (!photo) {
    response.status(404).json({ message: 'Photo not found.' });
    return;
  }
  response.json(photo);
});

app.get('/photos/:id', (request, response) => {
  const photo = photoStore.find((item) => item.id === request.params.id || item.qrToken === request.params.id);
  if (!photo) {
    response.status(404).send('Photo not found.');
    return;
  }
  const serializedImage = JSON.stringify(photo.fileUrl);
  response.type('html').send(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio Booth photo</title><style>body{margin:0;padding:24px;background:#111;color:#fff;font:16px Arial;text-align:center}img{display:block;width:min(100%,720px);height:auto;margin:0 auto 20px}a{display:inline-block;padding:14px 18px;background:#d5c28b;color:#111;text-decoration:none;font-weight:700;border-radius:5px}</style></head><body><img src=${serializedImage} alt="Studio Booth photo"><a href=${serializedImage} download="studio-booth-photo.jpg">Download high-resolution photo</a></body></html>`);
});

app.get('/api/events', (_request, response) => {
  response.json([
    { id: 'event-1', name: 'Spring Celebration', date: '2026-09-20', location: 'Downtown Studio', isActive: true },
    { id: 'event-2', name: 'Corporate Mixer', date: '2026-10-15', location: 'City Hall', isActive: true },
  ]);
});

startServer(defaultPort);
