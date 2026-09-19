/**
 * Migration: add-barber-blocks-exclude-constraint
 * Adds EXCLUDE constraint to prevent overlapping blocks for the same barber.
 * Requires btree_gist extension.
 */

exports.up = pgm => {
  pgm.createExtension('btree_gist', { ifNotExists: true });

  pgm.addConstraint('barber_blocks', 'no_overlapping_blocks', {
    exclude: 'barber_id WITH =, tsrange(start_date_time, end_date_time) WITH &&',
    using: 'gist',
  });
};

exports.down = pgm => {
  pgm.dropConstraint('barber_blocks', 'no_overlapping_blocks');
};