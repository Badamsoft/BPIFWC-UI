<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Repository;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Repositories operate on plugin-owned custom tables.

abstract class AbstractRepository {
    protected \wpdb $wpdb;
    protected string $table_name;

    public function __construct( \wpdb $wpdb, string $table_name ) {
        $this->wpdb       = $wpdb;
        $this->table_name = $table_name;
    }

    /**
     * Get a single record by ID.
     *
     * @param int $id Record ID.
     * @return object|null
     */
    public function find( int $id ): ?object {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'find', [ $id ] );
        $cached = $this->cache_get( $cache_key );
        if ( false !== $cached ) {
            return $cached instanceof \stdClass ? $cached : null;
        }

        $result = $wpdb->get_row(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE id = %d",
                $id
            )
        );

        if ( $result ) {
            $this->cache_set( $cache_key, $result );
        }

        return $result ?: null;
    }

    /**
     * Get all records.
     *
     * @param int $limit  Maximum number of records to return.
     * @param int $offset Offset for pagination.
     * @return array<object>
     */
    public function find_all( int $limit = 100, int $offset = 0 ): array {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'find_all', [ $limit, $offset ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} ORDER BY id DESC LIMIT %d OFFSET %d",
                $limit,
                $offset
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Count total records.
     *
     * @return int
     */
    public function count(): int {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'count' );
        $cached = $this->cache_get( $cache_key );
        if ( false !== $cached ) {
            return (int) $cached;
        }

        $count = (int) $wpdb->get_var(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "SELECT COUNT(*) FROM {$table}"
        );

        $this->cache_set( $cache_key, $count );

        return $count;
    }

    /**
     * Insert a new record.
     *
     * @param array<string, mixed> $data Record data.
     * @return int|false Inserted ID or false on failure.
     */
    public function insert( array $data ) {
        $result = $this->wpdb->insert(
            $this->table_name,
            $data
        );

        if ( false === $result ) {
            return false;
        }

        // Clear object cache to prevent stale data on aggressive caching hosts (Hostinger, etc.)
        $this->clear_cache();

        return $this->wpdb->insert_id;
    }

    /**
     * Update a record by ID.
     *
     * @param int                  $id   Record ID.
     * @param array<string, mixed> $data Record data.
     * @return bool
     */
    public function update( int $id, array $data ): bool {
        $result = $this->wpdb->update(
            $this->table_name,
            $data,
            [ 'id' => $id ]
        );

        if ( false !== $result ) {
            // Clear object cache to prevent stale data on aggressive caching hosts (Hostinger, etc.)
            $this->clear_cache();
        }

        return false !== $result;
    }

    /**
     * Delete a record by ID.
     *
     * @param int $id Record ID.
     * @return bool
     */
    public function delete( int $id ): bool {
        $result = $this->wpdb->delete(
            $this->table_name,
            [ 'id' => $id ]
        );

        if ( false !== $result ) {
            // Clear object cache to prevent stale data on aggressive caching hosts (Hostinger, etc.)
            $this->clear_cache();
        }

        return false !== $result;
    }

    /**
     * Get table name.
     *
     * @return string
     */
    public function get_table_name(): string {
        return $this->table_name;
    }

    /**
     * Clear WordPress object cache for this table.
     * Helps prevent stale data on hosts with aggressive caching (Hostinger, etc.).
     *
     * @return void
     */
    protected function clear_cache(): void {
        // Clear WordPress object cache groups related to this table
        $cache_group = 'pifwc_' . str_replace( $this->wpdb->prefix . 'pifwc_', '', $this->table_name );

        $this->cache_bump_version();

        if ( function_exists( 'wp_cache_flush_group' ) ) {
            wp_cache_flush_group( $cache_group );
        }
        
        // Also flush runtime cache if using persistent object cache
        if ( function_exists( 'wp_cache_flush_runtime' ) ) {
            wp_cache_flush_runtime();
        }
    }

    protected function cache_group(): string {
        return 'pifwc_' . str_replace( $this->wpdb->prefix . 'pifwc_', '', $this->table_name );
    }

    protected function cache_version(): int {
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

    protected function cache_bump_version(): void {
        if ( ! function_exists( 'wp_cache_set' ) ) {
            return;
        }

        $group = $this->cache_group();
        $version = $this->cache_version();
        $version = $version > 0 ? $version + 1 : 1;
        wp_cache_set( '__v', $version, $group );
    }

    protected function cache_key( string $method, array $parts = [] ): string {
        $base = $method;
        if ( ! empty( $parts ) ) {
            $base .= ':' . implode( ':', array_map( 'strval', $parts ) );
        }

        return $base;
    }

    protected function cache_get( string $key ) {
        if ( ! function_exists( 'wp_cache_get' ) ) {
            return false;
        }

        $group = $this->cache_group();
        $version = $this->cache_version();

        return wp_cache_get( $key . ':' . (string) $version, $group );
    }

    protected function cache_set( string $key, $value, int $ttl = 60 ): void {
        if ( ! function_exists( 'wp_cache_set' ) ) {
            return;
        }

        $group = $this->cache_group();
        $version = $this->cache_version();

        wp_cache_set( $key . ':' . (string) $version, $value, $group, $ttl );
    }
}
