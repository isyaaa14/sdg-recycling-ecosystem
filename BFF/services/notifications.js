import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.join(__dirname, '..', 'data', 'notifications.json');

fs.mkdirSync(path.dirname(storePath), { recursive: true });

function readStore() {
  if (!fs.existsSync(storePath)) {
    return { byUser: {} };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    return {
      byUser: raw?.byUser && typeof raw.byUser === 'object' ? raw.byUser : {},
    };
  } catch {
    return { byUser: {} };
  }
}

function writeStore(store) {
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function userKey(email) {
  return normalizeEmail(email);
}

export function listNotifications(email, { limit = 50 } = {}) {
  const key = userKey(email);
  if (!key) return [];
  const store = readStore();
  const items = Array.isArray(store.byUser[key]) ? store.byUser[key] : [];
  return items.slice(0, limit);
}

export function countUnread(email) {
  return listNotifications(email).filter((item) => !item.read).length;
}

export function createNotification(email, { type, title, body, link, dedupeKey } = {}) {
  const key = userKey(email);
  if (!key || !title) return null;

  const store = readStore();
  const existing = Array.isArray(store.byUser[key]) ? store.byUser[key] : [];

  if (dedupeKey) {
    const dup = existing.find((item) => item.dedupeKey === dedupeKey);
    if (dup) return dup;
  }

  const notification = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: type || 'general',
    title: String(title),
    body: body ? String(body) : '',
    link: link || null,
    read: false,
    dedupeKey: dedupeKey || null,
    createdAt: new Date().toISOString(),
  };

  store.byUser[key] = [notification, ...existing].slice(0, 100);
  writeStore(store);
  return notification;
}

export function markNotificationRead(email, id) {
  const key = userKey(email);
  if (!key) return null;
  const store = readStore();
  const items = Array.isArray(store.byUser[key]) ? store.byUser[key] : [];
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) return null;
  items[idx] = { ...items[idx], read: true };
  store.byUser[key] = items;
  writeStore(store);
  return items[idx];
}

export function markAllNotificationsRead(email) {
  const key = userKey(email);
  if (!key) return [];
  const store = readStore();
  const items = Array.isArray(store.byUser[key]) ? store.byUser[key] : [];
  const updated = items.map((item) => ({ ...item, read: true }));
  store.byUser[key] = updated;
  writeStore(store);
  return updated;
}
