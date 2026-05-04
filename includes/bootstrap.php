<?php

declare(strict_types=1);

use BadamSoft\ProductImporterForWooCommerce\Core\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( file_exists( PIFWC_PLUGIN_DIR . '/src/autoload.php' ) ) {
    require_once PIFWC_PLUGIN_DIR . '/src/autoload.php';
}

if ( ! class_exists( 'BadamSoft\\ProductImporterForWooCommerce\\Core\\Plugin' ) ) {
    $pifwc_src_plugin_file = PIFWC_PLUGIN_DIR . '/src/Core/Plugin.php';

    if ( file_exists( $pifwc_src_plugin_file ) ) {
        require_once $pifwc_src_plugin_file;
    }
}

// Initialize core on plugins_loaded.
add_action(
    'plugins_loaded',
    static function (): void {
        Plugin::init( PIFWC_PLUGIN_FILE );
    },
    20
);
