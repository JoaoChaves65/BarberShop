process.env.JWT_ACCESS_SECRET = 'test-access-secret-key-min-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-min-32-chars-long';
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'barberlab_test';
process.env.DB_USER = 'barberlab';
process.env.DB_PASSWORD = 'changeme';
process.env.CORS_ORIGIN = 'http://localhost:5173';

import { createApp } from './packages/api-secure/src/http/app.js';
import request from 'supertest';
import { createSqlExecutor, resetTestDatabase, runMigrations } from './packages/core/src/infrastructure/database/index.js';
import { createPasswordHasher } from './packages/core/src/shared/password-hasher.js';
import { randomUUID } from 'node:crypto';

async function main() {
  await resetTestDatabase();
  await runMigrations('up');

  const pool = createSqlExecutor().getExecutor();
  const passwordHasher = createPasswordHasher();
  const passwordHash = await passwordHasher.hash('validpassword123');
  
  const adminId = randomUUID();
  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, role, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [adminId, 'Admin', 'admin@test.com', passwordHash, 'ADMIN', 'ACTIVE', new Date(), new Date()]
  );

  const app = createApp();

  const loginRes = await request(app)
    .post('/auth/login')
    .send({ email: 'admin@test.com', password: 'validpassword123' });
  
  const token = loginRes.body.accessToken;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const dateStr = startDate.toISOString();
  console.log('dateStr:', dateStr);

  const weeklyRes = await request(app)
    .get('/api/v1/barber-schedules/weekly')
    .query({ startDate: dateStr })
    .set('Authorization', `Bearer ${token}`);
  
  console.log('Weekly status:', weeklyRes.status);
  console.log('Weekly body:', JSON.stringify(weeklyRes.body, null, 2));
  
  process.exit(0);
}

main().catch(console.error);
