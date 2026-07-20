import sharp from 'sharp';

async function generate() {
  try {
    console.log('Generating PWA Icons and Screenshots...');
    
    // Generate 192x192 PNG Icon
    await sharp('public/icon.svg')
      .resize(192, 192)
      .png()
      .toFile('public/icon-192.png');
    console.log('Successfully created public/icon-192.png');

    // Generate 512x512 PNG Icon
    await sharp('public/icon.svg')
      .resize(512, 512)
      .png()
      .toFile('public/icon-512.png');
    console.log('Successfully created public/icon-512.png');

    // Generate Mock Desktop Screenshot
    const desktopSvg = `
      <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#1c0f32" />
            <stop offset="65%" stop-color="#06020c" />
            <stop offset="100%" stop-color="#000000" />
          </radialGradient>
        </defs>
        <rect width="1920" height="1080" fill="url(#grad)" />
        <g transform="translate(960, 480) scale(1.5)">
          <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="42" fill="#ffffff" text-anchor="middle" letter-spacing="4">DRIVEBEAT</text>
          <text y="45" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="14" fill="#db1fff" text-anchor="middle" letter-spacing="2">THE ULTIMATE IN-CAR MUSIC ENGINE</text>
          <text y="75" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#a1a1aa" text-anchor="middle" letter-spacing="1">Up Next Queue &amp; High Fidelity Stereo Streams</text>
        </g>
      </svg>
    `;
    await sharp(Buffer.from(desktopSvg))
      .png()
      .toFile('public/screenshot-desktop.png');
    console.log('Successfully created public/screenshot-desktop.png');

    // Generate Mock Mobile Screenshot
    const mobileSvg = `
      <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="grad" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stop-color="#1c0f32" />
            <stop offset="65%" stop-color="#06020c" />
            <stop offset="100%" stop-color="#000000" />
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#grad)" />
        <g transform="translate(540, 900) scale(1.5)">
          <text font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="42" fill="#ffffff" text-anchor="middle" letter-spacing="4">DRIVEBEAT</text>
          <text y="45" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" font-size="14" fill="#db1fff" text-anchor="middle" letter-spacing="2">IN-CAR HIGH FIDELITY</text>
          <text y="75" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#a1a1aa" text-anchor="middle" letter-spacing="1">Standalone Stereo Player</text>
        </g>
      </svg>
    `;
    await sharp(Buffer.from(mobileSvg))
      .png()
      .toFile('public/screenshot-mobile.png');
    console.log('Successfully created public/screenshot-mobile.png');

  } catch (error) {
    console.error('Failed to generate icons or screenshots:', error);
  }
}

generate();
