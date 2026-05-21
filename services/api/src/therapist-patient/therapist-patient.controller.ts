import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TherapistPatientService } from './therapist-patient.service';
import { AssignPatientDto } from './dto/assign-patient.dto';
import { CreateNoteDto } from './dto/create-note.dto';

const extractMeta = (req: Request) => ({
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  correlationId: (req as Request & { correlationId?: string }).correlationId,
});

@ApiTags('therapist-patient')
@ApiBearerAuth()
@Controller('therapist-patient')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TherapistPatientController {
  constructor(private readonly service: TherapistPatientService) {}

  // --- Therapist endpoints ---

  @Post('assign')
  @Roles('THERAPIST', 'ADMIN')
  @ApiOperation({ summary: 'Назначить пациента терапевту' })
  assign(
    @CurrentUser() user: { userId: string },
    @Body() dto: AssignPatientDto,
    @Req() req: Request,
  ) {
    return this.service.assignPatient(user.userId, dto, extractMeta(req));
  }

  @Delete('patients/:patientId')
  @Roles('THERAPIST', 'ADMIN')
  @ApiOperation({ summary: 'Выписать пациента' })
  discharge(
    @CurrentUser() user: { userId: string },
    @Param('patientId') patientId: string,
    @Req() req: Request,
  ) {
    return this.service.dischargePatient(user.userId, patientId, extractMeta(req));
  }

  @Get('patients')
  @Roles('THERAPIST', 'ADMIN')
  @ApiOperation({ summary: 'Список пациентов текущего терапевта' })
  listPatients(
    @CurrentUser() user: { userId: string },
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 50,
  ) {
    return this.service.listPatientsForTherapist(user.userId, page, pageSize);
  }

  @Get('patients/:patientId/notes')
  @Roles('THERAPIST', 'ADMIN')
  @ApiOperation({ summary: 'Заметки по пациенту' })
  listNotes(
    @CurrentUser() user: { userId: string },
    @Param('patientId') patientId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 50,
  ) {
    return this.service.listNotes(user.userId, patientId, page, pageSize);
  }

  @Post('notes')
  @Roles('THERAPIST', 'ADMIN')
  @ApiOperation({ summary: 'Добавить заметку' })
  createNote(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateNoteDto,
    @Req() req: Request,
  ) {
    return this.service.createNote(user.userId, dto, extractMeta(req));
  }

  // --- Patient endpoint ---

  @Get('my-therapists')
  @ApiOperation({ summary: 'Список терапевтов текущего пациента' })
  listMyTherapists(@CurrentUser() user: { userId: string }) {
    return this.service.listTherapistsForPatient(user.userId);
  }
}
