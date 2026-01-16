const sharp = require('sharp');
const path = require('path');

async function createCircleMask() {
  const size = 300;
  const radius = size / 2;

  // Create SVG with white circle on black background
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="black"/>
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="white"/>
    </svg>
  `;

  const outputPath = path.join(__dirname, '..', 'public', 'circle-mask.png');

  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);

  console.log(`Circle mask created at: ${outputPath}`);
}

createCircleMask().catch(console.error);
