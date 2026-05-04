<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\FileParser;

use BadamSoft\ProductImporterForWooCommerce\FileParser\ParserFactory;

class FileParser {
    public const FORMAT_CSV  = 'csv';

    public const DEFAULT_PREVIEW_ROWS = 100;
    public const DEFAULT_DISPLAY_ROWS = 10;

    /**
     * Detect file format from extension and mime type.
     *
     * @param string $file_path Path to the file.
     * @return string|null Detected format or null if unknown.
     */
    public function detect_format( string $file_path ): ?string {
        if ( ! file_exists( $file_path ) ) {
            return null;
        }

        $extension = strtolower( pathinfo( $file_path, PATHINFO_EXTENSION ) );

        $extension_map = [
            'csv'  => self::FORMAT_CSV,
            'tsv'  => self::FORMAT_CSV,
            'txt'  => self::FORMAT_CSV,
        ];

        if ( isset( $extension_map[ $extension ] ) ) {
            return $extension_map[ $extension ];
        }

        $format = apply_filters( 'pifwc_detect_format', null, $extension, $file_path );
        if ( is_string( $format ) && '' !== $format ) {
            return $format;
        }

        // Default to CSV.
        return self::FORMAT_CSV;
    }

    /**
     * Parse file and get preview data.
     *
     * @param string $file_path Path to the file.
     * @param int    $max_rows  Maximum rows to read.
     * @return array{
     *     format: string,
     *     encoding: string,
     *     delimiter: string|null,
     *     headers: array<string>,
     *     rows: array<array<string>>,
     *     total_preview_rows: int,
     *     error: string|null
     * }
     */
    public function get_preview( string $file_path, int $max_rows = self::DEFAULT_PREVIEW_ROWS ): array {
        $result = [
            'format'             => '',
            'encoding'           => 'UTF-8',
            'delimiter'          => null,
            'headers'            => [],
            'rows'               => [],
            'total_preview_rows' => 0,
            'error'              => null,
        ];

        if ( ! file_exists( $file_path ) ) {
            $result['error'] = __( 'File not found.', 'badamsoft-product-importer-for-woocommerce' );
            return $result;
        }

        $format = $this->detect_format( $file_path );

        if ( null === $format ) {
            $result['error'] = __( 'Unable to detect file format.', 'badamsoft-product-importer-for-woocommerce' );
            return $result;
        }

        $result['format'] = $format;

        $parser = ParserFactory::create( $file_path );
        if ( ! $parser ) {
            $result['error'] = __( 'Unsupported file format.', 'badamsoft-product-importer-for-woocommerce' );
            return $result;
        }

        $validation = $parser->validate( $file_path );
        if ( ! $validation['valid'] ) {
            $result['error'] = (string) $validation['error'];
            return $result;
        }

        if ( ! method_exists( $parser, 'get_import_chunk' ) ) {
            $result['error'] = __( 'Preview is not available for this format.', 'badamsoft-product-importer-for-woocommerce' );
            return $result;
        }

        $headers = method_exists( $parser, 'get_headers' ) ? (array) $parser->get_headers( $file_path ) : [];
        $result['headers'] = $headers;

        $state = [];
        $rows = [];
        $wanted = max( 1, $max_rows );
        while ( count( $rows ) < $wanted ) {
            $chunk = $parser->get_import_chunk( $file_path, 1, $state );
            if ( empty( $chunk['success'] ) ) {
                $result['error'] = (string) ( $chunk['error'] ?? __( 'Failed to build preview.', 'badamsoft-product-importer-for-woocommerce' ) );
                return $result;
            }

            $state = is_array( $chunk['state'] ?? null ) ? ( $chunk['state'] ?? [] ) : [];
            $chunk_rows = is_array( $chunk['rows'] ?? null ) ? ( $chunk['rows'] ?? [] ) : [];
            if ( empty( $chunk_rows ) ) {
                break;
            }

            $row_assoc = $chunk_rows[0];
            if ( ! is_array( $row_assoc ) ) {
                continue;
            }

            $row_flat = [];
            foreach ( $headers as $h ) {
                $row_flat[] = (string) ( $row_assoc[ $h ] ?? '' );
            }
            $rows[] = $row_flat;
        }

        $result['rows'] = $rows;
        $result['total_preview_rows'] = count( $rows );

        return $result;
    }

    /**
     * Get supported file extensions.
     *
     * @return array<string>
     */
    public function get_supported_extensions(): array {
        return ParserFactory::get_supported_extensions();
    }

    /**
     * Get supported mime types.
     *
     * @return array<string>
     */
    public function get_supported_mime_types(): array {
        return [
            'text/csv',
            'text/plain',
            'text/tab-separated-values',
            'application/csv',
            'application/json',
            'text/json',
            'application/xml',
            'text/xml',
            'application/x-yaml',
            'application/yaml',
            'text/yaml',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
    }
}
