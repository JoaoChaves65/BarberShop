import type { SqlExecutor } from '../../../persistence/interfaces';
import type {
  AppointmentRepository,
  BarberRepository,
  CustomerRepository,
  ServiceRepository,
  BarberBlockRepository,
  BarberScheduleRepository,
  UserRepository,
  TransactionRepository,
  RepositoryFactory,
} from '../../../persistence/interfaces';
import { PgAppointmentRepository } from './appointment-repository';
import { PgBarberRepository } from './barber-repository';
import { PgCustomerRepository } from './customer-repository';
import { PgServiceRepository } from './service-repository';
import { PgBarberBlockRepository } from './barber-block-repository';
import { PgBarberScheduleRepository } from './barber-schedule-repository';
import { PgUserRepository } from './user-repository';
import { PgTransactionRepository } from './transaction-repository';

export class PgRepositoryFactory implements RepositoryFactory {
  createAppointmentRepository(executor: SqlExecutor): AppointmentRepository {
    return new PgAppointmentRepository(executor);
  }

  createBarberRepository(executor: SqlExecutor): BarberRepository {
    return new PgBarberRepository(executor);
  }

  createCustomerRepository(executor: SqlExecutor): CustomerRepository {
    return new PgCustomerRepository(executor);
  }

  createServiceRepository(executor: SqlExecutor): ServiceRepository {
    return new PgServiceRepository(executor);
  }

  createBarberBlockRepository(executor: SqlExecutor): BarberBlockRepository {
    return new PgBarberBlockRepository(executor);
  }

  createBarberScheduleRepository(executor: SqlExecutor): BarberScheduleRepository {
    return new PgBarberScheduleRepository(executor);
  }

  createUserRepository(executor: SqlExecutor): UserRepository {
    return new PgUserRepository(executor);
  }

  createTransactionRepository(executor: SqlExecutor): TransactionRepository {
    return new PgTransactionRepository(executor);
  }
}