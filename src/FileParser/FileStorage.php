<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\FileParser;

class FileStorage {
    public const TMP_DIR = 'pifwc/tmp';
    public const MAX_FILE_SIZE = 104857600; // 100MB

    private string $upload_dir;
    private string $tmp_dir;

    private function filesystem() {
        if ( ! defined( 'ABSPATH' ) ) {
            return null;
        }

        require_once ABSPATH . 'wp-admin/includes/file.php';

        global $wp_filesystem;

        if ( ! is_object( $wp_filesystem ) ) {
            WP_Filesystem();
        }

        return $wp_filesystem;
    }

    public function __construct() {
        $upload_dir = wp_upload_dir();
        $this->upload_dir = $upload_dir['basedir'];
        $this->tmp_dir = trailingslashit( $this->upload_dir ) . self::TMP_DIR;
    }

    /**
     * Get the temporary directory path.
     *
     * @return string
     */
    public function get_tmp_dir(): string {
        return $this->tmp_dir;
    }

    /**
     * Ensure the temporary directory exists.
     *
     * @return bool
     */
    public function ensure_tmp_dir(): bool {
        $fs = $this->filesystem();

        if ( ! is_dir( $this->tmp_dir ) ) {
            $created = wp_mkdir_p( $this->tmp_dir );

            if ( ! $created ) {
                return false;
            }
        }

        if ( ! is_object( $fs ) ) {
            return is_dir( $this->tmp_dir );
        }

        // Create .htaccess to protect directory.
        $htaccess = trailingslashit( $this->tmp_dir ) . '.htaccess';

        if ( ! $fs->exists( $htaccess ) ) {
            $fs->put_contents( $htaccess, "Deny from all\n", defined( 'FS_CHMOD_FILE' ) ? FS_CHMOD_FILE : false );
        }

        // Create index.php.
        $index = trailingslashit( $this->tmp_dir ) . 'index.php';

        if ( ! $fs->exists( $index ) ) {
            $fs->put_contents( $index, "<?php\n// Silence is golden.\n", defined( 'FS_CHMOD_FILE' ) ? FS_CHMOD_FILE : false );
        }

        return is_dir( $this->tmp_dir );
    }

    /**
     * Generate a unique file ID.
     *
     * @return string
     */
    public function generate_file_id(): string {
        return wp_generate_uuid4();
    }

    /**
     * Store uploaded file.
     *
     * @param array $file $_FILES array element.
     * @return array{success: bool, file_id: string|null, file_path: string|null, original_name: string|null, error: string|null}
     */
    public function store_upload( array $file ): array {
        $result = [
            'success'       => false,
            'file_id'       => null,
            'file_path'     => null,
            'original_name' => null,
            'error'         => null,
        ];

        // Validate upload.
        if ( ! isset( $file['tmp_name'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
            $result['error'] = __( 'Invalid file upload.', 'badamsoft-product-importer-for-woocommerce' );
            return $result;
        }

        if ( isset( $file['error'] ) && UPLOAD_ERR_OK !== $file['error'] ) {
            $result['error'] = $this->get_upload_error_message( $file['error'] );
            return $result;
        }

        // Check file size.
        $max_size = $this->get_max_file_size();

        if ( $file['size'] > $max_size ) {
            $result['error'] = sprintf(
                /* translators: %s: maximum file size */
                __( 'File size exceeds the maximum allowed size of %s.', 'badamsoft-product-importer-for-woocommerce' ),
                size_format( $max_size )
            );
            return $result;
        }

        // Validate file type.
        $validation = $this->validate_file_type( $file['tmp_name'], $file['name'] );

        if ( ! $validation['valid'] ) {
            $result['error'] = $validation['error'];
            return $result;
        }

        // Ensure tmp directory exists.
        if ( ! $this->ensure_tmp_dir() ) {
            $result['error'] = __( 'Failed to create temporary directory.', 'badamsoft-product-importer-for-woocommerce' );
            return $result;
        }

        // Generate file ID and path.
        $file_id   = $this->generate_file_id();
        $extension = strtolower( pathinfo( $file['name'], PATHINFO_EXTENSION ) );

        $upload_dir_filter = function ( $uploads ) {
            $uploads['path']    = $this->tmp_dir;
            $uploads['basedir'] = $this->tmp_dir;
            $uploads['subdir']  = '';
            return $uploads;
        };

        add_filter( 'upload_dir', $upload_dir_filter );

        $overrides = [
            'test_form'               => false,
            'unique_filename_callback' => function ( $dir, $name, $ext ) use ( $file_id, $extension ) {
                $ext_to_use = $ext !== '' ? $ext : ( $extension !== '' ? '.' . $extension : '' );
                return $file_id . $ext_to_use;
            },
        ];

        $uploaded = wp_handle_upload( $file, $overrides );

        remove_filter( 'upload_dir', $upload_dir_filter );

        if ( ! is_array( $uploaded ) || isset( $uploaded['error'] ) ) {
            $result['error'] = is_array( $uploaded ) && isset( $uploaded['error'] ) ? (string) $uploaded['error'] : __( 'Failed to save uploaded file.', 'badamsoft-product-importer-for-woocommerce' );
            return $result;
        }

        $file_path = isset( $uploaded['file'] ) ? (string) $uploaded['file'] : '';

        if ( $file_path === '' ) {
            $result['error'] = __( 'Failed to save uploaded file.', 'badamsoft-product-importer-for-woocommerce' );
            return $result;
        }

        // Store metadata.
        $this->store_file_metadata( $file_id, [
            'original_name' => $file['name'],
            'file_path'     => $file_path,
            'size'          => $file['size'],
            'mime_type'     => $file['type'],
            'uploaded_at'   => current_time( 'mysql' ),
        ] );

        $result['success']       = true;
        $result['file_id']       = $file_id;
        $result['file_path']     = $file_path;
        $result['original_name'] = $file['name'];

        return $result;
    }

    /**
     * Get file path by file ID.
     *
     * @param string $file_id File ID.
     * @return string|null File path or null if not found.
     */
    public function get_file_path( string $file_id ): ?string {
        $fs = $this->filesystem();
        $metadata = $this->get_file_metadata( $file_id );

        if ( null !== $metadata && isset( $metadata['file_path'] ) ) {
            $file_path = (string) $metadata['file_path'];
            if ( $file_path !== '' && ( is_object( $fs ) ? $fs->exists( $file_path ) : file_exists( $file_path ) ) ) {
                return $file_path;
            }
        }

        if ( ! preg_match( '/^[a-f0-9-]{36}$/i', $file_id ) ) {
            return null;
        }

        if ( ! is_dir( $this->tmp_dir ) ) {
            return null;
        }

        if ( is_object( $fs ) ) {
            $list = $fs->dirlist( $this->tmp_dir );
            if ( is_array( $list ) ) {
                foreach ( $list as $name => $info ) {
                    if ( ! is_string( $name ) ) {
                        continue;
                    }
                    if ( 0 !== strpos( $name, $file_id . '.' ) ) {
                        continue;
                    }
                    $candidate = trailingslashit( $this->tmp_dir ) . $name;
                    if ( $fs->is_file( $candidate ) ) {
                        $this->store_file_metadata( $file_id, [
                            'original_name' => basename( $candidate ),
                            'file_path'     => $candidate,
                            'size'          => is_array( $info ) && isset( $info['size'] ) ? (int) $info['size'] : (int) $fs->size( $candidate ),
                            'uploaded_at'   => current_time( 'mysql' ),
                        ] );

                        return $candidate;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Get file metadata.
     *
     * @param string $file_id File ID.
     * @return array|null
     */
    public function get_file_metadata( string $file_id ): ?array {
        $fs = $this->filesystem();
        $transient_key = 'pifwc_file_' . $file_id;
        $metadata = get_transient( $transient_key );

        if ( is_array( $metadata ) ) {
            return $metadata;
        }

        if ( ! preg_match( '/^[a-f0-9-]{36}$/i', $file_id ) ) {
            return null;
        }

        if ( ! is_dir( $this->tmp_dir ) ) {
            return null;
        }

        if ( is_object( $fs ) ) {
            $list = $fs->dirlist( $this->tmp_dir );
            if ( is_array( $list ) ) {
                foreach ( $list as $name => $info ) {
                    if ( ! is_string( $name ) ) {
                        continue;
                    }
                    if ( 0 !== strpos( $name, $file_id . '.' ) ) {
                        continue;
                    }
                    $candidate = trailingslashit( $this->tmp_dir ) . $name;
                    if ( $fs->is_file( $candidate ) ) {
                        $metadata = [
                            'original_name' => basename( $candidate ),
                            'file_path'     => $candidate,
                            'size'          => is_array( $info ) && isset( $info['size'] ) ? (int) $info['size'] : (int) $fs->size( $candidate ),
                            'uploaded_at'   => current_time( 'mysql' ),
                        ];

                        $this->store_file_metadata( $file_id, $metadata );

                        return $metadata;
                    }
                }
            }
        }

        return null;
    }

    /**
     * Store file metadata.
     *
     * @param string $file_id  File ID.
     * @param array  $metadata Metadata array.
     */
    private function store_file_metadata( string $file_id, array $metadata ): void {
        $transient_key = 'pifwc_file_' . $file_id;
        set_transient( $transient_key, $metadata, DAY_IN_SECONDS );
    }

    /**
     * Delete file and its metadata.
     *
     * @param string $file_id File ID.
     * @return bool
     */
    public function delete_file( string $file_id ): bool {
        $fs = $this->filesystem();
        $file_path = $this->get_file_path( $file_id );

        if ( null !== $file_path && ( is_object( $fs ) ? $fs->exists( $file_path ) : file_exists( $file_path ) ) ) {
            wp_delete_file( $file_path );
        }

        if ( null === $file_path && preg_match( '/^[a-f0-9-]{36}$/i', $file_id ) && is_dir( $this->tmp_dir ) && is_object( $fs ) ) {
            $list = $fs->dirlist( $this->tmp_dir );
            if ( is_array( $list ) ) {
                foreach ( $list as $name => $info ) {
                    if ( ! is_string( $name ) ) {
                        continue;
                    }
                    if ( 0 !== strpos( $name, $file_id . '.' ) ) {
                        continue;
                    }
                    $candidate = trailingslashit( $this->tmp_dir ) . $name;
                    if ( $fs->is_file( $candidate ) ) {
                        wp_delete_file( $candidate );
                    }
                }
            }
        }

        $transient_key = 'pifwc_file_' . $file_id;
        delete_transient( $transient_key );

        return true;
    }

    /**
     * Validate file type.
     *
     * @param string $file_path File path.
     * @param string $file_name Original file name.
     * @return array{valid: bool, error: string|null}
     */
    private function validate_file_type( string $file_path, string $file_name ): array {
        $allowed_extensions = (array) apply_filters( 'pifwc_allowed_upload_extensions', [ 'csv', 'tsv', 'txt' ] );
        $extension = strtolower( pathinfo( $file_name, PATHINFO_EXTENSION ) );

        if ( ! in_array( $extension, $allowed_extensions, true ) ) {
            return [
                'valid' => false,
                'error' => sprintf(
                    /* translators: %s: allowed file extensions */
                    __( 'Invalid file type. Allowed types: %s.', 'badamsoft-product-importer-for-woocommerce' ),
                    implode( ', ', $allowed_extensions )
                ),
            ];
        }

        // Check mime type.
        $finfo = new \finfo( FILEINFO_MIME_TYPE );
        $mime_type = $finfo->file( $file_path );

        $allowed_mimes = (array) apply_filters(
            'pifwc_allowed_upload_mimes',
            [
                'text/plain',
                'text/csv',
                'text/tab-separated-values',
                'application/csv',
                'application/octet-stream',
            ]
        );

        if ( ! in_array( $mime_type, $allowed_mimes, true ) ) {
            return [
                'valid' => false,
                'error' => __( 'Invalid file content type.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        return [ 'valid' => true, 'error' => null ];
    }

    /**
     * Get maximum file size.
     *
     * @return int Maximum file size in bytes.
     */
    public function get_max_file_size(): int {
        $max_size = self::MAX_FILE_SIZE;

        // Check PHP limits.
        $upload_max = wp_convert_hr_to_bytes( ini_get( 'upload_max_filesize' ) );
        $post_max   = wp_convert_hr_to_bytes( ini_get( 'post_max_size' ) );

        $php_max = min( $upload_max, $post_max );

        if ( $php_max > 0 && $php_max < $max_size ) {
            $max_size = $php_max;
        }

        return (int) apply_filters( 'pifwc_max_file_size', $max_size );
    }

    /**
     * Get upload error message.
     *
     * @param int $error_code PHP upload error code.
     * @return string
     */
    private function get_upload_error_message( int $error_code ): string {
        $messages = [
            UPLOAD_ERR_INI_SIZE   => __( 'The uploaded file exceeds the upload_max_filesize directive in php.ini.', 'badamsoft-product-importer-for-woocommerce' ),
            UPLOAD_ERR_FORM_SIZE  => __( 'The uploaded file exceeds the MAX_FILE_SIZE directive in the HTML form.', 'badamsoft-product-importer-for-woocommerce' ),
            UPLOAD_ERR_PARTIAL    => __( 'The uploaded file was only partially uploaded.', 'badamsoft-product-importer-for-woocommerce' ),
            UPLOAD_ERR_NO_FILE    => __( 'No file was uploaded.', 'badamsoft-product-importer-for-woocommerce' ),
            UPLOAD_ERR_NO_TMP_DIR => __( 'Missing a temporary folder.', 'badamsoft-product-importer-for-woocommerce' ),
            UPLOAD_ERR_CANT_WRITE => __( 'Failed to write file to disk.', 'badamsoft-product-importer-for-woocommerce' ),
            UPLOAD_ERR_EXTENSION  => __( 'A PHP extension stopped the file upload.', 'badamsoft-product-importer-for-woocommerce' ),
        ];

        return $messages[ $error_code ] ?? __( 'Unknown upload error.', 'badamsoft-product-importer-for-woocommerce' );
    }

    /**
     * Cleanup old temporary files.
     *
     * @param int $max_age Maximum age in seconds.
     * @return int Number of deleted files.
     */
    public function cleanup_old_files( int $max_age = DAY_IN_SECONDS ): int {
        $fs = $this->filesystem();
        if ( ! is_dir( $this->tmp_dir ) ) {
            return 0;
        }

        if ( ! is_object( $fs ) ) {
            return 0;
        }

        $deleted = 0;
        $now     = time();

        $files = $fs->dirlist( $this->tmp_dir );

        if ( ! is_array( $files ) ) {
            return 0;
        }

        foreach ( $files as $file_name => $info ) {
            if ( ! is_string( $file_name ) ) {
                continue;
            }

            // Skip protection files.
            if ( in_array( $file_name, [ '.htaccess', 'index.php' ], true ) ) {
                continue;
            }

            $file_path = trailingslashit( $this->tmp_dir ) . $file_name;

            if ( ! $fs->is_file( $file_path ) ) {
                continue;
            }

            $mtime = null;
            if ( is_array( $info ) && isset( $info['lastmodunix'] ) ) {
                $mtime = (int) $info['lastmodunix'];
            } elseif ( method_exists( $fs, 'mtime' ) ) {
                $mtime = (int) $fs->mtime( $file_path );
            }

            if ( null === $mtime ) {
                continue;
            }

            $file_age = $now - $mtime;

            if ( $file_age > $max_age ) {
                wp_delete_file( $file_path );
                $deleted++;
            }
        }

        return $deleted;
    }

    /**
     * Get list of uploaded files.
     *
     * @param int $limit Maximum number of files to return.
     * @return array<int, array{file_id: string, file_path: string, original_name: string, size: int, upload_time: int, extension: string}>
     */
    public function get_uploaded_files( int $limit = 50 ): array {
        $fs = $this->filesystem();
        if ( ! is_dir( $this->tmp_dir ) ) {
            return [];
        }

        if ( ! is_object( $fs ) ) {
            return [];
        }

        $files = $fs->dirlist( $this->tmp_dir );

        if ( ! is_array( $files ) ) {
            return [];
        }

        $result = [];

        foreach ( $files as $file_name => $info ) {
            if ( ! is_string( $file_name ) ) {
                continue;
            }

            // Skip protection files.
            if ( in_array( $file_name, [ '.htaccess', 'index.php' ], true ) ) {
                continue;
            }

            $file_path = trailingslashit( $this->tmp_dir ) . $file_name;

            if ( ! $fs->is_file( $file_path ) ) {
                continue;
            }

            // Extract file_id (UUID) and extension.
            $parts = explode( '.', $file_name );
            if ( count( $parts ) < 2 ) {
                continue;
            }

            $file_id   = $parts[0];
            $extension = end( $parts );

            // Try to get original name from metadata or use file_id.
            $metadata = $this->get_file_metadata( $file_id );
            $original_name = is_array( $metadata ) && isset( $metadata['original_name'] )
                ? (string) $metadata['original_name']
                : '';
            $original_name = $this->normalize_uploaded_file_name( $original_name, $file_name, $file_id );

            $size = is_array( $info ) && isset( $info['size'] ) ? (int) $info['size'] : (int) $fs->size( $file_path );

            $mtime = null;
            if ( is_array( $info ) && isset( $info['lastmodunix'] ) ) {
                $mtime = (int) $info['lastmodunix'];
            } elseif ( method_exists( $fs, 'mtime' ) ) {
                $mtime = (int) $fs->mtime( $file_path );
            }

            if ( null === $mtime ) {
                $mtime = 0;
            }

            $result[] = [
                'file_id'       => $file_id,
                'file_path'     => $file_path,
                'original_name' => $original_name,
                'size'          => $size,
                'upload_time'   => $mtime,
                'extension'     => $extension,
            ];
        }

        // Sort by upload time (newest first).
        usort( $result, function ( $a, $b ) {
            return $b['upload_time'] - $a['upload_time'];
        } );

        // Limit results.
        return array_slice( $result, 0, $limit );
    }

    /**
     * Normalize stored file names for display in the UI.
     */
    private function normalize_uploaded_file_name( string $original_name, string $file_name, string $file_id ): string {
        $original_name = trim( $original_name );
        if ( '' !== $original_name && $original_name !== $file_name && $original_name !== $file_id ) {
            return $original_name;
        }

        $pathinfo = pathinfo( $file_name );
        $basename = (string) ( $pathinfo['filename'] ?? $file_name );
        $extension = (string) ( $pathinfo['extension'] ?? '' );

        if ( $basename === $file_id ) {
            return '' !== $extension ? sprintf( 'Uploaded file.%s', $extension ) : 'Uploaded file';
        }

        return $file_name;
    }
}
