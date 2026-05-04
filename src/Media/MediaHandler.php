<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Media;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom media cache table operations.

class MediaHandler {
    private \wpdb $wpdb;
    private string $cache_table;

    private int $timeout = 10;
    private int $max_file_size = 10485760; // 10MB
    private array $allowed_types = [ 'image/jpeg', 'image/png', 'image/gif', 'image/webp' ];

    public function __construct() {
        global $wpdb;
        $this->wpdb        = $wpdb;
        $this->cache_table = $wpdb->prefix . 'pifwc_media_cache';
    }

    private function cache_group(): string {
        return 'pifwc_media';
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

    private function cache_set( string $key, $value, int $ttl = 300 ): void {
        if ( ! function_exists( 'wp_cache_set' ) ) {
            return;
        }

        $version = $this->cache_version();
        wp_cache_set( $key . ':' . (string) $version, $value, $this->cache_group(), $ttl );
    }

    /**
     * Process image URL and return attachment ID.
     * Uses cache to avoid duplicate downloads.
     *
     * @param string $url       Image URL.
     * @param int    $post_id   Post ID to attach to.
     * @param array  $options   Options (skip_missing, retry, etc.).
     * @return array Result with attachment_id or error.
     */
    public function process_image( string $url, int $post_id = 0, array $options = [] ): array {
        $url = trim( $url );

        if ( empty( $url ) ) {
            return [
                'success'       => false,
                'error'         => __( 'Empty image URL.', 'badamsoft-product-importer-for-woocommerce' ),
                'attachment_id' => null,
            ];
        }

        // Validate URL.
        if ( ! filter_var( $url, FILTER_VALIDATE_URL ) ) {
            return [
                'success'       => false,
                'error'         => __( 'Invalid image URL.', 'badamsoft-product-importer-for-woocommerce' ),
                'attachment_id' => null,
            ];
        }

        // Check cache first.
        $cached = $this->get_cached_attachment( $url );
        if ( $cached ) {
            // Verify attachment still exists.
            if ( wp_attachment_is_image( $cached ) ) {
                return [
                    'success'       => true,
                    'attachment_id' => $cached,
                    'cached'        => true,
                ];
            } else {
                // Attachment was deleted, remove from cache.
                $this->remove_from_cache( $url );
            }
        }

        // Download and attach image.
        $result = $this->download_and_attach( $url, $post_id, $options );

        if ( $result['success'] ) {
            // Cache the result.
            $this->cache_attachment( $url, $result['attachment_id'] );
        }

        return $result;
    }

    /**
     * Process multiple image URLs.
     *
     * @param array $urls     Array of image URLs.
     * @param int   $post_id  Post ID to attach to.
     * @param array $options  Options.
     * @return array Results for each URL.
     */
    public function process_images( array $urls, int $post_id = 0, array $options = [] ): array {
        $results = [];

        foreach ( $urls as $url ) {
            $url = trim( $url );
            if ( empty( $url ) ) {
                continue;
            }

            $results[] = $this->process_image( $url, $post_id, $options );
        }

        return $results;
    }

    /**
     * Parse image field value (comma-separated URLs or single URL).
     *
     * @param mixed $value Image field value.
     * @return array Array of URLs.
     */
    public function parse_image_urls( $value ): array {
        if ( empty( $value ) ) {
            return [];
        }

        if ( is_array( $value ) ) {
            return array_filter( array_map( 'trim', $value ) );
        }

        if ( is_string( $value ) ) {
            // Check for comma-separated URLs.
            if ( strpos( $value, ',' ) !== false ) {
                return array_filter( array_map( 'trim', explode( ',', $value ) ) );
            }

            // Check for pipe-separated URLs.
            if ( strpos( $value, '|' ) !== false ) {
                return array_filter( array_map( 'trim', explode( '|', $value ) ) );
            }

            // Single URL.
            return [ trim( $value ) ];
        }

        return [];
    }

    /**
     * Download image from URL and attach to media library.
     *
     * @param string $url      Image URL.
     * @param int    $post_id  Post ID to attach to.
     * @param array  $options  Options.
     * @return array Result.
     */
    private function download_and_attach( string $url, int $post_id, array $options ): array {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        // Check URL headers first.
        $headers = $this->get_url_headers( $url );
        if ( ! $headers['success'] ) {
            if ( ! empty( $options['skip_missing'] ) ) {
                return [
                    'success'       => false,
                    'error'         => $headers['error'],
                    'attachment_id' => null,
                    'skipped'       => true,
                ];
            }
            return [
                'success'       => false,
                'error'         => $headers['error'],
                'attachment_id' => null,
            ];
        }

        // Check file size.
        if ( $headers['size'] > $this->max_file_size ) {
            return [
                'success'       => false,
                'error'         => sprintf(
                    /* translators: 1: actual image size, 2: maximum allowed size. */
                    __( 'Image too large: %1$s (max %2$s).', 'badamsoft-product-importer-for-woocommerce' ),
                    size_format( $headers['size'] ),
                    size_format( $this->max_file_size )
                ),
                'attachment_id' => null,
            ];
        }

        // Check content type.
        if ( ! empty( $headers['type'] ) && ! in_array( $headers['type'], $this->allowed_types, true ) ) {
            return [
                'success'       => false,
                'error'         => sprintf(
                    /* translators: %s: MIME type. */
                    __( 'Invalid image type: %s.', 'badamsoft-product-importer-for-woocommerce' ),
                    $headers['type']
                ),
                'attachment_id' => null,
            ];
        }

        // Download to temp file.
        $tmp_file = download_url( $url, $this->timeout );

        if ( is_wp_error( $tmp_file ) ) {
            return [
                'success'       => false,
                'error'         => $tmp_file->get_error_message(),
                'attachment_id' => null,
            ];
        }

        // Get filename from URL.
        $filename = $this->get_filename_from_url( $url );

        // Prepare file array for media_handle_sideload.
        $file_array = [
            'name'     => $filename,
            'tmp_name' => $tmp_file,
        ];

        // Sideload the file.
        $attachment_id = media_handle_sideload( $file_array, $post_id );

        // Clean up temp file if still exists.
        if ( file_exists( $tmp_file ) ) {
            wp_delete_file( $tmp_file );
        }

        if ( is_wp_error( $attachment_id ) ) {
            return [
                'success'       => false,
                'error'         => $attachment_id->get_error_message(),
                'attachment_id' => null,
            ];
        }

        return [
            'success'       => true,
            'attachment_id' => $attachment_id,
            'cached'        => false,
        ];
    }

    /**
     * Get URL headers to check file info.
     *
     * @param string $url URL to check.
     * @return array Headers info.
     */
    private function get_url_headers( string $url ): array {
        $response = wp_remote_head( $url, [
            'timeout'   => $this->timeout,
            'sslverify' => false,
        ] );

        if ( is_wp_error( $response ) ) {
            return [
                'success' => false,
                'error'   => $response->get_error_message(),
            ];
        }

        $code = wp_remote_retrieve_response_code( $response );
        if ( $code !== 200 ) {
            return [
                'success' => false,
                'error'   => sprintf(
                    /* translators: %d: HTTP status code. */
                    __( 'HTTP error %d.', 'badamsoft-product-importer-for-woocommerce' ),
                    $code
                ),
            ];
        }

        return [
            'success' => true,
            'size'    => (int) wp_remote_retrieve_header( $response, 'content-length' ),
            'type'    => wp_remote_retrieve_header( $response, 'content-type' ),
        ];
    }

    /**
     * Get filename from URL.
     *
     * @param string $url URL.
     * @return string Filename.
     */
    private function get_filename_from_url( string $url ): string {
        $parsed = wp_parse_url( $url );
        $path   = $parsed['path'] ?? '';

        $filename = basename( $path );

        // Remove query string from filename.
        if ( strpos( $filename, '?' ) !== false ) {
            $filename = substr( $filename, 0, strpos( $filename, '?' ) );
        }

        // Ensure valid extension.
        $ext = pathinfo( $filename, PATHINFO_EXTENSION );
        if ( empty( $ext ) || ! in_array( strtolower( $ext ), [ 'jpg', 'jpeg', 'png', 'gif', 'webp' ], true ) ) {
            $filename .= '.jpg';
        }

        // Sanitize filename.
        $filename = sanitize_file_name( $filename );

        // Ensure unique filename.
        if ( strlen( $filename ) < 5 ) {
            $filename = 'image-' . uniqid() . '.jpg';
        }

        return $filename;
    }

    /**
     * Get cached attachment ID for URL.
     *
     * @param string $url Image URL.
     * @return int|null Attachment ID or null.
     */
    public function get_cached_attachment( string $url ): ?int {
        $wpdb = $this->wpdb;

        $cache_key = 'attachment:' . md5( $url );
        $cached = $this->cache_get( $cache_key );
        if ( false !== $cached ) {
            return $cached ? (int) $cached : null;
        }

        $attachment_id = $wpdb->get_var(
            $wpdb->prepare(
                'SELECT attachment_id FROM %i WHERE url = %s AND status = %s LIMIT 1',
                $this->cache_table,
                $url,
                'completed'
            )
        );

        $result = $attachment_id ? (int) $attachment_id : null;
        $this->cache_set( $cache_key, $result );

        return $result;
    }

    /**
     * Cache attachment ID for URL.
     *
     * @param string $url           Image URL.
     * @param int    $attachment_id Attachment ID.
     */
    public function cache_attachment( string $url, int $attachment_id ): void {
        $wpdb = $this->wpdb;

        // Check if already cached.
        $existing = $wpdb->get_var(
            $wpdb->prepare(
                'SELECT id FROM %i WHERE url = %s',
                $this->cache_table,
                $url
            )
        );

        if ( $existing ) {
            $wpdb->update(
                $this->cache_table,
                [
                    'attachment_id' => $attachment_id,
                    'status'        => 'completed',
                    'last_checked'  => current_time( 'mysql' ),
                ],
                [ 'id' => $existing ]
            );
        } else {
            $wpdb->insert(
                $this->cache_table,
                [
                    'url'           => $url,
                    'attachment_id' => $attachment_id,
                    'status'        => 'completed',
                    'last_checked'  => current_time( 'mysql' ),
                    'created_at'    => current_time( 'mysql' ),
                ],
                [ '%s', '%d', '%s', '%s', '%s' ]
            );
        }

        $this->cache_bump_version();
    }

    /**
     * Remove URL from cache.
     *
     * @param string $url Image URL.
     */
    public function remove_from_cache( string $url ): void {
        $wpdb = $this->wpdb;

        $wpdb->delete(
            $this->cache_table,
            [ 'url' => $url ],
            [ '%s' ]
        );

        $this->cache_bump_version();
    }

    /**
     * Mark URL as failed in cache.
     *
     * @param string $url   Image URL.
     * @param string $error Error message.
     */
    public function mark_failed( string $url, string $error = '' ): void {
        $wpdb = $this->wpdb;

        $existing = $wpdb->get_var(
            $wpdb->prepare(
                'SELECT id FROM %i WHERE url = %s',
                $this->cache_table,
                $url
            )
        );

        if ( $existing ) {
            $wpdb->update(
                $this->cache_table,
                [
                    'status'       => 'failed',
                    'last_checked' => current_time( 'mysql' ),
                ],
                [ 'id' => $existing ]
            );
        } else {
            $wpdb->insert(
                $this->cache_table,
                [
                    'url'          => $url,
                    'status'       => 'failed',
                    'last_checked' => current_time( 'mysql' ),
                    'created_at'   => current_time( 'mysql' ),
                ],
                [ '%s', '%s', '%s', '%s' ]
            );
        }

        $this->cache_bump_version();
    }

    /**
     * Get media cache stats.
     *
     * @return array Stats.
     */
    public function get_cache_stats(): array {
        $wpdb = $this->wpdb;

        $cache_key = 'stats';
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $total = (int) $wpdb->get_var(
            $wpdb->prepare(
                'SELECT COUNT(*) FROM %i',
                $this->cache_table
            )
        );

        $completed = (int) $wpdb->get_var(
            $wpdb->prepare(
                'SELECT COUNT(*) FROM %i WHERE status = %s',
                $this->cache_table,
                'completed'
            )
        );

        $failed = (int) $wpdb->get_var(
            $wpdb->prepare(
                'SELECT COUNT(*) FROM %i WHERE status = %s',
                $this->cache_table,
                'failed'
            )
        );

        $pending = (int) $wpdb->get_var(
            $wpdb->prepare(
                'SELECT COUNT(*) FROM %i WHERE status = %s',
                $this->cache_table,
                'pending'
            )
        );

        $stats = [
            'total'     => $total,
            'completed' => $completed,
            'failed'    => $failed,
            'pending'   => $pending,
        ];

        $this->cache_set( $cache_key, $stats );

        return $stats;
    }

    /**
     * Clear media cache.
     *
     * @param bool $delete_attachments Also delete attachment files.
     * @return int Number of rows deleted.
     */
    public function clear_cache( bool $delete_attachments = false ): int {
        $wpdb = $this->wpdb;

        if ( $delete_attachments ) {
            $attachments = $wpdb->get_col(
                $wpdb->prepare(
                    'SELECT attachment_id FROM %i WHERE attachment_id IS NOT NULL',
                    $this->cache_table
                )
            );

            foreach ( $attachments as $attachment_id ) {
                wp_delete_attachment( (int) $attachment_id, true );
            }
        }

        $rows = (int) $wpdb->query(
            $wpdb->prepare(
                'TRUNCATE TABLE %i',
                $this->cache_table
            )
        );

        if ( $rows > 0 ) {
            $this->cache_bump_version();
        }

        return $rows;
    }

    /**
     * Set timeout for downloads.
     *
     * @param int $seconds Timeout in seconds.
     */
    public function set_timeout( int $seconds ): void {
        $this->timeout = max( 5, min( 120, $seconds ) );
    }

    /**
     * Set max file size.
     *
     * @param int $bytes Max size in bytes.
     */
    public function set_max_file_size( int $bytes ): void {
        $this->max_file_size = $bytes;
    }
}
