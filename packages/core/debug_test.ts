import { Client } from 'pg';
import { runner } from 'node-pg-migrate';

async function main() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'barberlab_test',
    user: 'barberlab',
    password: 'changeme',
  });
  
  await client.connect();
  
  await client.query('DROP TABLE IF EXISTS barber_blocks CASCADE');
  await client.query('DROP TABLE IF EXISTS barber_schedules CASCADE');
  await client.query('DROP TABLE IF EXISTS refresh_tokens CASCADE');
  await client.query('DROP TABLE IF EXISTS transactions CASCADE');
  await client.query('DROP TABLE IF EXISTS appointments CASCADE');
  await client.query('DROP TABLE IF EXISTS services CASCADE');
  await client.query('DROP TABLE IF EXISTS barbers CASCADE');
  await client.query('DROP TABLE IF EXISTS customers CASCADE');
  await client.query('DROP TABLE IF EXISTS users CASCADE');
  await client.query('DROP TABLE IF EXISTS migrations CASCADE');
  await client.query('DROP TABLE IF EXISTS pgmigrations CASCADE');
  
  await runner({
    dbClient: client,
    dir: './src/infrastructure/database/migrations',
    migrationsTable: 'migrations',
    direction: 'up',
    checkOrder: true,
    verbose: false,
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  });
  
  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('After UP:', result.rows.map(r => r.table_name));
  
  const mig = await client.query('SELECT count(*) as count FROM pgmigrations');
  console.log('Migrations after UP:', mig.rows[0].count);
  
  await runner({
    dbClient: client,
    dir: './src/infrastructure/database/migrations',
    migrationsTable: 'migrations',
    direction: 'down',
    count: 7,
    checkOrder: true,
    verbose: false,
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  });
  
  const result2 = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('After DOWN 7:', result2.rows.map(r => r.table_name));
  
  const mig2 = await client.query('SELECT count(*) as count FROM pgmigrations');
  console.log('Migrations after DOWN 7:', mig2.rows[0].count);
  
  await client.end();
}

main().catch(console.error);
