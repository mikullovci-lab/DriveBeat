import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1, 
  FolderOpen, Music, ListMusic, ChevronLeft, ChevronDown, MoreVertical, Heart, ListPlus, MoreHorizontal, Settings
} from 'lucide-react';
// @ts-ignore
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
import { AudioWaveform } from './components/AudioWaveform';

const getFallbackColors = (index: number) => {
  const colors = [
    'from-[#283AB8] to-[#0c123d]', // Blue
    'from-[#8D379E] to-[#330c3b]', // Purple
    'from-[#F13484] to-[#510425]', // Pink/Fuchsia
    'from-[#FF605D] to-[#540f0d]', // Coral
    'from-[#FEA959] to-[#5c3002]', // Peach
    'from-[#FEE27A] to-[#594702]', // Yellow
  ];
  return colors[index % colors.length];
};

const getAccentColor = (index: number) => {
  const colors = [
    '#283AB8', // Blue
    '#8D379E', // Purple
    '#F13484', // Pink
    '#FF605D', // Coral
    '#FEA959', // Peach
    '#FEE27A', // Yellow
  ];
  return colors[index % colors.length];
};


// Types
interface Track {
  file?: File;
  url?: string;
  path: string;
  id: string;
  isStream?: boolean;
  streamTitle?: string;
}

interface TrackMetadata {
  title?: string;
  artist?: string;
  album?: string;
  coverUrl?: string;
}

interface Playlist {
  name: string;
  tracks: {
    title?: string;
    artist?: string;
    path: string;
    isStream: boolean;
  }[];
}

const cleanFileName = (filename: string) => {
  return filename
    .replace(/\.[^/.]+$/, "") // remove extension
    .replace(/_/g, " ")       // replace underscores with spaces
    .replace(/-/g, " - ")     // pad hyphens
    .replace(/\s+/g, " ")     // remove double spaces
    .replace(/\(.*?\)/g, "")  // remove anything in parentheses
    .replace(/\[.*?\]/g, "")  // remove anything in brackets
    .trim();
};

// DriveBeat Logo SVG Component: A futuristic combination of a steering wheel, vinyl groove, and high-fidelity sound waves
const DriveBeatLogo = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 595.28 521.36" className={className} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink">
    <defs>
      <linearGradient id="logo-linear-gradient" x1="159.39" y1="256.88" x2="260.09" y2="466.03" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#4547e0"/>
        <stop offset=".12" stopColor="#4040cb"/>
        <stop offset=".37" stopColor="#343097"/>
        <stop offset=".73" stopColor="#211544"/>
        <stop offset=".92" stopColor="#160613"/>
      </linearGradient>
      <linearGradient id="logo-linear-gradient1" x1="-8458.47" y1="-8210.44" x2="-8315.33" y2="-7967.98" gradientTransform="translate(8782.82 8458.77)" gradientUnits="userSpaceOnUse">
        <stop offset=".02" stopColor="#e22d63"/>
        <stop offset=".45" stopColor="#893ba9"/>
        <stop offset=".81" stopColor="#4547e0"/>
      </linearGradient>
      <linearGradient id="logo-linear-gradient2" x1="335.07" y1="337.59" x2="338.17" y2="439.84" gradientUnits="userSpaceOnUse">
        <stop offset=".02" stopColor="#2b1428"/>
        <stop offset=".81" stopColor="#160613"/>
      </linearGradient>
    </defs>
    <path fill="url(#logo-linear-gradient)" d="M275.69,419.32l80.51-153.87-95-176.89c-7.54-14.04-27.73-13.88-35.05.28L55.91,418.2c-8.96,17.34,3.62,38.01,23.14,38.01h216.83c-17.71-1.49-28.65-20.72-20.19-36.89Z"/>
    <path fill="url(#logo-linear-gradient1)" d="M558.08,412.34l-122.55-231.76c-7.37-13.93-27.29-14.04-34.81-.19l-44.51,85.07,37.16,69.19c10.02,18.67,10.19,41.08.43,59.88l-21.3,41.08c-6.57,12.66-19.64,20.61-33.91,20.61h-42.69c.72.06,1.46.1,2.2.1h233.5c22.58,0,37.04-24.02,26.49-43.97Z"/>
    <path fill="url(#logo-linear-gradient2)" d="M372.49,435.6l21.3-41.08c9.75-18.81,9.59-41.22-.43-59.88l-37.16-69.19-80.51,153.87c-8.46,16.17,2.48,35.4,20.19,36.89h42.69c14.27,0,27.34-7.95,33.91-20.61Z"/>
  </svg>
);

export default function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [allMp3s, setAllMp3s] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylistIndex, setSelectedPlaylistIndex] = useState<number | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<0 | 1 | 2>(0); // 0: none, 1: all, 2: one
  const [metadataCache, setMetadataCache] = useState<Record<string, TrackMetadata>>({});
  const [view, setView] = useState<'player' | 'playlist'>('player');
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const glowLeftRef = useRef<HTMLDivElement>(null);
  const glowRightRef = useRef<HTMLDivElement>(null);
  const glowCenterRef = useRef<HTMLDivElement>(null);


  // Initialize audio element
  useEffect(() => {
    // Load saved state
    const saved = localStorage.getItem('drive-player-state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.isShuffle !== undefined) setIsShuffle(state.isShuffle);
        if (state.repeatMode !== undefined) setRepeatMode(state.repeatMode);
      } catch (e) {}
    }
  }, []);

  // Listen for PWA installation capability
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show banner if they have not already dismissed it in this session
      const isDismissed = sessionStorage.getItem('pwa-dismissed') === 'true';
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If already running standalone (already installed), do not show banner
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setShowInstallBanner(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install: ${outcome}`);
    } catch (err) {
      console.error("Installation choice errored:", err);
    }
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // Keep screen awake while music is playing using Screen Wake Lock API
  useEffect(() => {
    let wakeLock: any = null;

    const requestWakeLock = async () => {
      if (!('wakeLock' in navigator)) return;
      try {
        wakeLock = await (navigator as any).wakeLock.request('screen');
        console.log('Screen Wake Lock acquired successfully.');
      } catch (err: any) {
        console.warn(`Failed to acquire Screen Wake Lock: ${err.name}, ${err.message}`);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock) {
        try {
          await wakeLock.release();
          wakeLock = null;
          console.log('Screen Wake Lock released.');
        } catch (err) {
          console.error('Error releasing Screen Wake Lock:', err);
        }
      }
    };

    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    // Handle tab visibility change (re-acquire lock if page becomes visible again)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        await requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [isPlaying]);

  // Save state on change
  useEffect(() => {
    localStorage.setItem('drive-player-state', JSON.stringify({
      isShuffle,
      repeatMode,
      lastPath: currentIndex >= 0 ? tracks[currentIndex].path : null,
      lastProgress: progress
    }));
  }, [isShuffle, repeatMode, currentIndex, progress, tracks]);

  // Clean up Web Audio API context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Initialize Web Audio API
  const initVisualizer = () => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64; // Small fftSize for highly smooth liquid bars
      
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (e) {
      console.warn("Web Audio API not supported or blocked by browser:", e);
    }
  };

  // Run visualizer when playing
  useEffect(() => {
    const isStream = currentIndex >= 0 && currentIndex < tracks.length && tracks[currentIndex].isStream;
    if (isPlaying && !isStream) {
      initVisualizer();
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
    }
  }, [isPlaying, currentIndex, tracks]);

  // Dynamic background ambient glow loop tracking audio analysis
  useEffect(() => {
    const update = (timestamp: number) => {
      let volume = 0;
      
      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        let count = 0;
        // Focus on the lower/mid bass frequencies (first half of the buffer) for punchier glow reactions
        const focusRange = Math.floor(bufferLength / 2);
        for (let i = 0; i < focusRange; i++) {
          sum += dataArray[i];
          count++;
        }
        volume = count > 0 ? (sum / count) / 255 : 0; // Normalize between 0.0 and 1.0

        // --- DRAW REAL-TIME VISUALIZER ON CANVAS (Linear & Elegant) ---
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const width = canvas.width;
            const height = canvas.height;
            ctx.clearRect(0, 0, width, height);
            
            const numBars = 36; // Sleek linear bars
            const barWidth = (width / numBars) - 2; // Subtract spacing
            const centerY = height / 2;
            
            for (let i = 0; i < numBars; i++) {
              // Create a symmetric shape by mapping index relative to center
              const distFromCenter = Math.abs(i - numBars / 2);
              const mapIndex = Math.floor(((numBars / 2 - distFromCenter) / (numBars / 2)) * (bufferLength * 0.4));
              
              const value = dataArray[mapIndex] || 0;
              const percent = value / 255;
              const barHeight = Math.max(2, percent * height * 0.85); // elegant height
              
              const x = i * (barWidth + 2);
              const y = centerY - barHeight / 2;
              
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(x, y, barWidth, barHeight, 1.5);
              } else {
                ctx.rect(x, y, barWidth, barHeight);
              }
              
              const colorPercent = i / numBars;
              const color = getAccentColor(Math.floor(colorPercent * 10));
              ctx.fillStyle = color;
              
              ctx.shadowBlur = isPlaying ? 3 : 0;
              ctx.shadowColor = color;
              ctx.fill();
            }
            ctx.shadowBlur = 0;
          }
        }
      } else {
        // Clear canvas if not playing
        if (canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        }
      }
      
      // Floating slow wave factor using time
      const time = timestamp * 0.001;
      
      // Dynamic scaling factors
      const pulseLeft = 1.0 + (isPlaying ? volume * 0.28 : 0) + Math.sin(time * 0.4) * 0.04;
      const pulseRight = 1.0 + (isPlaying ? volume * 0.35 : 0) + Math.cos(time * 0.3) * 0.05;
      const pulseCenter = 1.0 + (isPlaying ? volume * 0.20 : 0) + Math.sin(time * 0.25) * 0.03;
      
      // Dynamic opacity factors - reduced for high-contrast, moody dark style
      const opacityLeft = 0.12 + (isPlaying ? volume * 0.15 : 0) + Math.sin(time * 0.4) * 0.02;
      const opacityRight = 0.14 + (isPlaying ? volume * 0.18 : 0) + Math.cos(time * 0.3) * 0.02;
      const opacityCenter = 0.05 + (isPlaying ? volume * 0.10 : 0) + Math.sin(time * 0.25) * 0.01;

      // Directly update DOM styles to bypass React overhead and maintain silky 60fps animations
      if (glowLeftRef.current) {
        glowLeftRef.current.style.transform = `scale(${pulseLeft})`;
        glowLeftRef.current.style.opacity = `${Math.max(0.05, Math.min(0.35, opacityLeft))}`;
      }
      if (glowRightRef.current) {
        glowRightRef.current.style.transform = `scale(${pulseRight})`;
        glowRightRef.current.style.opacity = `${Math.max(0.06, Math.min(0.40, opacityRight))}`;
      }
      if (glowCenterRef.current) {
        glowCenterRef.current.style.transform = `scale(${pulseCenter})`;
        glowCenterRef.current.style.opacity = `${Math.max(0.02, Math.min(0.20, opacityCenter))}`;
      }
      
      animationFrameRef.current = requestAnimationFrame(update);
    };
    
    animationFrameRef.current = requestAnimationFrame(update);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  // Ref to hold the latest state for media session handlers
  const stateRef = useRef({ tracks, currentIndex, isShuffle, repeatMode, shuffledIndices });
  useEffect(() => {
    stateRef.current = { tracks, currentIndex, isShuffle, repeatMode, shuffledIndices };
  }, [tracks, currentIndex, isShuffle, repeatMode, shuffledIndices]);

  const getActiveAudio = () => {
    if (currentIndex >= 0 && currentIndex < tracks.length) {
      return tracks[currentIndex].isStream ? streamAudioRef.current : audioRef.current;
    }
    return audioRef.current;
  };

  // Handle current track change
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < tracks.length) {
      const track = tracks[currentIndex];
      
      // Stop both audio elements
      if (audioRef.current) audioRef.current.pause();
      if (streamAudioRef.current) streamAudioRef.current.pause();
      
      const activeAudio = track.isStream ? streamAudioRef.current : audioRef.current;
      if (!activeAudio) return;
      
      let objectUrl = "";
      if (track.isStream && track.url) {
        activeAudio.src = track.url;
      } else if (track.file) {
        objectUrl = URL.createObjectURL(track.file);
        activeAudio.src = objectUrl;
      }
      
      // Try to restore progress if this is the first play of a restored session
      const saved = localStorage.getItem('drive-player-state');
      let restoredProgress = 0;
      if (saved && !track.isStream) {
        try {
          const state = JSON.parse(saved);
          if (state.lastPath === track.path && state.lastProgress > 0 && !isPlaying) {
             restoredProgress = state.lastProgress;
             setProgress(restoredProgress);
          }
        } catch (e) {}
      }
      
      try {
        activeAudio.currentTime = track.isStream ? 0 : restoredProgress;
      } catch (e) {
        console.warn("Could not set currentTime:", e);
      }

      if (isPlaying) {
        activeAudio.play().catch(e => console.error("Playback failed:", e));
      }

      // Fetch metadata
      if (track.isStream) {
        setMetadataCache(prev => ({
          ...prev,
          [track.id]: {
            title: track.streamTitle || cleanFileName(track.path.split('/').pop() || ""),
            artist: "Live Stream",
            album: "Online Radio"
          }
        }));
      } else if (!metadataCache[track.id]) {
        fetchMetadata(track);
      }

      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }
  }, [currentIndex, tracks]);

  // Update media session when metadata loads
  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < tracks.length && 'mediaSession' in navigator) {
      const track = tracks[currentIndex];
      const meta = metadataCache[track.id];
      const tTitle = meta?.title || (track.isStream ? (track.streamTitle || "Live Stream") : cleanFileName(track.file?.name || ""));
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: tTitle,
        artist: meta?.artist || "Unknown Artist",
        album: meta?.album || "Unknown Album",
        artwork: meta?.coverUrl ? [{ src: meta.coverUrl, sizes: '512x512', type: 'image/jpeg' }] : []
      });
      
      navigator.mediaSession.setActionHandler('play', () => {
        const activeAudio = getActiveAudio();
        if (activeAudio) activeAudio.play().then(() => setIsPlaying(true)).catch(() => {});
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        const activeAudio = getActiveAudio();
        if (activeAudio) activeAudio.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
    }
  }, [metadataCache, currentIndex, tracks, isPlaying]);

  const handleNext = (isAuto = false) => {
    const { tracks: t, currentIndex: cIdx, isShuffle: isShuff, repeatMode: rMode, shuffledIndices: sInd } = stateRef.current;
    if (t.length === 0) return;
    
    const activeAudio = getActiveAudio();
    if (isAuto && rMode === 2 && activeAudio) {
      // Repeat one
      activeAudio.currentTime = 0;
      activeAudio.play().catch(e => console.error("Playback failed:", e));
      return;
    }
    
    if (isShuff) {
      const currentShufflePos = sInd.indexOf(cIdx);
      let nextShufflePos = currentShufflePos + 1;
      
      if (nextShufflePos >= sInd.length) {
        if (rMode === 1 || !isAuto) {
          nextShufflePos = 0; // Loop shuffle
        } else {
          setIsPlaying(false);
          return; // Stop at end of shuffle
        }
      }
      setCurrentIndex(sInd[nextShufflePos]);
    } else {
      let nextIndex = cIdx + 1;
      if (nextIndex >= t.length) {
        if (rMode === 1 || !isAuto) {
          nextIndex = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
      setCurrentIndex(nextIndex);
    }
  };

  const handlePrev = () => {
    const { tracks: t, currentIndex: cIdx, isShuffle: isShuff, shuffledIndices: sInd } = stateRef.current;
    const activeAudio = getActiveAudio();
    if (t.length === 0 || !activeAudio) return;
    
    // If playing for more than 3 seconds, just restart song
    if (activeAudio.currentTime > 3) {
      activeAudio.currentTime = 0;
      return;
    }
    
    if (isShuff) {
      const currentShufflePos = sInd.indexOf(cIdx);
      let prevShufflePos = currentShufflePos - 1;
      if (prevShufflePos < 0) {
        prevShufflePos = sInd.length - 1;
      }
      setCurrentIndex(sInd[prevShufflePos]);
    } else {
      let prevIndex = cIdx - 1;
      if (prevIndex < 0) {
        prevIndex = t.length - 1;
      }
      setCurrentIndex(prevIndex);
    }
  };
  const fetchMetadata = async (track: Track) => {
    jsmediatags.read(track.file, {
      onSuccess: function(tag) {
        let coverUrl = undefined;
        const picture = tag.tags.picture;
        if (picture) {
          const { data, format } = picture;
          let base64String = "";
          for (let i = 0; i < data.length; i++) {
            base64String += String.fromCharCode(data[i]);
          }
          coverUrl = `data:${format};base64,${window.btoa(base64String)}`;
        }
        
        setMetadataCache(prev => ({
          ...prev,
          [track.id]: {
            title: tag.tags.title || undefined,
            artist: tag.tags.artist || undefined,
            album: tag.tags.album || undefined,
            coverUrl
          }
        }));
      },
      onError: function(error) {
        console.warn("Could not read ID3 tags for", track.file.name, error);
      }
    });
  };

  const parseM3U = async (file: File): Promise<{ title?: string, artist?: string, path: string, isStream: boolean }[]> => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/);
      const items: { title?: string, artist?: string, path: string, isStream: boolean }[] = [];
      
      let currentTitle: string | undefined = undefined;
      let currentArtist: string | undefined = undefined;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        if (trimmed.startsWith('#')) {
          if (trimmed.startsWith('#EXTINF:')) {
            const commaIndex = trimmed.indexOf(',');
            if (commaIndex !== -1) {
              const info = trimmed.substring(commaIndex + 1).trim();
              const dashIndex = info.indexOf(' - ');
              if (dashIndex !== -1) {
                currentArtist = info.substring(0, dashIndex).trim();
                currentTitle = info.substring(dashIndex + 3).trim();
              } else {
                currentTitle = info;
                currentArtist = undefined;
              }
            }
          }
          continue;
        }
        
        const isStream = trimmed.startsWith('http://') || trimmed.startsWith('https://');
        items.push({
          title: currentTitle,
          artist: currentArtist,
          path: trimmed,
          isStream
        });
        
        currentTitle = undefined;
        currentArtist = undefined;
      }
      
      return items;
    } catch (e) {
      console.error("Error parsing playlist:", e);
      return [];
    }
  };

  const scanDirectoryRecursively = async (dirHandle: any, path = ''): Promise<{ mp3s: Track[], playlistFiles: { file: File, path: string }[] }> => {
    let mp3s: Track[] = [];
    let playlistFiles: { file: File, path: string }[] = [];
    
    for await (const entry of dirHandle.values()) {
      const entryPath = path + entry.name;
      if (entry.kind === 'file') {
        const lowerName = entry.name.toLowerCase();
        if (lowerName.endsWith('.mp3')) {
          const file = await entry.getFile();
          mp3s.push({ 
            file, 
            path: entryPath,
            id: entryPath + file.lastModified
          });
        } else if (lowerName.endsWith('.m3u') || lowerName.endsWith('.m3u8')) {
          const file = await entry.getFile();
          playlistFiles.push({ file, path: entryPath });
        }
      } else if (entry.kind === 'directory') {
        const subResult = await scanDirectoryRecursively(entry, entryPath + '/');
        mp3s.push(...subResult.mp3s);
        playlistFiles.push(...subResult.playlistFiles);
      }
    }
    return { mp3s, playlistFiles };
  };

  const handleOpenFolder = async () => {
    try {
      const showDirPicker = (window as any).showDirectoryPicker;
      
      let inIframe = false;
      try {
        inIframe = window.self !== window.top;
      } catch (e) {
        inIframe = true;
      }

      if (showDirPicker && !inIframe) {
        try {
          const dirHandle = await showDirPicker();
          setIsScanning(true);
          const { mp3s, playlistFiles } = await scanDirectoryRecursively(dirHandle);
          await processScannedFiles(mp3s, playlistFiles);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.warn("showDirectoryPicker failed, falling back to input", err);
        }
      }
      
      // Fallback
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } catch (e) {
      console.error(e);
      setIsScanning(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setIsScanning(true);
    
    const mp3s: Track[] = [];
    const playlistFiles: { file: File, path: string }[] = [];
    const files = Array.from(e.target.files) as File[];
    
    for (const file of files) {
      const lowerName = file.name.toLowerCase();
      const path = file.webkitRelativePath || file.name;
      if (lowerName.endsWith('.mp3')) {
        mp3s.push({
          file,
          path,
          id: path + file.lastModified
        });
      } else if (lowerName.endsWith('.m3u') || lowerName.endsWith('.m3u8')) {
        playlistFiles.push({ file, path });
      }
    }
    
    await processScannedFiles(mp3s, playlistFiles);
    e.target.value = '';
  };

  const processScannedFiles = async (mp3s: Track[], playlistFiles: { file: File, path: string }[]) => {
    mp3s.sort((a, b) => a.path.localeCompare(b.path));
    setAllMp3s(mp3s);
    
    const parsedPlaylists: Playlist[] = [];
    for (const pf of playlistFiles) {
      const items = await parseM3U(pf.file);
      if (items.length > 0) {
        parsedPlaylists.push({
          name: pf.file.name.replace(/\.[^/.]+$/, ""),
          tracks: items
        });
      }
    }
    setPlaylists(parsedPlaylists);
    setSelectedPlaylistIndex(null);
    setTracks(mp3s);
    
    const indices = Array.from({ length: mp3s.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledIndices(indices);
    
    if (mp3s.length > 0) {
      let startIndex = 0;
      const saved = localStorage.getItem('drive-player-state');
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (state.lastPath) {
            const foundIndex = mp3s.findIndex(t => t.path === state.lastPath);
            if (foundIndex !== -1) {
              startIndex = foundIndex;
            }
          }
        } catch (e) {}
      }
      setCurrentIndex(startIndex);
      setIsPlaying(false);
    }
    setIsScanning(false);
  };

  const selectPlaylist = (index: number | null) => {
    setSelectedPlaylistIndex(index);
    let activeQueue: Track[] = [];
    const metadataUpdates: Record<string, TrackMetadata> = {};
    
    if (index === null) {
      activeQueue = [...allMp3s];
    } else {
      const pl = playlists[index];
      const resolvedTracks: Track[] = [];
      
      pl.tracks.forEach((item, itemIdx) => {
        if (item.isStream) {
          resolvedTracks.push({
            path: item.path,
            url: item.path,
            id: `stream-${item.path}-${itemIdx}`,
            isStream: true,
            streamTitle: item.title || item.path.split('/').pop() || "Stream Track"
          });
        } else {
          const normalizedPath = item.path.toLowerCase().replace(/\\/g, '/');
          const fileName = normalizedPath.split('/').pop() || "";
          
          const matchedTrack = allMp3s.find(t => {
            const tPath = t.path.toLowerCase().replace(/\\/g, '/');
            return tPath.endsWith(normalizedPath) || tPath.endsWith(fileName);
          });
          
          if (matchedTrack) {
            resolvedTracks.push(matchedTrack);
            if (item.title || item.artist) {
              metadataUpdates[matchedTrack.id] = {
                ...metadataCache[matchedTrack.id],
                title: item.title || undefined,
                artist: item.artist || undefined
              };
            }
          }
        }
      });
      activeQueue = resolvedTracks;
    }
    
    setTracks(activeQueue);
    
    if (Object.keys(metadataUpdates).length > 0) {
      setMetadataCache(prev => ({
        ...prev,
        ...metadataUpdates
      }));
    }
    
    const indices = Array.from({ length: activeQueue.length }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    setShuffledIndices(indices);
    
    if (activeQueue.length > 0) {
      setCurrentIndex(0);
      setIsPlaying(false);
    } else {
      setCurrentIndex(-1);
    }
  };

  const togglePlay = () => {
    const activeAudio = getActiveAudio();
    if (!activeAudio || tracks.length === 0) return;
    
    if (isPlaying) {
      activeAudio.pause();
    } else {
      activeAudio.play().catch(e => console.error("Playback failed:", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current || !duration) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }
    
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    audioRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  const toggleShuffle = () => {
    setIsShuffle(!isShuffle);
    if (!isShuffle) {
      // Create new shuffle array
      const indices = Array.from({ length: tracks.length }, (_, i) => i);
      // Remove current index, shuffle rest, then put current at front
      const current = indices.splice(currentIndex, 1)[0];
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      indices.unshift(current);
      setShuffledIndices(indices);
    }
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;
  const currentMeta = currentTrack ? metadataCache[currentTrack.id] : null;
  
  const title = currentMeta?.title || (currentTrack ? (currentTrack.isStream ? (currentTrack.streamTitle || "Live Stream") : cleanFileName(currentTrack.file?.name || "")) : "No music loaded");
  const artist = currentMeta?.artist || (currentTrack ? "Unknown Artist" : "");

  // Calculate upcoming tracks
  const upcomingTracks = [];
  if (tracks.length > 1) {
    for (let i = 1; i <= 4; i++) {
      const idx = isShuffle 
        ? shuffledIndices[(shuffledIndices.indexOf(currentIndex) + i) % tracks.length] 
        : (currentIndex + i) % tracks.length;
      upcomingTracks.push({ track: tracks[idx], index: idx });
    }
  }

  return (
    <div className="min-h-screen bg-[#020104] text-[#fafa] font-sans flex overflow-hidden pb-safe select-none">
      {/* PWA Install Promotion Banner */}
      {showInstallBanner && deferredPrompt && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[92%] max-w-lg bg-[#0e091b]/90 backdrop-blur-3xl border border-white/[0.08] rounded-[2rem] p-4 pr-5 flex items-center gap-4 shadow-[0_24px_50px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] z-[9999] transition-all duration-500">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1c0f32] to-[#000000] border border-white/[0.08] shadow-inner flex items-center justify-center flex-shrink-0">
            <DriveBeatLogo className="w-8 h-8 drop-shadow-[0_4px_10px_rgba(219,31,255,0.4)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold tracking-wide text-white">Install DriveBeat App</p>
            <p className="text-[11px] text-white/50 mt-0.5 font-medium leading-normal">Enjoy offline music, full screen &amp; smoother stereo audio.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleInstallPWA}
              className="px-4 py-2 bg-gradient-to-r from-[#4547e0] to-[#db1fff] hover:from-[#5659f0] hover:to-[#e438ff] active:scale-95 text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_8px_20px_rgba(219,31,255,0.25)] flex-shrink-0"
            >
              Install
            </button>
            <button 
              onClick={() => {
                setShowInstallBanner(false);
                sessionStorage.setItem('pwa-dismissed', 'true');
              }}
              className="w-8 h-8 rounded-full bg-white/[0.03] hover:bg-white/[0.08] active:scale-90 flex items-center justify-center text-white/40 hover:text-white transition-all border border-white/[0.05]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#0a0f24]/95 backdrop-blur-2xl border border-[#db1fff]/30 text-[#db1fff] text-[11px] font-bold tracking-widest uppercase rounded-full shadow-[0_12px_30px_rgba(219,31,255,0.15)] z-[10000] text-center whitespace-nowrap">
          {toastMessage}
        </div>
      )}
      <audio 
        ref={audioRef}
        onTimeUpdate={(e) => {
          if (!tracks[currentIndex]?.isStream) {
            setProgress(e.currentTarget.currentTime);
          }
        }}
        onLoadedMetadata={(e) => {
          if (!tracks[currentIndex]?.isStream) {
            setDuration(e.currentTarget.duration || 0);
          }
        }}
        onEnded={() => handleNext(true)}
        className="hidden"
      />
      <audio 
        ref={streamAudioRef}
        onTimeUpdate={(e) => {
          if (tracks[currentIndex]?.isStream) {
            setProgress(e.currentTarget.currentTime);
          }
        }}
        onLoadedMetadata={(e) => {
          if (tracks[currentIndex]?.isStream) {
            setDuration(e.currentTarget.duration || 0);
          }
        }}
        onEnded={() => handleNext(true)}
        className="hidden"
      />
      
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-20 md:w-24 flex-col items-center py-8 bg-[#010102]/60 backdrop-blur-2xl border-r border-white/[0.03] z-30 shrink-0 shadow-[4px_0_32px_rgba(0,0,0,0.5)]">
        <div className="text-white/80 mb-10 mt-2">
          <DriveBeatLogo className="w-10 h-10 md:w-12 md:h-12" />
        </div>
        
        <div className="flex flex-col gap-4 w-full px-3">
          <button 
            onClick={() => setView('player')}
            className={`w-full aspect-square flex flex-col items-center justify-center rounded-2xl md:rounded-[1.5rem] hover:animate-liquid-square hover:scale-105 transition-all duration-500 ${view === 'player' ? 'bg-[#7030ef]/10 text-[#db1fff] shadow-[0_0_25px_rgba(219,31,255,0.15)] border border-[#db1fff]/30' : 'text-white/50 hover:bg-white/5 border border-transparent'}`}
          >
            <Music size={28} strokeWidth={1.5} />
            <span className="text-[9px] md:text-[10px] mt-2 font-bold tracking-widest uppercase">Songs</span>
          </button>
          
          <button 
            onClick={() => setView('playlist')}
            className={`w-full aspect-square flex flex-col items-center justify-center rounded-2xl md:rounded-[1.5rem] hover:animate-liquid-square hover:scale-105 transition-all duration-500 ${view === 'playlist' ? 'bg-[#7030ef]/10 text-[#db1fff] shadow-[0_0_25px_rgba(219,31,255,0.15)] border border-[#db1fff]/30' : 'text-white/50 hover:bg-white/5 border border-transparent'}`}
          >
            <ListMusic size={28} strokeWidth={1.5} />
            <span className="text-[9px] md:text-[10px] mt-2 font-bold tracking-widest uppercase">List</span>
          </button>
          
          <div className="w-6 h-[1px] bg-white/[0.06] -my-2 mx-auto shrink-0" />
 
          <button 
            onClick={handleOpenFolder}
            disabled={isScanning}
            className="w-full aspect-square flex flex-col items-center justify-center rounded-2xl md:rounded-[1.5rem] hover:animate-liquid-square hover:scale-105 text-white/50 hover:bg-white/5 hover:text-white transition-all duration-500 border border-transparent"
          >
            {isScanning ? (
               <div className="w-7 h-7 border-2 border-[#db1fff] border-t-transparent rounded-full animate-spin" />
            ) : (
               <FolderOpen size={28} strokeWidth={1.5} />
            )}
            <span className="text-[9px] md:text-[10px] mt-2 font-bold tracking-widest uppercase">Load</span>
          </button>
        </div>
 
        <div className="mt-auto mb-2 w-full px-3">
          <button 
            onClick={() => {
              if (deferredPrompt) {
                handleInstallPWA();
              } else {
                triggerToast("DriveBeat is installed & running perfectly!");
              }
            }}
            className="w-full aspect-square flex flex-col items-center justify-center text-white/50 hover:text-white transition-all rounded-2xl md:rounded-[1.5rem] hover:animate-liquid-square hover:scale-105 hover:bg-white/5 duration-500"
          >
            <Settings size={28} strokeWidth={1.5} />
            <span className="text-[9px] md:text-[10px] mt-2 font-bold tracking-widest uppercase">Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-hidden flex flex-col bg-[#020104]">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Deep Velvet Base Canvas */}
          <div className="absolute inset-0 bg-[#020104]" />

          {/* Ultra-subtle, blurred Album Art layer (only if active) to keep custom theme dark and organic */}
          {currentMeta?.coverUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-[0.10] blur-[75px] scale-110 saturate-[1.1] transition-all duration-1000 z-10"
              style={{ backgroundImage: `url(${currentMeta.coverUrl})` }}
            />
          )}

          {/* Core Velvet Ambient Glow Layers - Designed to match the vertical background image exactly */}
          {/* 1. Center / Dynamic track accent glow */}
          <div 
            ref={glowCenterRef}
            className="absolute top-[10%] left-[5%] right-[5%] bottom-[5%] rounded-full opacity-[0.12] blur-[150px] transition-all duration-1000 z-10"
            style={{ 
              background: `radial-gradient(circle, ${getAccentColor(currentIndex >= 0 ? currentIndex : 0)} 0%, ${getAccentColor(currentIndex >= 0 ? currentIndex + 1 : 1)} 50%, transparent 100%)`,
            }} 
          />

          {/* 2. Left side - Soft, organic, wide-angle Fuchsia/Magenta glow */}
          <div 
            ref={glowLeftRef}
            className="absolute -bottom-[15%] -left-[10%] w-[750px] h-[750px] rounded-full bg-[#db1fff] opacity-[0.12] blur-[180px] z-10 transition-transform duration-100 ease-out" 
          />

          {/* 3. Right side - Deep royal purple/violet glow */}
          <div 
            ref={glowRightRef}
            className="absolute -bottom-[20%] right-[-15%] w-[850px] h-[850px] rounded-full bg-[#7030ef] opacity-[0.15] blur-[200px] z-10 transition-transform duration-100 ease-out" 
          />

          {/* 4. Elegant middle-right deep indigo/blue ambient highlight */}
          <div className="absolute top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[#3b82f6] opacity-[0.04] blur-[160px] z-10" />

          {/* 5. Deep darkening vignette and shadows to structure the layout perfectly and make UI pop */}
          <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-transparent to-black/95 z-20 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-20 pointer-events-none" />
          
          {/* Extra dark gradient from bottom to completely sink the lower half into rich velvet darkness */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent z-20 pointer-events-none" />
          
          {/* Extra dark gradient from left side to give deep shadow-contrast behind sidebar/controls */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent z-20 pointer-events-none" />
        </div>

        {view === 'player' ? (
          <div className="flex-1 flex flex-col p-3 md:p-6 pb-24 md:pb-6 overflow-y-auto no-scrollbar relative z-10 justify-center">
            
            <div className="flex flex-col lg:grid lg:grid-cols-12 lg:gap-12 xl:gap-20 max-w-[28rem] lg:max-w-5xl w-full mx-auto mt-1 sm:mt-3 md:mt-4 lg:mt-0 items-center justify-center">
              
              {/* Left Column: Cover Art and Title Info */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center w-full relative z-10">
                <div className="w-[45vw] sm:w-[50vw] max-w-[10.5rem] sm:max-w-[13.5rem] lg:w-[22rem] lg:max-w-[22rem] aspect-square relative rounded-[1.75rem] sm:rounded-[2.25rem] lg:rounded-[3rem] mx-auto mb-4 sm:mb-6 lg:mb-8 group flex-shrink-0 flex items-center justify-center">
                  <div className={`absolute inset-[-18px] sm:inset-[-35px] rounded-[2.25rem] sm:rounded-[3.5rem] bg-gradient-to-br from-[#0099FF] via-[#8A2BE2] to-[#db1fff] opacity-75 blur-[35px] sm:blur-[65px] transition-all duration-1000 ${isPlaying ? 'scale-[1.2] sm:scale-[1.25] opacity-90 animate-liquid-glow' : 'scale-100 blur-[25px] sm:blur-[45px]'}`} />

                  {currentMeta?.coverUrl ? (
                    <img src={currentMeta.coverUrl} alt="Album Art" className="w-full h-full object-cover rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.75rem] relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/10" />
                  ) : currentIndex >= 0 ? (
                    <div className={`w-full h-full rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.75rem] relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-gradient-to-br ${getFallbackColors(currentIndex)} flex items-center justify-center border border-white/10`}>
                      <Music size={48} className="text-white/40 sm:hidden" strokeWidth={1} />
                      <Music size={80} className="text-white/40 hidden sm:block" strokeWidth={1} />
                    </div>
                  ) : (
                    <div className="w-full h-full rounded-[1.5rem] sm:rounded-[2rem] lg:rounded-[2.75rem] relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] bg-gradient-to-b from-[#16141a] via-[#09080c] to-black flex flex-col items-center justify-center border border-white/[0.08] p-6 sm:p-10 select-none">
                      <DriveBeatLogo className="w-16 h-16 sm:w-24 sm:h-24 lg:w-32 lg:h-32 drop-shadow-[0_10px_30px_rgba(112,48,239,0.35)] hover:scale-105 transition-transform duration-500" />
                    </div>
                  )}
                </div>
                
                <div className="text-center mb-1.5 sm:mb-3 lg:mb-0 px-2 relative z-10 flex-shrink-0">
                  <h1 className="text-[1.3rem] sm:text-[1.6rem] lg:text-[2rem] font-bold text-white mb-0.5 sm:mb-1 truncate tracking-tight drop-shadow-lg max-w-[15rem] sm:max-w-[17rem] lg:max-w-[22rem]">{title}</h1>
                  {artist && (
                    <p className="text-[0.9rem] sm:text-[1rem] lg:text-[1.1rem] text-white/60 truncate tracking-wide drop-shadow-md max-w-[15rem] sm:max-w-[17rem] lg:max-w-[22rem]">{artist}</p>
                  )}
                </div>
              </div>

              {/* Right Column: Controls & Queue */}
              <div className="lg:col-span-7 flex flex-col justify-center w-full relative z-10 mt-2 sm:mt-4 lg:mt-0">
                {/* Custom Progress Bar */}
                <div className="w-full mt-1.5 sm:mt-4 mb-2 sm:mb-4 lg:mt-0 lg:mb-8 relative z-10 px-2 flex-shrink-0">
                  <div 
                    className="h-8 sm:h-10 flex items-center group cursor-pointer relative"
                    onMouseDown={handleSeek}
                    onTouchStart={handleSeek}
                    ref={progressRef}
                  >
                    <div className="w-full h-1.5 sm:h-2 bg-white/[0.06] backdrop-blur-md rounded-md overflow-hidden absolute pointer-events-none border border-white/[0.03]">
                      <div 
                        className="h-full bg-gradient-to-r from-[#7030ef] to-[#db1fff] rounded-md relative"
                        style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }}
                      >
                        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/30 to-transparent blur-[1px]" />
                      </div>
                    </div>
                    <div 
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-[0.35rem] shadow-[0_0_12px_rgba(219,31,255,0.85)] absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 top-1/2 transition-transform group-hover:scale-125 border border-white"
                      style={{ left: `${duration ? (progress / duration) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-[11px] text-white/40 mt-0.5 font-mono tracking-widest font-medium">
                    <span>{formatTime(progress)}</span>
                    <span>-{formatTime(duration - progress)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="w-full flex items-center justify-between px-1 relative z-10 flex-shrink-0 mb-3 sm:mb-5 lg:mb-10">
                  {/* Shuffle Button */}
                  <button 
                    onClick={toggleShuffle}
                    className={`w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl hover:animate-liquid-square hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-xl border ${
                      isShuffle 
                        ? 'text-white bg-gradient-to-tr from-[#7030ef]/40 to-[#db1fff]/40 border-[#db1fff]/45 shadow-[0_0_20px_rgba(219,31,255,0.35)]' 
                        : 'text-white/50 bg-white/[0.03] border-white/[0.08] hover:text-white hover:bg-white/[0.08] hover:border-white/[0.18]'
                    } shadow-[0_8px_32px_rgba(0,0,0,0.35)]`}
                  >
                    <Shuffle size={18} strokeWidth={2} />
                  </button>
                  
                  {/* Prev Button */}
                  <button 
                    onClick={handlePrev}
                    className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center text-white/70 rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 hover:animate-liquid-square bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:text-[#db1fff] hover:bg-white/[0.08]"
                  >
                    <SkipBack size={20} fill="currentColor" />
                  </button>
                  
                  {/* Main Play/Pause Button */}
                  <button 
                    onClick={togglePlay}
                    className={`w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-[#7030ef] via-[#9f50f3] to-[#db1fff] text-white hover:scale-105 active:scale-95 transition-all duration-300 relative overflow-hidden border border-white/20 rounded-[1.3rem] sm:rounded-[1.65rem] ${
                      isPlaying 
                        ? 'animate-liquid-square scale-[1.03] shadow-[0_15px_45px_rgba(219,31,255,0.65)]' 
                        : 'hover:animate-liquid-square shadow-[0_12px_35px_rgba(112,48,239,0.5)]'
                    }`}
                  >
                    <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                    <div className="relative z-10 flex items-center justify-center w-full h-full">
                      {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="ml-0.5 sm:ml-1" />}
                    </div>
                  </button>
                  
                  {/* Next Button */}
                  <button 
                    onClick={() => handleNext()}
                    className="w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center text-white/70 rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95 hover:animate-liquid-square bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] shadow-[0_8px_32px_rgba(0,0,0,0.35)] hover:text-[#db1fff] hover:bg-white/[0.08]"
                  >
                    <SkipForward size={20} fill="currentColor" />
                  </button>
                  
                  {/* Repeat Button */}
                  <button 
                    onClick={toggleRepeat}
                    className={`w-11 h-11 sm:w-14 sm:h-14 flex items-center justify-center rounded-2xl hover:animate-liquid-square hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-xl border ${
                      repeatMode !== 0 
                        ? 'text-white bg-gradient-to-tr from-[#0055ff]/40 to-[#7030ef]/40 border-[#7030ef]/45 shadow-[0_0_20px_rgba(112,48,239,0.35)]' 
                        : 'text-white/50 bg-white/[0.03] border-white/[0.08] hover:text-white hover:bg-white/[0.08] hover:border-white/[0.18]'
                    } shadow-[0_8px_32px_rgba(0,0,0,0.35)]`}
                  >
                    {repeatMode === 2 ? <Repeat1 size={18} strokeWidth={2} /> : <Repeat size={18} strokeWidth={2} />}
                  </button>
                </div>

                {/* Mobile Screen Waveform Visualizer */}
                <div className="lg:hidden flex flex-col items-center justify-center w-full px-4 mb-2 sm:mb-4 select-none mt-0.5 sm:mt-1">
                  <div className="flex items-center gap-1.5 mb-1.5 opacity-30 font-mono text-[8px] tracking-[0.25em] uppercase text-white font-bold">
                    <span className="w-1 h-1 rounded-full bg-[#db1fff]" />
                    Stereo Visualizer
                  </div>
                  <AudioWaveform 
                    isPlaying={isPlaying} 
                    barCount={28} 
                    className="h-6 sm:h-8 opacity-75" 
                    glowColor={getAccentColor(currentIndex >= 0 ? currentIndex : 0)}
                  />
                </div>

                {/* Up Next Section */}
                {upcomingTracks.length > 0 && (
                  <div className="w-full mt-4 mb-4 px-2">
                    <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Up Next</h3>
                    <div className="flex gap-[26px] sm:gap-8 lg:grid lg:grid-cols-4 lg:gap-6 justify-start lg:justify-between overflow-x-auto lg:overflow-visible no-scrollbar pb-1 w-full">
                      {upcomingTracks.slice(0, 4).map(({ track, index }) => {
                        const meta = metadataCache[track.id];
                        const tTitle = meta?.title || (track.isStream ? (track.streamTitle || "Live Stream") : cleanFileName(track.file?.name || ""));
                        return (
                          <button
                            key={track.id + index}
                            onClick={() => {
                              setCurrentIndex(index);
                              setIsPlaying(true);
                            }}
                            className="flex flex-col relative text-left hover:scale-[1.03] transition-all duration-300 group w-[105px] sm:w-[120px] lg:w-auto shrink-0 lg:shrink"
                          >
                            <div className="w-[105px] h-[105px] sm:w-[120px] sm:h-[120px] lg:w-full lg:h-auto lg:aspect-square rounded-[1.25rem] overflow-hidden mb-2 relative shadow-[0_12px_24px_rgba(0,0,0,0.5)] border border-white/[0.08] flex items-center justify-center bg-black/20 flex-shrink-0 lg:flex-shrink">
                              {meta?.coverUrl ? (
                                <img src={meta.coverUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 relative z-10" alt="" />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${getFallbackColors(index)} flex items-center justify-center relative z-10`}>
                                  <Music size={24} className="text-white/40" strokeWidth={1.5} />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                                <Play size={20} fill="currentColor" className="text-white" />
                              </div>
                            </div>
                            
                            <h4 className="text-white font-semibold text-[11px] truncate tracking-wide w-full px-1">{tTitle}</h4>
                            <p className="text-white/40 text-[10px] truncate mt-0.5 w-full font-medium px-1">{meta?.artist || "Unknown Artist"}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop/Wide Screen Waveform Visualizer */}
              <div className="hidden lg:flex lg:col-span-12 flex-col items-center justify-center w-full max-w-3xl mx-auto mt-12 select-none relative z-10">
                <div className="flex items-center gap-2 mb-3 opacity-40 font-mono text-[10px] tracking-[0.3em] uppercase text-white font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#db1fff] animate-pulse" />
                  Stereo Field Monitor
                  <span className="w-1.5 h-1.5 rounded-full bg-[#db1fff] animate-pulse" />
                </div>
                <AudioWaveform 
                  isPlaying={isPlaying} 
                  barCount={72} 
                  className="h-20 lg:h-24 opacity-95" 
                  glowColor={getAccentColor(currentIndex >= 0 ? currentIndex : 0)}
                />
              </div>

            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col p-6 md:p-8 pb-32 md:pb-8 relative z-10">
            {/* Playlist Categories Chiclets Selector */}
            {playlists.length > 0 && (
              <div className="mb-6 max-w-3xl w-full mx-auto px-1 flex-shrink-0">
                <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] mb-3">Playlists</h3>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  <button
                    onClick={() => selectPlaylist(null)}
                    className={`px-5 py-3 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 border flex items-center gap-2 flex-shrink-0 ${
                      selectedPlaylistIndex === null
                        ? 'bg-gradient-to-tr from-[#7030ef] to-[#db1fff] text-white border-transparent shadow-[0_4px_15px_rgba(219,31,255,0.35)]'
                        : 'bg-white/[0.03] text-white/60 border-white/[0.05] hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <Music size={14} />
                    All Tracks ({allMp3s.length})
                  </button>

                  {playlists.map((pl, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectPlaylist(idx)}
                      className={`px-5 py-3 rounded-full text-xs font-bold tracking-wider uppercase transition-all duration-300 border flex items-center gap-2 flex-shrink-0 ${
                        selectedPlaylistIndex === idx
                          ? 'bg-gradient-to-tr from-[#7030ef] to-[#db1fff] text-white border-transparent shadow-[0_4px_15px_rgba(219,31,255,0.35)]'
                          : 'bg-white/[0.03] text-white/60 border-white/[0.05] hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <ListMusic size={14} />
                      {pl.name} ({pl.tracks.length})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tracks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-24 h-24 rounded-[1.75rem] bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-[0_12px_24px_rgba(0,0,0,0.3)]">
                  <Music size={40} className="text-white/20" strokeWidth={1} />
                </div>
                <p className="text-xl text-white/60 tracking-wide">Playlist is empty</p>
                <p className="text-sm text-white/30 mt-2">Tap 'Load' to add your music</p>
              </div>
            ) : (
              <div className="space-y-3 pb-24 max-w-3xl w-full mx-auto">
                {tracks.map((track, idx) => {
                  const meta = metadataCache[track.id];
                  const tTitle = meta?.title || (track.isStream ? (track.streamTitle || "Live Stream") : cleanFileName(track.file?.name || ""));
                  const tArtist = meta?.artist || "Unknown Artist";
                  const isCurrent = idx === currentIndex;
                  
                  return (
                    <button
                      key={track.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsPlaying(true);
                      }}
                      className={`w-full text-left p-4 rounded-[1.5rem] flex items-center gap-5 transition-all backdrop-blur-md ${
                        isCurrent 
                          ? 'bg-[#0099FF]/10 border border-[#0099FF]/20 shadow-[0_8px_30px_rgba(0,153,255,0.08)]' 
                          : 'bg-[#0F111A]/60 border border-white/[0.03] hover:bg-[#161926]/80 shadow-[0_4px_15px_rgba(0,0,0,0.2)]'
                      }`}
                      style={{ minHeight: '96px' }}
                    >
                      <div className={`w-16 h-16 rounded-[1.25rem] bg-[#1a1f35] overflow-hidden flex-shrink-0 flex items-center justify-center border ${isCurrent ? 'border-[#0099FF]/30' : 'border-white/5'} shadow-inner`}>
                          {meta?.coverUrl ? (
                            <img src={meta.coverUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${getFallbackColors(idx)} flex items-center justify-center`}>
                              <Music size={24} className="text-white/40" />
                            </div>
                          )}
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <p className={`font-bold truncate text-[17px] tracking-wide ${isCurrent ? 'text-white' : 'text-white/90'}`}>
                            {tTitle}
                          </p>
                          {track.isStream && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0099FF]/20 text-[#0099FF] uppercase tracking-wider">Stream</span>
                          )}
                        </div>
                        <p className={`truncate mt-1 text-[14px] ${isCurrent ? 'text-[#0099FF]/80' : 'text-white/40'}`}>
                          {tArtist}
                        </p>
                      </div>
                      {isCurrent && isPlaying && (
                          <div className="flex gap-1.5 items-center h-6 px-3">
                            <div className="w-1.5 h-3 bg-[#0099FF] animate-bounce rounded-full" style={{ animationDelay: '0ms' }} />
                            <div className="w-1.5 h-6 bg-[#0099FF] animate-bounce rounded-full" style={{ animationDelay: '150ms' }} />
                            <div className="w-1.5 h-4 bg-[#0099FF] animate-bounce rounded-full" style={{ animationDelay: '300ms' }} />
                          </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        
        {/* Floating Global Mini-Player */}
        {view !== 'player' && tracks.length > 0 && currentIndex >= 0 && (
          <div className="absolute bottom-[5.5rem] md:bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-[#0a0f24]/90 backdrop-blur-2xl border border-white/[0.05] rounded-3xl p-3 pr-6 flex items-center shadow-[0_20px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.05)] z-50 transition-all duration-300">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#1a1f35] border border-white/5 shadow-inner relative flex-shrink-0 flex items-center justify-center">
              {currentMeta?.coverUrl ? (
                <img src={currentMeta.coverUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getFallbackColors(currentIndex >= 0 ? currentIndex : 0)} flex items-center justify-center`}>
                  <Music size={20} className="text-white/40" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0 mx-4 cursor-pointer" onClick={() => setView('player')}>
              <h4 className="text-white/90 font-bold text-[15px] truncate tracking-wide drop-shadow-md">{title}</h4>
              <p className="text-white/40 text-[13px] truncate font-medium">{artist}</p>
            </div>
            
            <div className="flex items-center gap-4 text-white/80">
              <button onClick={handlePrev} className="hover:text-white transition-colors active:scale-95">
                <SkipBack size={24} fill="currentColor" />
              </button>
              <button 
                onClick={togglePlay} 
                className="hover:text-[#0055FF] transition-colors active:scale-95 text-[#0099FF]"
              >
                {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
              </button>
              <button onClick={() => handleNext()} className="hover:text-white transition-colors active:scale-95">
                <SkipForward size={24} fill="currentColor" />
              </button>
            </div>
          </div>
        )}
        
        <input 
          type="file" 
          onChange={handleFileInputChange} 
          ref={fileInputRef} 
          className="hidden" 
          {...{
            webkitdirectory: "true",
            directory: "",
            multiple: true,
            accept: ".mp3,.m3u,.m3u8"
          } as any}
        />

        {/* Mobile Bottom Tab Bar */}
        <nav className="fixed bottom-0 left-0 right-0 h-[4.5rem] bg-[#010102]/60 backdrop-blur-2xl border-t border-white/[0.05] z-50 flex items-center justify-around pb-safe px-6 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] md:hidden">
          {/* Songs Tab */}
          <button 
            onClick={() => setView('player')}
            className={`flex flex-col items-center justify-center w-16 h-12 transition-all duration-300 relative ${view === 'player' ? 'text-[#db1fff]' : 'text-white/40 active:text-white'}`}
          >
            {view === 'player' && (
              <div className="absolute -top-[1.25rem] w-8 h-[2px] bg-[#db1fff] shadow-[0_0_8px_#db1fff]" />
            )}
            <Music size={22} strokeWidth={view === 'player' ? 2 : 1.5} className={view === 'player' ? 'scale-110 drop-shadow-[0_0_10px_rgba(219,31,255,0.4)]' : ''} />
            <span className="text-[9px] mt-1 font-bold tracking-wider uppercase">Songs</span>
          </button>

          {/* Playlist Tab */}
          <button 
            onClick={() => setView('playlist')}
            className={`flex flex-col items-center justify-center w-16 h-12 transition-all duration-300 relative ${view === 'playlist' ? 'text-[#db1fff]' : 'text-white/40 active:text-white'}`}
          >
            {view === 'playlist' && (
              <div className="absolute -top-[1.25rem] w-8 h-[2px] bg-[#db1fff] shadow-[0_0_8px_#db1fff]" />
            )}
            <ListMusic size={22} strokeWidth={view === 'playlist' ? 2 : 1.5} className={view === 'playlist' ? 'scale-110 drop-shadow-[0_0_10px_rgba(219,31,255,0.4)]' : ''} />
            <span className="text-[9px] mt-1 font-bold tracking-wider uppercase">List</span>
          </button>

          {/* Load Tab */}
          <button 
            onClick={handleOpenFolder}
            disabled={isScanning}
            className="flex flex-col items-center justify-center w-16 h-12 text-white/40 active:text-white transition-all duration-300"
          >
            {isScanning ? (
              <div className="w-5 h-5 border-2 border-[#db1fff] border-t-transparent rounded-full animate-spin mb-1" />
            ) : (
              <FolderOpen size={22} strokeWidth={1.5} />
            )}
            <span className="text-[9px] mt-1 font-bold tracking-wider uppercase">Load</span>
          </button>

          {/* Settings Tab */}
          <button 
            onClick={() => {
              if (deferredPrompt) {
                handleInstallPWA();
              } else {
                triggerToast("DriveBeat is installed & running perfectly!");
              }
            }}
            className="flex flex-col items-center justify-center w-16 h-12 text-white/40 active:text-white transition-all duration-300"
          >
            <Settings size={22} strokeWidth={1.5} />
            <span className="text-[9px] mt-1 font-bold tracking-wider uppercase">Settings</span>
          </button>
        </nav>
      </main>
    </div>
  );
}
