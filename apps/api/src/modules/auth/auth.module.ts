import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GithubService } from './github.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, GithubService],
})
export class AuthModule {}
