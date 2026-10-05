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

// Draws the photo at a given size and returns base64 JPEG, or '' if the
// device could not produce one (some Android browsers fail silently on big canvases).
function renderJpeg(img, side) {
  const scale = Math.min(1, side / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
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
    try { readImages = await pdfPagesAsJpegs(file); } catch (err) { console.warn('PDF page render failed:', err); }
    if (!readImages.length) throw new Error('That PDF could not be opened. Try a photo of the receipt instead.');
    return { mediaType: 'application/pdf', data: url.split(',')[1], fileName: file.name || 'receipt.pdf', readImages };
  }
  if (!type.startsWith('image/')) throw new Error('Please choose a photo or a PDF.');

  // An object URL avoids loading a 10 MB photo into a giant string first,
  // which matters on phones with less memory.
  const objectUrl = URL.createObjectURL(file);
  let img;
  try {
    img = await loadImage(objectUrl);
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw new Error('This photo format is not supported. Try taking the picture as JPG, or screenshot it.');
  }
  let data = '';
  try {
    for (const side of [MAX_SIDE, 1600, 1200]) {
      data = renderJpeg(img, side);
      if (data) break;
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
  if (!data) throw new Error('This device could not prepare that photo. Try a smaller photo or a screenshot of it.');
  const base = String(file.name || 'receipt').replace(/\.[^.]+$/, '') || 'receipt';
  return { mediaType: 'image/jpeg', data, fileName: base + '.jpg' };
}
