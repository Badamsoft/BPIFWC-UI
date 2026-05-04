<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Database;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching,WordPress.DB.DirectDatabaseQuery.SchemaChange -- Installer performs explicit schema migrations on plugin-owned tables.

class Installer {
    private \wpdb $wpdb;
    private string $charset_collate;

    public function __construct( \wpdb $wpdb ) {
        $this->wpdb            = $wpdb;
        $this->charset_collate = $wpdb->get_charset_collate();
    }

    /**
     * Install all database tables.
     */
    public function install(): void {
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';

        $this->create_import_jobs_table();
        $this->create_import_history_table();
        $this->create_import_logs_table();
        $this->create_import_profiles_table();
        $this->create_media_cache_table();
        $this->create_delta_cache_table();
        
        // Allow PRO add-on to install additional tables.
        do_action( 'pifwc_database_install', $this->wpdb );

        update_option( 'pifwc_db_version', PIFWC_VERSION );
    }

    /**
     * Check and upgrade database if needed.
     */
    public function maybe_upgrade(): void {
        $this->ensure_required_tables();

        $this->migrate_legacy_tables();

        if ( $this->should_install_tables() ) {
            $this->install();
        }

        $current_version = get_option( 'pifwc_db_version', '0' );

        if ( version_compare( $current_version, PIFWC_VERSION, '<' ) ) {
            // Run migrations before full install
            $this->migrate_profiles_table();
            $this->install();
        }
    }

    private function ensure_required_tables(): void {
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    }

    private function should_install_tables(): bool {
        $tables = [
            $this->wpdb->prefix . 'pifwc_import_jobs',
            $this->wpdb->prefix . 'pifwc_import_history',
            $this->wpdb->prefix . 'pifwc_import_logs',
            $this->wpdb->prefix . 'pifwc_import_profiles',
            $this->wpdb->prefix . 'pifwc_media_cache',
            $this->wpdb->prefix . 'pifwc_delta_cache',
        ];

        foreach ( $tables as $table_name ) {
            if ( ! $this->table_exists( $table_name ) ) {
                return true;
            }
        }

        return false;
    }

    private function migrate_legacy_tables(): void {
        $legacy_tables = [
            $this->wpdb->prefix . 'wpi_import_profiles' => $this->wpdb->prefix . 'pifwc_import_profiles',
            $this->wpdb->prefix . 'wpi_import_logs' => $this->wpdb->prefix . 'pifwc_import_logs',
            $this->wpdb->prefix . 'wpi_delta_cache' => $this->wpdb->prefix . 'pifwc_delta_cache',
        ];

        foreach ( $legacy_tables as $old_name => $new_name ) {
            if ( $this->table_exists( $old_name ) && ! $this->table_exists( $new_name ) ) {
                // phpcs:disable WordPress.DB.PreparedSQL.NotPrepared -- Using %i placeholders for SQL identifiers (table names).
                $this->wpdb->query(
                    $this->wpdb->prepare(
                        'RENAME TABLE %i TO %i',
                        $old_name,
                        $new_name
                    )
                );
                // phpcs:enable WordPress.DB.PreparedSQL.NotPrepared
            }
        }
    }

    private function table_exists( string $table_name ): bool {
        $wpdb = $this->wpdb;
        $like = $wpdb->esc_like( $table_name );
        $found = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $like ) );
        return is_string( $found ) && $found === $table_name;
    }

    /**
     * Migrate profiles table to add missing columns.
     */
    private function migrate_profiles_table(): void {
        $wpdb = $this->wpdb;
        $table_name = $wpdb->prefix . 'pifwc_import_profiles';
        
        $columns_to_add = [
            'source_config' => [ 'type' => 'LONGTEXT', 'after' => 'source', 'default' => 'DEFAULT NULL' ],
            'options'       => [ 'type' => 'LONGTEXT', 'after' => 'schedule', 'default' => 'DEFAULT NULL' ],
            'is_active'     => [ 'type' => 'TINYINT(1)', 'after' => 'options', 'default' => 'NOT NULL DEFAULT 1' ],
        ];
        
        foreach ( $columns_to_add as $column_name => $column_def ) {
            $column_exists = $wpdb->get_results(
                $wpdb->prepare(
                    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                    DB_NAME,
                    $table_name,
                    $column_name
                )
            );
            
            if ( empty( $column_exists ) ) {
                $after   = (string) ( $column_def['after'] ?? '' );

                $sql_map = [
                    'source_config' => 'ALTER TABLE %i ADD COLUMN %i LONGTEXT DEFAULT NULL AFTER %i',
                    'options'       => 'ALTER TABLE %i ADD COLUMN %i LONGTEXT DEFAULT NULL AFTER %i',
                    'is_active'     => 'ALTER TABLE %i ADD COLUMN %i TINYINT(1) NOT NULL DEFAULT 1 AFTER %i',
                ];

                if ( isset( $sql_map[ $column_name ] ) ) {
                    // phpcs:disable WordPress.DB.PreparedSQL.NotPrepared -- Using %i placeholders for SQL identifiers (table/column names).
                    $wpdb->query(
                        $wpdb->prepare(
                            $sql_map[ $column_name ],
                            $table_name,
                            $column_name,
                            $after
                        )
                    );
                    // phpcs:enable WordPress.DB.PreparedSQL.NotPrepared
                }
            }
        }
    }

    /**
     * Create wp_pifwc_import_jobs table.
     */
    private function create_import_jobs_table(): void {
        $table_name = $this->wpdb->prefix . 'pifwc_import_jobs';

        dbDelta(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "CREATE TABLE {$table_name} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            profile_id BIGINT UNSIGNED DEFAULT NULL,
            status VARCHAR(50) NOT NULL DEFAULT \'pending\',
            meta LONGTEXT DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY profile_id (profile_id),
            KEY status (status),
            KEY created_at (created_at)
        ) {$this->charset_collate};"
        );
    }

    /**
     * Create wp_pifwc_import_history table.
     */
    private function create_import_history_table(): void {
        $table_name = $this->wpdb->prefix . 'pifwc_import_history';

        dbDelta(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "CREATE TABLE {$table_name} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            job_id BIGINT UNSIGNED NOT NULL,
            total_rows INT UNSIGNED NOT NULL DEFAULT 0,
            added INT UNSIGNED NOT NULL DEFAULT 0,
            updated INT UNSIGNED NOT NULL DEFAULT 0,
            skipped INT UNSIGNED NOT NULL DEFAULT 0,
            errors INT UNSIGNED NOT NULL DEFAULT 0,
            started_at DATETIME DEFAULT NULL,
            finished_at DATETIME DEFAULT NULL,
            PRIMARY KEY (id),
            KEY job_id (job_id),
            KEY started_at (started_at)
        ) {$this->charset_collate};"
        );
    }

    /**
     * Create wp_pifwc_import_logs table.
     */
    private function create_import_logs_table(): void {
        $table_name = $this->wpdb->prefix . 'pifwc_import_logs';

        dbDelta(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "CREATE TABLE {$table_name} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            history_id BIGINT UNSIGNED NOT NULL,
            `row_number` INT UNSIGNED DEFAULT NULL,
            `level` VARCHAR(20) NOT NULL DEFAULT \'info\',
            message TEXT NOT NULL,
            payload LONGTEXT DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY history_id (history_id),
            KEY level (level),
            KEY created_at (created_at)
        ) {$this->charset_collate};"
        );
    }

    /**
     * Create wp_pifwc_import_profiles table.
     */
    private function create_import_profiles_table(): void {
        $table_name = $this->wpdb->prefix . 'pifwc_import_profiles';

        dbDelta(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "CREATE TABLE {$table_name} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            source VARCHAR(255) DEFAULT NULL,
            source_config LONGTEXT DEFAULT NULL,
            mapping LONGTEXT DEFAULT NULL,
            filters LONGTEXT DEFAULT NULL,
            schedule LONGTEXT DEFAULT NULL,
            options LONGTEXT DEFAULT NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_by BIGINT UNSIGNED DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY name (name),
            KEY created_by (created_by),
            KEY created_at (created_at)
        ) {$this->charset_collate};"
        );
    }

    /**
     * Create wp_pifwc_media_cache table.
     */
    private function create_media_cache_table(): void {
        $table_name = $this->wpdb->prefix . 'pifwc_media_cache';

        dbDelta(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "CREATE TABLE {$table_name} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            url VARCHAR(2048) NOT NULL,
            attachment_id BIGINT UNSIGNED DEFAULT NULL,
            status VARCHAR(50) NOT NULL DEFAULT \'pending\',
            last_checked DATETIME DEFAULT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY attachment_id (attachment_id),
            KEY status (status),
            KEY url (url(191))
        ) {$this->charset_collate};"
        );
    }

    /**
     * Create wp_pifwc_delta_cache table.
     */
    private function create_delta_cache_table(): void {
        $table_name = $this->wpdb->prefix . 'pifwc_delta_cache';

        dbDelta(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "CREATE TABLE {$table_name} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            profile_id BIGINT UNSIGNED NOT NULL,
            record_key VARCHAR(255) NOT NULL,
            record_hash VARCHAR(64) NOT NULL,
            last_modified VARCHAR(100) DEFAULT NULL,
            last_imported_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY profile_record (profile_id, record_key),
            KEY profile_id (profile_id),
            KEY record_hash (record_hash)
        ) {$this->charset_collate};"
        );
    }

    /**
     * Get import jobs table name.
     */
    public function get_jobs_table(): string {
        return $this->wpdb->prefix . 'pifwc_import_jobs';
    }

    /**
     * Get import history table name.
     */
    public function get_history_table(): string {
        return $this->wpdb->prefix . 'pifwc_import_history';
    }

    /**
     * Get import logs table name.
     */
    public function get_logs_table(): string {
        return $this->wpdb->prefix . 'pifwc_import_logs';
    }

    /**
     * Get import profiles table name.
     */
    public function get_profiles_table(): string {
        return $this->wpdb->prefix . 'pifwc_import_profiles';
    }

    /**
     * Get media cache table name.
     */
    public function get_media_cache_table(): string {
        return $this->wpdb->prefix . 'pifwc_media_cache';
    }

    /**
     * Get delta cache table name.
     */
    public function get_delta_cache_table(): string {
        return $this->wpdb->prefix . 'pifwc_delta_cache';
    }
}
