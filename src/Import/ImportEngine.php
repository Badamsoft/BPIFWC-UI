<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Import;

use BadamSoft\ProductImporterForWooCommerce\FileParser\FileStorage;
use BadamSoft\ProductImporterForWooCommerce\FileParser\ParserFactory;
use BadamSoft\ProductImporterForWooCommerce\Repository\JobsRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\HistoryRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\LogsRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\ProfilesRepository;
use BadamSoft\ProductImporterForWooCommerce\Media\MediaHandler;

class ImportEngine {
    public const MODE_CREATE = 'create';
    public const MODE_UPDATE = 'update';
    public const MODE_BOTH   = 'both';

    public const MATCH_BY_SKU = 'sku';
    public const MATCH_BY_ID  = 'id';

    public const STATUS_PENDING    = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED  = 'completed';
    public const STATUS_FAILED     = 'failed';
    public const STATUS_ABORTED    = 'aborted';

    private FileStorage $file_storage;
    private JobsRepository $jobs_repository;
    private HistoryRepository $history_repository;
    private LogsRepository $logs_repository;
    private ProfilesRepository $profiles_repository;
    private MediaHandler $media_handler;
    private array $registered_taxonomies = [];

    private int $batch_size = 50;

    private ?bool $debug_mode_cache = null;

    private const META_IMPORTED_BY_PROFILE = '_pifwc_imported_by_profile';
    private const META_IMPORT_SNAPSHOT     = '_pifwc_import_snapshot';
    private const META_LAST_IMPORTED_AT    = '_pifwc_last_imported_at';

    private function is_debug_mode_enabled(): bool {
        if ( null !== $this->debug_mode_cache ) {
            return $this->debug_mode_cache;
        }

        $enabled = false;
        if ( function_exists( 'get_option' ) ) {
            $opt = get_option( 'pifwc_settings', [] );
            $opt = is_array( $opt ) ? $opt : [];
            $debug = is_array( $opt['debug'] ?? null ) ? (array) $opt['debug'] : [];
            $enabled = ! empty( $debug['debug_mode'] );
        }

        $this->debug_mode_cache = (bool) $enabled;
        return $this->debug_mode_cache;
    }

    private function debug_log( string $message ): void {
        if ( ! $this->is_debug_mode_enabled() || ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
            return;
        }

        // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
        error_log( $message );
    }

    private function get_debug_watch_skus(): array {
        $default = [];

        if ( ! function_exists( 'get_option' ) ) {
            return $default;
        }

        $opt = get_option( 'pifwc_settings', [] );
        $opt = is_array( $opt ) ? $opt : [];
        $debug = is_array( $opt['debug'] ?? null ) ? (array) $opt['debug'] : [];
        $raw = isset( $debug['watch_skus'] ) ? (string) $debug['watch_skus'] : '';
        $raw = trim( $raw );
        if ( '' === $raw ) {
            return $default;
        }

        $parts = preg_split( '/[\s,;|]+/', $raw );
        $parts = is_array( $parts ) ? $parts : [];
        $parts = array_values( array_filter( array_map( static fn( $v ) => trim( (string) $v ), $parts ), static fn( $v ) => $v !== '' ) );
        if ( empty( $parts ) ) {
            return $default;
        }

        return $parts;
    }

    private function is_debug_watch_sku( ?string $sku ): bool {
        $sku = is_string( $sku ) ? trim( $sku ) : '';
        if ( '' === $sku ) {
            return false;
        }

        foreach ( $this->get_debug_watch_skus() as $watch ) {
            if ( $watch !== '' && $watch === $sku ) {
                return true;
            }
        }

        return false;
    }

    public function __construct(
        JobsRepository $jobs_repository,
        HistoryRepository $history_repository,
        LogsRepository $logs_repository,
        ProfilesRepository $profiles_repository
    ) {
        $this->file_storage = new FileStorage();
        $this->jobs_repository     = $jobs_repository;
        $this->history_repository  = $history_repository;
        $this->logs_repository     = $logs_repository;
        $this->profiles_repository = $profiles_repository;
        $this->media_handler       = new MediaHandler();
    }

    /**
     * Start a new import job.
     *
     * @param string $file_id    Uploaded file ID.
     * @param int    $profile_id Profile ID with mapping.
     * @param array  $options    Import options (mode, match_by).
     * @return array Job creation result.
     */
    public function start_import( string $file_id, int $profile_id, array $options = [] ): array {
        $file_path = $this->file_storage->get_file_path( $file_id );
        if ( null === $file_path ) {
            return [
                'success' => false,
                'error'   => __( 'File not found or expired.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // Get profile.
        $profile = $this->profiles_repository->get_full_profile( $profile_id );
        if ( null === $profile ) {
            return [
                'success' => false,
                'error'   => __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $mapping = $profile['mapping'] ?? [];
        if ( empty( $mapping ) ) {
            return [
                'success' => false,
                'error'   => __( 'Invalid mapping configuration.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // Create parser.
        $parser = ParserFactory::create( $file_path );
        if ( ! $parser ) {
            return [
                'success' => false,
                'error'   => __( 'Unsupported file format.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // Validate file.
        $validation = $parser->validate( $file_path );
        if ( ! $validation['valid'] ) {
            return [
                'success' => false,
                'error'   => $validation['error'],
            ];
        }

        // Parse to get total rows (just headers for now).
        $headers = $parser->get_headers( $file_path );
        $total_rows = 0;
        if ( method_exists( $parser, 'count_rows' ) ) {
            $total_rows = (int) $parser->count_rows( $file_path );
        }

        // Create job record.
        $job_id = $this->jobs_repository->insert( [
            'profile_id' => $profile_id,
            'status'     => self::STATUS_PENDING,
            'meta'       => wp_json_encode( [
                'file_id' => $file_id,
                'options' => $options,
            ] ),
        ] );

        if ( ! $job_id ) {
            return [
                'success' => false,
                'error'   => __( 'Failed to create import job.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // Create history record.
        $history_id = $this->history_repository->insert( [
            'job_id'      => $job_id,
            'total_rows'  => $total_rows,
            'started_at'  => current_time( 'mysql' ),
        ] );

        $this->debug_log( '[PIFWC TRACE] start_import job_id=' . (string) $job_id . ' history_id=' . (string) $history_id . ' profile_id=' . (string) $profile_id . ' file_id=' . (string) $file_id . ' total_rows=' . (string) $total_rows );

        // Process import synchronously for now (can be moved to background later).
        $result = $this->process_import( $job_id, $profile_id, $history_id, $file_path, $mapping, $options );

        return [
            'success'    => true,
            'job_id'     => $job_id,
            'history_id' => $history_id,
            'result'     => $result,
        ];
    }

    public function start_chunked_import( int $profile_id, ?string $file_id = null, array $options_override = [], array $mapping_override = [], array $source_config_override = [] ): array {
        $profile = $this->profiles_repository->get_full_profile( $profile_id );
        if ( null === $profile ) {
            return [
                'success' => false,
                'error'   => __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $source_config = is_array( $profile['source_config'] ?? null ) ? ( $profile['source_config'] ?? [] ) : [];
        if ( ! empty( $source_config_override ) ) {
            $source_config = $source_config_override;
        }

        if ( null === $file_id || '' === $file_id ) {
            $file_id = isset( $source_config['file_id'] ) ? (string) $source_config['file_id'] : null;
        }

        if ( ! $file_id ) {
            return [
                'success' => false,
                'error'   => __( 'File not found or expired.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $file_path = $this->file_storage->get_file_path( (string) $file_id );
        if ( null === $file_path ) {
            return [
                'success' => false,
                'error'   => __( 'File not found or expired.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $mapping = is_array( $profile['mapping'] ?? null ) ? ( $profile['mapping'] ?? [] ) : [];
        if ( ! empty( $mapping_override ) ) {
            $mapping = $mapping_override;
        }
        if ( empty( $mapping ) ) {
            return [
                'success' => false,
                'error'   => __( 'Invalid mapping configuration.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $options = is_array( $profile['options'] ?? null ) ? ( $profile['options'] ?? [] ) : [];
        if ( ! empty( $options_override ) ) {
            $options = $options_override;
        }

        $existing_jobs = $this->jobs_repository->find_by_profile( $profile_id );
        if ( ! empty( $existing_jobs ) && is_object( $existing_jobs[0] ) && ! empty( $existing_jobs[0]->id ) ) {
            $existing_job_id = (int) $existing_jobs[0]->id;
            $existing_status = isset( $existing_jobs[0]->status ) ? (string) $existing_jobs[0]->status : '';
            if ( $existing_job_id > 0 && in_array( $existing_status, [ self::STATUS_PENDING, self::STATUS_PROCESSING, 'running' ], true ) ) {
                $existing_meta_raw = isset( $existing_jobs[0]->meta ) ? (string) $existing_jobs[0]->meta : '';
                $existing_meta = $existing_meta_raw !== '' ? json_decode( $existing_meta_raw, true ) : null;
                $existing_meta = is_array( $existing_meta ) ? $existing_meta : [];
                $existing_file_id = isset( $existing_meta['file_id'] ) ? (string) $existing_meta['file_id'] : '';

                if ( $existing_file_id !== '' && (string) $file_id === $existing_file_id ) {
                    $history_id = 0;
                    $total_rows = 0;
                    if ( method_exists( $this->history_repository, 'get_latest_by_job_row' ) ) {
                        $history_row = $this->history_repository->get_latest_by_job_row( $existing_job_id );
                        if ( is_array( $history_row ) ) {
                            $history_id = (int) ( $history_row['id'] ?? 0 );
                            $total_rows = (int) ( $history_row['total_rows'] ?? 0 );
                        }
                    } else {
                        $history_rows = $this->history_repository->find_by_job( $existing_job_id );
                        if ( ! empty( $history_rows ) && is_object( $history_rows[0] ) ) {
                            $history_id = (int) ( $history_rows[0]->id ?? 0 );
                            $total_rows = (int) ( $history_rows[0]->total_rows ?? 0 );
                        }
                    }

                    $this->debug_log( sprintf( 'PIFWC: Reusing active job_id=%d for profile_id=%d file_id=%s', $existing_job_id, $profile_id, (string) $file_id ) );

                    return [
                        'success'    => true,
                        'job_id'     => $existing_job_id,
                        'history_id' => $history_id,
                        'total_rows' => $total_rows,
                        'reused'     => true,
                    ];
                }
            }
        }

        $initial_parser_state = [];
        if ( isset( $source_config['items_path'] ) && is_string( $source_config['items_path'] ) && $source_config['items_path'] !== '' ) {
            $initial_parser_state['items_path'] = $source_config['items_path'];
        }
        if ( isset( $source_config['item_xpath'] ) && is_string( $source_config['item_xpath'] ) && $source_config['item_xpath'] !== '' ) {
            $initial_parser_state['item_xpath'] = $source_config['item_xpath'];
        }

        $parser = ParserFactory::create( $file_path );
        if ( ! $parser ) {
            return [
                'success' => false,
                'error'   => __( 'Unsupported file format.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $validation = $parser->validate( $file_path );
        if ( ! $validation['valid'] ) {
            return [
                'success' => false,
                'error'   => $validation['error'],
            ];
        }

        $total_rows = 0;
        if ( method_exists( $parser, 'get_import_chunk' ) ) {
            $probe = $parser->get_import_chunk( $file_path, 1, $initial_parser_state );
            $probe_state = is_array( $probe['state'] ?? null ) ? ( $probe['state'] ?? [] ) : [];
            if ( ! empty( $probe_state['converted_csv'] ) && is_string( $probe_state['converted_csv'] ) ) {
                $csv_parser = new \BadamSoft\ProductImporterForWooCommerce\FileParser\CsvParser();
                $total_rows = (int) $csv_parser->count_rows( (string) $probe_state['converted_csv'] );
            }
        }

        if ( $total_rows <= 0 && method_exists( $parser, 'count_rows' ) ) {
            $total_rows = (int) $parser->count_rows( $file_path );
        }

        $job_meta = [
            'file_id'       => (string) $file_id,
            'source_config' => $source_config,
            'options'       => $options,
            'mapping'       => $mapping,
            'chunk_state'   => [
                'parser_state'     => $initial_parser_state,
                'last_parent_id'   => null,
            ],
        ];

        if ( ! empty( $options['delete_missing_products'] ) && $profile_id > 0 && ( $options['mode'] ?? self::MODE_BOTH ) !== self::MODE_CREATE ) {
            $job_meta['chunk_state']['seen_product_ids'] = [];
        }

        $job_id = $this->jobs_repository->insert( [
            'profile_id' => $profile_id,
            'status'     => self::STATUS_PROCESSING,
            'meta'       => wp_json_encode( $job_meta ),
        ] );

        if ( ! $job_id ) {
            return [
                'success' => false,
                'error'   => __( 'Failed to create import job.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $started_at = current_time( 'mysql' );
        $history_id = (int) $this->history_repository->insert( [
            'job_id'     => $job_id,
            'total_rows' => $total_rows,
            'started_at' => $started_at,
        ] );

        $this->logs_repository->add_log( $history_id, 'info', __( 'Import started.', 'badamsoft-product-importer-for-woocommerce' ), 0 );

        $this->debug_log( '[PIFWC TRACE] start_chunked_import job_id=' . (string) $job_id . ' history_id=' . (string) $history_id . ' profile_id=' . (string) $profile_id . ' file_id=' . (string) $file_id . ' total_rows=' . (string) $total_rows );

        $this->cache_job_status( $job_id, [
            'id'         => $job_id,
            'job_id'     => $job_id,
            'profile_id' => $profile_id,
            'status'     => self::STATUS_PROCESSING,
            'meta'       => null,
            'created_at' => $started_at,
            'updated_at' => $started_at,
            'total_rows' => $total_rows,
            'added'      => 0,
            'updated'    => 0,
            'skipped'    => 0,
            'errors'     => 0,
            'processed'  => 0,
            'progress'   => 0,
            'current_row'=> 0,
            'started_at' => $started_at,
            'finished_at'=> null,
        ] );

        return [
            'success'    => true,
            'job_id'     => $job_id,
            'history_id' => $history_id,
            'total_rows' => $total_rows,
        ];
    }

    public function process_import_chunk( int $job_id, int $limit = 50, int $max_seconds = 10 ): array {
        $job = $this->jobs_repository->get_full_job( $job_id );
        if ( ! $job ) {
            return [
                'success' => false,
                'error'   => __( 'Job not found.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        if ( $job['status'] === self::STATUS_PENDING ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_PROCESSING );
            $job['status'] = self::STATUS_PROCESSING;
        }

        if ( in_array( $job['status'], [ self::STATUS_COMPLETED, self::STATUS_FAILED, self::STATUS_ABORTED ], true ) ) {
            return [
                'success' => true,
                'done'    => true,
                'status'  => $job['status'],
            ];
        }

        $profile_id = (int) ( $job['profile_id'] ?? 0 );
        $meta = is_array( $job['meta'] ?? null ) ? ( $job['meta'] ?? [] ) : [];
        $file_id = isset( $meta['file_id'] ) ? (string) $meta['file_id'] : '';
        $options = is_array( $meta['options'] ?? null ) ? ( $meta['options'] ?? [] ) : [];
        $mapping = is_array( $meta['mapping'] ?? null ) ? ( $meta['mapping'] ?? [] ) : [];

        if ( $profile_id <= 0 || '' === $file_id || empty( $mapping ) ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => __( 'Job is missing required metadata.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $file_path = $this->file_storage->get_file_path( $file_id );
        if ( null === $file_path ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => __( 'File not found or expired.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $history_records = $this->history_repository->find_by_job( $job_id );
        $history_id = 0;
        $history_total_rows = 0;
        $history_started_at = null;
        if ( ! empty( $history_records ) && ! empty( $history_records[0]->id ) ) {
            $history_id = (int) $history_records[0]->id;
            $history_total_rows = (int) ( $history_records[0]->total_rows ?? 0 );
            $history_started_at = $history_records[0]->started_at ?? null;
        }
        if ( ! $history_id ) {
            $history_started_at = current_time( 'mysql' );
            $history_id = (int) $this->history_repository->insert( [
                'job_id'     => $job_id,
                'total_rows' => 0,
                'started_at' => $history_started_at,
            ] );
        }

        $parser = ParserFactory::create( $file_path );
        if ( ! $parser ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => __( 'Unsupported file format.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $validation = $parser->validate( $file_path );
        if ( ! $validation['valid'] ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => $validation['error'],
            ];
        }

        $expected_total_rows = 0;
        if ( method_exists( $parser, 'count_rows' ) ) {
            $expected_total_rows = (int) $parser->count_rows( $file_path );
            $current_total_rows = $history_total_rows;
            if ( $expected_total_rows > 0 && $current_total_rows <= 0 ) {
                $this->history_repository->update( $history_id, [
                    'total_rows' => $expected_total_rows,
                ] );
            }
        }

        $chunk_state = is_array( $meta['chunk_state'] ?? null ) ? ( $meta['chunk_state'] ?? [] ) : [];
        $parser_state = is_array( $chunk_state['parser_state'] ?? null ) ? ( $chunk_state['parser_state'] ?? [] ) : [];
        $last_parent_id = isset( $chunk_state['last_parent_id'] ) ? (int) $chunk_state['last_parent_id'] : null;
        $seen_product_ids = is_array( $chunk_state['seen_product_ids'] ?? null ) ? ( $chunk_state['seen_product_ids'] ?? [] ) : [];

        $limit = max( 1, min( $limit, 500 ) );
        $max_seconds = max( 1, min( $max_seconds, 60 ) );

        if ( function_exists( 'set_time_limit' ) ) {
            // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged
            set_time_limit( $max_seconds + 10 );
        }

        $prev_index = isset( $parser_state['data_index'] ) ? (int) $parser_state['data_index'] : 0;

        $this->debug_log( '[PIFWC TRACE] process_import_chunk start job_id=' . (string) $job_id . ' history_id=' . (string) $history_id . ' profile_id=' . (string) $profile_id . ' file_id=' . (string) $file_id . ' limit=' . (string) $limit . ' max_seconds=' . (string) $max_seconds . ' data_index=' . (string) $prev_index );

        if ( ! method_exists( $parser, 'get_import_chunk' ) ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => __( 'Chunk import is not supported for this format.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $started_at = microtime( true );
        $processed_rows_in_request = 0;
        $did_reach_eof = false;

        $mode     = $options['mode'] ?? self::MODE_BOTH;
        $match_by = $options['match_by'] ?? self::MATCH_BY_SKU;

        $track_seen_product_ids = ! empty( $options['delete_missing_products'] ) && $profile_id > 0 && $mode !== self::MODE_CREATE;
        if ( ! $track_seen_product_ids ) {
            $seen_product_ids = [];
        }

        $added = ! empty( $history_records ) ? (int) ( $history_records[0]->added ?? 0 ) : 0;
        $updated = ! empty( $history_records ) ? (int) ( $history_records[0]->updated ?? 0 ) : 0;
        $skipped = ! empty( $history_records ) ? (int) ( $history_records[0]->skipped ?? 0 ) : 0;
        $errors = ! empty( $history_records ) ? (int) ( $history_records[0]->errors ?? 0 ) : 0;

        $processed_before = $added + $updated + $skipped;

        $last_abort_check_ts = 0.0;

        while ( $processed_rows_in_request < $limit ) {
            if ( microtime( true ) - $started_at >= $max_seconds ) {
                break;
            }

            $current_index = isset( $parser_state['data_index'] ) ? (int) $parser_state['data_index'] : 0;
            $read_limit = (int) max( 1, min( 50, $limit - $processed_rows_in_request ) );
            $chunk_result = $parser->get_import_chunk( $file_path, $read_limit, $parser_state );
            if ( empty( $chunk_result['success'] ) ) {
                $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
                $this->logs_repository->add_log( $history_id, 'error', (string) ( $chunk_result['error'] ?? 'Unknown error' ), 0 );
                return [
                    'success' => false,
                    'error'   => (string) ( $chunk_result['error'] ?? 'Unknown error' ),
                ];
            }

            $rows = is_array( $chunk_result['rows'] ?? null ) ? ( $chunk_result['rows'] ?? [] ) : [];
            $next_state = is_array( $chunk_result['state'] ?? null ) ? ( $chunk_result['state'] ?? [] ) : [];
            $row_states = is_array( $chunk_result['row_states'] ?? null ) ? ( $chunk_result['row_states'] ?? [] ) : [];
            $can_use_row_states = ! empty( $row_states ) && count( $row_states ) === count( $rows );

            if ( empty( $rows ) ) {
                $did_reach_eof = true;
                break;
            }

            $rows_to_process = $can_use_row_states ? $rows : [ $rows[0] ];
            foreach ( $rows_to_process as $i => $row ) {
                if ( microtime( true ) - $started_at >= $max_seconds ) {
                    break;
                }

                if ( ( microtime( true ) - $last_abort_check_ts ) >= 2.0 ) {
                    $last_abort_check_ts = microtime( true );
                    $current_job = $this->jobs_repository->get_full_job( $job_id );
                    if ( $current_job && ( $current_job['status'] ?? '' ) === self::STATUS_ABORTED ) {
                        $this->logs_repository->add_log( $history_id, 'warning', __( 'Import aborted.', 'badamsoft-product-importer-for-woocommerce' ), 0 );
                        $this->history_repository->update( $history_id, [
                            'finished_at' => current_time( 'mysql' ),
                        ] );
                        return [
                            'success' => true,
                            'done'    => true,
                            'status'  => self::STATUS_ABORTED,
                        ];
                    }
                }

                $row_number = $current_index + $i + 1;
                if ( $can_use_row_states && isset( $row_states[ $i ] ) && is_array( $row_states[ $i ] ) && isset( $row_states[ $i ]['data_index'] ) ) {
                    $row_number = (int) $row_states[ $i ]['data_index'];
                }

                try {
                    $product_data = $this->apply_mapping( $row, $mapping );
                    $log_payload = $this->build_log_payload( is_array( $row ) ? $row : [], is_array( $product_data ) ? $product_data : [], $row_number );

                    $sku_for_trace = null;
                    if ( isset( $product_data['sku'] ) && $product_data['sku'] !== '' && $product_data['sku'] !== null ) {
                        $sku_for_trace = (string) $product_data['sku'];
                    } elseif ( isset( $product_data['_sku'] ) && $product_data['_sku'] !== '' && $product_data['_sku'] !== null ) {
                        $sku_for_trace = (string) $product_data['_sku'];
                    }
                    $should_trace_row = ( $row_number <= 30 ) || $this->is_debug_watch_sku( $sku_for_trace );
                    if ( $should_trace_row ) {
                        $attrs_count = 0;
                        if ( isset( $product_data['attributes'] ) && is_array( $product_data['attributes'] ) ) {
                            $attrs_count = count( $product_data['attributes'] );
                        }
                        $this->debug_log(
                            '[PIFWC TRACE] row=' . (string) $row_number
                            . ' sku=' . (string) ( $sku_for_trace ?? '' )
                            . ' type=' . (string) ( $product_data['type'] ?? '' )
                            . ' attrs=' . (string) $attrs_count
                        );
                    }

                    $result = apply_filters(
                        'pifwc_import_process_row',
                        null,
                        $product_data,
                        [
                            'last_product_id' => (int) $last_parent_id,
                            'row_number'      => $row_number,
                            'history_id'      => $history_id,
                            'profile_id'      => $profile_id,
                            'options'         => $options,
                            'log_payload'     => $log_payload,
                        ]
                    );

                    if ( ! is_array( $result ) ) {
                        $result = $this->process_product( $product_data, $mode, $match_by, $history_id, $row_number, $profile_id, $options );
                    }

                    if ( $result['success'] && ! empty( $result['product_id'] ) ) {
                        $last_parent_id = (int) $result['product_id'];
                    } else {
                        $last_parent_id = null;
                    }

                    if ( ! $result['success'] ) {
                        $errors++;
                        $message = isset( $result['error'] ) ? (string) $result['error'] : __( 'Unknown error', 'badamsoft-product-importer-for-woocommerce' );
                        $this->logs_repository->add_log( $history_id, 'error', $message, $row_number, $log_payload );
                    }

                    if ( $result['success'] ) {
                        if ( $track_seen_product_ids && ! empty( $result['product_id'] ) ) {
                            $seen_product_ids[] = (int) $result['product_id'];
                        }

                        if ( isset( $result['action'] ) ) {
                            if ( $result['action'] === 'created' ) {
                                $added++;
                            } elseif ( $result['action'] === 'updated' ) {
                                $updated++;
                            } else {
                                $skipped++;
                            }
                        }
                    }

                } catch ( \Exception $e ) {
                    $errors++;
                    $this->logs_repository->add_log( $history_id, 'error', $e->getMessage(), $row_number, is_array( $log_payload ) ? $log_payload : $this->build_log_payload( is_array( $row ) ? $row : [], [], $row_number ) );
                }

                if ( $can_use_row_states && isset( $row_states[ $i ] ) && is_array( $row_states[ $i ] ) ) {
                    $parser_state = array_merge( $next_state, (array) $row_states[ $i ] );
                } else {
                    $parser_state = $next_state;
                }
                $processed_rows_in_request++;

                if ( ! $can_use_row_states ) {
                    break;
                }
            }
        }

        $elapsed_seconds = microtime( true ) - $started_at;
        $elapsed_ms = (int) round( $elapsed_seconds * 1000 );
        $reached_time_limit = ( $elapsed_seconds >= ( (float) $max_seconds - 0.001 ) ) && ( $processed_rows_in_request < $limit ) && ! $did_reach_eof;

        $target_ms = (int) min( 12000, max( 3000, round( $max_seconds * 1000 * 0.7 ) ) );
        $suggested_limit = $limit;
        if ( $processed_rows_in_request > 0 ) {
            $ms_per_row = $elapsed_ms / max( 1, $processed_rows_in_request );
            $formula = (int) floor( $target_ms / max( 1, $ms_per_row ) );
            $formula = max( 1, min( 500, $formula ) );

            $min_cap = (int) max( 1, floor( $limit * 0.5 ) );
            $max_cap = (int) min( 500, ceil( $limit * 1.5 ) );

            $suggested_limit = (int) max( $min_cap, min( $max_cap, $formula ) );

            if ( $reached_time_limit ) {
                $suggested_limit = (int) min( $suggested_limit, max( 1, (int) floor( $limit * 0.8 ) ) );
            } elseif ( $processed_rows_in_request >= $limit && $elapsed_ms < (int) round( $target_ms * 0.6 ) ) {
                $suggested_limit = (int) max( $suggested_limit, min( 500, (int) ceil( $limit * 1.2 ) ) );
            }
        } else {
            $suggested_limit = 1;
        }

        if ( $track_seen_product_ids ) {
            $seen_product_ids = array_values( array_unique( array_filter( array_map( 'intval', $seen_product_ids ) ) ) );
        }

        $this->history_repository->update( $history_id, [
            'added'   => $added,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors'  => $errors,
        ] );

        $meta['chunk_state'] = [
            'parser_state'   => $parser_state,
            'last_parent_id' => $last_parent_id,
        ];
        if ( $track_seen_product_ids ) {
            $meta['chunk_state']['seen_product_ids'] = $seen_product_ids;
        }
        $this->jobs_repository->update_meta( $job_id, $meta );

        $processed_after = $added + $updated + $skipped;
        $processed_in_chunk = max( 0, $processed_after - $processed_before );

        $has_more = ! $did_reach_eof;

        $status_value = $job['status'] ?? self::STATUS_PROCESSING;
        if ( ! $has_more ) {
            if ( ! empty( $options['delete_missing_products'] ) && $profile_id > 0 && $mode !== self::MODE_CREATE ) {
                $deleted = $this->delete_missing_products_for_profile( $profile_id, $seen_product_ids );
                if ( $deleted > 0 ) {
                    $log_message = sprintf(
                        /* translators: %d: number of deleted products. */
                        __( 'Deleted %d products not in file (scoped to this profile).', 'badamsoft-product-importer-for-woocommerce' ),
                        $deleted
                    );
                    $this->logs_repository->add_log( $history_id, 'warning', $log_message, 0 );
                }
            }

            $final_status = $errors > 0 ? 'completed_with_errors' : self::STATUS_COMPLETED;
            $this->history_repository->update( $history_id, [
                'finished_at' => current_time( 'mysql' ),
            ] );
            $this->jobs_repository->update_status( $job_id, $final_status );
            $status_value = $final_status;
        }

        $total_rows_for_status = max( 0, $expected_total_rows, $history_total_rows );
        $this->cache_job_status( $job_id, [
            'id'         => $job_id,
            'job_id'     => $job_id,
            'profile_id' => $profile_id,
            'status'     => $status_value,
            'meta'       => null,
            'total_rows' => $total_rows_for_status,
            'added'      => $added,
            'updated'    => $updated,
            'skipped'    => $skipped,
            'errors'     => $errors,
            'processed'  => $processed_after,
            'progress'   => $total_rows_for_status > 0 ? round( ( $processed_after / $total_rows_for_status ) * 100, 1 ) : 0,
            'current_row'=> $processed_after,
            'started_at' => $history_started_at,
            'finished_at'=> $has_more ? null : current_time( 'mysql' ),
        ] );

        return [
            'success'           => true,
            'job_id'            => $job_id,
            'history_id'        => $history_id,
            'status'            => $this->jobs_repository->get_full_job( $job_id )['status'] ?? self::STATUS_PROCESSING,
            'elapsed_ms'        => $elapsed_ms,
            'processed_in_request' => $processed_rows_in_request,
            'reached_time_limit'   => $reached_time_limit,
            'suggested_limit'      => $suggested_limit,
            'processed'         => $processed_after,
            'added'             => $added,
            'updated'           => $updated,
            'skipped'           => $skipped,
            'errors'            => $errors,
            'has_more'          => $has_more,
            'next_offset'       => (int) ( $parser_state['data_index'] ?? 0 ),
        ];
    }

    /**
     * Run an import for an already-created job (e.g. Action Scheduler job).
     *
     * IMPORTANT: This must NOT create a new job record, otherwise the UI will track
     * the wrong job_id and will show 0/0.
     *
     * @param int $job_id Existing job id.
     * @return array Job execution result.
     */
    public function run_existing_job( int $job_id ): array {
        $job = $this->jobs_repository->get_full_job( $job_id );
        if ( ! $job ) {
            return [
                'success' => false,
                'error'   => __( 'Job not found.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $profile_id = (int) ( $job['profile_id'] ?? 0 );
        $meta = is_array( $job['meta'] ?? null ) ? ( $job['meta'] ?? [] ) : [];
        $file_id = $meta['file_id'] ?? null;
        $options = is_array( $meta['options'] ?? null ) ? ( $meta['options'] ?? [] ) : [];
        $mapping = is_array( $meta['mapping'] ?? null ) ? ( $meta['mapping'] ?? [] ) : [];

        if ( ! $file_id || ! $profile_id ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => __( 'Job is missing required metadata.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $file_path = $this->file_storage->get_file_path( (string) $file_id );
        if ( null === $file_path ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => __( 'File not found or expired.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // If mapping wasn't included in job meta, fallback to profile mapping.
        if ( empty( $mapping ) ) {
            $profile = $this->profiles_repository->get_full_profile( $profile_id );
            if ( null === $profile ) {
                $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
                return [
                    'success' => false,
                    'error'   => __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ),
                ];
            }

            $mapping = $profile['mapping'] ?? [];
        }

        if ( empty( $mapping ) ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => __( 'Invalid mapping configuration.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // Validate file quickly (mirrors start_import validation).
        $parser = ParserFactory::create( $file_path );
        if ( ! $parser ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => __( 'Unsupported file format.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        $validation = $parser->validate( $file_path );
        if ( ! $validation['valid'] ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => $validation['error'],
            ];
        }

        // Ensure there is a history record for this job.
        $history_records = $this->history_repository->find_by_job( $job_id );
        $history_id = 0;
        if ( ! empty( $history_records ) ) {
            $history = $history_records[0];
            if ( empty( $history->finished_at ) && ! empty( $history->id ) ) {
                $history_id = (int) $history->id;
            }
        }

        if ( ! $history_id ) {
            $history_id = (int) $this->history_repository->insert( [
                'job_id'     => $job_id,
                'total_rows' => 0,
                'started_at' => current_time( 'mysql' ),
            ] );
        }

        $result = $this->process_import( $job_id, $profile_id, $history_id, $file_path, $mapping, $options );

        return [
            'success'    => true,
            'job_id'     => $job_id,
            'history_id' => $history_id,
            'result'     => $result,
        ];
    }

    /**
     * Process import job.
     *
     * @param int    $job_id     Job ID.
     * @param int    $history_id History ID.
     * @param string $file_path  File path.
     * @param array  $mapping    Mapping configuration.
     * @param array  $options    Import options.
     * @return array Import result.
     */
    public function process_import( int $job_id, int $profile_id, int $history_id, string $file_path, array $mapping, array $options ): array {
        $mode     = $options['mode'] ?? self::MODE_BOTH;
        $match_by = $options['match_by'] ?? self::MATCH_BY_SKU;

        // Update job status.
        $this->jobs_repository->update_status( $job_id, self::STATUS_PROCESSING );

        // Create parser.
        $parser = ParserFactory::create( $file_path );
        if ( ! $parser ) {
            $this->jobs_repository->update_status( $job_id, self::STATUS_FAILED );
            return [
                'success' => false,
                'error'   => __( 'Unsupported file format.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // Get headers.
        $headers = $parser->get_headers( $file_path );

        $expected_total_rows = 0;
        if ( method_exists( $parser, 'count_rows' ) ) {
            $expected_total_rows = (int) $parser->count_rows( $file_path );
        }

        if ( $expected_total_rows > 0 ) {
            $this->history_repository->update( $history_id, [
                'total_rows' => $expected_total_rows,
            ] );
        }

        $stats = [
            'total'     => 0,
            'processed' => 0,
            'added'     => 0,
            'updated'   => 0,
            'skipped'   => 0,
            'errors'    => 0,
        ];

        // Log import start
        $this->logs_repository->add_log( $history_id, 'info', __( 'Import started.', 'badamsoft-product-importer-for-woocommerce' ), 0 );

        // Track state across rows for add-on extensions.
        $last_parent_id = null;
        $seen_product_ids = [];

        // Parse and process in chunks for memory efficiency.
        $parser->parse_chunked( $file_path, $this->batch_size, function( $chunk, $chunk_headers ) use ( $profile_id, $history_id, $mapping, $mode, $match_by, $options, &$stats, &$last_parent_id, &$seen_product_ids ) {
            foreach ( $chunk as $row ) {
                $stats['total']++;
                $row_number = $stats['total'];

                $product_data = [];
                $log_payload = null;

                try {
                    // Apply mapping.
                    $product_data = $this->apply_mapping( $row, $mapping );
                    $log_payload = $this->build_log_payload( is_array( $row ) ? $row : [], is_array( $product_data ) ? $product_data : [], $row_number );

                    $result = apply_filters(
                        'pifwc_import_process_row',
                        null,
                        $product_data,
                        [
                            'last_product_id' => (int) $last_parent_id,
                            'row_number'      => $row_number,
                            'history_id'      => $history_id,
                            'profile_id'      => $profile_id,
                            'options'         => $options,
                            'log_payload'     => $log_payload,
                        ]
                    );

                    if ( ! is_array( $result ) ) {
                        $result = $this->process_product( $product_data, $mode, $match_by, $history_id, $row_number, $profile_id, $options );
                    }

                    if ( $result['success'] && ! empty( $result['product_id'] ) ) {
                        $last_parent_id = (int) $result['product_id'];
                    } else {
                        $last_parent_id = null;
                    }

                    if ( ! $result['success'] ) {
                        $stats['errors']++;
                        $message = isset( $result['error'] ) ? (string) $result['error'] : 'Unknown error';
                        $this->logs_repository->add_log( $history_id, 'error', $message, $row_number, $log_payload );
                    }

                    if ( $result['success'] ) {
                        if ( ! empty( $result['product_id'] ) ) {
                            $seen_product_ids[] = (int) $result['product_id'];
                        }
                        if ( isset( $result['action'] ) ) {
                            if ( $result['action'] === 'created' ) {
                                $stats['added']++;
                                /* translators: 1: product label, 2: product ID. */
                                $message = __( 'Product created: %1$s (ID: %2$d)', 'badamsoft-product-importer-for-woocommerce' );
                                
                                // Use title, fallback to SKU, then ID if title is empty
                                $product_label = ! empty( $product_data['title'] ) 
                                    ? $product_data['title'] 
                                    : ( ! empty( $product_data['sku'] ) ? 'SKU: ' . $product_data['sku'] : 'ID: ' . $result['product_id'] );
                                
                                $log_msg = sprintf( $message, $product_label, $result['product_id'] );

                                $this->logs_repository->add_log( $history_id, 'info', $log_msg, $row_number );
                            } elseif ( $result['action'] === 'updated' ) {
                                $stats['updated']++;
                                
                                // Use title, fallback to SKU, then ID if title is empty
                                $product_label = ! empty( $product_data['title'] ) 
                                    ? $product_data['title'] 
                                    : ( ! empty( $product_data['sku'] ) ? 'SKU: ' . $product_data['sku'] : 'ID: ' . $result['product_id'] );
                                
                                $this->logs_repository->add_log(
                                    $history_id,
                                    'info',
                                    sprintf(
                                        /* translators: 1: product label, 2: product ID. */
                                        __( 'Product updated: %1$s (ID: %2$d)', 'badamsoft-product-importer-for-woocommerce' ),
                                        $product_label,
                                        $result['product_id']
                                    ),
                                    $row_number
                                );
                            } else {
                                $stats['skipped']++;
                                $this->logs_repository->add_log(
                                    $history_id,
                                    'warning',
                                    sprintf(
                                        /* translators: %s: reason why product was skipped. */
                                        __( 'Product skipped: %s', 'badamsoft-product-importer-for-woocommerce' ),
                                        $result['reason'] ?? 'Unknown'
                                    ),
                                    $row_number
                                );
                            }
                        }
                    } else {
                        $stats['errors']++;
                        $this->logs_repository->add_log( $history_id, 'error', $result['error'], $row_number, $log_payload );
                    }

                    $stats['processed']++;

                    // Update progress periodically.
                    if ( $stats['processed'] % 10 === 0 ) {
                        $this->history_repository->update( $history_id, [
                            'added'      => $stats['added'],
                            'updated'    => $stats['updated'],
                            'skipped'    => $stats['skipped'],
                            'errors'     => $stats['errors'],
                        ] );
                    }

                } catch ( \Exception $e ) {
                    $stats['errors']++;
                    $stats['processed']++;
                    $this->logs_repository->add_log( $history_id, 'error', $e->getMessage(), $row_number, is_array( $log_payload ) ? $log_payload : $this->build_log_payload( is_array( $row ) ? $row : [], [], $row_number ) );
                }
            }

            return true; // Continue processing
        } );

        $seen_product_ids = array_values( array_unique( array_filter( array_map( 'intval', $seen_product_ids ) ) ) );

        if ( ! empty( $options['delete_missing_products'] ) && $profile_id > 0 && $mode !== self::MODE_CREATE ) {
            $deleted = $this->delete_missing_products_for_profile( $profile_id, $seen_product_ids );
            if ( $deleted > 0 ) {
                $log_message = sprintf(
                    /* translators: %d: number of deleted products. */
                    __( 'Deleted %d products not in file (scoped to this profile).', 'badamsoft-product-importer-for-woocommerce' ),
                    $deleted
                );
                $this->logs_repository->add_log( $history_id, 'warning', $log_message, 0 );
            }
        }

        // Log import completion
        $this->logs_repository->add_log( 
            $history_id, 
            'info', 
            sprintf( 
                /* translators: 1: total, 2: added, 3: updated, 4: skipped, 5: errors. */
                __( 'Import completed. Total: %1$d, Added: %2$d, Updated: %3$d, Skipped: %4$d, Errors: %5$d', 'badamsoft-product-importer-for-woocommerce' ),
                $stats['total'],
                $stats['added'],
                $stats['updated'],
                $stats['skipped'],
                $stats['errors']
            ),
            0
        );

        // Final update.
        $final_total_rows = $expected_total_rows > 0 ? $expected_total_rows : $stats['total'];
        $this->history_repository->update( $history_id, [
            'total_rows'  => $final_total_rows,
            'added'       => $stats['added'],
            'updated'     => $stats['updated'],
            'skipped'     => $stats['skipped'],
            'errors'      => $stats['errors'],
            'finished_at' => current_time( 'mysql' ),
        ] );

        $final_status = $stats['errors'] > 0 ? 'completed_with_errors' : self::STATUS_COMPLETED;
        $finished_at = current_time( 'mysql' );

        $this->jobs_repository->update_status( $job_id, $final_status );
        $this->cache_job_status( $job_id, [
            'id'          => $job_id,
            'job_id'      => $job_id,
            'profile_id'  => $profile_id,
            'status'      => $final_status,
            'total_rows'  => $final_total_rows,
            'added'       => $stats['added'],
            'updated'     => $stats['updated'],
            'skipped'     => $stats['skipped'],
            'errors'      => $stats['errors'],
            'processed'   => $stats['processed'],
            'progress'    => $final_total_rows > 0 ? round( ( $stats['processed'] / $final_total_rows ) * 100, 1 ) : 100,
            'current_row' => $stats['processed'],
            'started_at'  => $this->get_job_status( $job_id )['started_at'] ?? null,
            'finished_at' => $finished_at,
            'timestamp'   => time(),
        ], 60 );

        return [
            'success' => true,
            'stats'   => $stats,
        ];
    }

    /**
     * Process a single product.
     *
     * @param array  $product_data Mapped product data.
     * @param string $mode         Import mode (create/update/both).
     * @param string $match_by     Match field (sku/id).
     * @return array Result with success, action, product_id.
     */
    /**
     * Apply field mapping to row data.
     *
     * @param array $row     Row data (indexed by column name or index).
     * @param array $mapping Field mapping configuration.
     * @return array Mapped product data.
     */
    private function apply_mapping( array $row, array $mapping ): array {
        $product_data = [];
        
        // Determine fields and attributes config
        $fields_config = isset( $mapping['fields'] ) ? $mapping['fields'] : $mapping;
        $attributes_config = isset( $mapping['attributes'] ) ? $mapping['attributes'] : [];

        $this->debug_log( '[IMPORT DEBUG] apply_mapping - Row keys: ' . implode( ', ', array_keys( $row ) ) );
        $this->debug_log( '[IMPORT DEBUG] apply_mapping - Fields config count: ' . count( $fields_config ) );
        $this->debug_log( '[IMPORT DEBUG] apply_mapping - Attributes config count: ' . count( $attributes_config ) );
        if ( ! empty( $attributes_config ) ) {
            $this->debug_log( '[IMPORT DEBUG] apply_mapping - Attributes config: ' . wp_json_encode( $attributes_config ) );
        }

        // Process fields
        foreach ( $fields_config as $map_item ) {
            // Handle new format: array of mapping objects
            if ( is_array( $map_item ) && isset( $map_item['targetFieldId'] ) ) {
                $target_field = $map_item['targetFieldId'];
                $source_field = $map_item['sourceFieldId'] ?? null;
                $manual_value = $map_item['manualValue'] ?? null;

                $this->debug_log( '[IMPORT DEBUG] Processing field - Target: ' . $target_field . ', Source: ' . ( $source_field ?? 'none' ) );

                // Determine final value based on what's provided
                $value = null;
                if ( ! empty( $source_field ) ) {
                    // Try direct match
                    if ( isset( $row[ $source_field ] ) ) {
                        $value = $row[ $source_field ];
                        $this->debug_log( '[IMPORT DEBUG] Found direct match for: ' . $source_field . ' = ' . $value );
                    }
                    // Try sanitized match (fallback)
                    else {
                        $sanitized_source = $this->sanitize_header( $source_field );
                        if ( $sanitized_source !== '' && isset( $row[ $sanitized_source ] ) ) {
                            $value = $row[ $sanitized_source ];
                            $this->debug_log( '[IMPORT DEBUG] Found sanitized match for: ' . $sanitized_source . ' = ' . $value );
                        }
                    }
                }

                $resolved_manual = null;
                if ( ! empty( $manual_value ) ) {
                    $template = (string) $manual_value;
                    if ( $value !== null && strpos( $template, '{value}' ) !== false ) {
                        $template = str_replace( '{value}', (string) $value, $template );
                    }
                    if ( strpos( $template, '{' ) !== false && strpos( $template, '}' ) !== false ) {
                        $template = $this->resolve_placeholder( $template, $row );
                    }
                    $template = is_string( $template ) ? trim( $template ) : '';
                    if ( $template !== '' ) {
                        $resolved_manual = $template;
                    }
                }

                $mapped_value = null;
                if ( $resolved_manual !== null ) {
                    $mapped_value = $resolved_manual;
                } elseif ( $value !== null ) {
                    $mapped_value = $value;
                }

                if ( $mapped_value !== null ) {
                    // Normalize field ID to internal format
                    $internal_field = $this->normalize_field_id( $target_field );
                    $product_data[ $internal_field ] = $mapped_value;

                    $this->debug_log( '[IMPORT DEBUG] Mapped: ' . $target_field . ' -> ' . $internal_field . ' = ' . $mapped_value );
                }
            }
        }

        // Process attributes if configured
        if ( ! empty( $attributes_config ) ) {
            $product_data['attributes'] = $this->map_attributes( $row, $attributes_config );
        }

        $categories_config = isset( $mapping['categories'] ) && is_array( $mapping['categories'] ) ? $mapping['categories'] : [];
        if ( ! empty( $categories_config ) ) {
            $structured_categories = $this->map_categories( $row, $categories_config );
            if ( ! empty( $structured_categories ) ) {
                $existing_categories = $product_data['categories'] ?? [];
                if ( is_string( $existing_categories ) ) {
                    $existing_categories = array_map( 'trim', explode( ',', $existing_categories ) );
                }
                if ( ! is_array( $existing_categories ) ) {
                    $existing_categories = [];
                }
                $product_data['categories'] = array_values( array_unique( array_filter( array_merge( $existing_categories, $structured_categories ) ) ) );
            }
        }
        
        // Auto-detect product type
        if ( ! isset( $product_data['type'] ) ) {
            $product_data['type'] = 'simple';
        }

        $this->debug_log( '[IMPORT DEBUG] Final product_data keys: ' . implode( ', ', array_keys( $product_data ) ) );
        $this->debug_log( '[IMPORT DEBUG] Product type: ' . ( $product_data['type'] ?? 'not set' ) );
        if ( isset( $product_data['title'] ) ) {
            $this->debug_log( '[IMPORT DEBUG] Title: ' . $product_data['title'] );
        }

        return $product_data;
    }

    private function build_log_payload( array $row, array $product_data, int $row_number ): array {
        $raw = $row;
        if ( is_array( $raw ) && count( $raw ) > 20 ) {
            $raw = array_slice( $raw, 0, 20, true );
        }

        $payload = [
            'row_number' => $row_number,
            'sku'        => $product_data['sku'] ?? null,
            'title'      => $product_data['title'] ?? null,
            'type'       => $product_data['type'] ?? null,
            'row'        => $raw,
        ];

        return $payload;
    }
    
    /**
     * Normalize field ID from UI format to internal format.
     * 
     * @param string $field_id Field ID from UI (e.g., 'post_title', '_sku').
     * @return string Internal field ID (e.g., 'title', 'sku').
     */
    private function normalize_field_id( string $field_id ): string {
        // Map UI field IDs to internal field names
        $field_map = [
            // Standard WordPress/WooCommerce fields
            'post_title'         => 'title',
            'post_content'       => 'description',
            'post_excerpt'       => 'short_description',
            '_sku'               => 'sku',
            '_regular_price'     => 'regular_price',
            '_sale_price'        => 'sale_price',
            '_manage_stock'      => 'manage_stock',
            '_stock_quantity'    => 'stock_quantity',
            '_stock_status'      => 'stock_status',
            '_weight'            => 'weight',
            '_length'            => 'length',
            '_width'             => 'width',
            '_height'            => 'height',
            'product_cat'        => 'categories',
            'product_tag'        => 'tags',
            '_featured'          => 'featured',
            '_catalog_visibility' => 'catalog_visibility',
            '_tax_status'        => 'tax_status',
            '_tax_class'         => 'tax_class',
            'product_type'       => 'type',
            'post_status'        => 'status',
            'post_name'          => 'slug',

            // Image fields
            'main_image'         => 'image',
            'gallery_images'     => 'gallery',

            // Taxonomy fields
            'brands'             => 'brands',
        ];

        $normalized = $field_map[ $field_id ] ?? $field_id;

        return (string) apply_filters( 'pifwc_normalize_field_id', $normalized, $field_id );
    }

    private function map_attributes( array $row, array $attributes_config ): array {
        $mapped_attributes = [];

        $this->debug_log( '[ATTR DEBUG] map_attributes - Row keys: ' . implode( ', ', array_keys( $row ) ) );

        foreach ( $attributes_config as $attr ) {
            // Resolve Attribute Name
            $name = $attr['name'];
            $this->debug_log( '[ATTR DEBUG] Processing attribute - Name from config: ' . $name );
            
            // If name is a placeholder {Column}, resolve it (though unlikely for name)
            if ( strpos( $name, '{' ) !== false && strpos( $name, '}' ) !== false ) {
                $name = $this->resolve_placeholder( $name, $row );
            }

            // Resolve Attribute Values
            $values_str = $attr['values'];
            $this->debug_log( '[ATTR DEBUG] Values template from config: ' . $values_str );
            
            $values_str = $this->resolve_placeholder( $values_str, $row );
            $this->debug_log( '[ATTR DEBUG] Values after resolve_placeholder: ' . $values_str );

            $values = $this->split_attribute_values( (string) $values_str );

            // Only add attribute if it has both name and values
            if ( ! empty( $name ) && ! empty( $values ) ) {
                $this->debug_log( '[ATTR DEBUG] Final attribute - Name: ' . $name . ', Values: ' . implode( ', ', $values ) );
                $mapped_attribute = [
                    'name'              => $name,
                    'options'           => $values,
                    'is_visible'        => ! empty( $attr['isVisible'] ),
                    'is_taxonomy'       => ! empty( $attr['isTaxonomy'] ),
                    'auto_create_terms' => ! empty( $attr['autoCreateTerms'] ),
                ];

                $mapped_attributes[] = apply_filters( 'pifwc_import_map_attribute_config', $mapped_attribute, $attr, $row );
            } elseif ( ! empty( $name ) && empty( $values ) ) {
                $this->debug_log( '[ATTR DEBUG] Skipping attribute with empty values - Name: ' . $name );
            }
        }

        return $mapped_attributes;
    }

    private function map_categories( array $row, array $categories_config ): array {
        $nodes = [];
        $stack = [];
        $roots = [];

        foreach ( $categories_config as $item ) {
            if ( ! is_array( $item ) ) {
                continue;
            }

            $template = isset( $item['name'] ) ? (string) $item['name'] : '';
            $level = isset( $item['level'] ) ? (int) $item['level'] : 0;

            $node = [
                'template' => $template,
                'level'    => max( 0, $level ),
                'children' => [],
            ];

            $nodes[] = $node;
            $idx = count( $nodes ) - 1;

            while ( ! empty( $stack ) && $nodes[ end( $stack ) ]['level'] >= $nodes[ $idx ]['level'] ) {
                array_pop( $stack );
            }

            if ( empty( $stack ) ) {
                $roots[] = $idx;
            } else {
                $parent_idx = end( $stack );
                $nodes[ $parent_idx ]['children'][] = $idx;
            }

            $stack[] = $idx;
        }

        $leaf_paths = [];
        foreach ( $roots as $root_idx ) {
            $this->expand_category_node_paths( $nodes, $root_idx, $row, [], $leaf_paths );
        }

        $paths = [];
        foreach ( $leaf_paths as $segments ) {
            $segments = array_values( array_filter( array_map( 'trim', $segments ) ) );
            if ( empty( $segments ) ) {
                continue;
            }
            $paths[] = implode( ' > ', $segments );
        }

        return array_values( array_unique( $paths ) );
    }

    private function expand_category_node_paths( array $nodes, int $node_idx, array $row, array $current_path, array &$leaf_paths ): void {
        $template = $nodes[ $node_idx ]['template'] ?? '';
        $resolved = $template;
        if ( is_string( $template ) && strpos( $template, '{' ) !== false && strpos( $template, '}' ) !== false ) {
            $resolved = $this->resolve_placeholder( $template, $row );
        }
        $resolved = is_string( $resolved ) ? trim( $resolved ) : '';

        $options = $this->split_category_value_to_segment_options( $resolved );
        if ( empty( $options ) ) {
            $options = [ [] ];
        }

        foreach ( $options as $segments ) {
            $next_path = $current_path;
            if ( ! empty( $segments ) ) {
                $next_path = array_merge( $next_path, $segments );
            }

            $children = $nodes[ $node_idx ]['children'] ?? [];
            if ( empty( $children ) ) {
                $leaf_paths[] = $next_path;
                continue;
            }

            foreach ( $children as $child_idx ) {
                $this->expand_category_node_paths( $nodes, $child_idx, $row, $next_path, $leaf_paths );
            }
        }
    }

    private function split_category_value_to_segment_options( string $value ): array {
        $value = trim( $value );
        if ( $value === '' ) {
            return [];
        }

        $parts = preg_split( '/[,;|]+/', $value );
        $parts = is_array( $parts ) ? $parts : [ $value ];

        $options = [];
        foreach ( $parts as $part ) {
            $part = trim( (string) $part );
            if ( $part === '' ) {
                continue;
            }

            if ( strpos( $part, '>' ) !== false ) {
                $segments = array_values( array_filter( array_map( 'trim', explode( '>', $part ) ) ) );
                if ( ! empty( $segments ) ) {
                    $options[] = $segments;
                }
            } else {
                $options[] = [ $part ];
            }
        }

        return $options;
    }

    /**
     * Resolve placeholders in string against row data.
     *
     * @param string $string String with {placeholders}.
     * @param array  $row    Row data.
     * @return string Resolved string.
     */
    private function resolve_placeholder( string $string, array $row ): string {
        return preg_replace_callback( '/\{([^}]+)\}/', function( $matches ) use ( $row ) {
            $key = $matches[1];
            $this->debug_log( "[RESOLVE DEBUG] Looking for key: '{$key}'" );
            
            // Try direct match
            if ( isset( $row[ $key ] ) ) {
                $this->debug_log( "[RESOLVE DEBUG] Found direct match: '{$key}' = '{$row[$key]}'" );
                return $row[ $key ];
            }
            $this->debug_log( "[RESOLVE DEBUG] No direct match for: '{$key}'" );
            
            // Try with trimmed key (CSV headers may have leading/trailing spaces)
            $trimmed_key = trim( $key );
            if ( $trimmed_key !== $key && isset( $row[ $trimmed_key ] ) ) {
                $this->debug_log( "[RESOLVE DEBUG] Found trimmed key match: '{$trimmed_key}' = '{$row[$trimmed_key]}'" );
                return $row[ $trimmed_key ];
            }
            
            // Try matching against trimmed row keys
            foreach ( $row as $row_key => $row_value ) {
                if ( trim( $row_key ) === $key || trim( $row_key ) === $trimmed_key ) {
                    $this->debug_log( "[RESOLVE DEBUG] Found trimmed row key match: '{$row_key}' (trimmed: '" . trim($row_key) . "') = '{$row_value}'" );
                    return $row_value;
                }
            }
            $this->debug_log( "[RESOLVE DEBUG] No trimmed match found" );
            
            // Try sanitized match
            $sanitized = $this->sanitize_header( $key );
            if ( $sanitized !== '' && isset( $row[ $sanitized ] ) ) {
                $this->debug_log( "[RESOLVE DEBUG] Found sanitized match: '{$sanitized}' = '{$row[$sanitized]}'" );
                return $row[ $sanitized ];
            }
            
            $this->debug_log( "[RESOLVE DEBUG] No match found for key: '{$key}', returning empty string" );
            return ''; 
        }, $string );
    }

    private function maybe_decode_percent_encoded_string( string $value ): string {
        if ( $value === '' ) {
            return $value;
        }

        if ( strpos( $value, '%' ) === false ) {
            return $value;
        }

        if ( ! preg_match( '/%[0-9A-Fa-f]{2}/', $value ) ) {
            return $value;
        }

        $decoded = rawurldecode( $value );
        if ( $decoded === $value ) {
            return $value;
        }

        if ( function_exists( 'mb_check_encoding' ) && ! mb_check_encoding( $decoded, 'UTF-8' ) ) {
            return $value;
        }

        return $decoded;
    }

    private function normalize_attribute_value( string $value ): string {
        $value = trim( wp_strip_all_tags( html_entity_decode( $value, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) );
        if ( $value === '' ) {
            return '';
        }

        $value = $this->maybe_decode_percent_encoded_string( $value );

        $value = str_replace( [ "\xC2\xA0" ], [ ' ' ], $value );

        $value = str_replace( [ '×', 'Х', 'х', 'X' ], [ 'x', 'x', 'x', 'x' ], $value );

        $value = preg_replace( '/\s+/u', ' ', $value );
        $value = preg_replace( '/(\d+(?:[\.,]\d+)?)\s*x\s*(\d+(?:[\.,]\d+)?)/u', '$1x$2', (string) $value );

        return trim( (string) $value );
    }

    private function split_attribute_values( string $values_str ): array {
        $values_str = trim( $values_str );
        if ( $values_str === '' ) {
            return [];
        }

        if ( strpos( $values_str, '|' ) !== false ) {
            $parts = explode( '|', $values_str );
        } elseif ( strpos( $values_str, "\n" ) !== false || strpos( $values_str, "\r" ) !== false ) {
            $parts = preg_split( '/\r\n|\n|\r/', $values_str );
        } elseif ( strpos( $values_str, ';' ) !== false ) {
            $parts = explode( ';', $values_str );
        } elseif ( strpos( $values_str, ',' ) !== false && ! preg_match( '/^\s*-?\d+,\d+\s*$/u', $values_str ) ) {
            $parts = explode( ',', $values_str );
        } else {
            $parts = [ $values_str ];
        }

        $parts = array_map( 'trim', is_array( $parts ) ? $parts : [ (string) $parts ] );
        $parts = array_values( array_filter( $parts, static function ( $v ) {
            return $v !== '' && $v !== null;
        } ) );

        if ( count( $parts ) <= 1 && preg_match( '/[\|,;]|\r\n|\n|\r/', $values_str ) ) {
            $fallback = preg_split( '/[\|,;]+|\r\n|\n|\r/', $values_str );
            if ( is_array( $fallback ) ) {
                $fallback = array_map( 'trim', $fallback );
                $fallback = array_values( array_filter( $fallback, static function ( $v ) {
                    return $v !== '' && $v !== null;
                } ) );
                if ( ! empty( $fallback ) ) {
                    $parts = $fallback;
                }
            }
        }

        return $parts;
    }

    private function get_attribute_slug( string $attribute_name ): string {
        $attribute_name = $this->normalize_attribute_label( $attribute_name );

        $existing = $this->find_existing_global_attribute_slug_by_label( $attribute_name );
        if ( null !== $existing ) {
            return $existing;
        }

        $ascii = $this->transliterate_to_ascii( $attribute_name );
        $slug = wc_sanitize_taxonomy_name( $ascii );
        $slug = str_replace( '-', '_', $slug );
        $slug = preg_replace( '/[^a-z0-9_]/', '', (string) $slug );
        $slug = trim( (string) $slug, '_' );

        if ( $slug === '' || strpos( $slug, '%' ) !== false ) {
            $slug = 'attr-' . substr( md5( $attribute_name ), 0, 10 );
        }

        return $slug;
    }

    private function transliterate_to_ascii( string $value ): string {
        $value = $this->maybe_decode_percent_encoded_string( $value );
        $value = str_replace( "\xc2\xa0", ' ', $value );
        $value = trim( $value );
        if ( $value === '' ) {
            return '';
        }

        $converted = '';

        if ( function_exists( 'transliterator_transliterate' ) ) {
            $converted = transliterator_transliterate( 'Any-Latin; Latin-ASCII; NFD; [:Nonspacing Mark:] Remove; NFC;', $value );
            $converted = is_string( $converted ) ? $converted : '';
        }

        if ( $converted === '' && function_exists( 'iconv' ) ) {
            $converted = iconv( 'UTF-8', 'ASCII//TRANSLIT//IGNORE', $value );
            $converted = is_string( $converted ) ? $converted : '';
        }

        if ( $converted === '' ) {
            $converted = $value;
        }

        $converted = preg_replace( "/['\"`´’]/u", '', (string) $converted );
        $converted = preg_replace( '/[^A-Za-z0-9 _-]+/', ' ', (string) $converted );
        $converted = preg_replace( '/\s+/', ' ', (string) $converted );
        return trim( (string) $converted );
    }

    private function normalize_attribute_label( string $label ): string {
        $label = $this->maybe_decode_percent_encoded_string( $label );
        $label = str_replace( "\xc2\xa0", ' ', $label );
        $label = trim( $label );
        $label = preg_replace( '/\s+/u', ' ', $label );
        return (string) $label;
    }

    private function safe_term_slug( string $value ): string {
        $value = $this->maybe_decode_percent_encoded_string( $value );
        $value = str_replace( "\xc2\xa0", ' ', $value );
        $value = trim( $value );
        $value = preg_replace( '/\s+/u', ' ', $value );

        $slug_source = $this->transliterate_to_ascii( $value );
        $slug = sanitize_title( $slug_source );

        if ( $slug === '' || strpos( $slug, '%' ) !== false || preg_match( '/[^a-z0-9_\-]/', $slug ) ) {
            $slug = 't-' . substr( md5( $value ), 0, 12 );
        }

        return $slug;
    }

    private function find_existing_global_attribute_slug_by_label( string $label ): ?string {
        $label = $this->normalize_attribute_label( $label );
        if ( $label === '' ) {
            return null;
        }

        $taxonomies = function_exists( 'wc_get_attribute_taxonomies' ) ? wc_get_attribute_taxonomies() : [];
        if ( empty( $taxonomies ) || ! is_array( $taxonomies ) ) {
            return null;
        }

        foreach ( $taxonomies as $tax ) {
            $attr_label = isset( $tax->attribute_label ) ? (string) $tax->attribute_label : '';
            $attr_label = $this->normalize_attribute_label( $attr_label );
            if ( $attr_label !== '' && mb_strtolower( $attr_label, 'UTF-8' ) === mb_strtolower( $label, 'UTF-8' ) ) {
                $attr_name = isset( $tax->attribute_name ) ? (string) $tax->attribute_name : '';
                if ( $attr_name !== '' ) {
                    // If existing attribute slug is percent-encoded, treat it as invalid.
                    // WooCommerce will display such attributes incorrectly (e.g. %d1%81...), and taxonomies may mismatch.
                    if ( strpos( $attr_name, '%' ) !== false || preg_match( '/[^a-z0-9_]/', $attr_name ) ) {
                        return null;
                    }
                    return $attr_name;
                }
            }
        }

        return null;
    }

    public function get_cached_job_status_stale( int $job_id ): ?array {
        $cached = $this->read_job_status_cache_file( $job_id, true );
        if ( is_array( $cached ) ) {
            if ( empty( $cached['timestamp'] ) ) {
                $cached['timestamp'] = time();
            }
            return $cached;
        }

        return null;
    }

    private function ensure_attribute_taxonomy_ready( string $taxonomy ): void {
        $exists_before = taxonomy_exists( $taxonomy );
        $this->debug_log( "[PIFWC TAXONOMY DEBUG] ensure_attribute_taxonomy_ready({$taxonomy}): exists_before=" . ( $exists_before ? 'true' : 'false' ) );

        if ( $exists_before ) {
            return;
        }

        // Check if we manually registered this taxonomy earlier
        if ( isset( $this->registered_taxonomies[ $taxonomy ] ) ) {
            $cached = $this->registered_taxonomies[ $taxonomy ];
            $this->debug_log( "[PIFWC TAXONOMY DEBUG] Re-registering cached taxonomy: {$taxonomy}" );
            register_taxonomy(
                $taxonomy,
                apply_filters( 'pifwc_taxonomy_objects_' . $taxonomy, [ 'product' ] ),
                apply_filters(
                    'pifwc_taxonomy_args_' . $taxonomy,
                    [
                        'labels'       => [
                            'name' => $cached['label'],
                        ],
                        'hierarchical' => false,
                        'show_ui'      => false,
                        'query_var'    => true,
                        'rewrite'      => false,
                        'public'       => false,
                    ]
                )
            );
            $this->debug_log( "[PIFWC TAXONOMY DEBUG] Re-registered, exists now: " . ( taxonomy_exists( $taxonomy ) ? 'true' : 'false' ) );
            return;
        }

        if ( function_exists( 'delete_transient' ) ) {
            delete_transient( 'wc_attribute_taxonomies' );
        }
        if ( class_exists( '\\WC_Post_Types' ) ) {
            \WC_Post_Types::register_taxonomies();
        }

        $exists_after = taxonomy_exists( $taxonomy );
        $this->debug_log( "[PIFWC TAXONOMY DEBUG] ensure_attribute_taxonomy_ready({$taxonomy}): exists_after=" . ( $exists_after ? 'true' : 'false' ) );
    }

    private function create_global_attribute( string $label, string $slug ): ?string {
        $label = $this->normalize_attribute_label( $label );

        $existing = $this->find_existing_global_attribute_slug_by_label( $label );
        if ( null !== $existing ) {
            $taxonomy = wc_attribute_taxonomy_name( $existing );
            if ( function_exists( 'delete_transient' ) ) {
                delete_transient( 'wc_attribute_taxonomies' );
            }
            if ( class_exists( '\\WC_Post_Types' ) ) {
                \WC_Post_Types::register_taxonomies();
            }
            return $taxonomy;
        }

        $slug = wc_sanitize_taxonomy_name( $slug );
        $slug = str_replace( '-', '_', $slug );
        $slug = preg_replace( '/[^a-z0-9_]/', '', (string) $slug );
        $slug = trim( (string) $slug, '_' );
        if ( $slug === '' ) {
            $slug = wc_sanitize_taxonomy_name( $label );
            $slug = str_replace( '-', '_', $slug );
            $slug = preg_replace( '/[^a-z0-9_]/', '', (string) $slug );
            $slug = trim( (string) $slug, '_' );
        }

        $taxonomy = wc_attribute_taxonomy_name( $slug );
        if ( taxonomy_exists( $taxonomy ) ) {
            return $taxonomy;
        }

        $attribute_id = (int) wc_attribute_taxonomy_id_by_name( $slug );
        if ( $attribute_id > 0 ) {
            if ( function_exists( 'delete_transient' ) ) {
                delete_transient( 'wc_attribute_taxonomies' );
            }
            if ( class_exists( '\WC_Post_Types' ) ) {
                \WC_Post_Types::register_taxonomies();
            }
            $this->ensure_attribute_taxonomy_ready( $taxonomy );
            return $taxonomy;
        }

        $this->debug_log( "[PIFWC TAXONOMY DEBUG] create_global_attribute: calling wc_create_attribute(label={$label}, slug={$slug})" );

        $result = wc_create_attribute( [
            'name'         => $label,
            'slug'         => $slug,
            'type'         => 'select',
            'order_by'     => 'menu_order',
            'has_archives' => false,
        ] );

        if ( is_wp_error( $result ) ) {
            $this->debug_log( "[PIFWC TAXONOMY DEBUG] wc_create_attribute FAILED: " . $result->get_error_message() . " (code: " . $result->get_error_code() . ")" );
            $existing = $this->find_existing_global_attribute_slug_by_label( $label );
            if ( null !== $existing ) {
                $taxonomy = wc_attribute_taxonomy_name( $existing );
                if ( function_exists( 'delete_transient' ) ) {
                    delete_transient( 'wc_attribute_taxonomies' );
                }
                if ( class_exists( '\\WC_Post_Types' ) ) {
                    \WC_Post_Types::register_taxonomies();
                }
                $this->ensure_attribute_taxonomy_ready( $taxonomy );
                return $taxonomy;
            }

            return null;
        }

        if ( function_exists( 'delete_transient' ) ) {
            delete_transient( 'wc_attribute_taxonomies' );
        }
        if ( class_exists( '\\WC_Post_Types' ) ) {
            \WC_Post_Types::register_taxonomies();
        }

        // Manually register the taxonomy since WC_Post_Types::register_taxonomies()
        // only registers attributes that existed at init time
        if ( ! taxonomy_exists( $taxonomy ) ) {
            $this->debug_log( "[PIFWC TAXONOMY DEBUG] Manually registering taxonomy: {$taxonomy}" );
            register_taxonomy(
                $taxonomy,
                apply_filters( 'pifwc_taxonomy_objects_' . $taxonomy, [ 'product' ] ),
                apply_filters(
                    'pifwc_taxonomy_args_' . $taxonomy,
                    [
                        'labels'       => [
                            'name' => $label,
                        ],
                        'hierarchical' => false,
                        'show_ui'      => false,
                        'query_var'    => true,
                        'rewrite'      => false,
                        'public'       => false,
                    ]
                )
            );
            // Cache this taxonomy so we can re-register it if needed
            $this->registered_taxonomies[ $taxonomy ] = [
                'label' => $label,
                'slug'  => $slug,
            ];
            $this->debug_log( "[PIFWC TAXONOMY DEBUG] Taxonomy registered, exists now: " . ( taxonomy_exists( $taxonomy ) ? 'true' : 'false' ) );
        }

        $this->ensure_attribute_taxonomy_ready( $taxonomy );

        return $taxonomy;
    }

    private function process_product( array $product_data, string $mode, string $match_by, int $history_id = 0, int $row_number = 0, int $profile_id = 0, array $options = [] ): array {
        // Validate required data.
        if ( empty( $product_data['title'] ) && empty( $product_data['sku'] ) ) {
            return [
                'success' => false,
                'error'   => __( 'Product must have title or SKU.', 'badamsoft-product-importer-for-woocommerce' ),
            ];
        }

        // Find existing product.
        $existing_id = null;
        if ( $match_by === self::MATCH_BY_SKU && ! empty( $product_data['sku'] ) ) {
            $search_sku = $product_data['sku'];
            $this->debug_log( '[IMPORT SKU DEBUG] Searching for product with SKU: "' . $search_sku . '"' );
            $existing_id = wc_get_product_id_by_sku( $search_sku );
            if ( $existing_id ) {
                $this->debug_log( '[IMPORT SKU DEBUG] Found product ID: ' . $existing_id );
            } else {
                $this->debug_log( '[IMPORT SKU DEBUG] Product NOT FOUND for SKU: "' . $search_sku . '"' );
                // Try trimming whitespace
                $trimmed_sku = trim( $search_sku );
                if ( $trimmed_sku !== $search_sku ) {
                    $this->debug_log( '[IMPORT SKU DEBUG] Trying trimmed SKU: "' . $trimmed_sku . '"' );
                    $existing_id = wc_get_product_id_by_sku( $trimmed_sku );
                    if ( $existing_id ) {
                        $this->debug_log( '[IMPORT SKU DEBUG] Found with trimmed SKU! Product ID: ' . $existing_id );
                        $product_data['sku'] = $trimmed_sku; // Update to use trimmed version
                    }
                }
            }
        } elseif ( $match_by === self::MATCH_BY_ID && ! empty( $product_data['id'] ) ) {
            $existing_id = (int) $product_data['id'];
            if ( ! wc_get_product( $existing_id ) ) {
                $existing_id = null;
            }
        }

        // Determine action based on mode.
        if ( $existing_id ) {
            if ( $mode === self::MODE_CREATE ) {
                return [
                    'success' => true,
                    'action'  => 'skipped',
                    'product_id' => $existing_id,
                    'reason'  => __( 'Product exists, mode is create-only.', 'badamsoft-product-importer-for-woocommerce' ),
                ];
            }
            return $this->update_product( $existing_id, $product_data, $history_id, $row_number, $profile_id, $options );
        } else {
            if ( $mode === self::MODE_UPDATE ) {
                return [
                    'success' => true,
                    'action'  => 'skipped',
                    'reason'  => __( 'Product not found, mode is update-only.', 'badamsoft-product-importer-for-woocommerce' ),
                ];
            }
            return $this->create_product( $product_data, $history_id, $row_number, $profile_id, $options );
        }
    }

    /**
     * Create a new WooCommerce product.
     *
     * @param array $product_data Product data.
     * @return array Result.
     */
    private function create_product( array $product_data, int $history_id = 0, int $row_number = 0, int $profile_id = 0, array $options = [] ): array {
        try {
            $this->debug_log( '[IMPORT DEBUG] create_product called with data keys: ' . implode( ', ', array_keys( $product_data ) ) );
            
            // Determine product type
            $product_type = strtolower( (string) ( $product_data['type'] ?? 'simple' ) );
            $this->debug_log( '[IMPORT DEBUG] Product type: ' . $product_type );

            if ( 'simple' !== $product_type && null === $this->create_product_object( $product_type, 0 ) ) {
                return [
                    'success' => false,
                    'error'   => __( 'This import row is not supported by the active plugin configuration.', 'badamsoft-product-importer-for-woocommerce' ),
                ];
            }
            
            $parent_id = 0;

            // Create product object based on type
            $product = $this->create_product_object( $product_type, $parent_id );

            if ( ! $product ) {
                return [
                    'success' => false,
                    'error'   => sprintf(
                        /* translators: %s: product type. */
                        __( 'Invalid product type: %s', 'badamsoft-product-importer-for-woocommerce' ),
                        $product_type
                    ),
                ];
            }

            $this->debug_log( '[IMPORT DEBUG] Calling set_product_data with product type: ' . get_class( $product ) );
            $this->set_product_data( $product, $product_data, $history_id, $row_number, false, $profile_id, $options );

            $this->debug_log( '[IMPORT DEBUG] About to save product...' );
            $product_id = $product->save();
            $this->debug_log( '[IMPORT DEBUG] Product save() returned: ' . ( $product_id ? $product_id : 'FALSE/0' ) );
            
            if ( ! $product_id ) {
                $error_msg = 'Failed to save product. No product ID returned.';
                $this->debug_log( '[IMPORT DEBUG ERROR] ' . $error_msg );
                return [
                    'success' => false,
                    'error'   => __( 'Failed to save product.', 'badamsoft-product-importer-for-woocommerce' ),
                ];
            }
            
            $this->debug_log( '[IMPORT DEBUG] Product saved successfully with ID: ' . $product_id );

            // Brands must be assigned after the product has an ID.
            if ( ! empty( $product_data['brands'] ) ) {
                $brand_ids = $this->process_taxonomy( $product_data['brands'], 'product_brand' );
                if ( ! empty( $brand_ids ) ) {
                    wp_set_object_terms( $product_id, $brand_ids, 'product_brand' );
                }
            }

            if ( $profile_id > 0 ) {
                $this->mark_product_imported( $product_id, $profile_id );
            }
            
            // Process ACF fields after product is saved
            $this->process_acf_fields( $product );
            
            // Process images if history_id is provided
            if ( $history_id > 0 && $this->should_update_images( false, $options ) ) {
                $this->process_product_images( $product, $product_data, $history_id, $row_number );
            }

            if ( $profile_id > 0 ) {
                $this->update_import_snapshot_after_save( $product, $options );
            }

            return [
                'success'    => true,
                'action'     => 'created',
                'product_id' => $product_id,
                'product'    => $product,
            ];

        } catch ( \Exception $e ) {
            $this->debug_log( '[IMPORT DEBUG EXCEPTION] Exception in create_product: ' . $e->getMessage() );
            $this->debug_log( '[IMPORT DEBUG EXCEPTION] Stack trace: ' . $e->getTraceAsString() );
            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        }
    }
    
    /**
     * Create product object based on type.
     *
     * @param string $type Product type.
     * @return \WC_Product|null
     */
    private function create_product_object( string $type, int $parent_id = 0 ): ?\WC_Product {
        if ( 'simple' === $type ) {
            return new \WC_Product_Simple();
        }

        $product = apply_filters( 'pifwc_import_create_product_object', null, $type, $parent_id );
        return $product instanceof \WC_Product ? $product : null;
    }

    /**
     * Update an existing WooCommerce product.
     *
     * @param int   $product_id   Product ID.
     * @param array $product_data Product data.
     * @return array Result.
     */
    private function update_product( int $product_id, array $product_data, int $history_id = 0, int $row_number = 0, int $profile_id = 0, array $options = [] ): array {
        try {
            $product = wc_get_product( $product_id );

            if ( ! $product ) {
                return [
                    'success' => false,
                    'error'   => __( 'Product not found for update.', 'badamsoft-product-importer-for-woocommerce' ),
                ];
            }

            // Allow add-ons to create rollback snapshots.
            if ( $history_id > 0 ) {
                $snapshot_id = (int) apply_filters( 'pifwc_import_snapshot_target_id', $product_id, $product, $product_data, $history_id );
                
                do_action( 'pifwc_after_product_update', $product_id, $snapshot_id, $history_id, $product );
            }

            $product_data = $this->apply_update_rules_to_product_data( $product, $product_data, $options );
            $this->set_product_data( $product, $product_data, $history_id, $row_number, true, $profile_id, $options );

            $product->save();

            if ( $profile_id > 0 ) {
                $this->mark_product_imported( $product_id, $profile_id );
            }
            
            // Process ACF fields after product is saved
            $this->process_acf_fields( $product );
            
            // Process images if history_id is provided
            if ( $history_id > 0 && $this->should_update_images( true, $options ) ) {
                $this->process_product_images( $product, $product_data, $history_id, $row_number );
            }

            if ( $profile_id > 0 ) {
                $this->update_import_snapshot_after_save( $product, $options );
            }

            return [
                'success'    => true,
                'action'     => 'updated',
                'product_id' => $product_id,
                'product'    => $product,
            ];

        } catch ( \Exception $e ) {
            return [
                'success' => false,
                'error'   => $e->getMessage(),
            ];
        }
    }

    /**
     * Set product data from mapped values.
     *
     * @param \WC_Product $product      Product object.
     * @param array       $product_data Mapped data.
     */
    private function set_product_data( \WC_Product $product, array $product_data, int $history_id = 0, int $row_number = 0, bool $is_update = false, int $profile_id = 0, array $options = [] ): void {
        $this->debug_log( '[IMPORT DEBUG] set_product_data - Received keys: ' . implode( ', ', array_keys( $product_data ) ) );

        $groups = $this->get_update_groups( $options );
        
        // Title.
        if ( ! $is_update || ! empty( $groups['content'] ) ) {
            if ( ! empty( $product_data['title'] ) ) {
                $product->set_name( sanitize_text_field( $product_data['title'] ) );
                $this->debug_log( '[IMPORT DEBUG] Set title: ' . $product_data['title'] );
            } else {
                $this->debug_log( '[IMPORT DEBUG] Title is empty or not set' );
            }
        }

        // SKU.
        if ( ( ! $is_update || ! empty( $groups['content'] ) ) && isset( $product_data['sku'] ) ) {
            $sku = sanitize_text_field( $product_data['sku'] );
            // Check if SKU is unique (for new products).
            if ( $product->get_id() === 0 ) {
                $existing = wc_get_product_id_by_sku( $sku );
                if ( $existing ) {
                    $sku = $sku . '-' . uniqid();
                }
            }
            $product->set_sku( $sku );
            $this->debug_log( '[IMPORT DEBUG] Set SKU: ' . $sku );
        }

        // Slug.
        if ( ! $is_update || ! empty( $groups['content'] ) ) {
            if ( ! empty( $product_data['slug'] ) ) {
                $product->set_slug( sanitize_title( $product_data['slug'] ) );
            }
        }

        // Status.
        if ( ! $is_update || ! empty( $groups['content'] ) ) {
            if ( ! empty( $product_data['status'] ) ) {
                $product->set_status( sanitize_text_field( $product_data['status'] ) );
            } elseif ( ! $is_update ) {
                $product->set_status( 'publish' );
            }
        }

        // Description.
        if ( ! $is_update || ! empty( $groups['content'] ) ) {
            if ( isset( $product_data['description'] ) ) {
                $product->set_description( wp_kses_post( $product_data['description'] ) );
                $this->debug_log( '[IMPORT DEBUG] Set description: ' . substr( (string) $product_data['description'], 0, 50 ) . '...' );
            }
        }

        // Short description.
        if ( ! $is_update || ! empty( $groups['content'] ) ) {
            if ( isset( $product_data['short_description'] ) ) {
                $product->set_short_description( wp_kses_post( $product_data['short_description'] ) );
                $this->debug_log( '[IMPORT DEBUG] Set short_description' );
            }
        }

        // Regular price.
        if ( ! $is_update || ! empty( $groups['pricing'] ) ) {
            if ( isset( $product_data['regular_price'] ) ) {
                $product->set_regular_price( (string) floatval( $product_data['regular_price'] ) );
                $this->debug_log( '[IMPORT DEBUG] Set regular_price: ' . $product_data['regular_price'] );
            }
        }

        // Sale price.
        if ( ! $is_update || ! empty( $groups['pricing'] ) ) {
            if ( isset( $product_data['sale_price'] ) ) {
                $sale_price = $product_data['sale_price'];
                if ( $sale_price !== '' && $sale_price !== null ) {
                    $product->set_sale_price( (string) floatval( $sale_price ) );
                    $this->debug_log( '[IMPORT DEBUG] Set sale_price: ' . $sale_price );
                }
            }
        }

        // Stock management.
        if ( ! $is_update || ! empty( $groups['inventory'] ) ) {
            if ( isset( $product_data['manage_stock'] ) ) {
                $product->set_manage_stock( filter_var( $product_data['manage_stock'], FILTER_VALIDATE_BOOLEAN ) );
            }
        }

        // Stock quantity.
        if ( ( ! $is_update || ! empty( $groups['inventory'] ) ) && isset( $product_data['stock_quantity'] ) ) {
            $stock_quantity_raw = $product_data['stock_quantity'];
            if ( $stock_quantity_raw !== '' && $stock_quantity_raw !== null ) {
                $product->set_stock_quantity( (int) $stock_quantity_raw );
                $product->set_manage_stock( true );

                if ( ! isset( $product_data['stock_status'] ) ) {
                    $qty = $product->get_stock_quantity();
                    if ( null !== $qty && (int) $qty > 0 ) {
                        $product->set_stock_status( 'instock' );
                    } else {
                        $product->set_stock_status( $product->backorders_allowed() ? 'onbackorder' : 'outofstock' );
                    }
                }
            } else {
                do_action( 'pifwc_import_apply_inventory_defaults', $product, $product_data, $is_update, $options );
            }
        }

        // Stock status.
        if ( ! $is_update || ! empty( $groups['inventory'] ) ) {
            if ( isset( $product_data['stock_status'] ) ) {
                $product->set_stock_status( sanitize_text_field( $product_data['stock_status'] ) );
            }
        }

        // Weight.
        if ( ! $is_update || ! empty( $groups['shipping'] ) ) {
            if ( isset( $product_data['weight'] ) ) {
                $product->set_weight( (string) floatval( $product_data['weight'] ) );
            }
        }

        // Dimensions.
        if ( ! $is_update || ! empty( $groups['shipping'] ) ) {
            if ( isset( $product_data['length'] ) ) {
                $product->set_length( (string) floatval( $product_data['length'] ) );
            }
            if ( isset( $product_data['width'] ) ) {
                $product->set_width( (string) floatval( $product_data['width'] ) );
            }
            if ( isset( $product_data['height'] ) ) {
                $product->set_height( (string) floatval( $product_data['height'] ) );
            }
        }

        // Categories.
        if ( ! $is_update || ! empty( $groups['taxonomies'] ) ) {
            if ( ! empty( $product_data['categories'] ) ) {
                $category_ids = $this->process_categories( $product_data['categories'], $history_id, $row_number );
                $product->set_category_ids( $category_ids );
            }
        }

        // Tags.
        if ( ! $is_update || ! empty( $groups['taxonomies'] ) ) {
            if ( ! empty( $product_data['tags'] ) ) {
                $tag_ids = $this->process_tags( $product_data['tags'] );
                $product->set_tag_ids( $tag_ids );
            }
        }
        
        // Brands (custom taxonomy).
        if ( ! $is_update || ! empty( $groups['taxonomies'] ) ) {
            if ( ! empty( $product_data['brands'] ) && $product->get_id() ) {
                $brand_ids = $this->process_taxonomy( $product_data['brands'], 'product_brand' );
                if ( ! empty( $brand_ids ) ) {
                    wp_set_object_terms( $product->get_id(), $brand_ids, 'product_brand' );
                }
            }
        }

        // Featured.
        if ( ! $is_update || ! empty( $groups['content'] ) ) {
            if ( isset( $product_data['featured'] ) ) {
                $product->set_featured( filter_var( $product_data['featured'], FILTER_VALIDATE_BOOLEAN ) );
            }
        }

        // Catalog visibility.
        if ( ! $is_update || ! empty( $groups['content'] ) ) {
            if ( ! empty( $product_data['catalog_visibility'] ) ) {
                $product->set_catalog_visibility( sanitize_text_field( $product_data['catalog_visibility'] ) );
            }
        }

        // Tax status.
        if ( ! $is_update || ! empty( $groups['pricing'] ) ) {
            if ( ! empty( $product_data['tax_status'] ) ) {
                $product->set_tax_status( sanitize_text_field( $product_data['tax_status'] ) );
            }
        }

        // Tax class.
        if ( ! $is_update || ! empty( $groups['pricing'] ) ) {
            if ( isset( $product_data['tax_class'] ) ) {
                $product->set_tax_class( sanitize_text_field( $product_data['tax_class'] ) );
            }
        }
        
        // Custom fields and meta data
        if ( ! $is_update || ! empty( $groups['meta'] ) ) {
            $this->set_custom_fields( $product, $product_data );
        }
        
        // Attributes (New Structured Format)
        if ( ! $is_update || ! empty( $groups['attributes'] ) ) {
            if ( ! empty( $product_data['attributes'] ) ) {
                $handle_attributes_internally = (bool) apply_filters( 'pifwc_import_handle_attributes_internally', true, $product, $product_data );

                if ( $handle_attributes_internally ) {
                    $this->process_attributes_config( $product, $product_data['attributes'] );
                } else {
                    do_action( 'pifwc_import_apply_attributes', $product, $product_data['attributes'], $product_data );
                }
            }
        }
        
        // Allow add-ons to apply additional product data.
        $this->set_type_specific_data( $product, $product_data );
    }
    
    /**
     * Set custom fields and meta data.
     *
     * @param \WC_Product $product      Product object.
     * @param array       $product_data Mapped data.
     */
    private function set_custom_fields( \WC_Product $product, array $product_data ): void {
        // Process custom fields (meta_*)
        foreach ( $product_data as $key => $value ) {
            // Check if it's a custom field (starts with meta_)
            if ( strpos( $key, 'meta_' ) === 0 ) {
                $meta_key = substr( $key, 5 ); // Remove 'meta_' prefix
                
                if ( ! empty( $meta_key ) ) {
                    $product->update_meta_data( $meta_key, $value );
                }
            }
            
            // Check if it's an ACF field (starts with acf_)
            if ( strpos( $key, 'acf_' ) === 0 ) {
                $field_key = substr( $key, 4 ); // Remove 'acf_' prefix
                
                if ( ! empty( $field_key ) && function_exists( 'update_field' ) ) {
                    // ACF field - will be updated after product is saved
                    $product->add_meta_data( '_pifwc_acf_field_' . $field_key, $value, true );
                }
            }
        }
        
        // Process generic meta data array
        if ( ! empty( $product_data['meta_data'] ) && is_array( $product_data['meta_data'] ) ) {
            foreach ( $product_data['meta_data'] as $meta_key => $meta_value ) {
                $product->update_meta_data( $meta_key, $meta_value );
            }
        }
        
        // Process custom attributes (non-variation attributes)
        if ( ! empty( $product_data['custom_attributes'] ) ) {
            $this->set_custom_attributes( $product, $product_data['custom_attributes'] );
        }
    }
    
    /**
     * Set custom attributes (non-variation).
     *
     * @param \WC_Product  $product    Product object.
     * @param string|array $attributes Custom attributes data.
     */
    private function set_custom_attributes( \WC_Product $product, $attributes ): void {
        $existing_attributes = $product->get_attributes();
        $parsed_attributes = $this->parse_attributes( $attributes );
        
        foreach ( $parsed_attributes as $attribute_name => $attribute_values ) {
            $attribute = new \WC_Product_Attribute();
            $attribute->set_name( sanitize_title( $attribute_name ) );
            $attribute->set_options( $attribute_values );
            $attribute->set_position( count( $existing_attributes ) );
            $attribute->set_visible( true );
            $attribute->set_variation( false );
            
            $existing_attributes[] = $attribute;
        }
        
        $product->set_attributes( $existing_attributes );
    }
    
    /**
     * Process ACF fields after product is saved.
     *
     * @param \WC_Product $product Product object.
     */
    private function process_acf_fields( \WC_Product $product ): void {
        if ( ! function_exists( 'update_field' ) ) {
            return;
        }
        
        $product_id = $product->get_id();
        $meta_data = $product->get_meta_data();
        
        foreach ( $meta_data as $meta ) {
            $key = $meta->key;
            
            if ( strpos( $key, '_pifwc_acf_field_' ) === 0 ) {
                $field_key = substr( $key, 17 ); // Remove '_pifwc_acf_field_' prefix
                $value = $meta->value;
                
                // Update ACF field
                update_field( $field_key, $value, $product_id );
                
                // Remove temporary meta
                $product->delete_meta_data( $key );
            }
        }
        
        $product->save_meta_data();
    }
    
    /**
     * Set product type-specific data.
     *
     * @param \WC_Product $product      Product object.
     * @param array       $product_data Mapped data.
     */
    private function set_type_specific_data( \WC_Product $product, array $product_data ): void {
        do_action( 'pifwc_import_apply_product_data', $product, $product_data );
    }
    
    /**
     * Process attributes configuration (structured or legacy).
     *
     * @param \WC_Product  $product    Product object.
     * @param string|array $attributes Attributes data.
     */
    private function process_attributes_config( \WC_Product $product, $attributes ): void {
        $product_attributes = [];

        if ( is_array( $attributes ) && ! empty( $attributes ) && isset( $attributes[0]['name'] ) ) {
            foreach ( $attributes as $attr_config ) {
                $attribute_name = (string) ( $attr_config['name'] ?? '' );
                if ( $attribute_name === '' ) {
                    continue;
                }

                $attribute_name = $this->maybe_decode_percent_encoded_string( $attribute_name );
                $attribute_values = $attr_config['options'] ?? [];
                if ( ! is_array( $attribute_values ) ) {
                    $attribute_values = [ $attribute_values ];
                }

                $is_taxonomy = ! empty( $attr_config['is_taxonomy'] );
                $auto_create = ! empty( $attr_config['auto_create_terms'] );
                $attribute_key = $attribute_name;

                if ( $is_taxonomy ) {
                    $slug = $this->get_attribute_slug( $attribute_name );
                    $taxonomy = wc_attribute_taxonomy_name( $slug );

                    $this->ensure_attribute_taxonomy_ready( $taxonomy );

                    if ( ! taxonomy_exists( $taxonomy ) && $auto_create ) {
                        $this->log( 0, 0, 'info', "Attempting to create global attribute: $attribute_name ($slug)" );
                        $created_taxonomy = $this->create_global_attribute( $attribute_name, $slug );
                        if ( $created_taxonomy ) {
                            $taxonomy = $created_taxonomy;
                            $this->ensure_attribute_taxonomy_ready( $taxonomy );
                            $this->log( 0, 0, 'info', "Successfully created taxonomy: $taxonomy" );
                        } else {
                            $this->log( 0, 0, 'error', "Failed to create taxonomy for: $attribute_name" );
                        }
                    }

                    if ( taxonomy_exists( $taxonomy ) ) {
                        $attribute_key = $taxonomy;
                        $this->debug_log( "[PIFWC TAXONOMY DEBUG] process_attributes_config: taxonomy {$taxonomy} EXISTS, using as key" );
                    } else {
                        $this->debug_log( "[PIFWC TAXONOMY DEBUG] process_attributes_config: taxonomy {$taxonomy} DOES NOT EXIST after ensure_ready, falling back to custom attribute" );
                        $is_taxonomy = false;
                    }
                }

                $attribute_object = new \WC_Product_Attribute();

                if ( $is_taxonomy ) {
                    $attribute_object->set_name( $attribute_key );
                    $attribute_object->set_id( (int) wc_attribute_taxonomy_id_by_name( $slug ) );

                    $this->ensure_attribute_taxonomy_ready( $attribute_key );

                    $term_ids = [];
                    foreach ( $attribute_values as $value ) {
                        $value = trim( (string) $value );
                        if ( $value === '' ) {
                            continue;
                        }

                        $normalized_value = $this->normalize_attribute_value( $value );
                        $term_slug = $this->safe_term_slug( $normalized_value );
                        $term = null;
                        if ( $term_slug !== '' ) {
                            $term = get_term_by( 'slug', $term_slug, $attribute_key );
                        }
                        if ( ! $term ) {
                            $term = get_term_by( 'name', $normalized_value, $attribute_key );
                        }
                        if ( ! $term && $normalized_value !== $value ) {
                            $term = get_term_by( 'name', $value, $attribute_key );
                        }
                        if ( ! $term && $auto_create ) {
                            $this->debug_log( "[PIFWC TERM DEBUG] Parent: attempting wp_insert_term(name={$normalized_value}, taxonomy={$attribute_key}, slug={$term_slug})" );
                            $result = wp_insert_term( $normalized_value, $attribute_key, [ 'slug' => $term_slug ] );
                            if ( is_wp_error( $result ) ) {
                                $this->debug_log( "[PIFWC TERM DEBUG] Parent: wp_insert_term FAILED: " . $result->get_error_message() . " (code: " . $result->get_error_code() . ")" );
                            } else {
                                $this->debug_log( "[PIFWC TERM DEBUG] Parent: wp_insert_term SUCCESS: term_id=" . $result['term_id'] );
                                $term = get_term( $result['term_id'], $attribute_key );
                            }
                        }

                        if ( $term && ! is_wp_error( $term ) ) {
                            $term_ids[] = (int) $term->term_id;
                        }
                    }
                    $attribute_object->set_options( array_values( array_unique( $term_ids ) ) );
                } else {
                    $attribute_object->set_name( sanitize_title( $attribute_key ) );

                    $options = [];
                    foreach ( $attribute_values as $value ) {
                        $value = trim( (string) $value );
                        if ( $value === '' ) {
                            continue;
                        }
                        $normalized_value = $this->normalize_attribute_value( $value );
                        if ( $normalized_value !== '' ) {
                            $options[] = $normalized_value;
                        }
                    }
                    $attribute_object->set_options( array_values( array_unique( $options ) ) );
                }

                $attribute_object->set_position( count( $product_attributes ) );
                $attribute_object->set_visible( array_key_exists( 'visible', $attr_config ) ? (bool) $attr_config['visible'] : true );
                $attribute_object->set_variation( false );
                $product_attributes[] = $attribute_object;
            }

            $product->set_attributes( $product_attributes );
            return;
        }

        $this->set_custom_attributes( $product, $attributes );
    }

    /**
     * Process images for a product after it's saved.
     *
     * @param \WC_Product $product      Product object.
     * @param array       $product_data Mapped data.
     * @param int         $history_id   History ID for logging.
     * @param int         $row_number   Row number for logging.
     * @return array Media processing stats.
     */
    public function process_product_images( \WC_Product $product, array $product_data, int $history_id, int $row_number ): array {
        $stats = [
            'downloaded' => 0,
            'cached'     => 0,
            'failed'     => 0,
            'errors'     => [],
        ];

        $product_id = $product->get_id();
        $gallery_ids = [];
        $featured_url = null;

        // Process featured image (support both 'featured_image' and 'image' keys).
        $featured_image = $product_data['featured_image'] ?? $product_data['image'] ?? null;
        if ( ! empty( $featured_image ) ) {
            $urls = $this->media_handler->parse_image_urls( $featured_image );
            if ( ! empty( $urls[0] ) ) {
                $result = $this->media_handler->process_image( $urls[0], $product_id, [ 'skip_missing' => true ] );
                if ( $result['success'] ) {
                    $product->set_image_id( $result['attachment_id'] );
                    $featured_url = $urls[0];
                    if ( ! empty( $result['cached'] ) ) {
                        $stats['cached']++;
                    } else {
                        $stats['downloaded']++;
                    }
                } else {
                    $stats['failed']++;
                    $stats['errors'][] = $result['error'];
                    $this->log( $history_id, $row_number, 'warning', sprintf(
                        /* translators: 1: image URL, 2: error message. */
                        __( 'Failed to download featured image: %1$s - %2$s', 'badamsoft-product-importer-for-woocommerce' ),
                        $urls[0],
                        $result['error']
                    ) );
                }
            }
        }

        // Process gallery images (support both 'gallery_images' and 'gallery' keys).
        $gallery_images = $product_data['gallery_images'] ?? $product_data['gallery'] ?? null;
        if ( ! empty( $gallery_images ) ) {
            $urls = $this->media_handler->parse_image_urls( $gallery_images );
            foreach ( $urls as $url ) {
                $result = $this->media_handler->process_image( $url, $product_id, [ 'skip_missing' => true ] );
                if ( $result['success'] ) {
                    $gallery_ids[] = $result['attachment_id'];
                    if ( ! empty( $result['cached'] ) ) {
                        $stats['cached']++;
                    } else {
                        $stats['downloaded']++;
                    }
                } else {
                    $stats['failed']++;
                    $stats['errors'][] = $result['error'];
                    $this->log( $history_id, $row_number, 'warning', sprintf(
                        /* translators: 1: image URL, 2: error message. */
                        __( 'Failed to download gallery image: %1$s - %2$s', 'badamsoft-product-importer-for-woocommerce' ),
                        $url,
                        $result['error']
                    ) );
                }
            }
        }

        // Process generic images field (first = featured, rest = gallery).
        if ( ! empty( $product_data['images'] ) ) {
            $urls = $this->media_handler->parse_image_urls( $product_data['images'] );
            $is_first = ! $product->get_image_id(); // Only set featured if not already set.

            foreach ( $urls as $url ) {
                $result = $this->media_handler->process_image( $url, $product_id, [ 'skip_missing' => true ] );
                if ( $result['success'] ) {
                    if ( $is_first ) {
                        $product->set_image_id( $result['attachment_id'] );
                        $featured_url = $url;
                        $is_first = false;
                    } else {
                        $gallery_ids[] = $result['attachment_id'];
                    }

                    if ( ! empty( $result['cached'] ) ) {
                        $stats['cached']++;
                    } else {
                        $stats['downloaded']++;
                    }
                } else {
                    $stats['failed']++;
                    $stats['errors'][] = $result['error'];
                    $this->log( $history_id, $row_number, 'warning', sprintf(
                        /* translators: 1: image URL, 2: error message. */
                        __( 'Failed to download image: %1$s - %2$s', 'badamsoft-product-importer-for-woocommerce' ),
                        $url,
                        $result['error']
                    ) );
                }
            }
        }

        // Set gallery images.
        if ( ! empty( $gallery_ids ) ) {
            $product->set_gallery_image_ids( array_unique( $gallery_ids ) );
        }

        // Save product with images.
        if ( $stats['downloaded'] > 0 || $stats['cached'] > 0 ) {
            $product->save();
        }

        // Log consolidated results (only once per product).
        if ( $featured_url ) {
            $this->log( $history_id, $row_number, 'info', sprintf(
                /* translators: %s: image URL. */
                __( 'Featured image set: %s', 'badamsoft-product-importer-for-woocommerce' ),
                $featured_url
            ) );
        }
        if ( ! empty( $gallery_ids ) ) {
            $this->log( $history_id, $row_number, 'info', sprintf(
                /* translators: %d: number of images. */
                __( 'Gallery images set: %d images', 'badamsoft-product-importer-for-woocommerce' ),
                count( $gallery_ids )
            ) );
        }

        return $stats;
    }

    /**
     * Process categories with enhanced logging and error handling.
     * Inspired by WP All Import best practices.
     *
     * @param string|array $categories Categories data.
     * @param int          $history_id History ID for logging.
     * @param int          $row_number Row number for logging.
     * @return array Category IDs.
     */
    private function process_categories( $categories, int $history_id = 0, int $row_number = 0 ): array {
        if ( is_string( $categories ) ) {
            $categories = array_map( 'trim', explode( ',', $categories ) );
        }

        if ( ! is_array( $categories ) ) {
            return [];
        }

        $ids = [];
        foreach ( $categories as $cat_path ) {
            $cat_path = trim( $cat_path );
            if ( empty( $cat_path ) ) {
                continue;
            }

            // Check if this is a hierarchical category (Parent > Child)
            if ( strpos( $cat_path, '>' ) !== false ) {
                $parts = array_map( 'trim', explode( '>', $cat_path ) );
                $parent_id = 0;
                
                foreach ( $parts as $cat_name ) {
                    if ( empty( $cat_name ) ) {
                        continue;
                    }

                    $existing_id = $this->find_existing_term_id_by_name_and_parent( $cat_name, 'product_cat', $parent_id );
                    if ( $existing_id > 0 ) {
                        $parent_id = $existing_id;
                        $ids[] = $existing_id;
                        continue;
                    }

                    $current_parent = $parent_id;
                    $result = wp_insert_term( $cat_name, 'product_cat', [ 'parent' => $current_parent ] );
                    if ( ! is_wp_error( $result ) && ! empty( $result['term_id'] ) ) {
                        $parent_id = (int) $result['term_id'];
                        if ( $history_id > 0 ) {
                            $this->log( $history_id, $row_number, 'info', sprintf( 'Created category "%s" (ID: %d, Parent: %d)', $cat_name, $parent_id, (int) $current_parent ) );
                        }
                        $ids[] = $parent_id;
                    } else {
                        if ( $history_id > 0 ) {
                            $this->log( $history_id, $row_number, 'warning', sprintf( 'Failed to create category "%s": %s', $cat_name, is_wp_error( $result ) ? $result->get_error_message() : 'Unknown error' ) );
                        }
                    }
                }
            } else {
                // Simple category (no hierarchy)
                $existing_id = $this->find_existing_term_id_by_name_and_parent( $cat_path, 'product_cat', 0 );
                if ( $existing_id > 0 ) {
                    $ids[] = $existing_id;
                    continue;
                }

                $result = wp_insert_term( $cat_path, 'product_cat' );
                if ( ! is_wp_error( $result ) && ! empty( $result['term_id'] ) ) {
                    $ids[] = (int) $result['term_id'];
                    if ( $history_id > 0 ) {
                        $this->log( $history_id, $row_number, 'info', sprintf( 'Created category "%s" (ID: %d)', $cat_path, (int) $result['term_id'] ) );
                    }
                } else {
                    if ( $history_id > 0 ) {
                        $this->log( $history_id, $row_number, 'warning', sprintf( 'Failed to create category "%s": %s', $cat_path, is_wp_error( $result ) ? $result->get_error_message() : 'Unknown error' ) );
                    }
                }
            }
        }

        $ids = array_values( array_unique( array_map( 'intval', $ids ) ) );
        return $ids;
    }

    private function find_existing_term_id_by_name_and_parent( string $name, string $taxonomy, int $parent_id ): int {
        $name = trim( $name );
        if ( $name === '' ) {
            return 0;
        }

        global $wpdb;
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Needed for exact term lookup by name+parent combination.
        $found = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT tt.term_id FROM {$wpdb->term_taxonomy} tt INNER JOIN {$wpdb->terms} t ON t.term_id = tt.term_id WHERE tt.taxonomy = %s AND tt.parent = %d AND t.name = %s LIMIT 1",
                $taxonomy,
                $parent_id,
                $name
            )
        );
        return $found ? (int) $found : 0;
    }

    /**
     * Process tags string/array into term IDs.
     *
     * @param mixed $tags Tags data.
     * @return array Tag IDs.
     */
    private function process_tags( $tags ): array {
        return $this->process_taxonomy( $tags, 'product_tag' );
    }
    
    /**
     * Process taxonomy terms (generic method for tags, brands, etc).
     *
     * @param mixed  $terms    Terms data (string or array).
     * @param string $taxonomy Taxonomy name.
     * @return array Term IDs.
     */
    private function process_taxonomy( $terms, string $taxonomy ): array {
        if ( is_string( $terms ) ) {
            $terms = array_map( 'trim', explode( ',', $terms ) );
        }

        if ( ! is_array( $terms ) ) {
            return [];
        }

        $ids = [];
        foreach ( $terms as $term_name ) {
            $term_name = trim( $term_name );
            if ( empty( $term_name ) ) {
                continue;
            }

            // Check if term exists.
            $term = get_term_by( 'name', $term_name, $taxonomy );
            if ( $term ) {
                $ids[] = $term->term_id;
            } else {
                // Create term.
                $result = wp_insert_term( $term_name, $taxonomy );
                if ( ! is_wp_error( $result ) ) {
                    $ids[] = $result['term_id'];
                }
            }
        }

        return $ids;
    }

    /**
     * Get import job status.
     *
     * @param int $job_id Job ID.
     * @return array|null Job data.
     */
    public function get_job_status( int $job_id ): ?array {
        $job = null;
        if ( method_exists( $this->jobs_repository, 'get_status_row' ) ) {
            $job = $this->jobs_repository->get_status_row( $job_id );
        }
        if ( null === $job ) {
            $job = $this->jobs_repository->get_full_job( $job_id );
        }
        
        if ( ! $job ) {
            return null;
        }

        // Get history for this job.
        $history = null;
        if ( method_exists( $this->history_repository, 'get_latest_by_job_row' ) ) {
            $history = $this->history_repository->get_latest_by_job_row( $job_id );
        } else {
            $history_records = $this->history_repository->find_by_job( $job_id );
            $history = ! empty( $history_records ) ? $history_records[0] : null;
        }

        if ( $history ) {
            if ( is_array( $history ) ) {
                $job['total_rows'] = (int) ( $history['total_rows'] ?? 0 );
                $job['added'] = (int) ( $history['added'] ?? 0 );
                $job['updated'] = (int) ( $history['updated'] ?? 0 );
                $job['skipped'] = (int) ( $history['skipped'] ?? 0 );
                $job['errors'] = (int) ( $history['errors'] ?? 0 );
                $job['started_at'] = $history['started_at'] ?? null;
                $job['finished_at'] = $history['finished_at'] ?? null;
            } else {
                $job['total_rows'] = $history->total_rows ?? 0;
                $job['added'] = $history->added ?? 0;
                $job['updated'] = $history->updated ?? 0;
                $job['skipped'] = $history->skipped ?? 0;
                $job['errors'] = $history->errors ?? 0;
                $job['started_at'] = $history->started_at ?? null;
                $job['finished_at'] = $history->finished_at ?? null;
            }

            // Calculate progress.
            $processed = $job['added'] + $job['updated'] + $job['skipped'];
            $total = $job['total_rows'];
            $job['progress'] = $total > 0 ? round( ( $processed / $total ) * 100, 1 ) : 0;
            $job['processed'] = $processed;
        } else {
            $job['progress'] = 0;
            $job['processed'] = 0;
        }

        $job['timestamp'] = time();
        $this->cache_job_status( $job_id, $job, 5 );

        return $job;
    }

    public function get_cached_job_status( int $job_id, bool $allow_db = false ): ?array {
        $key = $this->get_job_status_cache_key( $job_id );

        if ( function_exists( 'wp_cache_get' ) ) {
            $cached = wp_cache_get( $key, 'pifwc_job_status' );
            if ( is_array( $cached ) ) {
                return $cached;
            }
        }

        $cached = $this->read_job_status_cache_file( $job_id );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $use_transient = $allow_db && function_exists( 'apply_filters' )
            ? (bool) apply_filters( 'pifwc_status_cache_use_transients', false )
            : false;
        if ( $use_transient && function_exists( 'get_transient' ) ) {
            $cached = get_transient( $key );
            if ( is_array( $cached ) ) {
                return $cached;
            }
        }

        return null;
    }

    public function cache_job_status( int $job_id, array $status, int $ttl = 30 ): void {
        $key = $this->get_job_status_cache_key( $job_id );

        $status['job_id'] = $status['job_id'] ?? $job_id;
        $status['id'] = $status['id'] ?? $job_id;
        if ( empty( $status['timestamp'] ) ) {
            $status['timestamp'] = time();
        }
        $status['expires_at'] = $status['expires_at'] ?? ( time() + max( 1, $ttl ) );

        if ( function_exists( 'wp_cache_set' ) ) {
            wp_cache_set( $key, $status, 'pifwc_job_status', $ttl );
        }

        $this->write_job_status_cache_file( $job_id, $status, $ttl );

        $use_transient = function_exists( 'apply_filters' )
            ? (bool) apply_filters( 'pifwc_status_cache_use_transients', false )
            : false;
        if ( $use_transient && function_exists( 'set_transient' ) ) {
            set_transient( $key, $status, $ttl );
        }
    }

    private function get_job_status_cache_key( int $job_id ): string {
        return 'pifwc_job_status_' . $job_id;
    }

    private function get_job_status_cache_dir(): string {
        $upload_dir = wp_upload_dir();
        return trailingslashit( $upload_dir['basedir'] ) . 'badamsoft-product-importer-for-woocommerce/status-cache';
    }

    private function get_job_status_cache_file_path( int $job_id ): string {
        return $this->get_job_status_cache_dir() . '/job-' . $job_id . '.json';
    }

    private function read_job_status_cache_file( int $job_id, bool $allow_expired = false ): ?array {
        $path = $this->get_job_status_cache_file_path( $job_id );
        if ( ! is_file( $path ) ) {
            return null;
        }

        $contents = @file_get_contents( $path );
        if ( false === $contents || '' === $contents ) {
            return null;
        }

        $decoded = json_decode( $contents, true );
        if ( ! is_array( $decoded ) ) {
            return null;
        }

        $expires_at = isset( $decoded['expires_at'] ) ? (int) $decoded['expires_at'] : 0;
        if ( ! $allow_expired && $expires_at > 0 && $expires_at < time() ) {
            return null;
        }

        return $decoded;
    }

    private function write_job_status_cache_file( int $job_id, array $status, int $ttl ): void {
        $dir = $this->get_job_status_cache_dir();
        if ( ! is_dir( $dir ) ) {
            wp_mkdir_p( $dir );
        }

        if ( ! is_dir( $dir ) ) {
            return;
        }

        $status['expires_at'] = $status['expires_at'] ?? ( time() + max( 1, $ttl ) );
        $payload = wp_json_encode( $status );
        if ( false === $payload ) {
            return;
        }

        $path = $this->get_job_status_cache_file_path( $job_id );
        @file_put_contents( $path, $payload, LOCK_EX );
    }

    /**
     * Get job logs.
     *
     * @param int $job_id Job ID.
     * @param int $limit  Max logs.
     * @param int $offset Offset.
     * @return array Logs.
     */
    public function get_job_logs( int $job_id, int $limit = 100, int $offset = 0 ): array {
        // Get history for this job.
        $history_records = $this->history_repository->find_by_job( $job_id );
        
        if ( empty( $history_records ) ) {
            return [];
        }

        $history = $history_records[0];
        $history_id = (int) $history->id;

        // Get logs for this history.
        $logs = $this->logs_repository->find_by_history( $history_id );

        // Convert objects to arrays and apply limit/offset.
        $logs_array = array_map( function( $log ) {
            return [
                'id'         => $log->id,
                'history_id' => $log->history_id,
                'row_number' => $log->row_number,
                'level'      => $log->level,
                'message'    => $log->message,
                'payload'    => $log->payload ? json_decode( $log->payload, true ) : null,
                'created_at' => $log->created_at,
            ];
        }, $logs );

        // Apply limit and offset.
        return array_slice( $logs_array, $offset, $limit );
    }

    /**
     * Abort a running job.
     *
     * @param int $job_id Job ID.
     * @return bool Success.
     */
    public function abort_job( int $job_id ): bool {
        $ok = $this->jobs_repository->update_status( $job_id, self::STATUS_ABORTED );
        if ( ! $ok ) {
            return false;
        }

        $history_records = $this->history_repository->find_by_job( $job_id );
        foreach ( $history_records as $history ) {
            if ( empty( $history->finished_at ) && ! empty( $history->id ) ) {
                $this->history_repository->update( (int) $history->id, [
                    'finished_at' => current_time( 'mysql' ),
                ] );
                break;
            }
        }

        return true;
    }

    /**
     * Set batch size for processing.
     *
     * @param int $size Batch size.
     */
    public function set_batch_size( int $size ): void {
        $this->batch_size = max( 1, min( $size, 500 ) ); // Between 1 and 500
    }

    /**
     * Get batch size.
     *
     * @return int
     */
    public function get_batch_size(): int {
        return $this->batch_size;
    }

    /**
     * Sanitize header name to match parser output.
     *
     * @param string $header Header name.
     * @return string
     */
    private function sanitize_header( string $header ): string {
        $header = trim( $header );
        $header = strtolower( $header );
        $header = preg_replace( '/[^a-z0-9_\-]/', '_', $header );
        $header = preg_replace( '/_+/', '_', $header );
        $header = trim( $header, '_' );

        return $header;
    }

    private function get_update_rules( array $options ): array {
        $rules = $options['update_rules'] ?? [];
        if ( ! is_array( $rules ) ) {
            $rules = [];
        }
        return $rules;
    }

    private function get_update_groups( array $options ): array {
        $defaults = [
            'content'    => true,
            'pricing'    => true,
            'inventory'  => true,
            'shipping'   => true,
            'taxonomies' => true,
            'images'     => true,
            'attributes' => true,
            'meta'       => true,
        ];

        $rules = $this->get_update_rules( $options );
        $groups = $rules['groups'] ?? null;
        if ( ! is_array( $groups ) ) {
            return $defaults;
        }

        return array_merge( $defaults, array_map( static function ( $v ): bool {
            return (bool) $v;
        }, $groups ) );
    }

    private function should_skip_empty_on_update( array $options ): bool {
        $rules = $this->get_update_rules( $options );
        if ( array_key_exists( 'skip_empty', $rules ) ) {
            return (bool) $rules['skip_empty'];
        }
        if ( array_key_exists( 'skip_empty_values', $options ) ) {
            return (bool) $options['skip_empty_values'];
        }
        if ( array_key_exists( 'skip_empty', $options ) ) {
            return (bool) $options['skip_empty'];
        }
        return true;
    }

    private function should_update_images( bool $is_update, array $options ): bool {
        if ( ! $is_update ) {
            return true;
        }

        if ( array_key_exists( 'update_images', $options ) && ! $options['update_images'] ) {
            return false;
        }

        $groups = $this->get_update_groups( $options );
        return ! empty( $groups['images'] );
    }

    private function is_effectively_empty( $value ): bool {
        if ( null === $value ) {
            return true;
        }
        if ( is_string( $value ) ) {
            return trim( $value ) === '';
        }
        if ( is_array( $value ) ) {
            return count( $value ) === 0;
        }
        return false;
    }

    private function filter_product_data_for_skip_empty( array $product_data ): array {
        foreach ( $product_data as $k => $v ) {
            if ( $this->is_effectively_empty( $v ) ) {
                unset( $product_data[ $k ] );
            }
        }
        return $product_data;
    }

    private function normalize_snapshot_value( $value ) {
        if ( is_array( $value ) ) {
            $copy = $value;
            sort( $copy );
            return $copy;
        }
        if ( is_bool( $value ) ) {
            return $value ? '1' : '0';
        }
        if ( null === $value ) {
            return '';
        }
        return (string) $value;
    }

    private function build_product_snapshot( \WC_Product $product ): array {
        $data = [
            'title'             => $product->get_name(),
            'description'       => $product->get_description(),
            'short_description' => $product->get_short_description(),
            'regular_price'     => $product->get_regular_price(),
            'sale_price'        => $product->get_sale_price(),
            'manage_stock'      => $product->get_manage_stock(),
            'stock_quantity'    => $product->get_stock_quantity(),
            'stock_status'      => $product->get_stock_status(),
            'weight'            => $product->get_weight(),
            'length'            => $product->get_length(),
            'width'             => $product->get_width(),
            'height'            => $product->get_height(),
        ];

        foreach ( $data as $k => $v ) {
            $data[ $k ] = $this->normalize_snapshot_value( $v );
        }

        return $data;
    }

    private function filter_product_data_for_manual_changes( \WC_Product $product, array $product_data, array $options ): array {
        if ( empty( $options['skip_manual_changes'] ) ) {
            return $product_data;
        }

        $snapshot = $product->get_meta( self::META_IMPORT_SNAPSHOT, true );
        if ( ! is_array( $snapshot ) || empty( $snapshot ) ) {
            return $product_data;
        }

        $current = $this->build_product_snapshot( $product );

        $map = [
            'title'             => 'title',
            'description'       => 'description',
            'short_description' => 'short_description',
            'regular_price'     => 'regular_price',
            'sale_price'        => 'sale_price',
            'manage_stock'      => 'manage_stock',
            'stock_quantity'    => 'stock_quantity',
            'stock_status'      => 'stock_status',
            'weight'            => 'weight',
            'length'            => 'length',
            'width'             => 'width',
            'height'            => 'height',
        ];

        foreach ( $map as $incoming_key => $snap_key ) {
            if ( ! array_key_exists( $incoming_key, $product_data ) ) {
                continue;
            }
            if ( ! array_key_exists( $snap_key, $snapshot ) ) {
                continue;
            }

            $snap_val = $this->normalize_snapshot_value( $snapshot[ $snap_key ] );
            $cur_val  = $this->normalize_snapshot_value( $current[ $snap_key ] ?? '' );

            if ( $cur_val !== $snap_val ) {
                unset( $product_data[ $incoming_key ] );
            }
        }

        return $product_data;
    }

    private function apply_update_rules_to_product_data( \WC_Product $product, array $product_data, array $options ): array {
        if ( $this->should_skip_empty_on_update( $options ) ) {
            $product_data = $this->filter_product_data_for_skip_empty( $product_data );
        }

        $product_data = $this->filter_product_data_for_manual_changes( $product, $product_data, $options );

        return $product_data;
    }

    private function mark_product_imported( int $product_id, int $profile_id ): void {
        if ( $profile_id <= 0 || $product_id <= 0 ) {
            return;
        }
        update_post_meta( $product_id, self::META_IMPORTED_BY_PROFILE, $profile_id );
        update_post_meta( $product_id, self::META_LAST_IMPORTED_AT, (int) current_time( 'timestamp' ) );
    }

    private function update_import_snapshot_after_save( \WC_Product $product, array $options ): void {
        if ( empty( $options['skip_manual_changes'] ) ) {
            return;
        }

        $snapshot = $this->build_product_snapshot( $product );
        $product->update_meta_data( self::META_IMPORT_SNAPSHOT, $snapshot );
        $product->save_meta_data();
    }

    /**
     * Log message.
     *
     * @param int    $history_id History ID.
     * @param int    $row_number Row number.
     * @param string $level      Log level.
     * @param string $message    Message.
     */
    private function log( int $history_id, int $row_number, string $level, string $message ): void {
        $this->logs_repository->add_log( $history_id, $level, $message, $row_number );
    }
}
