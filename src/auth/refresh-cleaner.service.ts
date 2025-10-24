import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class RefreshCleanerService {
  constructor(private readonly refreshRepo: RefreshTokenRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_2PM)
  async purgeExpired() {
    console.log('Purging expired refresh tokens...');
    await this.refreshRepo.deleteExpired();
  }
}
