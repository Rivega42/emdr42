import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { CreateEmotionRecordDto } from './dto/create-emotion-record.dto';
import { CreateSudsRecordDto } from './dto/create-suds-record.dto';
import { CreateVocRecordDto } from './dto/create-voc-record.dto';
import { CreateSafetyEventDto } from './dto/create-safety-event.dto';
import { SessionQueryDto } from './dto/session-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  create(
    @Body() dto: CreateSessionDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.sessionsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List sessions with pagination and filters' })
  findAll(
    @Query() query: SessionQueryDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.findAll(query, user.id, user.role);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get session with all related data' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.findOne(id, user.id, user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update session (phase, scales, status)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.update(id, dto, user.id, user.role);
  }

  @Post(':id/timeline')
  @ApiOperation({ summary: 'Add timeline event' })
  addTimelineEvent(
    @Param('id') id: string,
    @Body() dto: CreateTimelineEventDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.addTimelineEvent(id, dto, user.id, user.role);
  }

  @Post(':id/emotions')
  @ApiOperation({ summary: 'Add emotion records (batch)' })
  addEmotionRecords(
    @Param('id') id: string,
    @Body() dto: CreateEmotionRecordDto[],
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.addEmotionRecords(id, dto, user.id, user.role);
  }

  @Post(':id/suds')
  @ApiOperation({ summary: 'Add SUDS record' })
  addSudsRecord(
    @Param('id') id: string,
    @Body() dto: CreateSudsRecordDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.addSudsRecord(id, dto, user.id, user.role);
  }

  @Post(':id/voc')
  @ApiOperation({ summary: 'Add VOC record' })
  addVocRecord(
    @Param('id') id: string,
    @Body() dto: CreateVocRecordDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.addVocRecord(id, dto, user.id, user.role);
  }

  @Post(':id/safety')
  @ApiOperation({ summary: 'Add safety event' })
  addSafetyEvent(
    @Param('id') id: string,
    @Body() dto: CreateSafetyEventDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.addSafetyEvent(id, dto, user.id, user.role);
  }

  @Get(':id/compare/:previousId')
  @ApiOperation({ summary: 'Compare two sessions' })
  compareSessions(
    @Param('id') id: string,
    @Param('previousId') previousId: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.compareSessions(
      id,
      previousId,
      user.id,
      user.role,
    );
  }

  // --- Recording / transcript (#122) ---

  @Post(':id/recording-consent')
  @ApiOperation({ summary: 'Пациент даёт consent на запись сессии' })
  recordConsent(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.recordConsent(id, user.id, user.role);
  }

  @Post(':id/recording')
  @ApiOperation({ summary: 'Attach recording URL + storage key (after LiveKit egress)' })
  attachRecording(
    @Param('id') id: string,
    @Body()
    body: {
      recordingUrl: string;
      recordingStorageKey: string;
      recordingEncryptionKeyId?: string;
    },
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.attachRecording(id, user.id, user.role, body);
  }

  @Post(':id/transcript')
  @ApiOperation({ summary: 'Сохранить транскрипт сессии (от orchestrator)' })
  saveTranscript(
    @Param('id') id: string,
    @Body() body: { transcriptText: string },
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.saveTranscript(id, user.id, user.role, body.transcriptText);
  }

  @Get(':id/transcript')
  @ApiOperation({ summary: 'Получить транскрипт сессии' })
  getTranscript(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return this.sessionsService.getTranscript(id, user.id, user.role);
  }
}
