import type { SqlExecutor } from '../interfaces';
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
} from '../interfaces';
import { InMemoryAppointmentRepository } from './appointment-repository';
import { InMemoryBarberRepository } from './barber-repository';
import { InMemoryCustomerRepository } from './customer-repository';
import { InMemoryServiceRepository } from './service-repository';
import { InMemoryBarberBlockRepository } from './barber-block-repository';
import { InMemoryBarberScheduleRepository } from './barber-schedule-repository';
import { InMemoryUserRepository } from './user-repository';
import { InMemoryTransactionRepository } from './transaction-repository';

export class InMemoryRepositoryFactory implements RepositoryFactory {
  private appointmentRepo?: AppointmentRepository;
  private barberRepo?: BarberRepository;
  private customerRepo?: CustomerRepository;
  private serviceRepo?: ServiceRepository;
  private barberBlockRepo?: BarberBlockRepository;
  private barberScheduleRepo?: BarberScheduleRepository;
  private userRepo?: UserRepository;
  private transactionRepo?: TransactionRepository;

  createAppointmentRepository(_executor: SqlExecutor): AppointmentRepository {
    if (!this.appointmentRepo) {
      this.appointmentRepo = new InMemoryAppointmentRepository();
    }
    return this.appointmentRepo;
  }

  createBarberRepository(_executor: SqlExecutor): BarberRepository {
    if (!this.barberRepo) {
      this.barberRepo = new InMemoryBarberRepository();
    }
    return this.barberRepo;
  }

  createCustomerRepository(_executor: SqlExecutor): CustomerRepository {
    if (!this.customerRepo) {
      this.customerRepo = new InMemoryCustomerRepository();
    }
    return this.customerRepo;
  }

  createServiceRepository(_executor: SqlExecutor): ServiceRepository {
    if (!this.serviceRepo) {
      this.serviceRepo = new InMemoryServiceRepository();
    }
    return this.serviceRepo;
  }

  createBarberBlockRepository(_executor: SqlExecutor): BarberBlockRepository {
    if (!this.barberBlockRepo) {
      this.barberBlockRepo = new InMemoryBarberBlockRepository();
    }
    return this.barberBlockRepo;
  }

  createBarberScheduleRepository(_executor: SqlExecutor): BarberScheduleRepository {
    if (!this.barberScheduleRepo) {
      this.barberScheduleRepo = new InMemoryBarberScheduleRepository();
    }
    return this.barberScheduleRepo;
  }

  createUserRepository(_executor: SqlExecutor): UserRepository {
    if (!this.userRepo) {
      this.userRepo = new InMemoryUserRepository();
    }
    return this.userRepo;
  }

  createTransactionRepository(_executor: SqlExecutor): TransactionRepository {
    if (!this.transactionRepo) {
      this.transactionRepo = new InMemoryTransactionRepository();
    }
    return this.transactionRepo;
  }
}