<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Api;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Controller reads/writes plugin-owned custom profile table.

use BadamSoft\ProductImporterForWooCommerce\FileParser\FileParser;
use BadamSoft\ProductImporterForWooCommerce\FileParser\FileStorage;
use BadamSoft\ProductImporterForWooCommerce\Mapper\Mapper;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class MappingController {
    public const NAMESPACE = 'pifwc/v1';

    private FileStorage $file_storage;
    private FileParser $file_parser;
    private Mapper $mapper;
    private \wpdb $wpdb;

    private function cache_group(): string {
        return 'pifwc_mapping';
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

    public function __construct() {
        global $wpdb;
        $this->wpdb         = $wpdb;
        $this->file_storage = new FileStorage();
        $this->file_parser  = new FileParser();
        $this->mapper       = new Mapper();
    }

    /**
     * Register REST API routes.
     */
    public function register_routes(): void {
        // Get product fields tree.
        register_rest_route(
            self::NAMESPACE,
            '/mapping/fields',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_fields' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );

        // Auto-map columns to fields.
        register_rest_route(
            self::NAMESPACE,
            '/mapping/auto',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'auto_map' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'file_id' => [
                        'required'          => true,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ]
        );

        // Save mapping as profile.
        register_rest_route(
            self::NAMESPACE,
            '/mapping/save',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'save_mapping' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'name' => [
                        'required'          => true,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'mapping' => [
                        'required' => true,
                        'type'     => 'object',
                    ],
                    'source' => [
                        'required'          => false,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ]
        );

        // Get mapping profile by ID.
        register_rest_route(
            self::NAMESPACE,
            '/mapping/(?P<profile_id>\d+)',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_mapping' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'profile_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // Update mapping profile.
        register_rest_route(
            self::NAMESPACE,
            '/mapping/(?P<profile_id>\d+)',
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_mapping' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'profile_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'name' => [
                        'required'          => false,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'mapping' => [
                        'required' => false,
                        'type'     => 'object',
                    ],
                ],
            ]
        );

        // Delete mapping profile.
        register_rest_route(
            self::NAMESPACE,
            '/mapping/(?P<profile_id>\d+)',
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete_mapping' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'profile_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // List all mapping profiles.
        register_rest_route(
            self::NAMESPACE,
            '/mapping/profiles',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'list_profiles' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );

        // Preview mapped data.
        register_rest_route(
            self::NAMESPACE,
            '/mapping/preview',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'preview_mapping' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'file_id' => [
                        'required'          => true,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'mapping' => [
                        'required' => true,
                        'type'     => 'object',
                    ],
                    'limit' => [
                        'required'          => false,
                        'type'              => 'integer',
                        'default'           => 10,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );
    }

    /**
     * Check if user has permission.
     *
     * @return bool
     */
    public function check_permission(): bool {
        return current_user_can( 'manage_woocommerce' );
    }

    /**
     * Get product fields tree.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_fields( WP_REST_Request $request ): WP_REST_Response {
        return $this->success_response( [
            'fields'      => $this->mapper->get_product_fields(),
            'flat_fields' => $this->mapper->get_flat_product_fields(),
        ] );
    }

    /**
     * Auto-map file columns to product fields.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function auto_map( WP_REST_Request $request ): WP_REST_Response {
        $file_id = $request->get_param( 'file_id' );

        $file_path = $this->file_storage->get_file_path( $file_id );
        if ( null === $file_path ) {
            return $this->error_response(
                __( 'File not found or expired.', 'badamsoft-product-importer-for-woocommerce' ),
                404
            );
        }

        // Get file preview to extract headers.
        $preview = $this->file_parser->get_preview( $file_path, 1 );
        if ( null !== $preview['error'] ) {
            return $this->error_response( $preview['error'], 400 );
        }

        $headers = $preview['headers'];
        $mapping = $this->mapper->auto_map( $headers );

        // Count mapped vs unmapped.
        $mapped_count   = 0;
        $unmapped_count = 0;
        foreach ( $mapping['columns'] as $column => $config ) {
            if ( ! empty( $config['target'] ) ) {
                $mapped_count++;
            } else {
                $unmapped_count++;
            }
        }

        return $this->success_response( [
            'mapping'        => $mapping,
            'headers'        => $headers,
            'mapped_count'   => $mapped_count,
            'unmapped_count' => $unmapped_count,
            'total_columns'  => count( $headers ),
        ] );
    }

    /**
     * Save mapping as profile.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function save_mapping( WP_REST_Request $request ): WP_REST_Response {
        $name    = $request->get_param( 'name' );
        $mapping = $request->get_param( 'mapping' );
        $source  = $request->get_param( 'source' );

        if ( empty( $name ) ) {
            return $this->error_response(
                __( 'Profile name is required.', 'badamsoft-product-importer-for-woocommerce' ),
                400
            );
        }

        // Validate mapping.
        $validation = $this->mapper->validate_mapping( $mapping );
        if ( ! $validation['valid'] ) {
            return $this->error_response(
                __( 'Invalid mapping configuration.', 'badamsoft-product-importer-for-woocommerce' ),
                400,
                $validation['errors']
            );
        }

        $table_name = function_exists( 'esc_sql' ) ? esc_sql( $this->wpdb->prefix . 'pifwc_import_profiles' ) : ( $this->wpdb->prefix . 'pifwc_import_profiles' );

        $result = $this->wpdb->insert(
            $table_name,
            [
                'name'       => $name,
                'source'     => $source,
                'mapping'    => wp_json_encode( $mapping ),
                'created_by' => get_current_user_id(),
                'created_at' => current_time( 'mysql' ),
                'updated_at' => current_time( 'mysql' ),
            ],
            [ '%s', '%s', '%s', '%d', '%s', '%s' ]
        );

        if ( false === $result ) {
            return $this->error_response(
                __( 'Failed to save profile.', 'badamsoft-product-importer-for-woocommerce' ),
                500
            );
        }

        $this->cache_bump_version();

        $profile_id = $this->wpdb->insert_id;

        return $this->success_response( [
            'profile_id' => $profile_id,
            'name'       => $name,
            'message'    => __( 'Profile saved successfully.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * Get mapping profile by ID.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_mapping( WP_REST_Request $request ): WP_REST_Response {
        $profile_id = $request->get_param( 'profile_id' );

        $wpdb = $this->wpdb;
        $table_name = function_exists( 'esc_sql' ) ? esc_sql( $wpdb->prefix . 'pifwc_import_profiles' ) : ( $wpdb->prefix . 'pifwc_import_profiles' );

        $cache_key = 'get_mapping:' . (string) $profile_id;
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $this->success_response( $cached );
        }

        $profile = $wpdb->get_row(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table_name} WHERE id = %d",
                $profile_id
            ),
            ARRAY_A
        );

        if ( null === $profile ) {
            return $this->error_response(
                __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ),
                404
            );
        }

        $profile['mapping'] = json_decode( $profile['mapping'], true );
        $profile['filters'] = json_decode( $profile['filters'], true );

        $this->cache_set( $cache_key, $profile );

        return $this->success_response( $profile );
    }

    /**
     * Update mapping profile.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function update_mapping( WP_REST_Request $request ): WP_REST_Response {
        $profile_id = $request->get_param( 'profile_id' );
        $name       = $request->get_param( 'name' );
        $mapping    = $request->get_param( 'mapping' );

        $wpdb = $this->wpdb;
        $table_name = function_exists( 'esc_sql' ) ? esc_sql( $wpdb->prefix . 'pifwc_import_profiles' ) : ( $wpdb->prefix . 'pifwc_import_profiles' );

        // Check if profile exists.
        $exists = $wpdb->get_var(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT id FROM {$table_name} WHERE id = %d",
                $profile_id
            )
        );

        if ( null === $exists ) {
            return $this->error_response(
                __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ),
                404
            );
        }

        $update_data   = [ 'updated_at' => current_time( 'mysql' ) ];
        $update_format = [ '%s' ];

        if ( ! empty( $name ) ) {
            $update_data['name'] = $name;
            $update_format[]     = '%s';
        }

        if ( ! empty( $mapping ) ) {
            // Validate mapping.
            $validation = $this->mapper->validate_mapping( $mapping );
            if ( ! $validation['valid'] ) {
                return $this->error_response(
                    __( 'Invalid mapping configuration.', 'badamsoft-product-importer-for-woocommerce' ),
                    400,
                    $validation['errors']
                );
            }
            $update_data['mapping'] = wp_json_encode( $mapping );
            $update_format[]        = '%s';
        }

        $result = $wpdb->update(
            $table_name,
            $update_data,
            [ 'id' => $profile_id ],
            $update_format,
            [ '%d' ]
        );

        if ( false === $result ) {
            return $this->error_response(
                __( 'Failed to update profile.', 'badamsoft-product-importer-for-woocommerce' ),
                500
            );
        }

        $this->cache_bump_version();

        return $this->success_response( [
            'profile_id' => $profile_id,
            'message'    => __( 'Profile updated successfully.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * Delete mapping profile.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function delete_mapping( WP_REST_Request $request ): WP_REST_Response {
        $profile_id = $request->get_param( 'profile_id' );

        $wpdb = $this->wpdb;
        $table_name = function_exists( 'esc_sql' ) ? esc_sql( $wpdb->prefix . 'pifwc_import_profiles' ) : ( $wpdb->prefix . 'pifwc_import_profiles' );

        $result = $wpdb->delete(
            $table_name,
            [ 'id' => $profile_id ],
            [ '%d' ]
        );

        if ( false === $result ) {
            return $this->error_response(
                __( 'Failed to delete profile.', 'badamsoft-product-importer-for-woocommerce' ),
                500
            );
        }

        if ( 0 === $result ) {
            return $this->error_response(
                __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ),
                404
            );
        }

        $this->cache_bump_version();

        return $this->success_response( [
            'message' => __( 'Profile deleted successfully.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * List all mapping profiles.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function list_profiles( WP_REST_Request $request ): WP_REST_Response {
        $wpdb = $this->wpdb;
        $table_name = function_exists( 'esc_sql' ) ? esc_sql( $wpdb->prefix . 'pifwc_import_profiles' ) : ( $wpdb->prefix . 'pifwc_import_profiles' );

        $cache_key = 'list_profiles';
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $this->success_response( [
                'profiles' => $cached,
                'total'    => count( $cached ),
            ] );
        }

        $profiles = $wpdb->get_results(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "SELECT id, name, source, created_by, created_at, updated_at FROM {$table_name} ORDER BY updated_at DESC",
            ARRAY_A
        );

        if ( is_array( $profiles ) ) {
            $this->cache_set( $cache_key, $profiles );
        }

        return $this->success_response( [
            'profiles' => $profiles,
            'total'    => count( $profiles ),
        ] );
    }

    /**
     * Preview mapped data.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function preview_mapping( WP_REST_Request $request ): WP_REST_Response {
        $file_id = $request->get_param( 'file_id' );
        $mapping = $request->get_param( 'mapping' );
        $limit   = $request->get_param( 'limit' );

        $file_path = $this->file_storage->get_file_path( $file_id );
        if ( null === $file_path ) {
            return $this->error_response(
                __( 'File not found or expired.', 'badamsoft-product-importer-for-woocommerce' ),
                404
            );
        }

        // Validate mapping.
        $validation = $this->mapper->validate_mapping( $mapping );
        if ( ! $validation['valid'] ) {
            return $this->error_response(
                __( 'Invalid mapping configuration.', 'badamsoft-product-importer-for-woocommerce' ),
                400,
                $validation['errors']
            );
        }

        // Get file data.
        $preview = $this->file_parser->get_preview( $file_path, $limit + 1 );
        if ( null !== $preview['error'] ) {
            return $this->error_response( $preview['error'], 400 );
        }

        // Convert rows to associative arrays using headers.
        $headers = $preview['headers'];
        $rows    = [];
        foreach ( $preview['rows'] as $row ) {
            $assoc_row = [];
            foreach ( $headers as $index => $header ) {
                $assoc_row[ $header ] = $row[ $index ] ?? null;
            }
            $rows[] = $assoc_row;
        }

        // Apply mapping to rows.
        $products = $this->mapper->preview_mapping( $rows, $mapping, $limit );

        return $this->success_response( [
            'products'    => $products,
            'total'       => count( $products ),
            'mapping'     => $mapping,
            'field_labels' => $this->mapper->get_flat_product_fields(),
        ] );
    }

    /**
     * Create a success response.
     *
     * @param mixed $data Response data.
     * @return WP_REST_Response
     */
    private function success_response( $data ): WP_REST_Response {
        $response = new WP_REST_Response(
            [
                'status' => 'success',
                'data'   => $data,
                'errors' => [],
            ],
            200
        );
        
        return ResponseHelper::add_no_cache_headers( $response );
    }

    /**
     * Create an error response.
     *
     * @param string $message Error message.
     * @param int    $code    HTTP status code.
     * @param array  $errors  Additional error details.
     * @return WP_REST_Response
     */
    private function error_response( string $message, int $code = 400, array $errors = [] ): WP_REST_Response {
        $response = new WP_REST_Response(
            [
                'status' => 'error',
                'data'   => null,
                'errors' => array_merge( [ $message ], $errors ),
            ],
            $code
        );
        
        return ResponseHelper::add_no_cache_headers( $response );
    }
}
