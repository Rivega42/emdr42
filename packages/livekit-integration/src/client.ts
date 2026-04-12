import { Room, RoomEvent, Track, RemoteTrack, RemoteTrackPublication } from 'livekit-client';

export interface LiveKitConfig {
  url: string;
  token: string;
}

export class LiveKitSession {
  private room: Room;
  private onTrackSubscribed?: (track: RemoteTrack) => void;

  constructor() {
    this.room = new Room();
  }

  async connect(config: LiveKitConfig): Promise<void> {
    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      this.onTrackSubscribed?.(track);
    });

    await this.room.connect(config.url, config.token);
  }

  async publishAudio(): Promise<MediaStreamTrack | null> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      await this.room.localParticipant.publishTrack(audioTrack, {
        name: 'patient-audio',
        source: Track.Source.Microphone,
      });
    }
    return audioTrack || null;
  }

  async publishVideo(): Promise<MediaStreamTrack | null> {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      await this.room.localParticipant.publishTrack(videoTrack, {
        name: 'patient-video',
        source: Track.Source.Camera,
      });
    }
    return videoTrack || null;
  }

  onRemoteTrack(callback: (track: RemoteTrack) => void) {
    this.onTrackSubscribed = callback;
  }

  async disconnect(): Promise<void> {
    this.room.disconnect();
  }

  getRoom(): Room { return this.room; }
}
