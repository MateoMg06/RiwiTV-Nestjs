import { Module } from '@nestjs/common';
import { CountryModule } from '../country/country.module.js';
import { MovieModule } from '../movie/movie.module.js';
import { NotificationController } from './notification.controller.js';
import { NotificationService } from './notification.service.js';
import { ReleaseNotificationDao } from './release-notification.dao.js';
import { ReleaseNotificationJob } from './release-notification.job.js';

@Module({
  imports: [MovieModule, CountryModule],
  controllers: [NotificationController],
  providers: [NotificationService, ReleaseNotificationDao, ReleaseNotificationJob],
})
export class NotificationModule {}
