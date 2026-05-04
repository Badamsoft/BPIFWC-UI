<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Logging;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Logger operates on plugin-owned custom log table.

class Logger {
    public const LEVEL_INFO    = 'info';
    public const LEVEL_WARNING = 'warning';
    public const LEVEL_ERROR   = 'error';
    public const LEVEL_DEBUG   = 'debug';

    private \wpdb $wpdb;
    private string $table_name;

    public function __construct( \wpdb $wpdb ) {
        $this->wpdb       = $wpdb;
        $this->table_name = $wpdb->prefix . 'pifwc_import_logs';
    }

    private function cache_group(): string {
        return 'pifwc_logger';
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

    private function cache_set( string $key, $value, int $ttl = 30 ): void {
        if ( ! function_exists( 'wp_cache_set' ) ) {
            return;
        }

        $version = $this->cache_version();
        wp_cache_set( $key . ':' . (string) $version, $value, $this->cache_group(), $ttl );
    }

    /**
     * Log an info message.
     *
     * @param int         $history_id Import history ID.
     * @param string      $message    Log message.
     * @param int|null    $row_number Row number in the import file.
     * @param array|null  $payload    Additional data.
     */
    public function info( int $history_id, string $message, ?int $row_number = null, ?array $payload = null ): void {
        $this->log( self::LEVEL_INFO, $history_id, $message, $row_number, $payload );
    }

    /**
     * Log a warning message.
     *
     * @param int         $history_id Import history ID.
     * @param string      $message    Log message.
     * @param int|null    $row_number Row number in the import file.
     * @param array|null  $payload    Additional data.
     */
    public function warning( int $history_id, string $message, ?int $row_number = null, ?array $payload = null ): void {
        $this->log( self::LEVEL_WARNING, $history_id, $message, $row_number, $payload );
    }

    /**
     * Log an error message.
     *
     * @param int         $history_id Import history ID.
     * @param string      $message    Log message.
     * @param int|null    $row_number Row number in the import file.
     * @param array|null  $payload    Additional data.
     */
    public function error( int $history_id, string $message, ?int $row_number = null, ?array $payload = null ): void {
        $this->log( self::LEVEL_ERROR, $history_id, $message, $row_number, $payload );

        // Also log to WP error log for critical errors.
        $this->log_to_error_log( $message, $payload );
    }

    /**
     * Log a debug message.
     *
     * @param int         $history_id Import history ID.
     * @param string      $message    Log message.
     * @param int|null    $row_number Row number in the import file.
     * @param array|null  $payload    Additional data.
     */
    public function debug( int $history_id, string $message, ?int $row_number = null, ?array $payload = null ): void {
        if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
            return;
        }

        $this->log( self::LEVEL_DEBUG, $history_id, $message, $row_number, $payload );
    }

    /**
     * Write a log entry to the database.
     *
     * @param string      $level      Log level.
     * @param int         $history_id Import history ID.
     * @param string      $message    Log message.
     * @param int|null    $row_number Row number in the import file.
     * @param array|null  $payload    Additional data.
     */
    private function log( string $level, int $history_id, string $message, ?int $row_number = null, ?array $payload = null ): void {
        $data = [
            'history_id' => $history_id,
            'level'      => $level,
            'message'    => $message,
            'created_at' => current_time( 'mysql' ),
        ];

        $formats = [ '%d', '%s', '%s', '%s' ];

        if ( null !== $row_number ) {
            $data['row_number'] = $row_number;
            $formats[]          = '%d';
        }

        if ( null !== $payload ) {
            $data['payload'] = wp_json_encode( $payload );
            $formats[]       = '%s';
        }

        $this->wpdb->insert( $this->table_name, $data, $formats );
        $this->cache_bump_version();
    }

    /**
     * Write to WP error log.
     *
     * @param string     $message Log message.
     * @param array|null $payload Additional data.
     */
    private function log_to_error_log( string $message, ?array $payload = null ): void {
        if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
            return;
        }

        $log_message = '[WooProduct Importer] ' . $message;

        if ( null !== $payload ) {
            $log_message .= ' | Payload: ' . wp_json_encode( $payload );
        }

        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
        error_log( $log_message );
    }

    /**
     * Get logs for a specific history entry.
     *
     * @param int    $history_id Import history ID.
     * @param string $level      Optional level filter.
     * @param int    $limit      Maximum number of logs to return.
     * @param int    $offset     Offset for pagination.
     * @return array
     */
    public function get_logs( int $history_id, string $level = '', int $limit = 100, int $offset = 0 ): array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = 'get_logs:' . (string) $history_id . ':' . (string) $level . ':' . (string) $limit . ':' . (string) $offset;
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        if ( '' === $level ) {
            $results = $wpdb->get_results(
                $wpdb->prepare(
                    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                    "SELECT * FROM {$table} WHERE history_id = %d ORDER BY created_at DESC LIMIT %d OFFSET %d",
                    $history_id,
                    $limit,
                    $offset
                ),
                ARRAY_A
            );
        } else {
            $results = $wpdb->get_results(
                $wpdb->prepare(
                    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                    "SELECT * FROM {$table} WHERE history_id = %d AND level = %s ORDER BY created_at DESC LIMIT %d OFFSET %d",
                    $history_id,
                    $level,
                    $limit,
                    $offset
                ),
                ARRAY_A
            );
        }

        $results = is_array( $results ) ? $results : [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Count logs for a specific history entry.
     *
     * @param int    $history_id Import history ID.
     * @param string $level      Optional level filter.
     * @return int
     */
    public function count_logs( int $history_id, string $level = '' ): int {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = 'count_logs:' . (string) $history_id . ':' . (string) $level;
        $cached = $this->cache_get( $cache_key );
        if ( false !== $cached ) {
            return (int) $cached;
        }

        if ( '' === $level ) {
            $count = (int) $wpdb->get_var(
                $wpdb->prepare(
                    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                    "SELECT COUNT(*) FROM {$table} WHERE history_id = %d",
                    $history_id
                )
            );
            $this->cache_set( $cache_key, $count );
            return $count;
        }

        $count = (int) $wpdb->get_var(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT COUNT(*) FROM {$table} WHERE history_id = %d AND level = %s",
                $history_id,
                $level
            )
        );

        $this->cache_set( $cache_key, $count );

        return $count;
    }

    /**
     * Delete logs older than specified days.
     *
     * @param int $days Number of days to keep logs.
     * @return int Number of deleted rows.
     */
    public function cleanup_old_logs( int $days = 30 ): int {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cutoff = gmdate( 'Y-m-d H:i:s', strtotime( "-{$days} days" ) );

        $rows = (int) $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "DELETE FROM {$table} WHERE created_at < %s",
                $cutoff
            )
        );

        if ( $rows > 0 ) {
            $this->cache_bump_version();
        }

        return $rows;
    }
}
