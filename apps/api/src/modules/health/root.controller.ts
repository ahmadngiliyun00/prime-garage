import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators.js';

/** `GET /api`: a friendly answer instead of a 404 when someone opens the API base URL. */
@Controller()
@Public()
export class RootController {
  @Get()
  info() {
    return { name: 'PrimeGarage API', status: 'ok', health: '/api/health' };
  }
}
