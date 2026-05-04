<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\FileParser\Parsers;

use BadamSoft\ProductImporterForWooCommerce\FileParser\FileParser;

class CsvParser implements ParserInterface {
    private const DELIMITERS = [ ',', ';', "\t", '|' ];
    private const SAMPLE_SIZE = 4096;

    /**
     * {@inheritdoc}
     */
    public function parse( string $file_path, int $max_rows = 100 ): array {
        try {
            $info = new \SplFileInfo( $file_path );
        } catch ( \RuntimeException $e ) {
            $info = null;
        }

        if ( ! ( $info instanceof \SplFileInfo ) || ! $info->isFile() || ! $info->isReadable() ) {
            throw new \RuntimeException(
                esc_html__( 'CSV file not found or not readable.', 'badamsoft-product-importer-for-woocommerce' )
            );
        }

        $encoding  = $this->detect_encoding( $file_path );
        $delimiter = $this->detect_delimiter( $file_path );

        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            throw new \RuntimeException(
                esc_html__( 'Failed to open CSV file.', 'badamsoft-product-importer-for-woocommerce' )
            );
        }

        // Handle BOM.
        $bom = $file->fread( 3 );
        if ( "\xEF\xBB\xBF" !== $bom ) {
            $file->fseek( 0 );
        }

        $headers = [];
        $rows    = [];
        $line    = 0;

        while ( ( $data = $file->fgetcsv( $delimiter ) ) !== false ) {
            if ( 0 === $line ) {
                $headers = $this->normalize_headers( $data, $encoding );
                $line++;
                continue;
            }

            if ( $line > $max_rows ) {
                break;
            }

            $rows[] = $this->normalize_row( $data, $encoding );
            $line++;
        }

        return [
            'headers'   => $headers,
            'rows'      => $rows,
            'encoding'  => $encoding,
            'delimiter' => $delimiter,
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function get_format(): string {
        return FileParser::FORMAT_CSV;
    }

    /**
     * Detect file encoding.
     *
     * @param string $file_path Path to the file.
     * @return string Detected encoding.
     */
    private function detect_encoding( string $file_path ): string {
        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return 'UTF-8';
        }

        $content = $file->fread( self::SAMPLE_SIZE );

        // If the sample is already valid UTF-8 (or plain ASCII), treat the file as UTF-8.
        // This avoids false positives (e.g. Windows-1252) that cause mojibake like "ÐŸÐ¾...".
        if ( mb_check_encoding( $content, 'UTF-8' ) ) {
            return 'UTF-8';
        }

        // Check for BOM.
        if ( str_starts_with( $content, "\xEF\xBB\xBF" ) ) {
            return 'UTF-8';
        }

        if ( str_starts_with( $content, "\xFF\xFE" ) ) {
            return 'UTF-16LE';
        }

        if ( str_starts_with( $content, "\xFE\xFF" ) ) {
            return 'UTF-16BE';
        }

        // Try to detect with mb_detect_encoding.
        $detected = mb_detect_encoding( $content, [ 'Windows-1251', 'CP1251', 'Windows-1252', 'ISO-8859-1', 'ASCII' ], true );

        if ( 'ASCII' === $detected ) {
            return 'UTF-8';
        }

        return $detected ?: 'UTF-8';
    }

    /**
     * Detect CSV delimiter.
     *
     * @param string $file_path Path to the file.
     * @return string Detected delimiter.
     */
    private function detect_delimiter( string $file_path ): string {
        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return ',';
        }

        $content = $file->fread( self::SAMPLE_SIZE );

        // Remove BOM if present.
        if ( str_starts_with( $content, "\xEF\xBB\xBF" ) ) {
            $content = substr( $content, 3 );
        }

        // Get first few lines.
        $lines = explode( "\n", $content );
        $lines = array_slice( $lines, 0, 5 );

        $delimiter_counts = [];

        foreach ( self::DELIMITERS as $delimiter ) {
            $counts = [];

            foreach ( $lines as $line ) {
                if ( '' === trim( $line ) ) {
                    continue;
                }

                $count = substr_count( $line, $delimiter );
                $counts[] = $count;
            }

            if ( empty( $counts ) ) {
                $delimiter_counts[ $delimiter ] = 0;
                continue;
            }

            // Check consistency (same count across lines).
            $unique_counts = array_unique( $counts );

            if ( 1 === count( $unique_counts ) && $counts[0] > 0 ) {
                $delimiter_counts[ $delimiter ] = $counts[0] * 10; // Bonus for consistency.
            } else {
                $delimiter_counts[ $delimiter ] = array_sum( $counts );
            }
        }

        arsort( $delimiter_counts );

        return array_key_first( $delimiter_counts ) ?: ',';
    }

    /**
     * Normalize headers to UTF-8.
     *
     * @param array<string> $headers Raw headers.
     * @param string        $encoding Source encoding.
     * @return array<string>
     */
    private function normalize_headers( array $headers, string $encoding ): array {
        return array_map(
            function ( $header ) use ( $encoding ) {
                $header = $this->convert_encoding( $header, $encoding );
                return trim( $header );
            },
            $headers
        );
    }

    /**
     * Normalize row data to UTF-8.
     *
     * @param array<string> $row      Raw row data.
     * @param string        $encoding Source encoding.
     * @return array<string>
     */
    private function normalize_row( array $row, string $encoding ): array {
        return array_map(
            function ( $value ) use ( $encoding ) {
                return $this->convert_encoding( $value, $encoding );
            },
            $row
        );
    }

    /**
     * Convert string to UTF-8.
     *
     * @param string $string   String to convert.
     * @param string $encoding Source encoding.
     * @return string
     */
    private function convert_encoding( string $string, string $encoding ): string {
        if ( '' === $string ) {
            return $string;
        }

        if ( mb_check_encoding( $string, 'UTF-8' ) && preg_match( '/[ÐÑ]/u', $string ) && ! preg_match( '/[\p{Cyrillic}]/u', $string ) ) {
            $fixed = @mb_convert_encoding( $string, 'Windows-1252', 'UTF-8' );
            if ( is_string( $fixed ) && '' !== $fixed && mb_check_encoding( $fixed, 'UTF-8' ) && preg_match( '/[\p{Cyrillic}]/u', $fixed ) ) {
                return $fixed;
            }
        }

        // If the value is already valid UTF-8, never convert it.
        // This prevents double-encoding / mis-detection issues.
        if ( mb_check_encoding( $string, 'UTF-8' ) ) {
            return $string;
        }

        if ( 'UTF-8' === $encoding ) {
            return $string;
        }

        $converted = mb_convert_encoding( $string, 'UTF-8', $encoding );

        return false !== $converted ? $converted : $string;
    }
}
