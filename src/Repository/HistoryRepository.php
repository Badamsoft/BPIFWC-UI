<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Repository;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table queries inside repository layer.

class HistoryRepository extends AbstractRepository {
    public function __construct( \wpdb $wpdb ) {
        parent::__construct( $wpdb, $wpdb->prefix . 'pifwc_import_history' );
    }

    /**
     * Get latest history counters for a job (lightweight, LIMIT 1).
     *
     * @param int $job_id Job ID.
     * @return array<string, mixed>|null
     */
    public function get_latest_by_job_row( int $job_id ): ?array {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'get_latest_by_job_row', [ $job_id ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $row = $wpdb->get_row(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT id, job_id, total_rows, added, updated, skipped, errors, started_at, finished_at FROM {$table} WHERE job_id = %d ORDER BY started_at DESC LIMIT 1",
                $job_id
            ),
            ARRAY_A
        );

        if ( ! is_array( $row ) ) {
            return null;
        }

        $out = [
            'id'          => isset( $row['id'] ) ? (int) $row['id'] : 0,
            'job_id'      => isset( $row['job_id'] ) ? (int) $row['job_id'] : $job_id,
            'total_rows'  => isset( $row['total_rows'] ) ? (int) $row['total_rows'] : 0,
            'added'       => isset( $row['added'] ) ? (int) $row['added'] : 0,
            'updated'     => isset( $row['updated'] ) ? (int) $row['updated'] : 0,
            'skipped'     => isset( $row['skipped'] ) ? (int) $row['skipped'] : 0,
            'errors'      => isset( $row['errors'] ) ? (int) $row['errors'] : 0,
            'started_at'  => $row['started_at'] ?? null,
            'finished_at' => $row['finished_at'] ?? null,
        ];

        $this->cache_set( $cache_key, $out, 2 );
        return $out;
    }

    /**
     * Count distinct jobs.
     */
    public function count_distinct_jobs(): int {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'count_distinct_jobs' );
        $cached = $this->cache_get( $cache_key );
        if ( false !== $cached ) {
            return (int) $cached;
        }

        $count = (int) $wpdb->get_var(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "SELECT COUNT(DISTINCT job_id) FROM {$table}"
        );

        $this->cache_set( $cache_key, $count );

        return $count;
    }

    /**
     * Find history records by job ID.
     *
     * @param int $job_id Job ID.
     * @return array<object>
     */
    public function find_by_job( int $job_id ): array {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'find_by_job', [ $job_id ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE job_id = %d ORDER BY started_at DESC",
                $job_id
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Get recent history records.
     *
     * @param int $limit  Maximum number of records.
     * @param int $offset Offset for pagination.
     * @return array<object>
     */
    public function get_recent( int $limit = 20, int $offset = 0 ): array {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );
        $jobs_table = esc_sql( $wpdb->prefix . 'pifwc_import_jobs' );

        $cache_key = $this->cache_key( 'get_recent', [ $limit, $offset ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT h.*, latest.min_started_at as earliest_started_at, latest.max_finished_at as latest_finished_at, j.profile_id, j.status as job_status, j.meta as job_meta FROM {$table} h INNER JOIN (SELECT job_id, MAX(id) as max_id, MIN(started_at) as min_started_at, MAX(finished_at) as max_finished_at FROM {$table} GROUP BY job_id) latest ON h.id = latest.max_id LEFT JOIN {$jobs_table} j ON h.job_id = j.id ORDER BY latest.min_started_at DESC LIMIT %d OFFSET %d",
                $limit,
                $offset
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Get history statistics.
     *
     * @param int|null $days Number of days to include (null for all time).
     * @return array<string, int>
     */
    public function get_statistics( ?int $days = null ): array {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'get_statistics', [ $days === null ? 'all' : $days ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        if ( $days !== null ) {
            $result = $wpdb->get_row(
                $wpdb->prepare(
                    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                    "SELECT COUNT(*) as total_imports, SUM(total_rows) as total_rows, SUM(added) as total_added, SUM(updated) as total_updated, SUM(skipped) as total_skipped, SUM(errors) as total_errors FROM {$table} WHERE started_at >= DATE_SUB(NOW(), INTERVAL %d DAY)",
                    $days
                ),
                ARRAY_A
            );
        } else {
            $result = $wpdb->get_row(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT COUNT(*) as total_imports, SUM(total_rows) as total_rows, SUM(added) as total_added, SUM(updated) as total_updated, SUM(skipped) as total_skipped, SUM(errors) as total_errors FROM {$table}",
                ARRAY_A
            );
        }

        $result = $result ?: [
            'total_imports' => 0,
            'total_rows'    => 0,
            'total_added'   => 0,
            'total_updated' => 0,
            'total_skipped' => 0,
            'total_errors'  => 0,
        ];

        $this->cache_set( $cache_key, $result );

        return $result;
    }

    /**
     * Get history with errors.
     *
     * @param int $limit Maximum number of records.
     * @return array<object>
     */
    public function get_with_errors( int $limit = 20 ): array {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'get_with_errors', [ $limit ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE errors > 0 ORDER BY started_at DESC LIMIT %d",
                $limit
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Get successful imports.
     *
     * @param int $limit Maximum number of records.
     * @return array<object>
     */
    public function get_successful( int $limit = 20 ): array {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $cache_key = $this->cache_key( 'get_successful', [ $limit ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE errors = 0 AND finished_at IS NOT NULL ORDER BY started_at DESC LIMIT %d",
                $limit
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Delete old history records.
     *
     * @param int $days Keep records from last N days.
     * @return int Number of deleted records.
     */
    public function delete_old( int $days = 30 ): int {
        $wpdb  = $this->wpdb;
        $table = esc_sql( $this->table_name );

        $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "DELETE FROM {$table} WHERE started_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
                $days
            )
        );

        $rows = (int) $wpdb->rows_affected;
        if ( $rows > 0 ) {
            $this->clear_cache();
        }

        return $rows;
    }
}
