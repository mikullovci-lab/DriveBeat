# Mercedes Drive Audio

A Progressive Web App (PWA) music player designed with an automotive aesthetic, specifically tailored for safe and easy use while driving.

## Features
- **File System Access:** Load entire music folders directly from your device (no uploads).
- **Offline Capable:** Runs entirely in the browser using PWA technologies.
- **Massive Touch Targets:** Buttons are oversized (minimum 60x60px) to ensure easy tapping without distraction.
- **Background Playback:** Utilizes HTML5 Audio and MediaSession API for lock-screen controls and background audio.
- **ID3 Tag Support:** Extracts title, artist, and embedded cover art directly from your MP3s.
- **Privacy First:** Zero tracking, zero analytics. Your files never leave your device.

## Setup & Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

## Deployment
This app can be deployed to Vercel instantly without any additional configuration. Just connect your GitHub repository and it will use the standard Vite build settings.

> **Note:** For the Folder selection API to work, the app must be served over HTTPS (or `localhost`). Safari/iOS does not currently support `showDirectoryPicker`, so file selection is limited to Chromium-based browsers on Android or Desktop.
