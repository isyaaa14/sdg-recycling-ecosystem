import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Azure App Service replaces wwwroot on zip deploy, but /home persists.
 * Keep reward gallery files + JSON under HOME so multi-image survives redeploys.
 */
function resolveUploadsRoot() {
  const home = process.env.HOME || process.env.USERPROFILE;
  if (process.env.WEBSITE_SITE_NAME && home) {
    return path.join(home, 'sdg-bff-data', 'uploads');
  }
  return path.join(__dirname, '..', 'uploads');
}

export const uploadsRoot = resolveUploadsRoot();
export const rewardUploadsDir = path.join(uploadsRoot, 'rewards');

fs.mkdirSync(rewardUploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, rewardUploadsDir),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || 'image')
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, '-');
    cb(null, `${Date.now()}-${safe}`);
  },
});

function fileFilter(_req, file, cb) {
  const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
  if (!ok) {
    cb(new Error('Only JPEG, PNG, or WebP images are allowed.'));
    return;
  }
  cb(null, true);
}

/** Legacy local-disk reward uploads. */
export const uploadRewardImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/** Memory storage for forwarding images to Student 4 / Azure Blob. */
export const uploadMissionProofImage = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const uploadRewardImageMemory = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

export function saveRewardImageBuffer(file) {
  const safe = String(file.originalname || 'image')
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-');
  const filename = `${Date.now()}-${safe}`;
  const dest = path.join(rewardUploadsDir, filename);
  fs.writeFileSync(dest, file.buffer);
  return { filename, dest };
}

export function publicUploadsBaseUrl(req) {
  const fromEnv = (process.env.BFF_PUBLIC_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  const host = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
  return `${proto}://${host}`;
}
