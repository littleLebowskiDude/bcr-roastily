import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { BaggingLine, RoastComputation } from "./types";

const formatWeight = (value: number) =>
  `${(value / 1000).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })} kg`;

const addTitle = async (doc: PDFDocument, pageIndex: number, title: string) => {
  const page = doc.getPage(pageIndex);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 18;
  page.drawText(title, { x: 50, y: page.getHeight() - 50, size: fontSize, font, color: rgb(0.07, 0.36, 0.24) });
};

export async function buildRoastingPdf(sessionId: string, computation: RoastComputation) {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  await addTitle(doc, 0, `Roasting Report #${sessionId}`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = page.getHeight() - 80;
  page.drawText("Coffee", { x: 50, y, size: 11, font: bold });
  page.drawText("Drops", { x: 220, y, size: 11, font: bold });
  page.drawText("Green", { x: 280, y, size: 11, font: bold });
  page.drawText("Roasted", { x: 360, y, size: 11, font: bold });
  page.drawText("Surplus", { x: 450, y, size: 11, font: bold });

  y -= 18;
  computation.results.forEach((result) => {
    page.drawText(result.blendName ? `${result.coffeeName} -> ${result.blendName}` : result.coffeeName, {
      x: 50,
      y,
      size: 10,
      font,
    });
    page.drawText(String(result.dropsRequired), { x: 220, y, size: 10, font });
    page.drawText(formatWeight(result.totalGreenG), { x: 280, y, size: 10, font });
    page.drawText(formatWeight(result.expectedRoastedG), { x: 360, y, size: 10, font });
    page.drawText(formatWeight(result.surplusG), { x: 450, y, size: 10, font });
    y -= 16;
  });

  return doc.save();
}

export async function buildBaggingPdf(sessionId: string, bagging: BaggingLine[]) {
  const doc = await PDFDocument.create();
  const page = doc.addPage();
  await addTitle(doc, 0, `Bagging Report #${sessionId}`);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = page.getHeight() - 80;
  page.drawText("SKU", { x: 50, y, size: 11, font: bold });
  page.drawText("Qty", { x: 360, y, size: 11, font: bold });
  page.drawText("Roasted", { x: 430, y, size: 11, font: bold });
  y -= 18;

  bagging.forEach((line) => {
    page.drawText(line.label, { x: 50, y, size: 10, font });
    page.drawText(String(line.quantity), { x: 360, y, size: 10, font });
    page.drawText(formatWeight(line.totalRoastedG), { x: 430, y, size: 10, font });
    y -= 16;
  });

  return doc.save();
}
