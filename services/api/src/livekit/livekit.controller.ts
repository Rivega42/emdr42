import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
// TODO: Заменить на @emdr42/livekit после настройки pnpm workspaces (#54)
// import { generateToken } from '@emdr42/livekit';

function generateToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  participantName: string,
  participantIdentity: string,
): string {
  // Stub — реальная реализация в packages/livekit-integration
  return Buffer.from(JSON.stringify({
    apiKey, roomName, participantName, participantIdentity,
    iat: Date.now(),
  })).toString('base64');
}

@ApiTags('livekit')
@ApiBearerAuth()
@Controller('livekit')
export class LiveKitController {
  @UseGuards(JwtAuthGuard)
  @Post('token')
  @ApiOperation({ summary: 'Генерация LiveKit токена для WebRTC' })
  generateToken(
    @CurrentUser() user: { id: string; name: string },
    @Body() body: { sessionId: string },
  ) {
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    const token = generateToken(
      apiKey,
      apiSecret,
      body.sessionId,
      user.name,
      user.id,
    );
    return { token };
  }
}
