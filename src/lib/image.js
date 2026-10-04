// Phone photos are often 5-12 MB. Shrinking them in the browser before
// upload makes scanning faster, cheaper and avoids size errors, and a
// receipt is still perfectly readable at 1800px.
const MAX_SIDE = 1800;

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

// Renders the first page of a PDF to a JPEG so readers that cannot take
// PDFs (like Grok) can still scan it. The original PDF is still what gets stored.
async function pdfFirstPageJpeg(file) {
  const pdfjs = await import('pdfjs-dist');
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, MAX_SIDE / Math.max(base.width, base.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
}

// Returns { mediaType, data (base64, no prefix), fileName }
export async function prepareUpload(file) {
  if (file.type === 'application/pdf') {
    if (file.size > 8 * 1024 * 1024) throw new Error('That PDF is larger than 8 MB.');
    const url = await readAsDataURL(file);
    let readData = null;
    try { readData = await pdfFirstPageJpeg(file); } catch (err) { console.warn('PDF preview render failed:', err); }
    return {
      mediaType: 'application/pdf', data: url.split(',')[1], fileName: file.name,
      ...(readData ? { readData, readMediaType: 'image/jpeg' } : {}),
    };
  }
  if (!file.type.startsWith('image/')) throw new Error('Please choose a photo or a PDF.');

  const url = await readAsDataURL(file);
  let img;
  try {
    img = await loadImage(url);
  } catch (err) {
    // e.g. HEIC on a browser that cannot decode it
    throw new Error('This photo format is not supported. Try taking the picture as JPG, or screenshot it.');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL('image/jpeg', 0.85);
  return { mediaType: 'image/jpeg', data: out.split(',')[1], fileName: file.name.replace(/\.[^.]+$/, '') + '.jpg' };
}
