<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Import;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Delta tracker works with plugin-owned cache table.

class DeltaTracker {
    private \wpdb $wpdb;
    private string $table;

    public function __construct() {
        global $wpdb;
        $this->wpdb  = $wpdb;
        $this->table = $wpdb->prefix . 'pifwc_delta_cache';
    }

    private function cache_group(): string {
        return 'pifwc_delta_cache';
    }

    private function cache_version(): int {
        if ( ! function_exists( 'wp_cache_get' ) || ! function_exists( 'wp_cache_set' ) ) {
            return 0;
        }

        $group = $this->cache_group();
        $version = wp_cache_get( '__v', $group );
        $version = is_numeric( $version ) ? (int) $version : 1;
        if ( $version < 1 ) {
            $version = 1;
        }

        wp_cache_set( '__v', $version, $group );

        return $version;
    }

    private function cache_bump_version(): void {
        if ( ! function_exists( 'wp_cache_set' ) ) {
            return;
        }

        $group = $this->cache_group();
        $version = $this->cache_version();
        $version = $version > 0 ? $version + 1 : 1;
        wp_cache_set( '__v', $version, $group );
    }

    private function cache_get( string $key ) {
        if ( ! function_exists( 'wp_cache_get' ) ) {
            return false;
        }

        $version = $this->cache_version();
        return wp_cache_get( $key . ':' . (string) $version, $this->cache_group() );
    }

    private function cache_set( string $key, $value, int $ttl = 60 ): void {
        if ( ! function_exists( 'wp_cache_set' ) ) {
            return;
        }

        $version = $this->cache_version();
        wp_cache_set( $key . ':' . (string) $version, $value, $this->cache_group(), $ttl );
    }

    /**
     * Create delta cache table if not exists.
     */
    public function create_table(): void {
        $charset = $this->wpdb->get_charset_collate();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $sql = "CREATE TABLE IF NOT EXISTS {$this->table} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            profile_id BIGINT UNSIGNED NOT NULL,
            record_key VARCHAR(255) NOT NULL,
            record_hash VARCHAR(64) NOT NULL,
            last_modified VARCHAR(100) DEFAULT NULL,
            last_imported_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY profile_record (profile_id, record_key),
            KEY profile_id (profile_id),
            KEY record_hash (record_hash)
        ) {$charset};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );
    }

    /**
     * Compute hash for a record.
     *
     * @param array       $record     Record data.
     * @param array|null  $fields     Fields to include in hash (null = all).
     * @return string Hash.
     */
    public function compute_hash( array $record, ?array $fields = null ): string {
        if ( $fields !== null ) {
            $data = [];
            foreach ( $fields as $field ) {
                $data[ $field ] = $record[ $field ] ?? '';
            }
        } else {
            $data = $record;
        }

        // Sort keys for consistent hashing.
        ksort( $data );

        return hash( 'sha256', json_encode( $data ) );
    }

    /**
     * Get record key from data.
     *
     * @param array  $record   Record data.
     * @param string $key_field Field to use as key (e.g., 'sku').
     * @return string|null Record key.
     */
    public function get_record_key( array $record, string $key_field = 'sku' ): ?string {
        $value = $record[ $key_field ] ?? null;

        if ( empty( $value ) ) {
            return null;
        }

        return (string) $value;
    }

    /**
     * Check if record has changed since last import.
     *
     * @param int    $profile_id Profile ID.
     * @param string $record_key Record key.
     * @param string $new_hash   New record hash.
     * @return bool True if changed or new.
     */
    public function has_changed( int $profile_id, string $record_key, string $new_hash ): bool {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table ) : $this->table;

        $cache_key = 'has_changed:' . (string) $profile_id . ':' . $record_key;
        $cached = $this->cache_get( $cache_key );
        if ( is_string( $cached ) ) {
            return $cached !== $new_hash;
        }

        $cached = $wpdb->get_var(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT record_hash FROM {$table} WHERE profile_id = %d AND record_key = %s",
                $profile_id,
                $record_key
            )
        );

        if ( $cached === null ) {
            return true; // New record.
        }

        if ( is_string( $cached ) ) {
            $this->cache_set( $cache_key, $cached );
        }

        return $cached !== $new_hash;
    }

    /**
     * Check if record has changed using last_modified field.
     *
     * @param int    $profile_id    Profile ID.
     * @param string $record_key    Record key.
     * @param string $last_modified Last modified value from source.
     * @return bool True if changed or new.
     */
    public function has_changed_by_date( int $profile_id, string $record_key, string $last_modified ): bool {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table ) : $this->table;

        $cache_key = 'has_changed_by_date:' . (string) $profile_id . ':' . $record_key;
        $cached = $this->cache_get( $cache_key );
        if ( is_string( $cached ) ) {
            return $cached !== $last_modified;
        }

        $cached = $wpdb->get_var(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT last_modified FROM {$table} WHERE profile_id = %d AND record_key = %s",
                $profile_id,
                $record_key
            )
        );

        if ( $cached === null ) {
            return true; // New record.
        }

        if ( is_string( $cached ) ) {
            $this->cache_set( $cache_key, $cached );
        }

        return $cached !== $last_modified;
    }

    /**
     * Update cache for a record.
     *
     * @param int         $profile_id    Profile ID.
     * @param string      $record_key    Record key.
     * @param string      $record_hash   Record hash.
     * @param string|null $last_modified Last modified value.
     */
    public function update_cache( int $profile_id, string $record_key, string $record_hash, ?string $last_modified = null ): void {
        $this->wpdb->replace(
            $this->table,
            [
                'profile_id'       => $profile_id,
                'record_key'       => $record_key,
                'record_hash'      => $record_hash,
                'last_modified'    => $last_modified,
                'last_imported_at' => current_time( 'mysql' ),
                'created_at'       => current_time( 'mysql' ),
            ],
            [ '%d', '%s', '%s', '%s', '%s', '%s' ]
        );

        $this->cache_bump_version();
    }

    /**
     * Filter records to only changed ones.
     *
     * @param int    $profile_id       Profile ID.
     * @param array  $records          Records to filter.
     * @param string $key_field        Field to use as key.
     * @param string $modified_field   Field with last modified date (optional).
     * @param array  $hash_fields      Fields to include in hash (optional).
     * @return array Filtered records with change info.
     */
    public function filter_changed(
        int $profile_id,
        array $records,
        string $key_field = 'sku',
        string $modified_field = '',
        array $hash_fields = []
    ): array {
        $result = [
            'changed'   => [],
            'unchanged' => [],
            'new'       => [],
            'stats'     => [
                'total'     => count( $records ),
                'changed'   => 0,
                'unchanged' => 0,
                'new'       => 0,
            ],
        ];

        foreach ( $records as $record ) {
            $record_key = $this->get_record_key( $record, $key_field );

            if ( $record_key === null ) {
                // No key - treat as new.
                $result['new'][] = $record;
                $result['stats']['new']++;
                continue;
            }

            // Check by last_modified if available.
            if ( ! empty( $modified_field ) && isset( $record[ $modified_field ] ) ) {
                $last_modified = (string) $record[ $modified_field ];

                if ( $this->has_changed_by_date( $profile_id, $record_key, $last_modified ) ) {
                    $result['changed'][] = $record;
                    $result['stats']['changed']++;
                } else {
                    $result['unchanged'][] = $record;
                    $result['stats']['unchanged']++;
                }
            } else {
                // Check by hash.
                $hash = $this->compute_hash( $record, empty( $hash_fields ) ? null : $hash_fields );

                $cached = $this->get_cached( $profile_id, $record_key );

                if ( $cached === null ) {
                    $result['new'][] = $record;
                    $result['stats']['new']++;
                } elseif ( $cached['record_hash'] !== $hash ) {
                    $result['changed'][] = $record;
                    $result['stats']['changed']++;
                } else {
                    $result['unchanged'][] = $record;
                    $result['stats']['unchanged']++;
                }
            }
        }

        return $result;
    }

    /**
     * Get cached record info.
     *
     * @param int    $profile_id Profile ID.
     * @param string $record_key Record key.
     * @return array|null Cached data.
     */
    public function get_cached( int $profile_id, string $record_key ): ?array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table ) : $this->table;

        $cache_key = 'get_cached:' . (string) $profile_id . ':' . $record_key;
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $row = $wpdb->get_row(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE profile_id = %d AND record_key = %s",
                $profile_id,
                $record_key
            ),
            ARRAY_A
        );

        $row = $row ?: null;
        if ( is_array( $row ) ) {
            $this->cache_set( $cache_key, $row );
        }

        return $row;
    }

    /**
     * Batch update cache after import.
     *
     * @param int    $profile_id     Profile ID.
     * @param array  $records        Imported records.
     * @param string $key_field      Field to use as key.
     * @param string $modified_field Field with last modified date.
     * @param array  $hash_fields    Fields to include in hash.
     */
    public function batch_update_cache(
        int $profile_id,
        array $records,
        string $key_field = 'sku',
        string $modified_field = '',
        array $hash_fields = []
    ): void {
        foreach ( $records as $record ) {
            $record_key = $this->get_record_key( $record, $key_field );

            if ( $record_key === null ) {
                continue;
            }

            $hash = $this->compute_hash( $record, empty( $hash_fields ) ? null : $hash_fields );
            $last_modified = ! empty( $modified_field ) ? ( $record[ $modified_field ] ?? null ) : null;

            $this->update_cache( $profile_id, $record_key, $hash, $last_modified );
        }
    }

    /**
     * Clear cache for a profile.
     *
     * @param int $profile_id Profile ID.
     * @return int Number of deleted rows.
     */
    public function clear_cache( int $profile_id ): int {
        $rows = (int) $this->wpdb->delete(
            $this->table,
            [ 'profile_id' => $profile_id ],
            [ '%d' ]
        );

        if ( $rows > 0 ) {
            $this->cache_bump_version();
        }

        return $rows;
    }

    /**
     * Get cache statistics for a profile.
     *
     * @param int $profile_id Profile ID.
     * @return array Statistics.
     */
    public function get_stats( int $profile_id ): array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table ) : $this->table;

        $cache_key = 'get_stats:' . (string) $profile_id;
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $total = (int) $wpdb->get_var(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT COUNT(*) FROM {$table} WHERE profile_id = %d",
                $profile_id
            )
        );

        $last_import = $wpdb->get_var(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT MAX(last_imported_at) FROM {$table} WHERE profile_id = %d",
                $profile_id
            )
        );

        $stats = [
            'cached_records' => $total,
            'last_import'    => $last_import,
        ];

        $this->cache_set( $cache_key, $stats );

        return $stats;
    }
}
