<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Api;

use BadamSoft\ProductImporterForWooCommerce\FileParser\FileParser;
use BadamSoft\ProductImporterForWooCommerce\FileParser\FileStorage;
use BadamSoft\ProductImporterForWooCommerce\FileParser\ParserFactory;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class UploadController {
    public const NAMESPACE = 'pifwc/v1';

    private FileStorage $file_storage;
    private FileParser $file_parser;

    public function __construct() {
        $this->file_storage = new FileStorage();
        $this->file_parser  = new FileParser();
    }

    /**
     * Register REST API routes.
     */
    public function register_routes(): void {
        register_rest_route(
            self::NAMESPACE,
            '/upload',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'handle_upload' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/fetch',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'handle_fetch' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/fetch-api',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'handle_fetch_api' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/preview',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'handle_preview' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'file_id' => [
                        'required'          => true,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'format' => [
                        'required'          => false,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'items_path' => [
                        'required'          => false,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'item_xpath' => [
                        'required'          => false,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'rows' => [
                        'required'          => false,
                        'type'              => 'integer',
                        'default'           => 10,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/uploaded-files',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_uploaded_files' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'limit' => [
                        'required'          => false,
                        'type'              => 'integer',
                        'default'           => 50,
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
     * Handle file upload.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function handle_upload( WP_REST_Request $request ): WP_REST_Response {
        // Debug logging
        $files = $request->get_file_params();

        if ( empty( $files['file'] ) ) {
            return $this->error_response(
                __( 'No file uploaded.', 'badamsoft-product-importer-for-woocommerce' ),
                400
            );
        }

        $file   = $files['file'];
        $result = $this->file_storage->store_upload( $file );

        if ( ! $result['success'] ) {
            return $this->error_response( $result['error'], 400 );
        }

        // Get basic file info.
        $format = $this->file_parser->detect_format( $result['file_path'] );

        return $this->success_response( [
            'file_id'       => $result['file_id'],
            'original_name' => $result['original_name'],
            'format'        => $format,
            'message'       => __( 'File uploaded successfully.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * Handle URL fetch.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */ 
     public function handle_fetch( WP_REST_Request $request ): WP_REST_Response {
         $filtered = apply_filters( 'pifwc_rest_fetch', null, $request );
         if ( $filtered instanceof WP_REST_Response ) {
             return ResponseHelper::add_no_cache_headers( $filtered );
         }
         if ( is_array( $filtered ) ) {
             return $this->success_response( $filtered );
         }

         return $this->error_response(
             __( 'This remote source type is not supported by the active plugin configuration.', 'badamsoft-product-importer-for-woocommerce' ),
             403
         );
     }

    /**
     * Handle API fetch with authentication.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function handle_fetch_api( WP_REST_Request $request ): WP_REST_Response {
        $filtered = apply_filters( 'pifwc_rest_fetch_api', null, $request );
        if ( $filtered instanceof WP_REST_Response ) {
            return ResponseHelper::add_no_cache_headers( $filtered );
        }
        if ( is_array( $filtered ) ) {
            return $this->success_response( $filtered );
        }

        return $this->error_response(
            __( 'This remote source type is not supported by the active plugin configuration.', 'badamsoft-product-importer-for-woocommerce' ),
            403
        );
    }

    /**
     * Handle file preview.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function handle_preview( WP_REST_Request $request ): WP_REST_Response {
        $file_id = $request->get_param( 'file_id' );
        $format_override = $request->get_param( 'format' );
        $items_path = $request->get_param( 'items_path' );
        $item_xpath = $request->get_param( 'item_xpath' );
        $rows    = $request->get_param( 'rows' );

        if ( empty( $file_id ) ) {
            return $this->error_response(
                __( 'File ID is required.', 'badamsoft-product-importer-for-woocommerce' ),
                400
            );
        }

        $file_path = $this->file_storage->get_file_path( $file_id );

        if ( null === $file_path ) {
            return $this->error_response(
                __( 'File not found or expired.', 'badamsoft-product-importer-for-woocommerce' ),
                404
            );
        }

        if ( is_string( $format_override ) && '' !== trim( $format_override ) ) {
            $wanted_ext = strtolower( trim( (string) $format_override, " .\t\n\r\0\x0B" ) );
            $current_ext = strtolower( (string) pathinfo( (string) $file_path, PATHINFO_EXTENSION ) );

            if ( '' !== $wanted_ext && $wanted_ext !== $current_ext ) {
                $candidate = trailingslashit( $this->file_storage->get_tmp_dir() ) . $file_id . '.' . $wanted_ext;
                if ( file_exists( $candidate ) ) {
                    $file_path = $candidate;
                }
            }
        }

        // Get file metadata.
        $metadata = $this->file_storage->get_file_metadata( $file_id );

        $parser = null;
        if ( is_string( $format_override ) && $format_override !== '' ) {
            $parser = ParserFactory::create_by_extension( $format_override );
        }
        if ( ! $parser ) {
            $parser = ParserFactory::create( $file_path );
        }
        $full_total_rows = 0;

        if ( ! $parser ) {
            return $this->error_response( __( 'Unsupported file format.', 'badamsoft-product-importer-for-woocommerce' ), 400 );
        }

        $validation = $parser->validate( $file_path );
        if ( ! $validation['valid'] ) {
            return $this->error_response( (string) $validation['error'], 400 );
        }

        if ( ! method_exists( $parser, 'get_import_chunk' ) ) {
            return $this->error_response( __( 'Preview is not available for this format.', 'badamsoft-product-importer-for-woocommerce' ), 400 );
        }

        $preview_rows = max( 1, (int) $rows );
        $state = [];
        if ( is_string( $items_path ) && $items_path !== '' ) {
            $state['items_path'] = $items_path;
        }
        if ( is_string( $item_xpath ) && $item_xpath !== '' ) {
            $state['item_xpath'] = $item_xpath;
        }

        $chunk = $parser->get_import_chunk( $file_path, $preview_rows, $state );
        if ( empty( $chunk['success'] ) ) {
            return $this->error_response( (string) ( $chunk['error'] ?? __( 'Failed to build preview.', 'badamsoft-product-importer-for-woocommerce' ) ), 400 );
        }

        $state = is_array( $chunk['state'] ?? null ) ? ( $chunk['state'] ?? [] ) : [];
        $chunk_rows = is_array( $chunk['rows'] ?? null ) ? ( $chunk['rows'] ?? [] ) : [];

        if ( ! empty( $state['converted_csv'] ) && is_string( $state['converted_csv'] ) ) {
            $csv_parser = new \BadamSoft\ProductImporterForWooCommerce\FileParser\CsvParser();
            $full_total_rows = (int) $csv_parser->count_rows( (string) $state['converted_csv'] );
        } elseif ( method_exists( $parser, 'count_rows' ) ) {
            $full_total_rows = (int) $parser->count_rows( $file_path );
        }

        $headers_sanitized = isset( $state['headers'] ) && is_array( $state['headers'] ) ? ( $state['headers'] ?? [] ) : [];
        $headers_display = isset( $state['original_headers'] ) && is_array( $state['original_headers'] ) ? ( $state['original_headers'] ?? [] ) : $headers_sanitized;

        if ( empty( $headers_display ) && ! empty( $chunk_rows ) && is_array( $chunk_rows[0] ) ) {
            $headers_display = array_keys( $chunk_rows[0] );
        }

        $out_rows = [];
        foreach ( $chunk_rows as $row_assoc ) {
            if ( ! is_array( $row_assoc ) ) {
                continue;
            }
            $row_flat = [];
            foreach ( $headers_display as $h ) {
                $row_flat[] = (string) ( $row_assoc[ $h ] ?? '' );
            }
            $out_rows[] = $row_flat;
        }

        $metadata = $this->file_storage->get_file_metadata( $file_id );
        $original_name = is_array( $metadata ) && ! empty( $metadata['original_name'] )
            ? (string) $metadata['original_name']
            : basename( (string) $file_path );

        return $this->success_response( [
            'file_id'       => $file_id,
            'original_name' => $original_name,
            'format'        => strtolower( (string) pathinfo( (string) $file_path, PATHINFO_EXTENSION ) ),
            'encoding'      => 'UTF-8',
            'delimiter'     => null,
            'headers'       => $headers_display,
            'rows'          => $out_rows,
            'total_rows'    => $full_total_rows > 0 ? $full_total_rows : count( $out_rows ),
            'total_preview_rows' => count( $out_rows ),
            'display_rows'  => count( $out_rows ),
        ] );
    }

    /**
     * Get list of uploaded files.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_uploaded_files( WP_REST_Request $request ): WP_REST_Response {
        $limit = $request->get_param( 'limit' ) ?? 50;
        $files = $this->file_storage->get_uploaded_files( $limit );

        return $this->success_response( [ 'files' => $files ] );
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
