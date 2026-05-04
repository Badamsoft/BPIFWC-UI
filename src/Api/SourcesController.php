<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Api;

class SourcesController {
    public const NAMESPACE = 'pifwc/v1';

    /**
     * Register REST API routes.
     */
    public function register_routes(): void {
        do_action( 'pifwc_register_sources_controller_routes' );
    }
}
