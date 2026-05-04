<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Repository;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table queries inside repository layer.

class LogsRepository extends AbstractRepository {
    public function __construct( \wpdb $wpdb ) {
        parent::__construct( $wpdb, $wpdb->prefix . 'pifwc_import_logs' );
    }

    private function should_store_level( string $level ): bool {
        $level = strtolower( trim( $level ) );
        if ( $level === 'error' ) {
            return true;
        }

        $settings = [];
        if ( function_exists( 'get_option' ) ) {
            $raw = get_option( 'pifwc_settings', [] );
            if ( is_array( $raw ) ) {
                $settings = $raw;
            }
        }

        $debug = is_array( $settings['debug'] ?? null ) ? (array) $settings['debug'] : [];
        $log_level = isset( $debug['log_level'] ) ? strtolower( (string) $debug['log_level'] ) : '';

        if ( $log_level === '' || $log_level === 'standard' ) {
            return in_array( $level, [ 'info', 'warning' ], true );
        }

        if ( $log_level === 'minimal' ) {
            return false;
        }

        if ( $log_level === 'verbose' || $log_level === 'debug' ) {
            return true;
        }

        return true;
    }

    /**
     * Find logs by history ID.
     *
     * @param int $history_id History ID.
     * @return array<object>
     */
    public function find_by_history( int|string $history_id ): array {
        $history_id = (int) $history_id;
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'find_by_history', [ $history_id ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE history_id = %d ORDER BY created_at ASC",
                $history_id
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Find logs by level.
     *
     * @param int    $history_id History ID.
     * @param string $level      Log level (info, warning, error).
     * @return array<object>
     */
    public function find_by_level( int|string $history_id, string $level ): array {
        $history_id = (int) $history_id;
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'find_by_level', [ $history_id, $level ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE history_id = %d AND `level` = %s ORDER BY created_at ASC",
                $history_id,
                $level
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Get error logs for a history record.
     *
     * @param int $history_id History ID.
     * @return array<object>
     */
    public function get_errors( int|string $history_id ): array {
        return $this->find_by_level( $history_id, 'error' );
    }

    /**
     * Get warning logs for a history record.
     *
     * @param int $history_id History ID.
     * @return array<object>
     */
    public function get_warnings( int|string $history_id ): array {
        return $this->find_by_level( $history_id, 'warning' );
    }

    /**
     * Add a log entry.
     *
     * @param int         $history_id History ID.
     * @param string      $level      Log level.
     * @param string      $message    Log message.
     * @param int|null    $row_number Row number (optional).
     * @param mixed|null  $payload    Additional data (optional).
     * @return int|false
     */
    public function add_log( int|string $history_id, string $level, string $message, ?int $row_number = null, $payload = null ) {
        $history_id = (int) $history_id;

        if ( ! $this->should_store_level( $level ) ) {
            return 0;
        }

        $payload_json = $payload ? wp_json_encode( $payload ) : null;

        // Avoid reserved keyword issues by quoting `level` and `row_number`.
        $data = [
            'history_id' => $history_id,
            'level'      => $level,
            'message'    => $message,
        ];

        $formats = [ '%d', '%s', '%s' ];

        if ( null !== $row_number ) {
            $data['row_number'] = (int) $row_number;
            $formats[]          = '%d';
        }

        if ( null !== $payload_json ) {
            $data['payload'] = $payload_json;
            $formats[]       = '%s';
        }

        $result = $this->wpdb->insert( $this->table_name, $data, $formats );
        if ( false === $result ) {
            return false;
        }

        $this->clear_cache();

        return $this->wpdb->insert_id;
    }

    /**
     * Delete logs for a history record.
     *
     * @param int $history_id History ID.
     * @return bool
     */
    public function delete_by_history( int $history_id ): bool {
        $result = $this->wpdb->delete(
            $this->table_name,
            [ 'history_id' => $history_id ]
        );

        if ( false !== $result ) {
            $this->clear_cache();
        }

        return false !== $result;
    }

    /**
     * Delete old logs.
     *
     * @param int $days Keep logs from last N days.
     * @return int Number of deleted records.
     */
    public function delete_old( int $days = 30 ): int {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "DELETE FROM {$table} WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)",
                $days
            )
        );

        $rows = (int) $wpdb->rows_affected;
        if ( $rows > 0 ) {
            $this->clear_cache();
        }

        return $rows;
    }

    /**
     * Get log statistics for a history record.
     *
     * @param int $history_id History ID.
     * @return array<string, int>
     */
    public function get_statistics( int $history_id ): array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'get_statistics', [ $history_id ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT `level`, COUNT(*) as count FROM {$table} WHERE history_id = %d GROUP BY `level`",
                $history_id
            ),
            ARRAY_A
        );

        $stats = [
            'info'    => 0,
            'warning' => 0,
            'error'   => 0,
        ];

        foreach ( $results as $row ) {
            $level_key = $row['level'] ?? ( $row['`level`'] ?? null );
            if ( $level_key !== null ) {
                $stats[ $level_key ] = (int) $row['count'];
            }
        }

        $this->cache_set( $cache_key, $stats );

        return $stats;
    }
}
