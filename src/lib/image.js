// Phone photos are often 5-12 MB. Shrinking them in the browser before
// upload makes scanning faster, cheaper and avoids size errors, and a
// receipt is still perfectly readable at 1800px.
const MAX_SIDE = 2400; // photos: big enough to read several receipts in one picture
const PDF_PAGE_SIDE = 1800;
const MAX_PDF_PAGES = 8;

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('Could not read that file.'));
    r.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That image could not be opened.'));
    img.src = src;
  });
}

// Renders each page of a PDF (up to 8) to a JPEG, so readers that cannot take
// PDFs (like Grok) can still read it. The original PDF is still what gets stored.
async function pdfPagesAsJpegs(file) {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = Math.min(pdf.numPages, MAX_PDF_PAGES);
  const out = [];
  for (let n = 1; n <= pages; n += 1) {
    const page = await pdf.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.5, PDF_PAGE_SIDE / Math.max(base.width, base.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    out.push({ mediaType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.8).split(',')[1] });
  }
  return out;
}

// Android pickers (and some cloud apps) hand over files with an empty type,
// so fall back to the file extension.
function guessType(file) {
  if (file.type) return file.type;
  const ext = String(file.name || '').toLowerCase().split('.').pop();
  return ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf' })[ext] || '';
}

// Loads the photo with a normal <img> (the most dependable path, and it applies
// the camera's rotation). Falls back to createImageBitmap only if that fails.
async function openPhoto(blob, mode) {
  if (mode === 'bitmap') return createImageBitmap(blob);
  if (mode === 'dataurl') return loadImage(await readAsDataURL(blob)); // the original method, known to work on Android
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Draws the photo at `side` pixels (scaling happens in drawImage, not in the decoder).
function toJpeg(img, side) {
  const scale = Math.min(1, side / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Guard against a blank result (some Android decoders return an empty picture):
  // sample a small grid and make sure the pixels are not all the same.
  try {
    const probe = document.createElement('canvas');
    probe.width = 24; probe.height = 24;
    const pctx = probe.getContext('2d');
    pctx.drawImage(canvas, 0, 0, 24, 24);
    const px = pctx.getImageData(0, 0, 24, 24).data;
    let min = 255; let max = 0;
    for (let i = 0; i < px.length; i += 4) {
      const v = (px[i] + px[i + 1] + px[i + 2]) / 3;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (max - min < 6) return '';
  } catch (e) { /* if sampling is not possible, trust the picture */ }

  const out = canvas.toDataURL('image/jpeg', 0.85);
  return out.length > 100 ? out.split(',')[1] : '';
}

// Returns { mediaType, data (base64, no prefix), fileName }
export async function prepareUpload(file) {
  const type = guessType(file);
  if (type === 'application/pdf') {
    if (file.size > 8 * 1024 * 1024) throw new Error('That PDF is larger than 8 MB.');
    const url = await readAsDataURL(file);
    let readImages = [];
    let why = '';
    try { readImages = await pdfPagesAsJpegs(file); } catch (err) { console.warn('PDF page render failed:', err); why = err?.message || String(err); }
    if (!readImages.length) throw new Error(`That PDF could not be opened${why ? ` (${why})` : ''}. Try a photo of the receipt instead.`);
    return { mediaType: 'application/pdf', data: url.split(',')[1], fileName: file.name || 'receipt.pdf', readImages };
  }
  if (!type.startsWith('image/')) throw new Error(`Please choose a photo or a PDF${file.type ? ` (got ${file.type})` : ''}.`);

  // Copy the file's bytes into memory first. Android hands over files lazily, and
  // decoding straight from that handle can fail even for an ordinary JPEG.
  let blob = file;
  let bytes = null;
  try {
    bytes = await file.arrayBuffer();
    blob = new Blob([bytes], { type: type || 'image/jpeg' });
  } catch (err) {
    throw new Error('This device would not let the app read that file. Please pick it again, or take a new photo.');
  }

  let data = '';
  let why = '';
  const attempts = [['dataurl', MAX_SIDE], ['dataurl', 1600], ['objecturl', MAX_SIDE], ['bitmap', MAX_SIDE], ['bitmap', 1600]];
  for (const [mode, side] of attempts) {
    if (mode === 'bitmap' && typeof createImageBitmap !== 'function') continue;
    try {
      const img = await openPhoto(blob, mode);
      data = toJpeg(img, side);
      img.close?.();
      if (data) break;
      why = 'the picture came out blank';
    } catch (err) {
      why = err?.message || String(err);
    }
  }

  if (!data) {
    // Last resort: send the original file untouched and let the server read it.
    const sendable = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type);
    const head = bytes ? new Uint8Array(bytes.slice(0, 4)) : [];
    const looksValid = (head[0] === 0xff && head[1] === 0xd8) || (head[0] === 0x89 && head[1] === 0x50) || (head[0] === 0x52 && head[1] === 0x49) || (head[0] === 0x47 && head[1] === 0x49);
    if (bytes && !looksValid) {
      throw new Error(`The file the phone handed over is not a readable image (${bytes.byteLength} bytes). Please pick it again, or take a new photo.`);
    }
    if (sendable && bytes && bytes.byteLength <= 7 * 1024 * 1024) {
      let bin = '';
      const view = new Uint8Array(bytes);
      for (let i = 0; i < view.length; i += 0x8000) bin += String.fromCharCode.apply(null, view.subarray(i, i + 0x8000));
      return { mediaType: type, data: btoa(bin), fileName: file.name || 'receipt' };
    }
    throw new Error(`This photo could not be prepared on this device${why ? ` (${why})` : ''}. Try a screenshot of it instead.`);
  }
  const base = String(file.name || 'receipt').replace(/\.[^.]+$/, '') || 'receipt';
  return { mediaType: 'image/jpeg', data, fileName: base + '.jpg' };
}
