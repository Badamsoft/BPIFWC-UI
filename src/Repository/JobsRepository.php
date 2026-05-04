<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Repository;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table queries inside repository layer.

class JobsRepository extends AbstractRepository {
    public function __construct( \wpdb $wpdb ) {
        parent::__construct( $wpdb, $wpdb->prefix . 'pifwc_import_jobs' );
    }

    /**
     * Get lightweight job status data (without decoding meta).
     *
     * @param int $id Job ID.
     * @return array<string, mixed>|null
     */
    public function get_status_row( int $id ): ?array {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'get_status_row', [ $id ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $row = $wpdb->get_row(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT id, profile_id, status, created_at, updated_at FROM {$table} WHERE id = %d",
                $id
            ),
            ARRAY_A
        );

        if ( ! is_array( $row ) ) {
            return null;
        }

        $out = [
            'id'         => (int) ( $row['id'] ?? 0 ),
            'profile_id' => isset( $row['profile_id'] ) && $row['profile_id'] !== null ? (int) $row['profile_id'] : null,
            'status'     => (string) ( $row['status'] ?? '' ),
            'meta'       => null,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ];

        $this->cache_set( $cache_key, $out, 2 );
        return $out;
    }

    public function touch( int $id ): bool {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $result = $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "UPDATE {$table} SET updated_at = CURRENT_TIMESTAMP WHERE id = %d",
                $id
            )
        );

        if ( false !== $result ) {
            $this->clear_cache();
        }
        return false !== $result;
    }

    public function update_meta( int $id, array $meta ): bool {
        return $this->update( $id, [ 'meta' => wp_json_encode( $meta ) ] );
    }

    /**
     * Find jobs by profile ID.
     *
     * @param int $profile_id Profile ID.
     * @return array<object>
     */
    public function find_by_profile( int $profile_id ): array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'find_by_profile', [ $profile_id ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE profile_id = %d ORDER BY created_at DESC",
                $profile_id
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Find jobs by status.
     *
     * @param string $status Job status.
     * @return array<object>
     */
    public function find_by_status( string $status ): array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'find_by_status', [ $status ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE status = %s ORDER BY created_at DESC",
                $status
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Find pending jobs.
     *
     * @return array<object>
     */
    public function find_pending(): array {
        return $this->find_by_status( 'pending' );
    }

    /**
     * Find running jobs.
     *
     * @return array<object>
     */
    public function find_running(): array {
        return $this->find_by_status( 'running' );
    }

    /**
     * Update job status.
     *
     * @param int    $id     Job ID.
     * @param string $status New status.
     * @return bool
     */
    public function update_status( int $id, string $status ): bool {
        return $this->update( $id, [ 'status' => $status ] );
    }

    /**
     * Get job with decoded meta.
     *
     * @param int $id Job ID.
     * @return array<string, mixed>|null
     */
    public function get_full_job( int $id ): ?array {
        $job = $this->find( $id );

        if ( ! $job ) {
            return null;
        }

        return [
            'id'         => (int) $job->id,
            'profile_id' => $job->profile_id ? (int) $job->profile_id : null,
            'status'     => $job->status,
            'meta'       => $job->meta ? json_decode( $job->meta, true ) : null,
            'created_at' => $job->created_at,
            'updated_at' => $job->updated_at,
        ];
    }

    /**
     * Get recent jobs with limit.
     *
     * @param int $limit Maximum number of jobs.
     * @return array<object>
     */
    public function get_recent( int $limit = 10 ): array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'get_recent', [ $limit ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} ORDER BY created_at DESC LIMIT %d",
                $limit
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }
}
