<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\FileParser\Parsers;

interface ParserInterface {
    /**
     * Parse file and return headers and rows.
     *
     * @param string $file_path Path to the file.
     * @param int    $max_rows  Maximum rows to read (excluding header).
     * @return array{
     *     headers: array<string>,
     *     rows: array<array<string>>,
     *     encoding: string,
     *     delimiter: string|null
     * }
     * @throws \RuntimeException If parsing fails.
     */
    public function parse( string $file_path, int $max_rows = 100 ): array;

    /**
     * Get the format this parser handles.
     *
     * @return string
     */
    public function get_format(): string;
}
