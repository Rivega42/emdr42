import { AccessToken, VideoGrant } from 'livekit-server-sdk';

export async function generateToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantName: string,
  participantIdentity: string,
  ttlSeconds = 3600
): Promise<string> {
  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
    // TTL обязателен (#133): без него компрометация токена даёт бессрочный
    // доступ к WebRTC-комнате. 1 час покрывает EMDR-сессию (~50-60 мин).
    ttl: ttlSeconds,
  });

  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };

  token.addGrant(grant);
  return token.toJwt();
}
