import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AccessAudit } from './entities/access-audit.entity.js';

@Injectable()
export class AccessAuditDao {
  constructor(private readonly dataSource: DataSource) {}

  private get repo(): Repository<AccessAudit> {
    return this.dataSource.getRepository(AccessAudit);
  }

  create(data: Partial<AccessAudit>): Promise<AccessAudit> {
    return this.repo.save(this.repo.create(data));
  }
}
