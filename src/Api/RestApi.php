<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Api;

use BadamSoft\ProductImporterForWooCommerce\Core\Plugin;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class RestApi {
    public const NAMESPACE = 'pifwc/v1';

    private Plugin $plugin;

    public function __construct( Plugin $plugin ) {
        $this->plugin = $plugin;
    }

    /**
     * Register REST API routes.
     */
    public function register_routes(): void {
        register_rest_route(
            self::NAMESPACE,
            '/health',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_health' ],
                'permission_callback' => [ $this, 'check_admin_permission' ],
            ]
        );
    }

    /**
     * Check if user has admin permission.
     *
     * @return bool
     */
    public function check_admin_permission(): bool {
        return current_user_can( 'manage_woocommerce' );
    }

    /**
     * Health endpoint callback.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_health( WP_REST_Request $request ): WP_REST_Response {
        $db_status = $this->plugin->get_database_status();

        $memory_limit = '';
        if ( defined( 'WP_MEMORY_LIMIT' ) && is_string( WP_MEMORY_LIMIT ) && WP_MEMORY_LIMIT !== '' ) {
            $memory_limit = WP_MEMORY_LIMIT;
        } else {
            $ini_limit = ini_get( 'memory_limit' );
            $memory_limit = is_string( $ini_limit ) ? $ini_limit : '';
        }

        $data = [
            'plugin'   => 'Product Importer for WooCommerce',
            'version'  => PIFWC_VERSION,
            'php'      => PHP_VERSION,
            'wp'       => get_bloginfo( 'version' ),
            'wc'       => defined( 'WC_VERSION' ) ? WC_VERSION : 'N/A',
            'memory_limit' => $memory_limit,
            'database' => $db_status,
            'time'     => current_time( 'mysql' ),
        ];

        return $this->success_response( $data );
    }

    /**
     * Create a success response.
     *
     * @param mixed $data Response data.
     * @return WP_REST_Response
     */
    protected function success_response( $data ): WP_REST_Response {
        $response = new WP_REST_Response(
            [
                'status' => 'success',
                'data'   => $data,
                'errors' => [],
            ],
            200
        );
        
        return $this->add_no_cache_headers( $response );
    }

    /**
     * Create an error response.
     *
     * @param string $message Error message.
     * @param int    $code    HTTP status code.
     * @param array  $errors  Additional error details.
     * @return WP_REST_Response
     */
    protected function error_response( string $message, int $code = 400, array $errors = [] ): WP_REST_Response {
        $response = new WP_REST_Response(
            [
                'status' => 'error',
                'data'   => null,
                'errors' => array_merge( [ $message ], $errors ),
            ],
            $code
        );
        
        return $this->add_no_cache_headers( $response );
    }

    /**
     * Add comprehensive no-cache headers to prevent aggressive caching on shared hosting.
     * 
     * This prevents issues with:
     * - LiteSpeed Cache (Hostinger, NameCheap)
     * - NGINX caching (SiteGround, Bluehost)
     * - Cloudflare and other CDNs
     * - Browser caching with If-Modified-Since
     *
     * @param WP_REST_Response $response Response object.
     * @return WP_REST_Response
     */
    private function add_no_cache_headers( WP_REST_Response $response ): WP_REST_Response {
        $response->header( 'Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, private' );
        $response->header( 'Pragma', 'no-cache' );
        $response->header( 'Expires', '0' );
        $response->header( 'X-Accel-Expires', '0' );
        $response->header( 'Last-Modified', gmdate( 'D, d M Y H:i:s' ) . ' GMT' );
        
        return $response;
    }
}
