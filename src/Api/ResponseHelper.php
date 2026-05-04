<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Api;

use WP_REST_Response;

/**
 * Helper class for adding anti-cache headers to REST API responses.
 * 
 * Prevents aggressive caching on shared hosting providers:
 * - LiteSpeed Cache (Hostinger, NameCheap, A2 Hosting)
 * - NGINX FastCGI cache (SiteGround, Bluehost, DreamHost)
 * - Varnish cache (WP Engine, Kinsta)
 * - Cloudflare and other CDNs
 * - Browser caching with If-Modified-Since
 */
class ResponseHelper {
    /**
     * Add comprehensive no-cache headers to prevent aggressive caching.
     *
     * @param WP_REST_Response $response Response object.
     * @return WP_REST_Response
     */
    public static function add_no_cache_headers( WP_REST_Response $response ): WP_REST_Response {
        // Standard HTTP/1.1 cache control
        $response->header( 'Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, private' );
        
        // HTTP/1.0 backward compatibility
        $response->header( 'Pragma', 'no-cache' );
        
        // Proxy cache control
        $response->header( 'Expires', '0' );
        
        // NGINX FastCGI cache control
        $response->header( 'X-Accel-Expires', '0' );
        
        // Prevent 304 Not Modified responses by always sending current timestamp
        $response->header( 'Last-Modified', gmdate( 'D, d M Y H:i:s' ) . ' GMT' );
        
        // Vary header to prevent CDN caching based on different request headers
        $response->header( 'Vary', 'Accept-Encoding, Cookie' );
        
        return $response;
    }
}
