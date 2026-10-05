import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// Colors are fixed (light theme) so the PDF looks the same no matter
// whether the app is in dark mode.
const INK = [28, 36, 32];
const SOFT = [107, 117, 112];
const LINE = [223, 228, 225];
const ACCENT = [47, 158, 128];
const CHART_INCOME = '#3FBF9C';
const CHART_EXPENSE = '#D97C63';
const CATEGORY_COLORS = ['#3FBF9C', '#E3A768', '#7FA8D9', '#C77DBE', '#D97C63', '#8FBF6A', '#B79ADB', '#5FB8B8'];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// jsPDF's built-in fonts do not draw the euro sign reliably, so amounts
// are written with the currency code: "EUR 1,200.00".
function money(amount, currency) {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency, currencyDisplay: 'code' })
    .format(Number(amount) || 0)
    .replace(/ /g, ' ');
}

// Draws a chart on a hidden canvas and returns it as a crisp PNG.
async function chartImage(config, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  // White background so the chart can be saved as a small JPEG.
  const whiteBackground = {
    id: 'whiteBackground',
    beforeDraw: (c) => { c.ctx.save(); c.ctx.fillStyle = '#ffffff'; c.ctx.fillRect(0, 0, c.width, c.height); c.ctx.restore(); },
  };
  const chart = new Chart(canvas, {
    ...config,
    plugins: [whiteBackground],
    options: { ...config.options, animation: false, responsive: false, devicePixelRatio: 1 },
  });
  const img = canvas.toDataURL('image/jpeg', 0.9);
  chart.destroy();
  return img;
}

export async function exportReportPdf({ business, rangeLabel, totals, series, categoryRows }) {
  const { jsPDF } = await import('jspdf');
  const currency = business.currency || 'EUR';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const M = 15;
  const CW = W - M * 2;
  let y = 18;

  const ensure = (needed) => {
    if (y + needed > 280) { doc.addPage(); y = 18; }
  };

  // ---- header
  doc.setFillColor(...ACCENT);
  doc.rect(M, y, 12, 1.2, 'F');
  y += 7;
  doc.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(20).text(business.name, M, y);
  doc.setFontSize(10).setTextColor(...SOFT).setFont('helvetica', 'normal');
  doc.text('FINANCIAL REPORT', W - M, y - 5, { align: 'right' });
  doc.setTextColor(...INK).setFont('helvetica', 'bold').setFontSize(11).text(rangeLabel, W - M, y, { align: 'right' });
  y += 6;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...SOFT);
  const generated = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Prepared with HandyCFO on ${generated}`, M, y);
  if (business.vat_number) doc.text(`VAT ID: ${business.vat_number}`, W - M, y, { align: 'right' });
  y += 6;
  doc.setDrawColor(...LINE).line(M, y, W - M, y);
  y += 8;

  // ---- three figures
  const boxW = (CW - 8) / 3;
  const boxes = [
    ['INCOME', money(totals.income, currency), 'Paid invoices', INK],
    ['EXPENSES', money(totals.expenses, currency), 'Money spent', INK],
    ['PROFIT', money(totals.profit, currency), totals.margin == null ? 'No income in this period' : `${totals.margin.toFixed(0)}% margin`, totals.profit < 0 ? [190, 70, 60] : INK],
  ];
  boxes.forEach(([label, value, note, color], i) => {
    const x = M + i * (boxW + 4);
    doc.setDrawColor(...LINE).setFillColor(250, 251, 250).roundedRect(x, y, boxW, 24, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...SOFT).text(label, x + 4, y + 7);
    doc.setFontSize(13).setTextColor(...color).text(value, x + 4, y + 15);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...SOFT).text(note, x + 4, y + 21);
  });
  y += 33;

  // ---- income vs expenses chart
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK).text('Income vs. expenses', M, y);
  y += 4;
  const trend = await chartImage({
    type: 'bar',
    data: {
      labels: series.map((s) => s.label),
      datasets: [
        { label: 'Income', data: series.map((s) => s.income), backgroundColor: CHART_INCOME, borderRadius: 4 },
        { label: 'Expenses', data: series.map((s) => s.expenses), backgroundColor: CHART_EXPENSE, borderRadius: 4 },
      ],
    },
    options: {
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 14, padding: 24, usePointStyle: true, font: { size: 20 } } } },
      scales: {
        x: { ticks: { color: '#6b7570', font: { size: 20 } }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: '#6b7570', font: { size: 20 } }, grid: { color: '#e6eae8' } },
      },
    },
  }, 1500, 540);
  const trendH = CW * (540 / 1500);
  doc.addImage(trend, 'JPEG', M, y, CW, trendH);
  y += trendH + 8;

  // ---- spending by category
  ensure(70);
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK).text('Where the money went', M, y);
  y += 5;
  if (categoryRows.length === 0) {
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...SOFT).text('No expenses were recorded in this period.', M, y + 4);
    y += 12;
  } else {
    const donut = await chartImage({
      type: 'doughnut',
      data: {
        labels: categoryRows.map(([c]) => c),
        datasets: [{ data: categoryRows.map(([, v]) => v), backgroundColor: categoryRows.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]), borderWidth: 0 }],
      },
      options: { cutout: '62%', plugins: { legend: { display: false } } },
    }, 600, 600);
    const size = 50;
    doc.addImage(donut, 'JPEG', M, y, size, size);

    const totalSpend = categoryRows.reduce((s, [, v]) => s + v, 0) || 1;
    let ly = y + 4;
    const lx = M + size + 10;
    categoryRows.slice(0, 10).forEach(([name, value], i) => {
      doc.setFillColor(...hex(CATEGORY_COLORS[i % CATEGORY_COLORS.length])).roundedRect(lx, ly - 3, 3.4, 3.4, 0.6, 0.6, 'F');
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK).text(name, lx + 6, ly);
      doc.setTextColor(...SOFT).text(`${((value / totalSpend) * 100).toFixed(0)}%`, W - M - 38, ly, { align: 'right' });
      doc.setTextColor(...INK).setFont('helvetica', 'bold').text(money(value, currency), W - M, ly, { align: 'right' });
      ly += 5.2;
    });
    y += size + 10;
  }

  // ---- month by month table
  ensure(30);
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK).text('Month by month', M, y);
  y += 6;
  const cols = [M, M + 62, M + 110, W - M];
  const header = () => {
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...SOFT);
    doc.text('MONTH', cols[0], y);
    doc.text('INCOME', cols[1] + 30, y, { align: 'right' });
    doc.text('EXPENSES', cols[2] + 30, y, { align: 'right' });
    doc.text('PROFIT', cols[3], y, { align: 'right' });
    y += 2.5;
    doc.setDrawColor(...INK).line(M, y, W - M, y);
    y += 5;
  };
  header();
  series.forEach((r) => {
    if (y > 278) { doc.addPage(); y = 18; header(); }
    const profit = r.income - r.expenses;
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK).text(r.label, cols[0], y);
    doc.text(money(r.income, currency), cols[1] + 30, y, { align: 'right' });
    doc.text(money(r.expenses, currency), cols[2] + 30, y, { align: 'right' });
    doc.setTextColor(...(profit < 0 ? [190, 70, 60] : INK)).text(money(profit, currency), cols[3], y, { align: 'right' });
    y += 2;
    doc.setDrawColor(...LINE).line(M, y, W - M, y);
    y += 4.6;
  });
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...INK).text('Total', cols[0], y);
  doc.text(money(totals.income, currency), cols[1] + 30, y, { align: 'right' });
  doc.text(money(totals.expenses, currency), cols[2] + 30, y, { align: 'right' });
  doc.text(money(totals.profit, currency), cols[3], y, { align: 'right' });

  // ---- page numbers
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...SOFT);
    doc.text(`${business.name} · ${rangeLabel}`, M, 290);
    doc.text(`Page ${p} of ${pages}`, W - M, 290, { align: 'right' });
  }

  const safe = `${business.name}-${rangeLabel}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  doc.save(`Report-${safe}.pdf`);
}
