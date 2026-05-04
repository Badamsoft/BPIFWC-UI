<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\FileParser;

class ParserFactory {
    /**
     * Create parser instance based on file extension.
     *
     * @param string $file_path File path.
     * @return ParserInterface|null Parser instance or null if unsupported.
     */
    public static function create( string $file_path ) {
        $extension = strtolower( pathinfo( $file_path, PATHINFO_EXTENSION ) );

        $parser = null;
        if ( in_array( $extension, [ 'csv', 'tsv', 'txt' ], true ) ) {
            $parser = new CsvParser();
        }

        // Allow PRO add-on to provide parsers for additional formats.
        $parser = apply_filters( 'pifwc_parser_for_extension', $parser, $extension, $file_path );
        if ( $parser !== null && ( ! is_object( $parser ) || ! method_exists( $parser, 'parse' ) || ! method_exists( $parser, 'validate' ) ) ) {
            return null;
        }
        return $parser;
    }

    /**
     * Create parser by extension string.
     *
     * @param string $extension File extension.
     * @return ParserInterface|null
     */
    public static function create_by_extension( string $extension ) {
        $extension = strtolower( trim( $extension, '.' ) );

        $parser = null;
        if ( in_array( $extension, [ 'csv', 'tsv', 'txt' ], true ) ) {
            $parser = new CsvParser();
        }

        // Allow PRO add-on to provide parsers for additional formats.
        $parser = apply_filters( 'pifwc_parser_for_extension', $parser, $extension, '' );
        if ( $parser !== null && ( ! is_object( $parser ) || ! method_exists( $parser, 'parse' ) || ! method_exists( $parser, 'validate' ) ) ) {
            return null;
        }
        return $parser;
    }

    /**
     * Get all available parsers.
     *
     * @return array<string, ParserInterface>
     */
    public static function get_all_parsers(): array {
        $parsers = [
            'csv' => new CsvParser(),
        ];

        return $parsers;
    }

    /**
     * Get supported file extensions.
     *
     * @return array
     */
    public static function get_supported_extensions(): array {
        $extensions = [ 'csv', 'tsv', 'txt' ];

        // Allow PRO add-on to add additional supported extensions.
        return apply_filters( 'pifwc_supported_extensions', $extensions );
    }

    /**
     * Check if file type is supported.
     *
     * @param string $file_path File path.
     * @return bool
     */
    public static function is_supported( string $file_path ): bool {
        $extension = strtolower( pathinfo( $file_path, PATHINFO_EXTENSION ) );
        return in_array( $extension, self::get_supported_extensions(), true );
    }

    /**
     * Get parser info for UI.
     *
     * @return array
     */
    public static function get_parser_info(): array {
        return [
            'csv' => [
                'name' => __( 'CSV (Comma-Separated Values)', 'badamsoft-product-importer-for-woocommerce' ),
                'extensions' => [ 'csv', 'tsv', 'txt' ],
                'features' => [
                    __( 'Auto-detect delimiter', 'badamsoft-product-importer-for-woocommerce' ),
                    __( 'Multiple encodings support', 'badamsoft-product-importer-for-woocommerce' ),
                    __( 'Memory-efficient chunked parsing', 'badamsoft-product-importer-for-woocommerce' ),
                ],
                'available' => true,
            ],
        ];
    }
}
