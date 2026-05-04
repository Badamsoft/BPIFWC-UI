<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Api;

use BadamSoft\ProductImporterForWooCommerce\Repository\ProfilesRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\JobsRepository;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class ProfilesController {
    public const NAMESPACE = 'pifwc/v1';

    private ProfilesRepository $profiles_repository;
    private JobsRepository $jobs_repository;

    public function __construct(
        ProfilesRepository $profiles_repository,
        JobsRepository $jobs_repository
    ) {
        $this->profiles_repository = $profiles_repository;
        $this->jobs_repository     = $jobs_repository;
    }

    /**
     * Register REST API routes.
     */
    public function register_routes(): void {
        // List all profiles.
        register_rest_route(
            self::NAMESPACE,
            '/profiles',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'list_profiles' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'limit' => [
                        'required'          => false,
                        'type'              => 'integer',
                        'default'           => 20,
                        'sanitize_callback' => 'absint',
                    ],
                    'offset' => [
                        'required'          => false,
                        'type'              => 'integer',
                        'default'           => 0,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // Create profile.
        register_rest_route(
            self::NAMESPACE,
            '/profiles',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'create_profile' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'name' => [
                        'required'          => true,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'source_type' => [
                        'required'          => false,
                        'type'              => 'string',
                        'default'           => 'local',
                        'enum'              => [ 'local', 'upload', 'url', 'ftp', 'sftp', 'api' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'source_config' => [
                        'required' => false,
                        'type'     => 'object',
                    ],
                    'mapping' => [
                        'required' => false,
                        'type'     => 'object',
                    ],
                    'schedule' => [
                        'required' => false,
                        'type'     => 'object',
                    ],
                    'options' => [
                        'required' => false,
                        'type'     => 'object',
                    ],
                ],
            ]
        );

        // Get single profile.
        register_rest_route(
            self::NAMESPACE,
            '/profiles/(?P<id>\d+)',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_profile' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // Update profile.
        register_rest_route(
            self::NAMESPACE,
            '/profiles/(?P<id>\d+)',
            [
                'methods'             => WP_REST_Server::EDITABLE,
                'callback'            => [ $this, 'update_profile' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'name' => [
                        'required'          => false,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'source_type' => [
                        'required'          => false,
                        'type'              => 'string',
                        'enum'              => [ 'local', 'upload', 'url', 'ftp', 'sftp', 'api' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'source_config' => [
                        'required' => false,
                        'type'     => 'object',
                    ],
                    'mapping' => [
                        'required' => false,
                        'type'     => 'object',
                    ],
                    'schedule' => [
                        'required' => false,
                        'type'     => 'object',
                    ],
                    'options' => [
                        'required' => false,
                        'type'     => 'object',
                    ],
                    'is_active' => [
                        'required' => false,
                        'type'     => 'boolean',
                    ],
                ],
            ]
        );

        // Delete profile.
        register_rest_route(
            self::NAMESPACE,
            '/profiles/(?P<id>\d+)',
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete_profile' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // Duplicate profile.
        register_rest_route(
            self::NAMESPACE,
            '/profiles/(?P<id>\d+)/duplicate',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'duplicate_profile' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // Run profile now.
        register_rest_route(
            self::NAMESPACE,
            '/profiles/(?P<id>\d+)/run',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'run_profile' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // Test connection (FTP/SFTP/URL).
        do_action( 'pifwc_register_profile_test_connection_route' );
    }

    /**
     * Check if user has permission.
     */
    public function check_permission(): bool {
        return current_user_can( 'manage_woocommerce' );
    }

    /**
     * List all profiles.
     */
    public function list_profiles( WP_REST_Request $request ): WP_REST_Response {
        $limit  = $request->get_param( 'limit' );
        $offset = $request->get_param( 'offset' );

        $profiles = $this->profiles_repository->find_all( $limit, $offset );
        $total    = $this->profiles_repository->count();

        // Parse JSON fields and add last_run info.
        $parsed_profiles = [];
        foreach ( $profiles as $profile ) {
            $parsed = $this->parse_profile( (array) $profile );
            $parsed['last_run'] = $this->get_last_run( (int) $profile->id );
            $parsed['next_run'] = $this->get_next_scheduled_run( (int) $profile->id );
            $parsed_profiles[] = $parsed;
        }

        return $this->success_response( [
            'profiles' => $parsed_profiles,
            'total'    => $total,
            'limit'    => $limit,
            'offset'   => $offset,
        ] );
    }

    /**
     * Create a new profile.
     */
    public function create_profile( WP_REST_Request $request ): WP_REST_Response {
        $name          = $request->get_param( 'name' );
        $source_type   = $request->get_param( 'source_type' );
        $source_config = $request->get_param( 'source_config' );
        $mapping       = $request->get_param( 'mapping' );
        $schedule      = $request->get_param( 'schedule' );
        $options       = $request->get_param( 'options' );

        // Encrypt sensitive data in source_config.
        if ( $source_config ) {
            $source_config = $this->encrypt_credentials( $source_config );
        }

        $profile_id = $this->profiles_repository->insert( [
            'name'          => $name,
            'source'        => $source_type,
            'source_config' => $source_config ? wp_json_encode( $source_config ) : null,
            'mapping'       => $mapping ? wp_json_encode( $mapping ) : null,
            'schedule'      => $schedule ? wp_json_encode( $schedule ) : null,
            'options'       => $options ? wp_json_encode( $options ) : null,
            'created_by'    => get_current_user_id(),
        ] );

        if ( ! $profile_id ) {
            return $this->error_response( __( 'Failed to create profile.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
        }

        if ( $schedule && ! empty( $schedule['enabled'] ) ) {
            $this->schedule_profile( $profile_id, $schedule );
        }

        return $this->success_response( [
            'profile_id' => $profile_id,
            'message'    => __( 'Profile created successfully.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * Get a single profile.
     */
    public function get_profile( WP_REST_Request $request ): WP_REST_Response {
        $id = $request->get_param( 'id' );

        $profile = $this->profiles_repository->get_full_profile( $id );

        if ( ! $profile ) {
            return $this->error_response( __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ), 404 );
        }

        // Get next scheduled run.
        $profile['next_run'] = $this->get_next_scheduled_run( $id );

        // Get last run info.
        $profile['last_run'] = $this->get_last_run( $id );

        return $this->success_response( $profile );
    }

    /**
     * Update a profile.
     */
    public function update_profile( WP_REST_Request $request ): WP_REST_Response {
        $id = $request->get_param( 'id' );

        // Check if profile exists.
        $existing = $this->profiles_repository->find( $id );

        if ( ! $existing ) {
            return $this->error_response( __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ), 404 );
        }

        $data   = [];
        $format = [];

        if ( $request->has_param( 'name' ) ) {
            $data['name'] = $request->get_param( 'name' );
            $format[]     = '%s';
        }

        if ( $request->has_param( 'source_type' ) ) {
            $data['source'] = $request->get_param( 'source_type' );
        }

        if ( $request->has_param( 'source_config' ) ) {
            $source_config           = $this->encrypt_credentials( $request->get_param( 'source_config' ) );
            $data['source_config']   = wp_json_encode( $source_config );
        }

        if ( $request->has_param( 'mapping' ) ) {
            $mapping = $request->get_param( 'mapping' );
            $data['mapping'] = wp_json_encode( $mapping );
        }

        if ( $request->has_param( 'options' ) ) {
            $data['options'] = wp_json_encode( $request->get_param( 'options' ) );
        }

        if ( $request->has_param( 'schedule' ) ) {
            $schedule         = $request->get_param( 'schedule' );
            $data['schedule'] = wp_json_encode( $schedule );

            $this->unschedule_profile( $id );
            if ( ! empty( $schedule['enabled'] ) ) {
                $this->schedule_profile( $id, $schedule );
            }
        }

        if ( $request->has_param( 'is_active' ) ) {
            $data['is_active'] = $request->get_param( 'is_active' ) ? 1 : 0;
        }

        if ( empty( $data ) ) {
            return $this->success_response( [
                'message' => __( 'No changes to update.', 'badamsoft-product-importer-for-woocommerce' ),
            ] );
        }

        $result = $this->profiles_repository->update( $id, $data );

        if ( ! $result ) {
            return $this->error_response( __( 'Failed to update profile.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
        }

        return $this->success_response( [
            'message' => __( 'Profile updated successfully.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * Delete a profile.
     */
    public function delete_profile( WP_REST_Request $request ): WP_REST_Response {
        $id = $request->get_param( 'id' );

        // Unschedule first.
        $this->unschedule_profile( $id );

        $result = $this->profiles_repository->delete( $id );

        if ( ! $result ) {
            return $this->error_response( __( 'Failed to delete profile.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
        }

        return $this->success_response( [
            'message' => __( 'Profile deleted successfully.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * Duplicate a profile.
     */
    public function duplicate_profile( WP_REST_Request $request ): WP_REST_Response {
        $id = $request->get_param( 'id' );

        $profile = $this->profiles_repository->find( $id );

        if ( ! $profile ) {
            return $this->error_response( __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ), 404 );
        }

        // Create copy.
        $new_id = $this->profiles_repository->insert( [
            'name'     => $profile->name . ' (Copy)',
            'source'   => $profile->source,
            'mapping'  => $profile->mapping,
            'filters'  => $profile->filters,
            'schedule' => null,
        ] );

        if ( ! $new_id ) {
            return $this->error_response( __( 'Failed to duplicate profile.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
        }

        return $this->success_response( [
            'profile_id' => $new_id,
            'message'    => __( 'Profile duplicated successfully.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * Run a profile immediately.
     */
    public function run_profile( WP_REST_Request $request ): WP_REST_Response {
        $id = $request->get_param( 'id' );

        $profile = $this->profiles_repository->get_full_profile( $id );

        if ( ! $profile ) {
            return $this->error_response( __( 'Profile not found.', 'badamsoft-product-importer-for-woocommerce' ), 404 );
        }

        // Trigger import via Action Scheduler or directly.
        $job_id = $this->trigger_import( $profile );

        if ( ! $job_id ) {
            return $this->error_response( __( 'Failed to start import.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
        }
        return $this->success_response( [
            'job_id'  => $job_id,
            'message' => __( 'Import started.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * Test connection to remote source.
     */
    public function test_connection( WP_REST_Request $request ): WP_REST_Response {
        return $this->error_response(
            __( 'This remote source type is not supported by the active plugin configuration.', 'badamsoft-product-importer-for-woocommerce' ),
            400
        );
    }

    /**
     * Parse profile JSON fields.
     */
    private function parse_profile( array $profile ): array {
        $profile['source_config'] = json_decode( $profile['source_config'] ?? '{}', true );
        $profile['mapping']       = json_decode( $profile['mapping'] ?? '{}', true );
        $profile['schedule']      = json_decode( $profile['schedule'] ?? '{}', true );
        $profile['options']       = json_decode( $profile['options'] ?? '{}', true );
        $profile['is_active']     = (bool) ( $profile['is_active'] ?? 0 );

        // Mask sensitive credentials.
        if ( ! empty( $profile['source_config']['password'] ) ) {
            $profile['source_config']['password'] = '********';
        }

        return $profile;
    }

    /**
     * Encrypt sensitive credentials.
     */
    private function encrypt_credentials( array $config ): array {
        // Simple encryption using WordPress salt.
        if ( ! empty( $config['password'] ) && $config['password'] !== '********' ) {
            $config['password_encrypted'] = base64_encode(
                openssl_encrypt(
                    $config['password'],
                    'AES-256-CBC',
                    wp_salt( 'auth' ),
                    0,
                    substr( wp_salt( 'secure_auth' ), 0, 16 )
                )
            );
            unset( $config['password'] );
        }

        return $config;
    }

    /**
     * Decrypt credentials.
     */
    private function decrypt_credentials( array $config ): array {
        if ( ! empty( $config['password_encrypted'] ) ) {
            $config['password'] = openssl_decrypt(
                base64_decode( $config['password_encrypted'] ),
                'AES-256-CBC',
                wp_salt( 'auth' ),
                0,
                substr( wp_salt( 'secure_auth' ), 0, 16 )
            );
            unset( $config['password_encrypted'] );
        }

        return $config;
    }

    /**
     * Schedule a profile for automatic import.
     */
    private function schedule_profile( int $profile_id, array $schedule ): void {
        $frequency = $schedule['frequency'] ?? 'daily';
        $time      = $schedule['time'] ?? '00:00';

        // Calculate next run time.
        $next_run = $this->calculate_next_run( $frequency, $time, $schedule );

        // Use Action Scheduler if available.
        if ( function_exists( 'as_schedule_single_action' ) ) {
            as_schedule_single_action(
                $next_run,
                'pifwc_scheduled_import',
                [ 'profile_id' => $profile_id ],
                'pifwc-imports'
            );
        } else {
            // Fallback to WP Cron.
            wp_schedule_single_event( $next_run, 'pifwc_cron_import', [ $profile_id ] );
        }
    }

    /**
     * Unschedule a profile.
     */
    private function unschedule_profile( int $profile_id ): void {
        if ( function_exists( 'as_unschedule_all_actions' ) ) {
            as_unschedule_all_actions( 'pifwc_scheduled_import', [ 'profile_id' => $profile_id ], 'pifwc-imports' );
        } else {
            wp_clear_scheduled_hook( 'pifwc_cron_import', [ $profile_id ] );
        }
    }

    /**
     * Calculate next run timestamp.
     */
    private function calculate_next_run( string $frequency, string $time, array $schedule ): int {
        $timezone = wp_timezone();
        $now      = new \DateTime( 'now', $timezone );

        // Parse time.
        list( $hour, $minute ) = explode( ':', $time );

        $next = new \DateTime( 'now', $timezone );
        $next->setTime( (int) $hour, (int) $minute, 0 );

        // If time has passed today, move to next occurrence.
        if ( $next <= $now ) {
            switch ( $frequency ) {
                case 'hourly':
                    $next->modify( '+1 hour' );
                    break;
                case 'daily':
                    $next->modify( '+1 day' );
                    break;
                case 'weekly':
                    $next->modify( '+1 week' );
                    break;
                case 'monthly':
                    $next->modify( '+1 month' );
                    break;
                default:
                    // Custom cron expression - use daily as fallback.
                    $next->modify( '+1 day' );
            }
        }

        return $next->getTimestamp();
    }

    /**
     * Get next scheduled run for a profile.
     */
    private function get_next_scheduled_run( int $profile_id ): ?string {
        if ( function_exists( 'as_next_scheduled_action' ) ) {
            $timestamp = as_next_scheduled_action( 'pifwc_scheduled_import', [ 'profile_id' => $profile_id ], 'pifwc-imports' );
            if ( $timestamp ) {
                return wp_date( 'Y-m-d H:i:s', $timestamp );
            }
        } else {
            $timestamp = wp_next_scheduled( 'pifwc_cron_import', [ $profile_id ] );
            if ( $timestamp ) {
                return wp_date( 'Y-m-d H:i:s', $timestamp );
            }
        }

        return null;
    }

    /**
     * Get last run info for a profile.
     */
    private function get_last_run( int $profile_id ): ?array {
        $jobs = $this->jobs_repository->find_by_profile( $profile_id );

        if ( empty( $jobs ) ) {
            return null;
        }

        $last_job = $jobs[0];
        $history  = $this->jobs_repository->get_full_job( (int) $last_job->id );
        if ( is_array( $history ) && ! isset( $history['started_at'] ) && isset( $history['created_at'] ) ) {
            $history['started_at'] = $history['created_at'];
        }

        return $history;
    }

    /**
     * Trigger import for a profile.
     */
    private function trigger_import( array $profile ): ?int {
        // For now, we only support local file uploads from profiles
        // Remote sources (URL, FTP, SFTP) will be implemented later
        
        // Check if profile has a file_id in source_config
        $source_config = $profile['source_config'] ?? [];
        $file_id = $source_config['file_id'] ?? null;
        
        if ( ! $file_id ) {
            // No file uploaded yet - cannot run import
            return null;
        }
        
        // Create a job record
        $job_id = $this->jobs_repository->insert( [
            'profile_id' => (int) $profile['id'],
            'status'     => 'pending',
            'meta'       => wp_json_encode( [
                'file_id'       => $file_id,
                'source_config' => $source_config,
                'options'       => $profile['options'] ?? [],
                'mapping'       => $profile['mapping'] ?? [],
            ] ),
        ] );
        
        if ( ! $job_id ) {
            return null;
        }
        
        // Schedule the import to run via Action Scheduler
        if ( function_exists( 'as_enqueue_async_action' ) ) {
            as_enqueue_async_action(
                'pifwc_process_import_job',
                [ 'job_id' => $job_id ],
                'pifwc_import'
            );

            if ( function_exists( 'as_schedule_single_action' ) ) {
                as_schedule_single_action(
                    time() + 5,
                    'pifwc_process_import_job',
                    [ 'job_id' => $job_id ],
                    'pifwc_import'
                );
            }

            if ( class_exists( '\\ActionScheduler_AsyncRequest_QueueRunner' ) ) {
                try {
                    $runner_class = '\\ActionScheduler_AsyncRequest_QueueRunner';

                    if ( method_exists( $runner_class, 'maybe_dispatch' ) ) {
                        $rm = new \ReflectionMethod( $runner_class, 'maybe_dispatch' );

                        if ( $rm->isStatic() ) {
                            $runner_class::maybe_dispatch();
                        } else {
                            $runner = null;
                            if ( method_exists( $runner_class, 'get_instance' ) ) {
                                $runner = $runner_class::get_instance();
                            } elseif ( method_exists( $runner_class, 'instance' ) ) {
                                $runner = $runner_class::instance();
                            }

                            if ( is_object( $runner ) && method_exists( $runner, 'maybe_dispatch' ) ) {
                                $runner->maybe_dispatch();
                            }
                        }
                    }
                } catch ( \Throwable $e ) {
                }
            }

            if ( function_exists( 'spawn_cron' ) ) {
                try {
                    spawn_cron();
                } catch ( \Throwable $e ) {
                }
            }
        }
        
        return $job_id;
    }

    /**
     * Test connection to a remote source.
     */
    private function test_source_connection( string $type, array $config ): array {
        return [
            'success' => false,
            'error'   => __( 'This remote source type is not supported by the active plugin configuration.', 'badamsoft-product-importer-for-woocommerce' ),
        ];
    }

    /**
     * Test URL connection.
     */
    private function test_url_connection( array $config ): array {
        return [
            'success' => false,
            'error'   => __( 'This remote source type is not supported by the active plugin configuration.', 'badamsoft-product-importer-for-woocommerce' ),
        ];
    }

    /**
     * Test FTP/SFTP connection.
     */
    private function test_ftp_connection( array $config, bool $sftp ): array {
        return [
            'success' => false,
            'error'   => __( 'This remote source type is not supported by the active plugin configuration.', 'badamsoft-product-importer-for-woocommerce' ),
        ];
     }

    /**
     * Create a success response.
     */
    private function success_response( $data ): WP_REST_Response {
        $response = new WP_REST_Response(
            [
                'status' => 'success',
                'data'   => $data,
                'errors' => [],
            ],
            200
        );
        
        return ResponseHelper::add_no_cache_headers( $response );
    }

    /**
     * Create an error response.
     */
    private function error_response( string $message, int $code = 400, array $extra_data = [] ): WP_REST_Response {
        $response_data = [
            'status' => 'error',
            'data'   => null,
            'errors' => [ $message ],
        ];
        if ( ! empty( $extra_data ) ) {
            $response_data = array_merge( $response_data, $extra_data );
        }
        $response = new WP_REST_Response( $response_data, $code );
        
        return ResponseHelper::add_no_cache_headers( $response );
    }
}
