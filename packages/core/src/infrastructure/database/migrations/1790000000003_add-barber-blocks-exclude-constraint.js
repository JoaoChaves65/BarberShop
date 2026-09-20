/**
 * Migration: add-barber-blocks-exclude-constraint
 * Adds EXCLUDE constraint to prevent overlapping blocks for the same barber.
 * Requires btree_gist extension.
 */

exports.up = pgm => {
  pgm.createExtension('btree_gist', { ifNotExists: true });

  pgm.sql(`
    ALTER TABLE "barber_blocks"
      ADD CONSTRAINT "no_overlapping_blocks"
      EXCLUDE USING gist (
        barber_id WITH =,
        tstzrange(start_date_time, end_date_time) WITH &&
      )
  `);
};

exports.down = pgm => {
  pgm.dropConstraint('barber_blocks', 'no_overlapping_blocks');
};