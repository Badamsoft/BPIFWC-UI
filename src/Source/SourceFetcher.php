<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Source;

use BadamSoft\ProductImporterForWooCommerce\FileParser\FileStorage;

class SourceFetcher {
    public const TYPE_LOCAL = 'local';

    private FileStorage $file_storage;

    public function __construct() {
        $this->file_storage = new FileStorage();
    }

    /**
     * Fetch file from source and return file_id.
     *
     * @param string $type   Source type (local only).
     * @param array  $config Source configuration.
     * @return array Result with file_id or error.
     */
    public function fetch( string $type, array $config ): array {
        switch ( $type ) {
            case self::TYPE_LOCAL:
                return $this->fetch_local( $config );
            default:
                return [
                    'success' => false,
                    'error'   => __( 'This source type is not supported.', 'badamsoft-product-importer-for-woocommerce' ),
                ];
        }
    }

    /**
     * Fetch from local file (already uploaded).
     */
    private function fetch_local( array $config ): array {
        $file_id = $config['file_id'] ?? '';

        if ( empty( $file_id ) ) {
            return [
                'success' => false,
                'error'   => __( 'File ID is required for local source.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $file_path = $this->file_storage->get_file_path( $file_id );
        if ( ! $file_path ) {
            return [
                'success' => false,
                'error'   => __( 'File not found or expired.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        return [
            'success' => true,
            'file_id' => $file_id,
        ];
    }
}
