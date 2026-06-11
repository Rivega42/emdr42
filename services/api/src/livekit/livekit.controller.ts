import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { generateToken } from '@emdr42/livekit';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('livekit')
@ApiBearerAuth()
@Controller('livekit')
export class LiveKitController {
  @UseGuards(JwtAuthGuard)
  @Post('token')
  @ApiOperation({ summary: 'Генерация LiveKit токена для WebRTC' })
  async generateToken(
    @CurrentUser() user: { id: string; name: string },
    @Body() body: { sessionId: string },
  ) {
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';
    const token = await generateToken(apiKey, apiSecret, body.sessionId, user.name, user.id);
    return { token };
  }
}
