import { Global, Module } from '@nestjs/common';
import { GarageAccessService } from '../../common/garage-access.service.js';
import { TokenService } from './token.service.js';

@Global()
@Module({
  providers: [TokenService, GarageAccessService],
  exports: [TokenService, GarageAccessService],
})
export class AuthCoreModule {}
