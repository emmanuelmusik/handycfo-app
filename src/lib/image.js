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

// Opens a photo already shrunk to `side` pixels. createImageBitmap decodes at
// the smaller size, so a 50-megapixel Android photo never has to sit in memory
// at full size (which is what makes plain <img> loading fail on many phones).
async function openScaled(file, side) {
  if (typeof createImageBitmap === 'function') {
    try {
      const probe = await createImageBitmap(file);
      const scale = Math.min(1, side / Math.max(probe.width, probe.height));
      if (scale >= 1) return probe;
      const w = Math.max(1, Math.round(probe.width * scale));
      const h = Math.max(1, Math.round(probe.height * scale));
      probe.close?.();
      return await createImageBitmap(file, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
    } catch (err) {
      console.warn('createImageBitmap failed, falling back:', err);
    }
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    return await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function toJpeg(img) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, img.width);
  canvas.height = Math.max(1, img.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
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

  let data = '';
  let why = '';
  for (const side of [MAX_SIDE, 1600, 1100]) {
    try {
      const img = await openScaled(file, side);
      data = toJpeg(img);
      img.close?.();
      if (data) break;
    } catch (err) {
      why = err?.message || String(err);
    }
  }
  if (!data) throw new Error(`This photo could not be prepared on this device${why ? ` (${why})` : ''}. Try a screenshot of it instead.`);
  const base = String(file.name || 'receipt').replace(/\.[^.]+$/, '') || 'receipt';
  return { mediaType: 'image/jpeg', data, fileName: base + '.jpg' };
}
