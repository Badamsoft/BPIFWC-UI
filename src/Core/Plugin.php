<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Core;
use BadamSoft\ProductImporterForWooCommerce\Admin\AdminPage;
use BadamSoft\ProductImporterForWooCommerce\Api\RestApi;
use BadamSoft\ProductImporterForWooCommerce\Api\UploadController;
use BadamSoft\ProductImporterForWooCommerce\Api\MappingController;
use BadamSoft\ProductImporterForWooCommerce\Api\ImportController;
use BadamSoft\ProductImporterForWooCommerce\Api\ProfilesController;
use BadamSoft\ProductImporterForWooCommerce\Api\SettingsController;
use BadamSoft\ProductImporterForWooCommerce\Database\Installer;
use BadamSoft\ProductImporterForWooCommerce\Logging\Logger;
use BadamSoft\ProductImporterForWooCommerce\Repository\ProfilesRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\JobsRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\HistoryRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\LogsRepository;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Plugin {
    private static ?self $instance = null;

    private const CRON_HOOK_MAINTENANCE = 'pifwc_maintenance_cron';
    private const CRON_HOOK_DAILY_REPORT = 'pifwc_daily_report_cron';

    private string $plugin_file;
    private string $plugin_url;
    private string $plugin_path;
    private AdminPage $admin_page;
    private RestApi $rest_api;
    private UploadController $upload_controller;
    private MappingController $mapping_controller;
    private ImportController $import_controller;
    private ProfilesController $profiles_controller;
    private SettingsController $settings_controller;
    private Logger $logger;
    private ProfilesRepository $profiles_repository;
    private JobsRepository $jobs_repository;
    private HistoryRepository $history_repository;
    private LogsRepository $logs_repository;

    private function __construct( string $plugin_file ) {
        $this->plugin_file = $plugin_file;
        $this->plugin_path = plugin_dir_path( $plugin_file );
        $this->plugin_url  = plugin_dir_url( $plugin_file );

        $this->bootstrap_core_services();
        $this->register_hooks();
        
        // Allow PRO add-on to initialize after core services are ready.
        do_action( 'pifwc_plugin_loaded', $this );
    }

    /**
     * Bootstrap core plugin services.
     */
    private function bootstrap_core_services(): void {
        global $wpdb;

        // Initialize repositories.
        $this->profiles_repository = new ProfilesRepository( $wpdb );
        $this->jobs_repository     = new JobsRepository( $wpdb );
        $this->history_repository  = new HistoryRepository( $wpdb );
        $this->logs_repository     = new LogsRepository( $wpdb );

        // Initialize core services.
        $this->logger             = new Logger( $wpdb );
        $this->admin_page         = new AdminPage( $this );
        $this->rest_api           = new RestApi( $this );
        $this->upload_controller  = new UploadController();
        $this->mapping_controller = new MappingController();
        $this->import_controller   = new ImportController(
            $this->jobs_repository,
            $this->history_repository,
            $this->logs_repository,
            $this->profiles_repository
        );
        $this->profiles_controller = new ProfilesController(
            $this->profiles_repository,
            $this->jobs_repository
        );
        $this->settings_controller = new SettingsController();
    }

    /**
     * Register WordPress hooks and actions.
     */
    private function register_hooks(): void {
        add_action( 'init', [ $this, 'maybe_upgrade_database' ] );
        add_action( 'init', [ $this, 'ensure_scheduled_events' ] );
        add_action( 'admin_menu', [ $this->admin_page, 'register_menu_page' ] );
        add_action( 'admin_enqueue_scripts', [ $this->admin_page, 'enqueue_admin_assets' ] );
        add_action( 'rest_api_init', [ $this->rest_api, 'register_routes' ] );
        
        // Allow REST API authentication for logged-in users
        add_filter( 'rest_authentication_errors', [ $this, 'rest_authentication_errors' ], 100 );
        add_filter( 'pifwc_skip_async_runner', [ $this, 'filter_skip_async_runner' ] );
        add_action( 'rest_api_init', [ $this->upload_controller, 'register_routes' ] );
        add_action( 'rest_api_init', [ $this->mapping_controller, 'register_routes' ] );
        add_action( 'rest_api_init', [ $this->import_controller, 'register_routes' ] );
        add_action( 'rest_api_init', [ $this->profiles_controller, 'register_routes' ] );
        add_action( 'rest_api_init', [ $this->settings_controller, 'register_routes' ] );
        add_action( 'pifwc_process_import_job', [ $this->import_controller, 'handle_process_import_job' ], 10, 2 );
        
        // Allow PRO add-on to register additional REST controllers.
        add_action( 'init', [ $this, 'register_pro_rest_controllers' ] );
        

        add_action( self::CRON_HOOK_MAINTENANCE, [ $this, 'run_maintenance' ] );
        add_action( self::CRON_HOOK_DAILY_REPORT, [ $this, 'send_daily_report' ] );
    }

    public function register_pro_rest_controllers(): void {
        do_action( 'pifwc_register_rest_controllers' );
    }

    /**
     * Bootstrap the plugin singleton and register activation hook.
     *
     * @param string $plugin_file Absolute path to the main plugin file.
     */
    public static function init( string $plugin_file ): void {
        if ( null === self::$instance ) {
            self::$instance = new self( $plugin_file );
            register_activation_hook( $plugin_file, [ self::$instance, 'activate' ] );
            register_deactivation_hook( $plugin_file, [ self::$instance, 'deactivate' ] );
        }
    }

    /**
     * Get the current plugin singleton instance.
     *
     * @return self|null
     */
    public static function instance(): ?self {
        return self::$instance;
    }

    /**
     * Plugin activation handler.
     */
    public function activate(): void {
        global $wpdb;

        $installer = new Installer( $wpdb );
        $installer->install();

        // Flush rewrite rules for REST API.
        flush_rewrite_rules();

        $this->ensure_scheduled_events();
    }

    /**
     * Plugin deactivation handler.
     */
    public function deactivate(): void {
        // Cleanup scheduled events if needed.
        if ( function_exists( 'wp_clear_scheduled_hook' ) ) {
            wp_clear_scheduled_hook( self::CRON_HOOK_MAINTENANCE );
            wp_clear_scheduled_hook( self::CRON_HOOK_DAILY_REPORT );
        }
        flush_rewrite_rules();
    }

    public function ensure_scheduled_events(): void {
        if ( ! function_exists( 'wp_next_scheduled' ) || ! function_exists( 'wp_schedule_event' ) ) {
            return;
        }

        $settings = function_exists( 'get_option' ) ? get_option( 'pifwc_settings', [] ) : [];
        $settings = is_array( $settings ) ? $settings : [];

        $debug = is_array( $settings['debug'] ?? null ) ? (array) $settings['debug'] : [];
        $retention_days = isset( $debug['retention_days'] ) ? absint( $debug['retention_days'] ) : 30;
        $retention_days = max( 1, min( 3650, $retention_days ) );

        if ( $retention_days > 0 ) {
            if ( ! wp_next_scheduled( self::CRON_HOOK_MAINTENANCE ) ) {
                wp_schedule_event( time() + 300, 'daily', self::CRON_HOOK_MAINTENANCE );
            }
        }

        $notifications = is_array( $settings['notifications'] ?? null ) ? (array) $settings['notifications'] : [];
        $daily_report = ! empty( $notifications['daily_report'] );

        if ( $daily_report ) {
            if ( ! wp_next_scheduled( self::CRON_HOOK_DAILY_REPORT ) ) {
                wp_schedule_event( time() + 600, 'daily', self::CRON_HOOK_DAILY_REPORT );
            }
        } else {
            if ( function_exists( 'wp_clear_scheduled_hook' ) ) {
                wp_clear_scheduled_hook( self::CRON_HOOK_DAILY_REPORT );
            }
        }
    }

    public function run_maintenance(): void {
        $settings = function_exists( 'get_option' ) ? get_option( 'pifwc_settings', [] ) : [];
        $settings = is_array( $settings ) ? $settings : [];

        $debug = is_array( $settings['debug'] ?? null ) ? (array) $settings['debug'] : [];
        $retention_days = isset( $debug['retention_days'] ) ? absint( $debug['retention_days'] ) : 30;
        $retention_days = max( 1, min( 3650, $retention_days ) );

        $this->logs_repository->delete_old( $retention_days );
        $this->history_repository->delete_old( $retention_days );
    }

    public function send_daily_report(): void {
        if ( ! function_exists( 'wp_mail' ) ) {
            return;
        }

        $settings = function_exists( 'get_option' ) ? get_option( 'pifwc_settings', [] ) : [];
        $settings = is_array( $settings ) ? $settings : [];

        $notifications = is_array( $settings['notifications'] ?? null ) ? (array) $settings['notifications'] : [];
        if ( empty( $notifications['daily_report'] ) ) {
            return;
        }

        $email = isset( $notifications['email'] ) ? sanitize_email( (string) $notifications['email'] ) : '';
        if ( '' === $email && function_exists( 'get_option' ) ) {
            $email = sanitize_email( (string) get_option( 'admin_email', '' ) );
        }
        if ( ! function_exists( 'is_email' ) || ! is_email( $email ) ) {
            return;
        }

        $site = function_exists( 'get_bloginfo' ) ? (string) get_bloginfo( 'name' ) : 'WordPress';

        $stats_1d = $this->history_repository->get_statistics( 1 );
        $errors = $this->history_repository->get_with_errors( 10 );
        $errors_count = is_array( $errors ) ? count( $errors ) : 0;

        $lines = [];
        $lines[] = 'Site: ' . ( function_exists( 'site_url' ) ? (string) site_url() : '' );
        $lines[] = 'Period: last 24h';
        $lines[] = 'Imports: ' . (int) ( $stats_1d['total_imports'] ?? 0 );
        $lines[] = 'Rows: ' . (int) ( $stats_1d['total_rows'] ?? 0 );
        $lines[] = 'Added: ' . (int) ( $stats_1d['total_added'] ?? 0 );
        $lines[] = 'Updated: ' . (int) ( $stats_1d['total_updated'] ?? 0 );
        $lines[] = 'Skipped: ' . (int) ( $stats_1d['total_skipped'] ?? 0 );
        $lines[] = 'Errors: ' . (int) ( $stats_1d['total_errors'] ?? 0 );
        $lines[] = 'Recent errored imports (top 10): ' . $errors_count;

        $subject = sprintf( '[%s] Daily import report', $site );
        wp_mail( $email, $subject, implode( "\n", $lines ) );
    }

    /**
     * Check and upgrade database if needed.
     */
    public function maybe_upgrade_database(): void {
        global $wpdb;
        
        $installer = new Installer( $wpdb );
        $installer->maybe_upgrade();

        $status = $this->get_database_status();
        if ( empty( $status['exists'] ) ) {
            $installer->install();
        }
    }

    /**
     * Get the base plugin URL.
     */
    public function get_plugin_url(): string {
        return $this->plugin_url;
    }

    /**
     * Get the base plugin path on disk.
     */
    public function get_plugin_path(): string {
        return $this->plugin_path;
    }

    /**
     * Get the logger instance.
     */
    public function get_logger(): Logger {
        return $this->logger;
    }

    /**
     * Get the profiles repository instance.
     */
    public function get_profiles_repository(): ProfilesRepository {
        return $this->profiles_repository;
    }

    /**
     * Get the jobs repository instance.
     */
    public function get_jobs_repository(): JobsRepository {
        return $this->jobs_repository;
    }

    /**
     * Get the history repository instance.
     */
    public function get_history_repository(): HistoryRepository {
        return $this->history_repository;
    }

    /**
     * Get the logs repository instance.
     */
    public function get_logs_repository(): LogsRepository {
        return $this->logs_repository;
    }

    /**
     * Check database tables status.
     *
     * @return array{exists: bool, tables: array<string, bool>}
     */
    public function get_database_status(): array {
        global $wpdb;

        if ( function_exists( 'wp_cache_get' ) && function_exists( 'wp_cache_set' ) ) {
            $cached = wp_cache_get( 'db_status', 'pifwc_core' );
            if ( is_array( $cached ) ) {
                return $cached;
            }
        }

        $tables = [
            'import_jobs'     => $wpdb->prefix . 'pifwc_import_jobs',
            'import_history'  => $wpdb->prefix . 'pifwc_import_history',
            'import_logs'     => $wpdb->prefix . 'pifwc_import_logs',
            'import_profiles' => $wpdb->prefix . 'pifwc_import_profiles',
        ];

        $status = [];
        $all_exist = true;

        foreach ( $tables as $key => $table ) {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Required lightweight table existence check during diagnostics.
            $exists = $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $table ) ) === $table;
            $status[ $key ] = $exists;

            if ( ! $exists ) {
                $all_exist = false;
            }
        }

        $result = [
            'exists' => $all_exist,
            'tables' => $status,
        ];

        if ( function_exists( 'wp_cache_set' ) ) {
            wp_cache_set( 'db_status', $result, 'pifwc_core', 30 );
        }

        return $result;
    }

    public function filter_skip_async_runner( bool $skip ): bool {
        if ( $skip ) {
            return true;
        }

        return $this->import_controller->is_fast_manual_flag_active();
    }

    /**
     * Allow REST API authentication for logged-in users.
     *
     * @param WP_Error|null|bool $result Error from another authentication handler, null if we should handle it, or true if authentication succeeded.
     * @return WP_Error|null|bool
     */
    public function rest_authentication_errors( $result ) {
        // Don't interfere if another handler has already handled authentication
        if ( true === $result || is_wp_error( $result ) ) {
            return $result;
        }

        // If user is logged in, allow the request
        if ( is_user_logged_in() ) {
            return true;
        }

        // Pass through to other handlers
        return $result;
    }

}
