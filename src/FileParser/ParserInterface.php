<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\FileParser;

interface ParserInterface {
    /**
     * Parse file and return data as array.
     *
     * @param string $file_path Absolute path to file.
     * @return array{success: bool, data: array, headers: array, total_rows: int, error: string|null}
     */
    public function parse( string $file_path ): array;

    /**
     * Parse file in chunks for memory efficiency.
     *
     * @param string   $file_path  Absolute path to file.
     * @param int      $chunk_size Number of rows per chunk.
     * @param callable $callback   Callback function to process each chunk.
     * @return array{success: bool, total_rows: int, error: string|null}
     */
    public function parse_chunked( string $file_path, int $chunk_size, callable $callback ): array;

    /**
     * Get file headers/column names.
     *
     * @param string $file_path Absolute path to file.
     * @return array
     */
    public function get_headers( string $file_path ): array;

    /**
     * Validate file format.
     *
     * @param string $file_path Absolute path to file.
     * @return array{valid: bool, error: string|null}
     */
    public function validate( string $file_path ): array;

    /**
     * Get supported file extensions.
     *
     * @return array
     */
    public function get_supported_extensions(): array;
}
