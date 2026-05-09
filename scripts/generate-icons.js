const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const assetsDir = path.join(rootDir, 'assets');
const svgPath = path.join(assetsDir, 'icon.svg');
const pngPath = path.join(assetsDir, 'icon.png');
const png2xPath = path.join(assetsDir, 'icon@2x.png');
const icoPath = path.join(assetsDir, 'icon.ico');

async function renderWithSharp() {
  const sharp = require('sharp');
  const png2icons = require('png2icons');

  await sharp(svgPath).resize(512, 512).png().toFile(pngPath);
  await sharp(svgPath).resize(1024, 1024).png().toFile(png2xPath);

  const icoPng = await sharp(svgPath).resize(256, 256).png().toBuffer();
  const ico = png2icons.createICO(icoPng, png2icons.BICUBIC, 0, false, true);
  if (!ico) throw new Error('png2icons could not encode icon.ico');
  fs.writeFileSync(icoPath, ico);
}

async function renderWithCanvas() {
  const { createCanvas } = require('canvas');
  const png2icons = require('png2icons');

  function draw(size) {
    const scale = size / 512;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Canvas fallback mirrors assets/icon.svg when sharp is unavailable.
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(256, 256, 236, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 256, 218, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(116, 256);
    ctx.bezierCurveTo(154, 198, 200, 170, 256, 170);
    ctx.bezierCurveTo(312, 170, 358, 198, 396, 256);
    ctx.bezierCurveTo(358, 314, 312, 342, 256, 342);
    ctx.bezierCurveTo(200, 342, 154, 314, 116, 256);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(256, 256, 44, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(274, 238, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(156, 352);
    ctx.lineTo(210, 352);
    ctx.lineTo(232, 318);
    ctx.lineTo(266, 386);
    ctx.lineTo(300, 290);
    ctx.lineTo(328, 352);
    ctx.lineTo(356, 352);
    ctx.stroke();

    return canvas.toBuffer('image/png');
  }

  fs.writeFileSync(pngPath, draw(512));
  fs.writeFileSync(png2xPath, draw(1024));
  const ico = png2icons.createICO(draw(256), png2icons.BICUBIC, 0, false, true);
  if (!ico) throw new Error('png2icons could not encode fallback icon.ico');
  fs.writeFileSync(icoPath, ico);
}

async function main() {
  fs.mkdirSync(assetsDir, { recursive: true });
  try {
    await renderWithSharp();
  } catch (error) {
    console.warn(`sharp icon generation failed, trying canvas fallback: ${error.message}`);
    await renderWithCanvas();
  }
  console.log('Generated assets/icon.png, assets/icon@2x.png, and assets/icon.ico');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
