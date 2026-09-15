export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'error' | 'denied';

export interface CameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

export class CameraService {
  private stream: MediaStream | null = null;
  private devices: MediaDeviceInfo[] = [];
  private activeDeviceId: string | null = null;

  async getDevices(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return [];
    }

    this.devices = await navigator.mediaDevices.enumerateDevices();
    return this.devices.filter((device) => device.kind === 'videoinput');
  }

  async startCamera(options: CameraOptions = {}): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera API is not supported by this browser.');
    }

    const videoConstraints: MediaTrackConstraints = {
      facingMode: options.facingMode ?? 'user',
      width: options.width ? { ideal: options.width } : undefined,
      height: options.height ? { ideal: options.height } : undefined,
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });

    this.stream = stream;
    const [device] = stream.getVideoTracks();
    this.activeDeviceId = device?.getSettings().deviceId ?? null;
    return stream;
  }

  async switchCamera(deviceId: string): Promise<MediaStream> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera API is not supported by this browser.');
    }

    this.stopCamera();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false,
    });

    this.stream = stream;
    this.activeDeviceId = deviceId;
    return stream;
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  captureFrame(video: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to capture frame.');
    }

    context.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/png');
  }

  getCurrentStream(): MediaStream | null {
    return this.stream;
  }

  getActiveDeviceId(): string | null {
    return this.activeDeviceId;
  }
}
