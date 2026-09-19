import { useEffect, useRef, useState } from 'react';
import { CameraService, type CameraStatus } from '../services/cameraService';

export function useCamera() {
  const serviceRef = useRef<CameraService | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  if (!serviceRef.current) {
    serviceRef.current = new CameraService();
  }

  useEffect(() => {
    if (status === 'ready' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.muted = true;
      void videoRef.current.play();
    }
  }, [status]);

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

  return { videoRef, status, error, devices, ensureCamera, capture, stopCamera: () => serviceRef.current?.stopCamera() };
}
