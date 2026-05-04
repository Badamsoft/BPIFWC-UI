<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Admin;
use BadamSoft\ProductImporterForWooCommerce\Core\Plugin;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class AdminPage {
    private Plugin $plugin;
    private string $page_hook = '';

    public function __construct( Plugin $plugin ) {
        $this->plugin = $plugin;
    }

    private const MENU_POSITION = 55.1;

    /**
     * Register the admin menu page.
     */
    public function register_menu_page(): void {
        $page_title = __( 'BadamSoft Product Importer for WooCommerce', 'badamsoft-product-importer-for-woocommerce' );
        $menu_title = __( 'BadamSoft Product Importer', 'badamsoft-product-importer-for-woocommerce' );

        $this->page_hook = add_menu_page(
            $page_title,
            $menu_title,
            'manage_woocommerce',
            'badamsoft-product-importer-for-woocommerce',
            [ $this, 'render_page' ],
            $this->get_menu_icon(),
            self::MENU_POSITION
        );

        remove_submenu_page(
            'badamsoft-product-importer-for-woocommerce',
            'badamsoft-product-importer-for-woocommerce'
        );

        global $submenu;

        if ( isset( $submenu['badamsoft-product-importer-for-woocommerce'] ) && is_array( $submenu['badamsoft-product-importer-for-woocommerce'] ) ) {
            $submenu['badamsoft-product-importer-for-woocommerce'] = [];
        }
    }

    /**
     * Render the main admin page container.
     */
    public function render_page(): void {
        ?>
        <div id="pifwc-admin-root" class="pifwc-admin-wrap" data-version="<?php echo esc_attr( PIFWC_VERSION ); ?>">
            <!-- React app will mount here -->
            <div style="padding: 40px; text-align: center; color: #666;">
                <p>Loading Product Importer...</p>
                <p style="font-size: 12px; margin-top: 10px;">If this message persists, please check browser console for errors.</p>
            </div>
        </div>
        <?php
    }

    /**
     * Enqueue admin assets on plugin pages.
     *
     * @param string $hook_suffix Current admin page hook suffix.
     */
    public function enqueue_admin_assets( string $hook_suffix ): void {
        if ( ! $this->is_plugin_page( $hook_suffix ) ) {
            return;
        }

        $asset_url  = $this->plugin->get_plugin_url() . 'assets/admin/';
        $asset_path = $this->plugin->get_plugin_path() . 'assets/admin/';

        $js_version = '';
        $css_version = '';

        // Enqueue React app CSS.
        if ( file_exists( $asset_path . 'css/app.css' ) ) {
            $css_version = (string) filemtime( $asset_path . 'css/app.css' );
            wp_enqueue_style(
                'pifwc-admin-styles',
                $asset_url . 'css/app.css',
                [],
                $css_version
            );
        }

        // Enqueue React app JS.
        if ( file_exists( $asset_path . 'js/app.js' ) ) {
            $js_version = (string) filemtime( $asset_path . 'js/app.js' );
            // Enqueue wp-api for proper REST authentication
            wp_enqueue_script( 'wp-api' );
            
            // Add inline script with data BEFORE main script.
            wp_add_inline_script(
                'jquery', // Use jquery as dependency since it loads early
                'window.pifwcAdmin = ' . wp_json_encode( array_merge( $this->get_localized_data(), [
                    'build' => [
                        'js_version'  => $js_version,
                        'css_version' => $css_version,
                    ],
                ] ) ) . ';' . "\n",
                'after'
            );

            wp_enqueue_script(
                'pifwc-admin-app',
                $asset_url . 'js/app.js',
                [ 'jquery', 'wp-api' ],
                $js_version,
                true
            );

            // Add type="module" for ES modules support.
            add_filter( 'script_loader_tag', function( $tag, $handle ) {
                if ( 'pifwc-admin-app' === $handle ) {
                    return str_replace( ' src', ' type="module" src', $tag );
                }
                return $tag;
            }, 10, 2 );

            // Set script translations.
            wp_set_script_translations( 'pifwc-admin-app', 'badamsoft-product-importer-for-woocommerce' );
        }
    }

    /**
     * Check if current page is a plugin page.
     *
     * @param string $hook_suffix Current admin page hook suffix.
     * @return bool
     */
    private function is_plugin_page( string $hook_suffix ): bool {
        return strpos( $hook_suffix, 'badamsoft-product-importer-for-woocommerce' ) !== false;
    }

    /**
     * Get localized data for the admin app.
     *
     * @return array<string, mixed>
     */
    private function get_localized_data(): array {
        $plugin_name = __( 'BadamSoft Product Importer for WooCommerce', 'badamsoft-product-importer-for-woocommerce' );

        $locale = function_exists( 'get_user_locale' ) ? (string) get_user_locale() : (string) get_locale();
        $locale = $locale !== '' ? $locale : 'en_US';

        $i18n_base = [];
        $i18n_locale = [];

        $lang_dir = $this->plugin->get_plugin_path() . 'languages/';
        $base_path = $lang_dir . 'badamsoft-product-importer-for-woocommerce-en_US.php';
        if ( file_exists( $base_path ) ) {
            $loaded = require $base_path;
            $i18n_base = is_array( $loaded ) ? $loaded : [];
        }

        $locale_path = $lang_dir . 'badamsoft-product-importer-for-woocommerce-' . $locale . '.php';
        if ( file_exists( $locale_path ) ) {
            $loaded = require $locale_path;
            $i18n_locale = is_array( $loaded ) ? $loaded : [];
        }

        $i18n_dict = array_merge( $i18n_base, $i18n_locale );

        $import_ui_config = apply_filters(
            'pifwc_import_ui_config',
            [
                'productTypes' => [
                    [
                        'value' => 'simple',
                        'label' => __( 'Simple Product', 'badamsoft-product-importer-for-woocommerce' ),
                    ],
                ],
                'supportsVariationAttributes' => false,
            ]
        );

        return [
            'pluginName' => $plugin_name,
            'pluginUrl'  => $this->plugin->get_plugin_url(),
            'version'   => PIFWC_VERSION,
            'restUrl'   => rest_url( 'pifwc/v1/' ),
            'nonce'     => wp_create_nonce( 'wp_rest' ),
            'adminUrl'  => admin_url( 'admin.php?page=badamsoft-product-importer-for-woocommerce' ),
            'importUi'  => $import_ui_config,
            'locale'    => $locale,
            'i18nDict'  => $i18n_dict,
            'i18n'      => [
                'dashboard'        => __( 'Dashboard', 'badamsoft-product-importer-for-woocommerce' ),
                'newImport'        => __( 'New Import', 'badamsoft-product-importer-for-woocommerce' ),
                'profiles'         => __( 'Profiles', 'badamsoft-product-importer-for-woocommerce' ),
                'history'          => __( 'History', 'badamsoft-product-importer-for-woocommerce' ),
                'settings'         => __( 'Settings', 'badamsoft-product-importer-for-woocommerce' ),
                'help'             => __( 'Help & Docs', 'badamsoft-product-importer-for-woocommerce' ),
            ],
        ];
    }

    /**
     * Get the page hook.
     *
     * @return string
     */
    public function get_page_hook(): string {
        return $this->page_hook;
    }

    /**
     * Get the menu icon.
     *
     * Supports:
     * - Custom SVG file from assets/images/menu-icon.svg
     * - Base64-encoded SVG
     * - Dashicons fallback
     *
     * @return string
     */
    private function get_menu_icon(): string {
        // Check for custom SVG icon file.
        $icon_path = $this->plugin->get_plugin_path() . 'assets/images/menu-icon.svg';

        if ( file_exists( $icon_path ) ) {
            $svg_content = file_get_contents( $icon_path );

            if ( false !== $svg_content ) {
                return 'data:image/svg+xml;base64,' . base64_encode( $svg_content );
            }
        }

        // Default: database-import dashicon.
        return 'dashicons-database-import';
    }
}
