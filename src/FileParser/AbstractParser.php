<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\FileParser;

abstract class AbstractParser implements ParserInterface {
    protected const MAX_ROWS = 100000;
    protected const DEFAULT_CHUNK_SIZE = 100;

    protected function maybe_fix_mojibake( string $string ): string {
        if ( '' === $string ) {
            return $string;
        }

        if ( false === mb_check_encoding( $string, 'UTF-8' ) ) {
            return $string;
        }

        if ( ! preg_match( '/[ÐÑ]/u', $string ) ) {
            return $string;
        }

        if ( preg_match( '/[\p{Cyrillic}]/u', $string ) ) {
            return $string;
        }

        $bytes = @mb_convert_encoding( $string, 'ISO-8859-1', 'UTF-8' );
        if ( is_string( $bytes ) && '' !== $bytes ) {
            $fixed = @mb_convert_encoding( $bytes, 'UTF-8', 'ISO-8859-1' );
            if ( is_string( $fixed ) && '' !== $fixed && mb_check_encoding( $fixed, 'UTF-8' ) && preg_match( '/[\p{Cyrillic}]/u', $fixed ) ) {
                return $fixed;
            }
        }

        return $string;
    }

    /**
     * Check if file exists and is readable.
     *
     * @param string $file_path File path.
     * @return array{valid: bool, error: string|null}
     */
    protected function check_file_exists( string $file_path ): array {
        try {
            $info = new \SplFileInfo( $file_path );
        } catch ( \RuntimeException $e ) {
            $info = null;
        }

        if ( ! ( $info instanceof \SplFileInfo ) || ! $info->isFile() ) {
            return [
                'valid' => false,
                'error' => __( 'File not found.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        if ( ! $info->isReadable() ) {
            return [
                'valid' => false,
                'error' => __( 'File is not readable.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        return [ 'valid' => true, 'error' => null ];
    }

    /**
     * Check file extension.
     *
     * @param string $file_path File path.
     * @return array{valid: bool, error: string|null}
     */
    protected function check_extension( string $file_path ): array {
        $extension = strtolower( pathinfo( $file_path, PATHINFO_EXTENSION ) );
        $supported = $this->get_supported_extensions();

        if ( ! in_array( $extension, $supported, true ) ) {
            return [
                'valid' => false,
                'error' => sprintf(
                    /* translators: %s: list of supported extensions */
                    __( 'Unsupported file extension. Supported: %s', 'badamsoft-product-importer-for-woocommerce' ),
                    implode( ', ', $supported )
                ),
            ];
        }

        return [ 'valid' => true, 'error' => null ];
    }

    /**
     * Detect file encoding.
     *
     * @param string $file_path File path.
     * @return string Detected encoding.
     */
    protected function detect_encoding( string $file_path ): string {
        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return 'UTF-8';
        }

        $sample = $file->fread( 8192 );

        // Handle BOMs and prefer UTF-8 when possible to avoid mojibake (e.g. "ÐŸÐ¾...").
        if ( is_string( $sample ) && str_starts_with( $sample, "\xEF\xBB\xBF" ) ) {
            return 'UTF-8';
        }

        if ( is_string( $sample ) && mb_check_encoding( $sample, 'UTF-8' ) ) {
            return 'UTF-8';
        }

        $encoding = mb_detect_encoding( $sample, [ 'Windows-1251', 'CP1251', 'UTF-8', 'ASCII' ], true );

        if ( 'ASCII' === $encoding ) {
            return 'UTF-8';
        }

        return $encoding ?: 'UTF-8';
    }

    /**
     * Convert string to UTF-8.
     *
     * @param string $string   String to convert.
     * @param string $encoding Source encoding.
     * @return string
     */
    protected function convert_to_utf8( string $string, string $encoding ): string {
        $string = $this->maybe_fix_mojibake( $string );

        if ( $encoding === 'UTF-8' ) {
            return $string;
        }

        if ( '' === $string ) {
            return $string;
        }

        // If the value is already valid UTF-8, never convert it.
        // This prevents double-encoding when the file encoding was misdetected.
        if ( mb_check_encoding( $string, 'UTF-8' ) ) {
            return $string;
        }

        return mb_convert_encoding( $string, 'UTF-8', $encoding );
    }

    /**
     * Sanitize header name.
     *
     * @param string $header Header name.
     * @return string
     */
    protected function sanitize_header( string $header ): string {
        $header = trim( $header );
        $header = strtolower( $header );
        $header = preg_replace( '/[^a-z0-9_\-]/', '_', $header );
        $header = preg_replace( '/_+/', '_', $header );
        $header = trim( $header, '_' );

        return $header;
    }

    /**
     * Create error response.
     *
     * @param string $error Error message.
     * @return array
     */
    protected function error_response( string $error ): array {
        return [
            'success'    => false,
            'data'       => [],
            'headers'    => [],
            'total_rows' => 0,
            'error'      => $error,
        ];
    }

    /**
     * Create success response.
     *
     * @param array $data       Parsed data.
     * @param array $headers    Column headers.
     * @param int   $total_rows Total number of rows.
     * @return array
     */
    protected function success_response( array $data, array $headers, int $total_rows ): array {
        return [
            'success'    => true,
            'data'       => $data,
            'headers'    => $headers,
            'total_rows' => $total_rows,
            'error'      => null,
        ];
    }
}
