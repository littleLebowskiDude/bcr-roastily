import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { BaggingLine, PickListLine, RoastComputation } from "./types";

const palette = {
  primary: rgb(0.07, 0.36, 0.24),
  dark: rgb(0.12, 0.17, 0.21),
  muted: rgb(0.46, 0.51, 0.55),
  tableHeader: rgb(0.91, 0.95, 0.93),
  rowAlt: rgb(0.97, 0.98, 0.98),
};

const formatWeight = (value: number) => `${Math.round(value)} g`;
const formatKg = (value: number) => `${(value / 1000).toFixed(1)} kg`;

type Fonts = { regular: PDFFont; bold: PDFFont };

const drawTitleBar = (page: PDFPage, fonts: Fonts, title: string, subtitle?: string) => {
  const { width, height } = page.getSize();
  const barHeight = 64;
  page.drawRectangle({ x: 0, y: height - barHeight, width, height: barHeight, color: palette.primary });
  page.drawText(title, {
    x: 40,
    y: height - 32,
    size: 18,
    font: fonts.bold,
    color: rgb(1, 1, 1),
  });
  if (subtitle) {
    page.drawText(subtitle, {
      x: 40,
      y: height - 50,
      size: 10,
      font: fonts.regular,
      color: rgb(0.86, 0.94, 0.90),
    });
  }
};

type Column = { label: string; x: number; width?: number; formatter?: (value: any) => string };

const drawTableHeader = (page: PDFPage, fonts: Fonts, y: number, columns: Column[]) => {
  page.drawRectangle({
    x: 30,
    y: y - 4,
    width: page.getWidth() - 60,
    height: 20,
    color: palette.tableHeader,
  });
  columns.forEach((col) => {
    page.drawText(col.label, {
      x: col.x,
      y,
      size: 10,
      font: fonts.bold,
      color: palette.dark,
    });
  });
  return y - 24;
};

const ensureSpace = (
  doc: PDFDocument,
  fonts: Fonts,
  state: { page: PDFPage; y: number },
  title: string,
  subtitle: string | undefined,
  columns: Column[],
) => {
  if (state.y < 60) {
    const page = doc.addPage();
    drawTitleBar(page, fonts, title, subtitle);
    state.page = page;
    state.y = drawTableHeader(page, fonts, page.getHeight() - 100, columns);
  }
};

export async function buildRoastingPdf(sessionId: string, computation: RoastComputation) {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const columns: Column[] = [
    { label: "Coffee / Blend", x: 40 },
    { label: "Drops", x: 280 },
    { label: "Green", x: 330, formatter: formatKg },
    { label: "Roasted", x: 420, formatter: formatKg },
    { label: "Surplus", x: 510, formatter: formatWeight },
  ];

  drawTitleBar(page, fonts, "Roasting Report", `Session ${sessionId}`);
  let y = drawTableHeader(page, fonts, page.getHeight() - 100, columns);
  let stripe = false;

  const state = { page, y };
  computation.results.forEach((result) => {
    ensureSpace(doc, fonts, state, "Roasting Report", `Session ${sessionId}`, columns);
    const rowY = state.y;
    if (stripe) {
      state.page.drawRectangle({
        x: 30,
        y: rowY - 2,
        width: state.page.getWidth() - 60,
        height: 18,
        color: palette.rowAlt,
      });
    }
    const coffeeLabel = result.blendName ? `${result.coffeeName} -> ${result.blendName}` : result.coffeeName;
    state.page.drawText(coffeeLabel, { x: 40, y: rowY, size: 10, font: fonts.regular, color: palette.dark });
    state.page.drawText(String(result.dropsRequired), {
      x: 280,
      y: rowY,
      size: 10,
      font: fonts.regular,
      color: palette.dark,
    });
    state.page.drawText(formatKg(result.totalGreenG), {
      x: 330,
      y: rowY,
      size: 10,
      font: fonts.regular,
      color: palette.dark,
    });
    state.page.drawText(formatKg(result.expectedRoastedG), {
      x: 420,
      y: rowY,
      size: 10,
      font: fonts.regular,
      color: palette.dark,
    });
    state.page.drawText(formatWeight(result.surplusG), {
      x: 510,
      y: rowY,
      size: 10,
      font: fonts.regular,
      color: palette.dark,
    });
    state.y -= 18;
    stripe = !stripe;
  });

  return doc.save();
}

export async function buildBaggingPdf(sessionId: string, bagging: BaggingLine[]) {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const columns: Column[] = [
    { label: "SKU / Label", x: 40 },
    { label: "Qty", x: 420 },
    { label: "Roasted", x: 480, formatter: formatWeight },
  ];

  drawTitleBar(page, fonts, "Bagging Report", `Session ${sessionId}`);
  let y = drawTableHeader(page, fonts, page.getHeight() - 100, columns);
  let stripe = false;
  const state = { page, y };

  bagging.forEach((line) => {
    ensureSpace(doc, fonts, state, "Bagging Report", `Session ${sessionId}`, columns);
    const rowY = state.y;
    if (stripe) {
      state.page.drawRectangle({
        x: 30,
        y: rowY - 2,
        width: state.page.getWidth() - 60,
        height: 18,
        color: palette.rowAlt,
      });
    }
    state.page.drawText(line.label, { x: 40, y: rowY, size: 10, font: fonts.regular, color: palette.dark });
    state.page.drawText(String(line.quantity), {
      x: 420,
      y: rowY,
      size: 10,
      font: fonts.regular,
      color: palette.dark,
    });
    state.page.drawText(formatWeight(line.totalRoastedG), {
      x: 480,
      y: rowY,
      size: 10,
      font: fonts.regular,
      color: palette.dark,
    });
    state.y -= 18;
    stripe = !stripe;
  });

  return doc.save();
}

export async function buildPickListPdf(sessionId: string, pickList: PickListLine[]) {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const columns: Column[] = [
    { label: "Order", x: 40 },
    { label: "Item", x: 160 },
    { label: "Qty", x: 430 },
    { label: "Size", x: 470, formatter: formatWeight },
    { label: "Grind", x: 540 },
  ];

  drawTitleBar(page, fonts, "Order Pick List", `Session ${sessionId}`);
  let y = drawTableHeader(page, fonts, page.getHeight() - 100, columns);
  let stripe = false;
  const state = { page, y };

  pickList.forEach((line) => {
    ensureSpace(doc, fonts, state, "Order Pick List", `Session ${sessionId}`, columns);
    const rowY = state.y;
    if (stripe) {
      state.page.drawRectangle({
        x: 30,
        y: rowY - 2,
        width: state.page.getWidth() - 60,
        height: 18,
        color: palette.rowAlt,
      });
    }
    state.page.drawText(`${line.orderName}`, {
      x: 40,
      y: rowY,
      size: 10,
      font: fonts.bold,
      color: palette.dark,
    });
    state.page.drawText(line.itemLabel, { x: 160, y: rowY, size: 10, font: fonts.regular, color: palette.dark });
    state.page.drawText(String(line.quantity), {
      x: 430,
      y: rowY,
      size: 10,
      font: fonts.regular,
      color: palette.dark,
    });
    state.page.drawText(formatWeight(line.sizeG), {
      x: 470,
      y: rowY,
      size: 10,
      font: fonts.regular,
      color: palette.dark,
    });
    state.page.drawText(line.grindType, {
      x: 540,
      y: rowY,
      size: 10,
      font: fonts.regular,
      color: palette.dark,
    });
    state.y -= 18;
    stripe = !stripe;
  });

  return doc.save();
}
