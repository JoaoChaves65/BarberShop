/**
 * Migration: create-barber-schedules-table
 * Creates the barber_schedules table for weekly working hours.
 */

exports.up = pgm => {
  pgm.createTable('barber_schedules', {
    id: {
      type: 'uuid',
      primaryKey: true,
      notNull: true,
      default: pgm.func('gen_random_uuid()'),
    },
    barber_id: {
      type: 'uuid',
      notNull: true,
      references: 'barbers',
      onDelete: 'CASCADE',
    },
    day_of_week: {
      type: 'integer',
      notNull: true,
      check: 'day_of_week BETWEEN 0 AND 6',
    },
    start_time: {
      type: 'time',
      notNull: true,
    },
    end_time: {
      type: 'time',
      notNull: true,
    },
    break_start: {
      type: 'time',
      notNull: false,
    },
    break_end: {
      type: 'time',
      notNull: false,
    },
    active: {
      type: 'boolean',
      notNull: true,
      default: true,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('barber_schedules', ['barber_id', 'day_of_week'], { unique: true });
  pgm.createIndex('barber_schedules', 'barber_id');
};

exports.down = pgm => {
  pgm.dropTable('barber_schedules');
};