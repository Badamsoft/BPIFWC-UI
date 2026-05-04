<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Api;

use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class SettingsController {
    public const NAMESPACE = 'pifwc/v1';
    public const OPTION_KEY = 'pifwc_settings';

    /**
     * Register REST API routes.
     */
    public function register_routes(): void {
        register_rest_route(
            self::NAMESPACE,
            '/settings',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_settings' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/settings',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'save_settings' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );
    }

    public function check_permission(): bool {
        return current_user_can( 'manage_woocommerce' );
    }

    private function defaults(): array {
        return [
            'general' => [
                'batch_size'      => 50,
                'timeout_seconds' => 300,
                'memory_limit_mb' => 512,
                'encoding'        => 'UTF-8',
                'currency'        => 'USD',
            ],
            'logic' => [
                'unique_identifier'    => 'SKU',
                'custom_meta_key'      => '',
                'conflict_behavior'    => 'update',
                'error_behavior'       => 'continue_log',
                'auto_publish'         => true,
                'update_only_draft'    => false,
                'delete_old_images'    => true,
            ],
            'performance' => [
                'async_mode'              => true,
                'use_queues'              => true,
                'wp_background_processing' => true,
                'delay_ms'                => 100,
            ],
            'notifications' => [
                'email'             => '',
                'email_on_complete' => true,
                'email_on_errors'   => true,
                'daily_report'      => false,
            ],
            'debug' => [
                'log_level'          => 'standard',
                'debug_mode'         => false,
                'save_logs_to_files' => true,
                'retention_days'     => 30,
            ],
            'scheduling' => [
                'error_threshold_percent' => 10,
            ],
        ];
    }

    private function normalize( array $input ): array {
        $defaults = $this->defaults();

        $allowed_unique_identifier = [ 'SKU', 'Product ID', 'EAN', 'GTIN', 'Custom Meta Field' ];
        $allowed_conflict_behavior = [ 'update', 'skip', 'duplicate', 'confirm' ];
        $allowed_error_behavior = [ 'continue_log', 'stop', 'email_continue' ];
        $allowed_log_level = [ 'minimal', 'standard', 'verbose', 'debug' ];

        $general = is_array( $input['general'] ?? null ) ? (array) $input['general'] : [];
        $logic = is_array( $input['logic'] ?? null ) ? (array) $input['logic'] : [];
        $performance = is_array( $input['performance'] ?? null ) ? (array) $input['performance'] : [];
        $notifications = is_array( $input['notifications'] ?? null ) ? (array) $input['notifications'] : [];
        $debug = is_array( $input['debug'] ?? null ) ? (array) $input['debug'] : [];
        $scheduling = is_array( $input['scheduling'] ?? null ) ? (array) $input['scheduling'] : [];

        $batch_size = isset( $general['batch_size'] ) ? absint( $general['batch_size'] ) : (int) $defaults['general']['batch_size'];
        $timeout_seconds = isset( $general['timeout_seconds'] ) ? absint( $general['timeout_seconds'] ) : (int) $defaults['general']['timeout_seconds'];
        $memory_limit_mb = isset( $general['memory_limit_mb'] ) ? absint( $general['memory_limit_mb'] ) : (int) $defaults['general']['memory_limit_mb'];
        $encoding = isset( $general['encoding'] ) ? sanitize_text_field( (string) $general['encoding'] ) : (string) $defaults['general']['encoding'];
        $currency = isset( $general['currency'] ) ? sanitize_text_field( (string) $general['currency'] ) : (string) $defaults['general']['currency'];

        $unique_identifier = isset( $logic['unique_identifier'] ) ? sanitize_text_field( (string) $logic['unique_identifier'] ) : (string) $defaults['logic']['unique_identifier'];
        if ( ! in_array( $unique_identifier, $allowed_unique_identifier, true ) ) {
            $unique_identifier = (string) $defaults['logic']['unique_identifier'];
        }

        $custom_meta_key = isset( $logic['custom_meta_key'] ) ? sanitize_text_field( (string) $logic['custom_meta_key'] ) : (string) $defaults['logic']['custom_meta_key'];
        $custom_meta_key = trim( $custom_meta_key );
        if ( $custom_meta_key !== '' ) {
            if ( strpos( $custom_meta_key, ' ' ) !== false ) {
                $custom_meta_key = '';
            }
            if ( strlen( $custom_meta_key ) > 191 ) {
                $custom_meta_key = substr( $custom_meta_key, 0, 191 );
            }
        }

        $conflict_behavior = isset( $logic['conflict_behavior'] ) ? sanitize_text_field( (string) $logic['conflict_behavior'] ) : (string) $defaults['logic']['conflict_behavior'];
        if ( ! in_array( $conflict_behavior, $allowed_conflict_behavior, true ) ) {
            $conflict_behavior = (string) $defaults['logic']['conflict_behavior'];
        }

        $error_behavior = isset( $logic['error_behavior'] ) ? sanitize_text_field( (string) $logic['error_behavior'] ) : (string) $defaults['logic']['error_behavior'];
        if ( ! in_array( $error_behavior, $allowed_error_behavior, true ) ) {
            $error_behavior = (string) $defaults['logic']['error_behavior'];
        }
        $auto_publish = array_key_exists( 'auto_publish', $logic ) ? (bool) $logic['auto_publish'] : (bool) $defaults['logic']['auto_publish'];
        $update_only_draft = array_key_exists( 'update_only_draft', $logic ) ? (bool) $logic['update_only_draft'] : (bool) $defaults['logic']['update_only_draft'];
        $delete_old_images = array_key_exists( 'delete_old_images', $logic ) ? (bool) $logic['delete_old_images'] : (bool) $defaults['logic']['delete_old_images'];

        $async_mode = array_key_exists( 'async_mode', $performance ) ? (bool) $performance['async_mode'] : (bool) $defaults['performance']['async_mode'];
        $use_queues = array_key_exists( 'use_queues', $performance ) ? (bool) $performance['use_queues'] : (bool) $defaults['performance']['use_queues'];
        $wp_background_processing = array_key_exists( 'wp_background_processing', $performance ) ? (bool) $performance['wp_background_processing'] : (bool) $defaults['performance']['wp_background_processing'];
        $delay_ms = isset( $performance['delay_ms'] ) ? absint( $performance['delay_ms'] ) : (int) $defaults['performance']['delay_ms'];

        $email = isset( $notifications['email'] ) ? sanitize_email( (string) $notifications['email'] ) : (string) $defaults['notifications']['email'];
        if ( $email !== '' && ! is_email( $email ) ) {
            $email = '';
        }
        $email_on_complete = array_key_exists( 'email_on_complete', $notifications ) ? (bool) $notifications['email_on_complete'] : (bool) $defaults['notifications']['email_on_complete'];
        $email_on_errors = array_key_exists( 'email_on_errors', $notifications ) ? (bool) $notifications['email_on_errors'] : (bool) $defaults['notifications']['email_on_errors'];
        $daily_report = array_key_exists( 'daily_report', $notifications ) ? (bool) $notifications['daily_report'] : (bool) $defaults['notifications']['daily_report'];

        $log_level = isset( $debug['log_level'] ) ? sanitize_text_field( (string) $debug['log_level'] ) : (string) $defaults['debug']['log_level'];
        if ( ! in_array( $log_level, $allowed_log_level, true ) ) {
            $log_level = (string) $defaults['debug']['log_level'];
        }
        $debug_mode = array_key_exists( 'debug_mode', $debug ) ? (bool) $debug['debug_mode'] : (bool) $defaults['debug']['debug_mode'];
        $save_logs_to_files = array_key_exists( 'save_logs_to_files', $debug ) ? (bool) $debug['save_logs_to_files'] : (bool) $defaults['debug']['save_logs_to_files'];
        $retention_days = isset( $debug['retention_days'] ) ? absint( $debug['retention_days'] ) : (int) $defaults['debug']['retention_days'];

        $error_threshold_percent = isset( $scheduling['error_threshold_percent'] ) ? absint( $scheduling['error_threshold_percent'] ) : (int) $defaults['scheduling']['error_threshold_percent'];

        return [
            'general' => [
                'batch_size'      => max( 1, min( 500, $batch_size ) ),
                'timeout_seconds' => max( 30, min( 7200, $timeout_seconds ) ),
                'memory_limit_mb' => max( 128, min( 4096, $memory_limit_mb ) ),
                'encoding'        => $encoding !== '' ? $encoding : (string) $defaults['general']['encoding'],
                'currency'        => $currency !== '' ? $currency : (string) $defaults['general']['currency'],
            ],
            'logic' => [
                'unique_identifier' => $unique_identifier !== '' ? $unique_identifier : (string) $defaults['logic']['unique_identifier'],
                'custom_meta_key'   => $custom_meta_key,
                'conflict_behavior' => $conflict_behavior !== '' ? $conflict_behavior : (string) $defaults['logic']['conflict_behavior'],
                'error_behavior'    => $error_behavior !== '' ? $error_behavior : (string) $defaults['logic']['error_behavior'],
                'auto_publish'      => $auto_publish,
                'update_only_draft' => $update_only_draft,
                'delete_old_images' => $delete_old_images,
            ],
            'performance' => [
                'async_mode'               => $async_mode,
                'use_queues'               => $use_queues,
                'wp_background_processing' => $wp_background_processing,
                'delay_ms'                 => max( 0, min( 5000, $delay_ms ) ),
            ],
            'notifications' => [
                'email'             => $email,
                'email_on_complete' => $email_on_complete,
                'email_on_errors'   => $email_on_errors,
                'daily_report'      => $daily_report,
            ],
            'debug' => [
                'log_level'          => $log_level !== '' ? $log_level : (string) $defaults['debug']['log_level'],
                'debug_mode'         => $debug_mode,
                'save_logs_to_files' => $save_logs_to_files,
                'retention_days'     => max( 1, min( 365, $retention_days ) ),
            ],
            'scheduling' => [
                'error_threshold_percent' => max( 0, min( 100, $error_threshold_percent ) ),
            ],
        ];
    }

    private function get_stored_settings(): array {
        $raw = get_option( self::OPTION_KEY, [] );
        $raw = is_array( $raw ) ? $raw : [];
        return $this->normalize( $raw );
    }

    public function get_settings( WP_REST_Request $request ): WP_REST_Response {
        $data = $this->get_stored_settings();

        $response = new WP_REST_Response(
            [
                'status' => 'success',
                'data'   => $data,
                'errors' => [],
            ],
            200
        );

        $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
        $response->header( 'Pragma', 'no-cache' );
        return $response;
    }

    public function save_settings( WP_REST_Request $request ): WP_REST_Response {
        $body = $request->get_json_params();
        $payload = is_array( $body['settings'] ?? null ) ? (array) $body['settings'] : ( is_array( $body ) ? (array) $body : [] );

        $settings = $this->normalize( $payload );
        update_option( self::OPTION_KEY, $settings, false );

        $response = new WP_REST_Response(
            [
                'status' => 'success',
                'data'   => $settings,
                'errors' => [],
            ],
            200
        );

        $response->header( 'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0' );
        $response->header( 'Pragma', 'no-cache' );
        return $response;
    }
}
