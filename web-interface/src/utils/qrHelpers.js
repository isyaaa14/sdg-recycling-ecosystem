import jsQR from 'jsqr';

/** Build a QR image URL encoding the claim payload (no extra npm package needed). */
export function buildQrImageUrl(claimPayload, size = 280) {
  const data =
    typeof claimPayload === 'string' ? claimPayload : JSON.stringify(claimPayload);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export async function downloadQrImage(claimPayload, filename = 'recycling-qr.png') {
  const url = buildQrImageUrl(claimPayload, 512);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Unable to download QR image.');
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function normalizeClaimObject(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid claim code.');
  }

  // Our backend shape: { payload, signature }
  if (parsed.payload && parsed.signature) {
    return {
      payload: parsed.payload,
      signature: parsed.signature,
    };
  }

  // Nested wrappers
  if (parsed.signedPayload?.payload && parsed.signedPayload?.signature) {
    return {
      payload: parsed.signedPayload.payload,
      signature: parsed.signedPayload.signature,
    };
  }

  if (parsed.data?.payload && parsed.data?.signature) {
    return {
      payload: parsed.data.payload,
      signature: parsed.data.signature,
    };
  }

  throw new Error(
    'Invalid claim code. Expected signed payload JSON from Issue Recycling QR.'
  );
}

/**
 * Parse raw QR text / pasted claim code into { payload, signature }.
 * Supports plain JSON and verify-qr?data=<base64> style URLs.
 */
export function parseClaimPayloadText(raw) {
  let text = String(raw || '').trim();
  if (!text) throw new Error('Claim code is empty.');

  // URL with ?data= base64 or url-encoded JSON
  try {
    if (/^https?:\/\//i.test(text) || text.includes('data=')) {
      const url = new URL(text, window.location.origin);
      const dataParam = url.searchParams.get('data');
      if (dataParam) {
        try {
          // base64 JSON
          text = atob(dataParam);
        } catch {
          text = decodeURIComponent(dataParam);
        }
      }
    }
  } catch {
    // not a URL — keep original text
  }

  // Some decoders wrap JSON in quotes
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    try {
      text = JSON.parse(text);
    } catch {
      text = text.slice(1, -1);
    }
  }

  if (typeof text !== 'string') {
    return normalizeClaimObject(text);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      'Could not parse claim code. Use the QR from Issue Recycling QR, or paste Copy claim code.'
    );
  }

  // Double-encoded JSON string
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      throw new Error('Invalid claim code format.');
    }
  }

  return normalizeClaimObject(parsed);
}

async function detectWithBarcodeDetector(bitmap) {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }
  try {
    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    const codes = await detector.detect(bitmap);
    return codes?.[0]?.rawValue || null;
  } catch {
    return null;
  }
}

function detectWithJsQR(bitmap) {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  });
  return result?.data || null;
}

/** Read a QR image file and return claim body { payload, signature }. */
export async function decodeClaimFromImageFile(file) {
  const bitmap = await createImageBitmap(file);

  let raw =
    (await detectWithBarcodeDetector(bitmap)) || detectWithJsQR(bitmap);

  // Retry upscaled — helps small / compressed downloads
  if (!raw && (bitmap.width < 400 || bitmap.height < 400)) {
    const scale = 3;
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });
      raw = result?.data || null;
    }
  }

  bitmap.close?.();

  if (!raw) {
    throw new Error(
      'Could not read a QR code from this image. Try a clearer PNG, or paste the claim code from admin (Copy claim code).'
    );
  }

  return parseClaimPayloadText(raw);
}
