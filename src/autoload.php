<?php

declare(strict_types=1);

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

(static function (): void {
    static $registered = false;

    if ( $registered ) {
        return;
    }

    spl_autoload_register(
        static function ( string $class ): void {
            $prefix = 'BadamSoft\\ProductImporterForWooCommerce\\';
            $len    = strlen( $prefix );

            if ( 0 !== strncmp( $prefix, $class, $len ) ) {
                return;
            }

            $relative = substr( $class, $len );
            $relative = str_replace( '\\', '/', $relative );

            $file = __DIR__ . '/' . $relative . '.php';

            if ( file_exists( $file ) ) {
                require $file;
                return;
            }
        }
    );

    $registered = true;
})();
