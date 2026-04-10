import { Module } from '@nestjs/common';
import { EmailModule } from './email/email.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [EmailModule, AuthModule, UsersModule],
})
export class AppModule {}
