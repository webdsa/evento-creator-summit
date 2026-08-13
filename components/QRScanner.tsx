'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface QRScannerProps {
  onScan: (code: string) => void;
  disabled?: boolean;
  className?: string;
  /** Text shown when disabled (e.g. "Clique em Escanear outro para usar a câmera."). */
  disabledPlaceholder?: string;
  /** Label for the button that re-requests the camera (user gesture; helps on Android). */
  forceCameraLabel?: string;
}

function isAbortOrSafeToIgnore(e: unknown): boolean {
  const name = e && typeof e === 'object' && 'name' in e ? (e as { name: string }).name : '';
  const message = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : '';
  return name === 'AbortError' || message.includes('aborted') || name === 'NotAllowedError';
}

function cameraConstraintAttempts(): MediaStreamConstraints[] {
  return [
    { video: { facingMode: { ideal: 'environment' } } },
    { video: { facingMode: 'environment' } },
    { video: { facingMode: 'user' } },
    { video: true },
  ];
}

async function getCameraStream(): Promise<MediaStream> {
  let lastError: unknown;
  for (const constraints of cameraConstraintAttempts()) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/**
 * Renders a video stream from the camera and uses jsQR to detect QR codes.
 * When a QR code is found, calls onScan with the decoded data (trimmed).
 */
export function QRScanner({
  onScan,
  disabled,
  className,
  disabledPlaceholder,
  forceCameraLabel = 'Forçar câmera',
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cancelledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [restartNonce, setRestartNonce] = useState(0);
  const lastScannedRef = useRef<string | null>(null);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    if (disabled || cancelledRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const stream = streamRef.current;
    if (!stream?.active) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (w <= 0 || h <= 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const result = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (result?.data) {
        const code = result.data.trim();
        if (code && code !== lastScannedRef.current) {
          lastScannedRef.current = code;
          onScan(code);
        }
      }
    } catch (e) {
      if (!isAbortOrSafeToIgnore(e)) setError(String(e));
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [disabled, onScan]);

  useEffect(() => {
    if (disabled) return;
    const video = videoRef.current;
    if (!video) return;

    const hasApi = 'mediaDevices' in navigator && !!navigator.mediaDevices?.getUserMedia;
    setSupported(hasApi);
    if (!hasApi) return;

    cancelledRef.current = false;
    lastScannedRef.current = null;
    setError(null);
    setStarting(true);

    const stopCurrent = () => {
      cancelAnimationFrame(rafRef.current);
      const stream = streamRef.current;
      streamRef.current = null;
      stream?.getTracks().forEach((t) => t.stop());
      if (video.srcObject) {
        video.srcObject = null;
      }
    };

    stopCurrent();

    let effectCancelled = false;

    void (async () => {
      try {
        const stream = await getCameraStream();
        if (effectCancelled || cancelledRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.muted = true;
        await video.play();
        if (effectCancelled || cancelledRef.current) return;
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        if (!effectCancelled && !cancelledRef.current) {
          setError(e && typeof e === 'object' && 'message' in e ? String((e as Error).message) : 'Câmera indisponível');
        }
      } finally {
        if (!effectCancelled) setStarting(false);
      }
    })();

    return () => {
      effectCancelled = true;
      cancelledRef.current = true;
      stopCurrent();
    };
  }, [disabled, restartNonce, tick]);

  const handleForceCamera = useCallback(() => {
    setError(null);
    setRestartNonce((n) => n + 1);
  }, []);

  if (supported === false) {
    return (
      <div className={`space-y-3 ${className ?? ''}`}>
        <p className="text-sm text-amber-600">Câmera não disponível neste dispositivo. Use a digitação do código.</p>
        <Button type="button" variant="outline" size="sm" onClick={handleForceCamera}>
          {forceCameraLabel}
        </Button>
      </div>
    );
  }

  if (disabled) {
    return (
      <div className={`relative overflow-hidden rounded-lg bg-black flex items-center justify-center ${className ?? ''}`} style={{ minHeight: 200 }}>
        <p className="text-sm text-white/70 text-center px-4">
          {disabledPlaceholder ?? 'Clique em "Escanear outro" para usar a câmera.'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`space-y-3 ${className ?? ''}`}>
        <p className="text-sm text-amber-600">{error}</p>
        <Button type="button" variant="default" size="sm" onClick={handleForceCamera} disabled={starting}>
          {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : forceCameraLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          className="h-full w-full object-cover"
          style={{ maxHeight: 280 }}
        />
        {starting ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" aria-hidden />
          </div>
        ) : null}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleForceCamera} disabled={starting}>
        {forceCameraLabel}
      </Button>
    </div>
  );
}
