/**
 * Migration: add-barber-schedules-check-constraints
 * Adds CHECK constraints to barber_schedules for data integrity.
 */

exports.up = pgm => {
  pgm.addConstraint('barber_schedules', 'start_before_end', {
    check: 'start_time < end_time',
  });

  pgm.addConstraint('barber_schedules', 'break_within_schedule', {
    check: '(break_start IS NULL AND break_end IS NULL) OR (break_start IS NOT NULL AND break_end IS NOT NULL AND break_start < break_end AND break_start >= start_time AND break_end <= end_time)',
  });
};

exports.down = pgm => {
  pgm.dropConstraint('barber_schedules', 'start_before_end');
  pgm.dropConstraint('barber_schedules', 'break_within_schedule');
};