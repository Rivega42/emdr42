import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export enum NoteVisibility {
  PRIVATE = 'PRIVATE',
  SHARED_WITH_PATIENT = 'SHARED_WITH_PATIENT',
  SUPERVISION = 'SUPERVISION',
}

export class CreateNoteDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  sessionId?: string;

  @ApiProperty({ minLength: 1, maxLength: 10000 })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;

  @ApiProperty({ enum: NoteVisibility, default: NoteVisibility.PRIVATE })
  @IsOptional()
  @IsEnum(NoteVisibility)
  visibility?: NoteVisibility;
}
