/**
 * In-memory sliding window rate limiter untuk Next.js Route Handlers.
 * Melindungi endpoint sensitif (login, verifikasi 2FA, register) dari serangan brute-force.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const store = new Map<string, RateLimitRecord>();

// Bersihkan cache lama setiap 5 menit agar memori tidak bocor
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      // Hapus timestamp yang sudah lebih dari 15 menit
      const validTimestamps = record.timestamps.filter((t) => now - t < 15 * 60 * 1000);
      if (validTimestamps.length === 0) {
        store.delete(key);
      } else {
        record.timestamps = validTimestamps;
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitOptions {
  intervalMs?: number; // Jendela waktu, default: 60000 (1 menit)
  max?: number;        // Batas percobaan per jendela, default: 5
}

export function rateLimit(key: string, options: RateLimitOptions = {}) {
  const intervalMs = options.intervalMs ?? 60 * 1000;
  const max = options.max ?? 5;
  const now = Date.now();

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter hanya timestamp dalam interval aktif
  record.timestamps = record.timestamps.filter((t) => now - t < intervalMs);

  if (record.timestamps.length >= max) {
    const oldest = record.timestamps[0];
    const retryAfterSeconds = Math.ceil((oldest + intervalMs - now) / 1000);
    return {
      success: false,
      limit: max,
      remaining: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  record.timestamps.push(now);

  return {
    success: true,
    limit: max,
    remaining: max - record.timestamps.length,
    retryAfterSeconds: 0,
  };
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
