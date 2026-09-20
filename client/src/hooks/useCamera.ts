import { useEffect, useRef, useState } from 'react';
import { CameraService, type CameraStatus } from '../services/cameraService';

export function useCamera() {
  const serviceRef = useRef<CameraService | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const attachStream = (video: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!video || !stream) return;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    const play = () => {
      void video.play().catch(() => {
        // Playback can be deferred until the browser finishes loading the stream metadata.
      });
    };
    video.onloadedmetadata = play;
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) play();
  };

  if (!serviceRef.current) {
    serviceRef.current = new CameraService();
  }

  useEffect(() => {
    if (status === 'ready') attachStream(videoElement, streamRef.current);
  }, [status, videoElement]);

  useEffect(() => {
    return () => {
      serviceRef.current?.stopCamera();
      streamRef.current = null;
    };
  }, []);

  const ensureCamera = async (deviceId?: string, facingMode: 'user' | 'environment' = 'user') => {
    try {
      setStatus('requesting');
      setError(null);

      const availableDevices = await serviceRef.current!.getDevices();
      setDevices(availableDevices);

      const stream = deviceId
        ? await serviceRef.current!.switchCamera(deviceId)
        : await serviceRef.current!.startCamera({ facingMode });

      streamRef.current = stream;
      setStatus('ready');
    } catch (cameraError) {
      const message = cameraError instanceof Error ? cameraError.message : 'Camera unavailable.';
      setError(message);
      setStatus('error');
    }
  };

  const capture = () => {
    if (!videoRef.current) {
      throw new Error('Video element is not available.');
    }
    return serviceRef.current!.captureFrame(videoRef.current);
  };

  const videoRefCallback = (element: HTMLVideoElement | null) => {
    videoRef.current = element;
    setVideoElement(element);
    attachStream(element, streamRef.current);
  };

  return { videoRef, videoRefCallback, status, error, devices, ensureCamera, capture, stopCamera: () => serviceRef.current?.stopCamera() };
}
