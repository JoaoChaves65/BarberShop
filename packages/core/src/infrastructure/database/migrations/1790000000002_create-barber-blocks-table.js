/**
 * Migration: create-barber-blocks-table
 * Creates the barber_blocks table for time-off, lunch, maintenance blocks.
 */

exports.up = pgm => {
  pgm.createTable('barber_blocks', {
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
    start_date_time: {
      type: 'timestamptz',
      notNull: true,
    },
    end_date_time: {
      type: 'timestamptz',
      notNull: true,
    },
    reason: {
      type: 'varchar(20)',
      notNull: true,
      check: "reason IN ('TIME_OFF', 'LUNCH', 'MAINTENANCE', 'OTHER')",
    },
    recurring: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    recurrence_rule: {
      type: 'text',
      notNull: false,
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

  pgm.createIndex('barber_blocks', ['barber_id', 'start_date_time', 'end_date_time']);
  pgm.createIndex('barber_blocks', 'barber_id');
};

exports.down = pgm => {
  pgm.dropTable('barber_blocks');
};