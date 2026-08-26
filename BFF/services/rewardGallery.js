import fs from 'fs';
import path from 'path';
import { rewardUploadsDir, uploadsRoot } from '../middleware/upload.js';

const galleryRoot = path.join(uploadsRoot, 'rewards', 'gallery');

fs.mkdirSync(galleryRoot, { recursive: true });

function galleryPath(rewardId) {
  return path.join(galleryRoot, `${rewardId}.json`);
}

function readGallery(rewardId) {
  const file = galleryPath(rewardId);
  if (!fs.existsSync(file)) {
    return { images: [] };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      images: Array.isArray(raw.images) ? raw.images : [],
    };
  } catch {
    return { images: [] };
  }
}

function writeGallery(rewardId, gallery) {
  writeGalleryAtomic(rewardId, gallery);
}

function writeGalleryAtomic(rewardId, gallery) {
  const file = galleryPath(rewardId);
  fs.writeFileSync(file, JSON.stringify(gallery, null, 2), 'utf8');
}

export function getRewardGallery(rewardId) {
  return readGallery(rewardId);
}

export function addRewardGalleryImage(
  rewardId,
  imageUrl,
  { makeMain = false, uploadId = null } = {}
) {
  const gallery = readGallery(rewardId);
  const image = {
    id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    url: imageUrl,
    uploadId: uploadId || null,
    isMain: false,
    createdAt: new Date().toISOString(),
  };

  if (makeMain || gallery.images.length === 0) {
    gallery.images = gallery.images.map((item) => ({ ...item, isMain: false }));
    image.isMain = true;
  }

  gallery.images.push(image);
  writeGallery(rewardId, gallery);
  return gallery;
}

export function setRewardGalleryMain(rewardId, imageId) {
  const gallery = readGallery(rewardId);
  const exists = gallery.images.some((item) => item.id === imageId);
  if (!exists) {
    throw Object.assign(new Error('Gallery image not found.'), { status: 404 });
  }
  gallery.images = gallery.images.map((item) => ({
    ...item,
    isMain: item.id === imageId,
  }));
  writeGallery(rewardId, gallery);
  return gallery;
}

export function removeRewardGalleryImage(rewardId, imageId) {
  const gallery = readGallery(rewardId);
  const next = gallery.images.filter((item) => item.id !== imageId);
  if (next.length && !next.some((item) => item.isMain)) {
    next[0].isMain = true;
  }
  gallery.images = next;
  writeGallery(rewardId, gallery);
  return gallery;
}

export function getMainGalleryUrl(rewardId) {
  const gallery = readGallery(rewardId);
  const main = gallery.images.find((item) => item.isMain) || gallery.images[0];
  return main?.url || null;
}

function localRewardFileFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const marker = '/uploads/rewards/';
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const name = decodeURIComponent(url.slice(idx + marker.length).split('?')[0] || '');
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    return null;
  }
  return path.join(rewardUploadsDir, name);
}

/** Drop URLs the browser cannot load (missing local files, localhost, placeholders). */
export function isDeadGalleryUrl(url) {
  if (!url || typeof url !== 'string') return true;
  if (!/^https?:\/\//i.test(url)) return true;
  if (url.includes('localhost:') && url.includes('/uploads/')) return true;
  if (url.includes('127.0.0.1') && url.includes('/uploads/')) return true;
  if (url.includes('unsplash.com') || url.includes('via.placeholder')) return true;

  const localFile = localRewardFileFromUrl(url);
  if (localFile) {
    return !fs.existsSync(localFile);
  }

  return false;
}

/**
 * Attach gallery; drop dead local paths; optionally refresh Azure Blob SAS
 * via Student4 upload records (refreshReadUrl async callback).
 */
export async function attachGalleryToReward(reward, { refreshReadUrl } = {}) {
  if (!reward?.id) return reward;
  let gallery = readGallery(reward.id);

  const durableImages = gallery.images.filter(
    (img) => img?.url && !isDeadGalleryUrl(img.url)
  );
  if (durableImages.length !== gallery.images.length) {
    gallery = { images: durableImages };
    writeGallery(reward.id, gallery);
  }

  // Seed from Student4 reward.imageUrl when gallery is empty (survives BFF redeploy).
  const legacyUrl = reward.image;
  if (!gallery.images.length && legacyUrl && !isDeadGalleryUrl(legacyUrl)) {
    gallery = addRewardGalleryImage(reward.id, legacyUrl, { makeMain: true });
  }

  if (typeof refreshReadUrl === 'function' && gallery.images.length) {
    const refreshed = [];
    for (const img of gallery.images) {
      // Local BFF files do not need Student4 SAS refresh.
      if (!img.uploadId || localRewardFileFromUrl(img.url)) {
        refreshed.push(img);
        continue;
      }
      try {
        const freshUrl = await refreshReadUrl(img.uploadId);
        if (freshUrl && freshUrl !== img.url && !isDeadGalleryUrl(freshUrl)) {
          refreshed.push({ ...img, url: freshUrl });
        } else {
          refreshed.push(img);
        }
      } catch {
        refreshed.push(img);
      }
    }
    if (JSON.stringify(refreshed) !== JSON.stringify(gallery.images)) {
      gallery = { images: refreshed };
      writeGallery(reward.id, gallery);
    }
  }

  const main = gallery.images.find((item) => item.isMain) || gallery.images[0];
  return {
    ...reward,
    image: main?.url || (!isDeadGalleryUrl(reward.image) ? reward.image : ''),
    images: gallery.images,
  };
}
