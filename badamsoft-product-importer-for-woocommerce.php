<?php
/**
 * Plugin Name:           BadamSoft Product Importer for WooCommerce
 * Description:           Easy CSV product importer for WooCommerce.
 * Version:               2.0.4
 * Requires at least:     6.5
 * Tested up to:          6.9
 * Requires PHP:          7.4
 * Requires Plugins:      woocommerce
 * WC requires at least:  8.0
 * WC tested up to:       10.4.3
 * Author:                BadamSoft LLC
 * Author URI:            https://badamsoft.com
 * License:               GPL-2.0-or-later
 * Text Domain:           badamsoft-product-importer-for-woocommerce
 * Domain Path:           /languages
 */

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Declare HPOS compatibility.
add_action(
    'before_woocommerce_init',
    static function (): void {
        if ( class_exists( '\\Automattic\\WooCommerce\\Utilities\\FeaturesUtil' ) ) {
            \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
        }
    }
);

// Plugin constants.
if ( ! defined( 'PIFWC_VERSION' ) ) {
    define( 'PIFWC_VERSION', '2.0.4' );
}

if ( ! defined( 'PIFWC_PLUGIN_FILE' ) ) {
    define( 'PIFWC_PLUGIN_FILE', __FILE__ );
}

if ( ! defined( 'PIFWC_PLUGIN_BASENAME' ) ) {
    define( 'PIFWC_PLUGIN_BASENAME', plugin_basename( __FILE__ ) );
}

if ( ! defined( 'PIFWC_PLUGIN_DIR' ) ) {
    define( 'PIFWC_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
}

if ( ! defined( 'PIFWC_PLUGIN_URL' ) ) {
    define( 'PIFWC_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
}

// Plugin meta links.
add_filter( 'plugin_row_meta', 'pifwc_plugin_row_meta', 10, 2 );

/**
 * Add plugin meta links (Documentation).
 *
 * @param array  $links Plugin meta links.
 * @param string $file  Plugin file.
 * @return array
 */
function pifwc_plugin_row_meta( array $links, string $file ): array {
    if ( PIFWC_PLUGIN_BASENAME !== $file ) {
        return $links;
    }

    $links[] = '<a href="https://badamsoft.com/documentation/?doc_product=importer&cat=importer-guide" target="_blank">' . esc_html__( 'Documentation', 'badamsoft-product-importer-for-woocommerce' ) . '</a>';

    return $links;
}

// PSR-4 autoloader for the core plugin classes (BadamSoft\ProductImporterForWooCommerce\*) from src/.
$pifwc_src_psr4_autoload = PIFWC_PLUGIN_DIR . 'src/autoload.php';

if ( file_exists( $pifwc_src_psr4_autoload ) ) {
    require_once $pifwc_src_psr4_autoload;
}

// Shared Composer autoloader (plugin core dependencies).
$pifwc_composer_autoload        = PIFWC_PLUGIN_DIR . 'vendor/autoload.php';
$pifwc_composer_autoload_backup = PIFWC_PLUGIN_DIR . '___vendor/autoload.php';

$pifwc_has_composer_autoload = false;

if ( file_exists( $pifwc_composer_autoload ) ) {
    require_once $pifwc_composer_autoload;
    $pifwc_has_composer_autoload = true;
} elseif ( file_exists( $pifwc_composer_autoload_backup ) ) {
    require_once $pifwc_composer_autoload_backup;
    $pifwc_has_composer_autoload = true;
}

// Load the shared plugin core.
$pifwc_core_bootstrap = PIFWC_PLUGIN_DIR . 'includes/bootstrap.php';

if ( file_exists( $pifwc_core_bootstrap ) ) {
    require_once $pifwc_core_bootstrap;
}
