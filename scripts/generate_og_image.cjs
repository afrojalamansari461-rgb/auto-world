let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('sharp is not available, skipping raster image generation:', e.message);
}
const fs = require('fs');
const path = require('path');

const width = 1200;
const height = 630;

const svgCard = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .font-serif-bold {
        font-family: 'Liberation Serif', 'FreeSerif', 'Playfair Display', Georgia, 'Times New Roman', serif;
        font-weight: 900;
      }
      .font-serif-italic {
        font-family: 'Liberation Serif', 'FreeSerif', 'Playfair Display', Georgia, 'Times New Roman', serif;
        font-weight: 400;
        font-style: italic;
      }
      .font-mono-tag {
        font-family: 'Liberation Sans', 'FreeSans', 'Plus Jakarta Sans', Arial, sans-serif;
        font-weight: 700;
        letter-spacing: 0.22em;
      }
      .font-sub {
        font-family: 'Liberation Sans', 'FreeSans', 'Plus Jakarta Sans', Arial, sans-serif;
        font-weight: 600;
        letter-spacing: 0.06em;
      }
    </style>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="6" dy="6" stdDeviation="0" flood-color="#1c1917" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="${width}" height="${height}" fill="#FAF8F5" />
  
  <!-- Outer Subtle Luxury Border -->
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="24" fill="none" stroke="#E7E2D8" stroke-width="2" />
  <rect x="32" y="32" width="${width - 64}" height="${height - 64}" rx="18" fill="none" stroke="#1c1917" stroke-width="1.5" stroke-opacity="0.08" />

  <!-- Center Card Area with Shadow -->
  <g transform="translate(150, 155)">
    <rect width="900" height="320" rx="24" fill="#F4F1EA" stroke="#1c1917" stroke-width="2.5" filter="url(#shadow)" />
    
    <!-- Verified Badge at top right -->
    <g transform="translate(670, 24)">
      <rect width="195" height="34" rx="17" fill="#1c1917" />
      <text x="97" y="22" fill="#FAF8F5" font-size="11" text-anchor="middle" class="font-mono-tag">CERTIFIED MOTORS</text>
    </g>

    <!-- Main Exact Logo Group from User's Screenshot -->
    <g transform="translate(130, 85)">
      <!-- Black Rounded Logo Icon Box -->
      <rect x="0" y="0" width="105" height="105" rx="26" fill="#1c1917" />
      
      <!-- Lucide Car Vector Icon inside Box -->
      <g transform="translate(24, 24) scale(2.4)" stroke="#FAF8F5" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <path d="M9 17h6" />
        <circle cx="17" cy="17" r="2" />
      </g>

      <!-- AUTO WORLD Exact Brand Text Typography -->
      <text x="130" y="78" font-size="76" letter-spacing="-0.02em">
        <tspan fill="#1c1917" class="font-serif-bold">AUTO</tspan>
        <tspan dx="8" fill="#57534e" class="font-serif-italic">WORLD</tspan>
      </text>
    </g>

    <!-- Divider -->
    <line x1="80" y1="225" x2="820" y2="225" stroke="#1c1917" stroke-width="1.5" stroke-opacity="0.12" />

    <!-- Subtitle / Brand Description -->
    <text x="450" y="265" fill="#44403c" font-size="16" text-anchor="middle" class="font-sub">
      PREMIUM CAR MARKETPLACE &amp; PEER-TO-PEER VEHICLE EXCHANGE
    </text>
    
    <!-- Bullet feature items -->
    <text x="450" y="292" fill="#78716c" font-size="12" text-anchor="middle" class="font-mono-tag">
      VERIFIED HISTORY  •  LIVE AUCTIONS  •  DIRECT SELLER CONTACT
    </text>
  </g>
</svg>
`;

async function run() {
  const publicDir = path.join(__dirname, '..', 'public');
  const distDir = path.join(__dirname, '..', 'dist');

  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const svgBuffer = Buffer.from(svgCard);
  fs.writeFileSync(path.join(publicDir, 'og-image.svg'), svgCard);

  if (!sharp) {
    console.log('Skipping PNG/JPG generation as sharp is not installed; saved og-image.svg.');
    return;
  }

  // 1. Generate og-image.png & og-image.jpg in public
  await sharp(svgBuffer)
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(path.join(publicDir, 'og-image.jpg'));

  await sharp(svgBuffer)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, 'og-image.png'));

  // Also copy to autoworld-logo
  await sharp(svgBuffer)
    .jpeg({ quality: 95, mozjpeg: true })
    .toFile(path.join(publicDir, 'autoworld-logo.jpg'));

  if (fs.existsSync(distDir)) {
    await sharp(svgBuffer)
      .jpeg({ quality: 95, mozjpeg: true })
      .toFile(path.join(distDir, 'og-image.jpg'));
    await sharp(svgBuffer)
      .png({ compressionLevel: 9 })
      .toFile(path.join(distDir, 'og-image.png'));
    await sharp(svgBuffer)
      .jpeg({ quality: 95, mozjpeg: true })
      .toFile(path.join(distDir, 'autoworld-logo.jpg'));
  }

  console.log('Successfully generated Open Graph images matching exact user logo!');
}

run().catch(console.error);
