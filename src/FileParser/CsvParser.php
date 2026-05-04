<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\FileParser;

class CsvParser extends AbstractParser {
    private string $delimiter = ',';
    private string $enclosure = '"';
    private string $escape = '\\';

    private function make_unique_headers( array $headers ): array {
        $seen = [];
        $out = [];
        foreach ( $headers as $i => $h ) {
            $label = is_string( $h ) ? trim( $h ) : '';
            if ( '' === $label ) {
                $label = 'Column ' . ( (int) $i + 1 );
            }
            $base = $label;
            $n = 2;
            while ( isset( $seen[ $label ] ) ) {
                $label = $base . ' ' . $n;
                $n++;
            }
            $seen[ $label ] = true;
            $out[ (int) $i ] = $label;
        }
        return $out;
    }

    private function sanitize_headers_unique( array $headers ): array {
        $seen = [];
        $out = [];
        foreach ( $headers as $i => $h ) {
            $key = $this->sanitize_header( (string) $h );
            if ( '' === $key ) {
                $key = 'column_' . ( (int) $i + 1 );
            }
            $base = $key;
            $n = 2;
            while ( isset( $seen[ $key ] ) ) {
                $key = $base . '_' . $n;
                $n++;
            }
            $seen[ $key ] = true;
            $out[ (int) $i ] = $key;
        }
        return $out;
    }

    /**
     * Set CSV delimiter.
     *
     * @param string $delimiter Delimiter character.
     */
    public function set_delimiter( string $delimiter ): void {
        $this->delimiter = $delimiter;
    }

    /**
     * Set CSV enclosure.
     *
     * @param string $enclosure Enclosure character.
     */
    public function set_enclosure( string $enclosure ): void {
        $this->enclosure = $enclosure;
    }

    /**
     * Auto-detect CSV delimiter.
     *
     * @param string $file_path File path.
     * @return string Detected delimiter.
     */
    private function detect_delimiter( string $file_path ): string {
        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return ',';
        }

        $first_line = $file->fgets();

        if ( ! $first_line ) {
            return ',';
        }

        $delimiters = [ ',', ';', "\t", '|' ];
        $max_count = 0;
        $detected = ',';

        foreach ( $delimiters as $delimiter ) {
            $count = substr_count( $first_line, $delimiter );
            if ( $count > $max_count ) {
                $max_count = $count;
                $detected = $delimiter;
            }
        }

        return $detected;
    }

    /**
     * Parse CSV file.
     *
     * @param string $file_path File path.
     * @return array
     */
    public function parse( string $file_path ): array {
        $validation = $this->validate( $file_path );
        if ( ! $validation['valid'] ) {
            return $this->error_response( $validation['error'] );
        }

        $encoding = $this->detect_encoding( $file_path );
        $this->delimiter = $this->detect_delimiter( $file_path );

        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return $this->error_response( __( 'Failed to open file.', 'badamsoft-product-importer-for-woocommerce' ) );
        }

        // Handle BOM.
        $bom = $file->fread( 3 );
        if ( "\xEF\xBB\xBF" !== $bom ) {
            $file->fseek( 0 );
        }

        $headers = [];
        $data = [];
        $row_number = 0;

        while ( ( $row = $file->fgetcsv( $this->delimiter, $this->enclosure, $this->escape ) ) !== false ) {
            $row_number++;

            // Skip empty rows
            if ( empty( array_filter( $row ) ) ) {
                continue;
            }

            // Convert encoding
            if ( $encoding !== 'UTF-8' ) {
                $row = array_map( function( $value ) use ( $encoding ) {
                    return $this->convert_to_utf8( $value, $encoding );
                }, $row );
            }

            // First row is headers
            if ( empty( $headers ) ) {
                $original_headers = $this->make_unique_headers( $row );
                $headers = $this->sanitize_headers_unique( $original_headers );
                continue;
            }

            // Map row to headers
            $row_data = [];
            foreach ( $headers as $index => $header ) {
                $row_data[ $header ] = $row[ $index ] ?? '';
                if ( isset( $original_headers[ $index ] ) ) {
                    $row_data[ $original_headers[ $index ] ] = $row[ $index ] ?? '';
                }
            }

            $data[] = $row_data;

            // Prevent memory issues
            if ( count( $data ) >= self::MAX_ROWS ) {
                break;
            }
        }

        return $this->success_response( $data, $headers, count( $data ) );
    }

    public function get_import_chunk( string $file_path, int $limit, array $state = [] ): array {
        $validation = $this->validate( $file_path );
        if ( ! $validation['valid'] ) {
            return [
                'success' => false,
                'rows'    => [],
                'state'   => $state,
                'error'   => $validation['error'],
            ];
        }

        $encoding = isset( $state['encoding'] ) && is_string( $state['encoding'] ) ? $state['encoding'] : $this->detect_encoding( $file_path );
        $delimiter = isset( $state['delimiter'] ) && is_string( $state['delimiter'] ) ? $state['delimiter'] : $this->detect_delimiter( $file_path );
        $this->delimiter = $delimiter;

        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return [
                'success' => false,
                'rows'    => [],
                'state'   => $state,
                'error'   => __( 'Failed to open file.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $headers = isset( $state['headers'] ) && is_array( $state['headers'] ) ? $state['headers'] : [];
        $original_headers = isset( $state['original_headers'] ) && is_array( $state['original_headers'] ) ? $state['original_headers'] : [];
        $byte_offset = isset( $state['byte_offset'] ) ? (int) $state['byte_offset'] : 0;
        $data_index = isset( $state['data_index'] ) ? (int) $state['data_index'] : 0;

        if ( empty( $headers ) ) {
            $bom = $file->fread( 3 );
            if ( "\xEF\xBB\xBF" !== $bom ) {
                $file->fseek( 0 );
            }

            $header_row = $file->fgetcsv( $this->delimiter, $this->enclosure, $this->escape );
            if ( false === $header_row ) {
                return [
                    'success' => false,
                    'rows'    => [],
                    'state'   => $state,
                    'error'   => __( 'Failed to read headers.', 'badamsoft-product-importer-for-woocommerce' ),
                ];
            }

            if ( $encoding !== 'UTF-8' ) {
                $header_row = array_map( function( $value ) use ( $encoding ) {
                    return $this->convert_to_utf8( $value, $encoding );
                }, $header_row );
            }

            $original_headers = $this->make_unique_headers( $header_row );
            $headers = $this->sanitize_headers_unique( $original_headers );
            $byte_offset = (int) $file->ftell();
            $data_index = 0;
        } else {
            if ( $byte_offset > 0 ) {
                $file->fseek( $byte_offset );
            } else {
                $bom = $file->fread( 3 );
                if ( "\xEF\xBB\xBF" !== $bom ) {
                    $file->fseek( 0 );
                }

                $file->fgetcsv( $this->delimiter, $this->enclosure, $this->escape );
                $byte_offset = (int) $file->ftell();
            }
        }

        $rows = [];
        $row_states = [];
        while ( count( $rows ) < $limit && ( $row = $file->fgetcsv( $this->delimiter, $this->enclosure, $this->escape ) ) !== false ) {
            if ( empty( array_filter( $row ) ) ) {
                continue;
            }

            if ( $encoding !== 'UTF-8' ) {
                $row = array_map( function( $value ) use ( $encoding ) {
                    return $this->convert_to_utf8( $value, $encoding );
                }, $row );
            }

            $row_data = [];
            foreach ( $headers as $index => $header ) {
                $row_data[ $header ] = $row[ $index ] ?? '';
                if ( isset( $original_headers[ $index ] ) && $original_headers[ $index ] !== $header ) {
                    $row_data[ $original_headers[ $index ] ] = $row[ $index ] ?? '';
                }
            }

            $rows[] = $row_data;
            $data_index++;
            $byte_offset = (int) $file->ftell();

            $row_states[] = [
                'byte_offset' => $byte_offset,
                'data_index'  => $data_index,
            ];
        }

        return [
            'success' => true,
            'rows'    => $rows,
            'row_states' => $row_states,
            'state'   => [
                'encoding'         => $encoding,
                'delimiter'        => $delimiter,
                'headers'          => $headers,
                'original_headers' => $original_headers,
                'byte_offset'      => $byte_offset,
                'data_index'       => $data_index,
            ],
            'error'   => null,
        ];
    }

    public function count_rows( string $file_path ): int {
        $check = $this->check_file_exists( $file_path );
        if ( ! $check['valid'] ) {
            return 0;
        }

        try {
            $info = new \SplFileInfo( $file_path );
            $size = (int) $info->getSize();
        } catch ( \RuntimeException $e ) {
            $size = 0;
        }

        if ( $size === 0 ) {
            return 0;
        }

        $this->detect_encoding( $file_path );
        $this->delimiter = $this->detect_delimiter( $file_path );

        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return 0;
        }

        // Handle BOM.
        $bom = $file->fread( 3 );
        if ( "\xEF\xBB\xBF" !== $bom ) {
            $file->fseek( 0 );
        }

        // Skip headers.
        $headers = $file->fgetcsv( $this->delimiter, $this->enclosure, $this->escape );
        if ( false === $headers ) {
            return 0;
        }

        $count = 0;
        while ( ( $row = $file->fgetcsv( $this->delimiter, $this->enclosure, $this->escape ) ) !== false ) {
            if ( empty( array_filter( $row ) ) ) {
                continue;
            }
            $count++;
        }
        return $count;
    }

    /**
     * Parse CSV file in chunks.
     *
     * @param string   $file_path  File path.
     * @param int      $chunk_size Chunk size.
     * @param callable $callback   Callback function.
     * @return array
     */
    public function parse_chunked( string $file_path, int $chunk_size, callable $callback ): array {
        $validation = $this->validate( $file_path );
        if ( ! $validation['valid'] ) {
            return [
                'success'    => false,
                'total_rows' => 0,
                'error'      => $validation['error'],
            ];
        }

        $encoding = $this->detect_encoding( $file_path );
        $this->delimiter = $this->detect_delimiter( $file_path );

        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return [
                'success'    => false,
                'total_rows' => 0,
                'error'      => __( 'Failed to open file.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // Handle BOM.
        $bom = $file->fread( 3 );
        if ( "\xEF\xBB\xBF" !== $bom ) {
            $file->fseek( 0 );
        }

        $headers = [];
        $original_headers = [];
        $chunk = [];
        $total_rows = 0;
        $row_number = 0;

        while ( ( $row = $file->fgetcsv( $this->delimiter, $this->enclosure, $this->escape ) ) !== false ) {
            $row_number++;

            // Skip empty rows
            if ( empty( array_filter( $row ) ) ) {
                continue;
            }

            // Convert encoding
            if ( $encoding !== 'UTF-8' ) {
                $row = array_map( function( $value ) use ( $encoding ) {
                    return $this->convert_to_utf8( $value, $encoding );
                }, $row );
            }

            // First row is headers
            if ( empty( $headers ) ) {
                $original_headers = $row;
                $headers = array_map( [ $this, 'sanitize_header' ], $row );
                continue;
            }

            // Map row to headers (both sanitized and original)
            $row_data = [];
            foreach ( $headers as $index => $header ) {
                $row_data[ $header ] = $row[ $index ] ?? '';
                // Also add original header as key for placeholder resolution
                if ( isset( $original_headers[ $index ] ) && $original_headers[ $index ] !== $header ) {
                    $row_data[ $original_headers[ $index ] ] = $row[ $index ] ?? '';
                }
            }

            $chunk[] = $row_data;
            $total_rows++;

            // Process chunk when size reached
            if ( count( $chunk ) >= $chunk_size ) {
                $result = $callback( $chunk, $headers );
                
                // Stop if callback returns false
                if ( false === $result ) {
                    break;
                }

                $chunk = [];
            }
        }

        // Process remaining rows
        if ( ! empty( $chunk ) ) {
            $callback( $chunk, $headers );
        }

        return [
            'success'    => true,
            'total_rows' => $total_rows,
            'error'      => null,
        ];
    }

    /**
     * Get CSV headers.
     *
     * @param string $file_path File path.
     * @return array
     */
    public function get_headers( string $file_path ): array {
        $validation = $this->validate( $file_path );
        if ( ! $validation['valid'] ) {
            return [];
        }

        $encoding = $this->detect_encoding( $file_path );
        $this->delimiter = $this->detect_delimiter( $file_path );

        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return [];
        }

        // Handle BOM.
        $bom = $file->fread( 3 );
        if ( "\xEF\xBB\xBF" !== $bom ) {
            $file->fseek( 0 );
        }

        $row = $file->fgetcsv( $this->delimiter, $this->enclosure, $this->escape );

        if ( ! $row ) {
            return [];
        }

        // Convert encoding
        if ( $encoding !== 'UTF-8' ) {
            $row = array_map( function( $value ) use ( $encoding ) {
                return $this->convert_to_utf8( $value, $encoding );
            }, $row );
        }

        return array_map( [ $this, 'sanitize_header' ], $row );
    }

    /**
     * Validate CSV file.
     *
     * @param string $file_path File path.
     * @return array
     */
    public function validate( string $file_path ): array {
        $check = $this->check_file_exists( $file_path );
        if ( ! $check['valid'] ) {
            return $check;
        }

        $check = $this->check_extension( $file_path );
        if ( ! $check['valid'] ) {
            return $check;
        }

        // Check if file is empty
        try {
            $info = new \SplFileInfo( $file_path );
            $size = (int) $info->getSize();
        } catch ( \RuntimeException $e ) {
            $size = 0;
        }

        if ( $size === 0 ) {
            return [
                'valid' => false,
                'error' => __( 'File is empty.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // Try to read first line
        try {
            $file = new \SplFileObject( $file_path, 'r' );
        } catch ( \RuntimeException $e ) {
            return [
                'valid' => false,
                'error' => __( 'Failed to open file.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $first_line = $file->fgets();

        if ( false === $first_line ) {
            return [
                'valid' => false,
                'error' => __( 'Failed to read file.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        return [ 'valid' => true, 'error' => null ];
    }

    /**
     * Get supported extensions.
     *
     * @return array
     */
    public function get_supported_extensions(): array {
        return [ 'csv', 'tsv', 'txt' ];
    }
}
