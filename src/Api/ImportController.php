<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Api;

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

use BadamSoft\ProductImporterForWooCommerce\Import\ImportEngine;
use BadamSoft\ProductImporterForWooCommerce\Repository\JobsRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\HistoryRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\LogsRepository;
use BadamSoft\ProductImporterForWooCommerce\Repository\ProfilesRepository;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

class ImportController {
    public const NAMESPACE = 'pifwc/v1';

    private ImportEngine $import_engine;
    private JobsRepository $jobs_repository;
    private HistoryRepository $history_repository;
    private LogsRepository $logs_repository;

    public function __construct(
        JobsRepository $jobs_repository,
        HistoryRepository $history_repository,
        LogsRepository $logs_repository,
        ProfilesRepository $profiles_repository
    ) {
        $this->jobs_repository    = $jobs_repository;
        $this->history_repository = $history_repository;
        $this->logs_repository    = $logs_repository;
        
        $this->import_engine = new ImportEngine(
            $jobs_repository,
            $history_repository,
            $logs_repository,
            $profiles_repository
        );
    }

    /**
     * Register REST API routes.
     */
    public function register_routes(): void {
        // Start import job.
        register_rest_route(
            self::NAMESPACE,
            '/import/run',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'run_import' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'file_id' => [
                        'required'          => true,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'profile_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'mode' => [
                        'required'          => false,
                        'type'              => 'string',
                        'default'           => 'both',
                        'enum'              => [ 'create', 'update', 'both' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'match_by' => [
                        'required'          => false,
                        'type'              => 'string',
                        'enum'              => [ 'sku', 'id' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/import/chunk/start',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'start_chunked_import' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'profile_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'file_id' => [
                        'required'          => false,
                        'type'              => 'string',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'mode' => [
                        'required'          => false,
                        'type'              => 'string',
                        'enum'              => [ 'create', 'update', 'both' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'match_by' => [
                        'required'          => false,
                        'type'              => 'string',
                        'enum'              => [ 'sku', 'id' ],
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/import/chunk/process/(?P<job_id>\d+)',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'process_chunk' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'job_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'limit' => [
                        'required'          => false,
                        'type'              => 'integer',
                        'default'           => 50,
                        'sanitize_callback' => 'absint',
                    ],
                    'max_seconds' => [
                        'required'          => false,
                        'type'              => 'integer',
                        'default'           => 10,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/import/process-async/(?P<job_id>\d+)',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'process_async' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'job_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/import/pump/(?P<job_id>\d+)',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'process_async' ], // Pump is basically same as process_async - ensure it is running
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'job_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/import/diagnostics',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'diagnostics' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/import/diagnostics/purge',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'diagnostics_purge' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );

        register_rest_route(
            self::NAMESPACE,
            '/import/diagnostics/cleanup',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'diagnostics_cleanup' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'mode' => [
                        'required'          => false,
                        'type'              => 'string',
                        'default'           => 'terminal_only',
                        'sanitize_callback' => 'sanitize_text_field',
                    ],
                    'max' => [
                        'required'          => false,
                        'type'              => 'integer',
                        'default'           => 500,
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // Get WooCommerce fields for mapping.
        register_rest_route(
            self::NAMESPACE,
            '/import/fields',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_wc_fields' ],
                'permission_callback' => [ $this, 'check_permission' ],
            ]
        );

        // Get import job status.
        register_rest_route(
            self::NAMESPACE,
            '/import/status/(?P<job_id>\d+)',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_status' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'job_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // Get import job logs.
        register_rest_route(
            self::NAMESPACE,
            '/import/logs/(?P<job_id>\d+)',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'get_logs' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'job_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                    'limit' => [
                        'required'          => false,
                        'type'              => 'integer',
                        'default'           => 100,
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

        // Abort import job.
        register_rest_route(
            self::NAMESPACE,
            '/import/abort/(?P<job_id>\d+)',
            [
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => [ $this, 'abort_import' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'job_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );

        // List import jobs.
        register_rest_route(
            self::NAMESPACE,
            '/import/jobs',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'list_jobs' ],
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

        // Delete import history record.
        register_rest_route(
            self::NAMESPACE,
            '/import/jobs/(?P<id>\d+)',
            [
                'methods'             => WP_REST_Server::DELETABLE,
                'callback'            => [ $this, 'delete_history' ],
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

        // Stream import progress via SSE.
        register_rest_route(
            self::NAMESPACE,
            '/import/progress/(?P<job_id>\d+)',
            [
                'methods'             => WP_REST_Server::READABLE,
                'callback'            => [ $this, 'stream_progress' ],
                'permission_callback' => [ $this, 'check_permission' ],
                'args'                => [
                    'job_id' => [
                        'required'          => true,
                        'type'              => 'integer',
                        'sanitize_callback' => 'absint',
                    ],
                ],
            ]
        );
    }

    /**
     * Check if user has permission.
     *
     * @return bool
     */
    public function check_permission(): bool {
        return current_user_can( 'manage_woocommerce' );
    }

    public function diagnostics( WP_REST_Request $request ): WP_REST_Response {
        $hook = 'pifwc_process_import_job';
        $run_queue = (int) $request->get_param( 'run_queue' ) === 1;

        $has_hook = has_action( $hook );

        $as_available = function_exists( 'as_get_scheduled_actions' );
        $scheduled_counts = [
            'pending'      => null,
            'in_progress'  => null,
            'complete'     => null,
            'failed'       => null,
            'canceled'     => null,
        ];

        $queue_run = [
            'requested' => $run_queue,
            'supported' => false,
            'ran'       => false,
            'error'     => null,
            'before'    => null,
            'after'     => null,
        ];

        $claim_probe = [
            'attempted'     => false,
            'supported'     => false,
            'claim_id'      => null,
            'actions_count' => null,
            'actions'       => null,
            'released'      => false,
            'error'         => null,
        ];

        $samples = [
            'pending' => [],
            'error'   => null,
        ];

        $now_gmt = function_exists( 'gmdate' ) ? gmdate( 'Y-m-d H:i:s' ) : null;

        $store = null;
        $store_class = null;
        $store_claim_count = null;
        $store_action_counts = null;
        $store_next_claimable = [];
        $runner_allowed_concurrent_batches = null;
        if ( class_exists( '\\ActionScheduler' ) && method_exists( '\\ActionScheduler', 'store' ) ) {
            try {
                $store = \ActionScheduler::store();
                if ( is_object( $store ) ) {
                    $store_class = get_class( $store );
                    if ( method_exists( $store, 'get_claim_count' ) ) {
                        $store_claim_count = (int) $store->get_claim_count();
                    }
                    if ( method_exists( $store, 'action_counts' ) ) {
                        $store_action_counts = $store->action_counts();
                    }
                }
            } catch ( \Throwable $e ) {
                // ignore
            }
        }

        if ( class_exists( '\\ActionScheduler_QueueRunner' ) && method_exists( '\\ActionScheduler_QueueRunner', 'instance' ) ) {
            try {
                $runner = \ActionScheduler_QueueRunner::instance();
                if ( is_object( $runner ) && method_exists( $runner, 'get_allowed_concurrent_batches' ) ) {
                    $runner_allowed_concurrent_batches = (int) $runner->get_allowed_concurrent_batches();
                }
            } catch ( \Throwable $e ) {
                // ignore
            }
        }

        $get_counts = static function ( string $hook ): array {
            $statuses = [
                'pending'     => 'pending',
                'in_progress' => 'in-progress',
                'complete'    => 'complete',
                'failed'      => 'failed',
                'canceled'    => 'canceled',
            ];

            $out = [
                'pending'     => 0,
                'in_progress' => 0,
                'complete'    => 0,
                'failed'      => 0,
                'canceled'    => 0,
            ];

            foreach ( $statuses as $key => $status ) {
                $ids = as_get_scheduled_actions(
                    [
                        'hook'     => $hook,
                        'group'    => 'pifwc_import',
                        'status'   => $status,
                        'per_page' => 100,
                    ],
                    'ids'
                );
                $out[ $key ] = is_array( $ids ) ? count( $ids ) : 0;
            }

            return $out;
        };

        if ( $as_available ) {
            try {
                $scheduled_counts = $get_counts( $hook );

                if ( is_object( $store ) && method_exists( $store, 'query_actions' ) ) {
                    try {
                        $now_dt = new \DateTime( 'now', new \DateTimeZone( 'UTC' ) );
                        $claimable_ids = $store->query_actions( [
                            'status'       => 'pending',
                            'claimed'      => false,
                            'date'         => $now_dt,
                            'date_compare' => '<=',
                            'orderby'      => 'date',
                            'order'        => 'ASC',
                            'per_page'     => 5,
                        ], 'select' );

                        if ( is_array( $claimable_ids ) ) {
                            foreach ( $claimable_ids as $cid ) {
                                $cid = (int) $cid;
                                $entry = [ 'action_id' => $cid ];
                                try {
                                    $a = null;
                                    if ( function_exists( 'as_get_scheduled_action' ) ) {
                                        $a = as_get_scheduled_action( $cid );
                                    }
                                    if ( null === $a && is_object( $store ) && method_exists( $store, 'fetch_action' ) ) {
                                        $a = $store->fetch_action( $cid );
                                    }
                                    if ( is_object( $a ) ) {
                                        if ( method_exists( $a, 'get_hook' ) ) {
                                            $entry['hook'] = $a->get_hook();
                                        }
                                        if ( method_exists( $a, 'get_group' ) ) {
                                            $entry['group'] = $a->get_group();
                                        }
                                        if ( method_exists( $a, 'get_args' ) ) {
                                            $entry['args'] = $a->get_args();
                                        }
                                        if ( method_exists( $a, 'get_schedule' ) ) {
                                            $sch = $a->get_schedule();
                                            if ( is_object( $sch ) && method_exists( $sch, 'next' ) ) {
                                                $next = $sch->next();
                                                if ( $next instanceof \DateTimeInterface ) {
                                                    $next = ( clone $next )->setTimezone( new \DateTimeZone( 'UTC' ) );
                                                    $entry['next_scheduled_gmt'] = $next->format( 'Y-m-d H:i:s' );
                                                }
                                            }
                                        }
                                    }
                                } catch ( \Throwable $e ) {
                                    $entry['error'] = $e->getMessage();
                                }

                                $store_next_claimable[] = $entry;
                            }
                        }
                    } catch ( \Throwable $e ) {
                        $store_next_claimable = [ [ 'error' => $e->getMessage() ] ];
                    }
                }

                $pending_ids = as_get_scheduled_actions(
                    [
                        'hook'     => $hook,
                        'group'    => 'pifwc_import',
                        'status'   => 'pending',
                        'per_page' => 5,
                    ],
                    'ids'
                );

                if ( is_array( $pending_ids ) ) {
                    foreach ( $pending_ids as $action_id ) {
                        $action_id = (int) $action_id;
                        $row = [
                            'action_id' => $action_id,
                        ];

                        try {
                            $store = null;
                            if ( class_exists( '\\ActionScheduler' ) && method_exists( '\\ActionScheduler', 'store' ) ) {
                                $store = \ActionScheduler::store();
                            } elseif ( class_exists( '\\ActionScheduler_Store' ) && method_exists( '\\ActionScheduler_Store', 'instance' ) ) {
                                $store = \ActionScheduler_Store::instance();
                            }

                            if ( is_object( $store ) ) {
                                if ( method_exists( $store, 'get_status' ) ) {
                                    $row['store_status'] = $store->get_status( $action_id );
                                }
                                if ( method_exists( $store, 'get_claim_id' ) ) {
                                    $row['store_claim_id'] = $store->get_claim_id( $action_id );
                                }
                                if ( method_exists( $store, 'get_attempts' ) ) {
                                    $row['store_attempts'] = $store->get_attempts( $action_id );
                                }
                                if ( method_exists( $store, 'get_date' ) ) {
                                    $date = $store->get_date( $action_id );
                                    if ( $date instanceof \DateTimeInterface ) {
                                        $date = ( clone $date )->setTimezone( new \DateTimeZone( 'UTC' ) );
                                        $row['store_date_gmt'] = $date->format( 'Y-m-d H:i:s' );
                                    }
                                }
                            }
                        } catch ( \Throwable $e ) {
                            $row['store_error'] = $e->getMessage();
                        }

                        if ( function_exists( 'get_post' ) ) {
                            $post = get_post( $action_id );
                            if ( $post instanceof \WP_Post ) {
                                $row['post_status'] = $post->post_status;
                                $row['post_type'] = $post->post_type;
                                $row['post_date_gmt'] = $post->post_date_gmt;
                            }
                        }

                        try {
                            $action = null;

                            if ( function_exists( 'as_get_scheduled_action' ) ) {
                                $action = as_get_scheduled_action( $action_id );
                            }

                            if ( null === $action && class_exists( '\\ActionScheduler' ) && method_exists( '\\ActionScheduler', 'store' ) ) {
                                $store = \ActionScheduler::store();
                                if ( is_object( $store ) && method_exists( $store, 'fetch_action' ) ) {
                                    $action = $store->fetch_action( $action_id );
                                }
                            }

                            if ( null === $action && class_exists( '\\ActionScheduler_Store' ) && method_exists( '\\ActionScheduler_Store', 'instance' ) ) {
                                $store = \ActionScheduler_Store::instance();
                                if ( is_object( $store ) && method_exists( $store, 'fetch_action' ) ) {
                                    $action = $store->fetch_action( $action_id );
                                }
                            }

                            if ( is_object( $action ) ) {
                                if ( method_exists( $action, 'get_hook' ) ) {
                                    $row['hook'] = $action->get_hook();
                                }
                                if ( method_exists( $action, 'get_group' ) ) {
                                    $row['group'] = $action->get_group();
                                }
                                if ( method_exists( $action, 'get_args' ) ) {
                                    $row['args'] = $action->get_args();
                                }

                                if ( method_exists( $action, 'get_schedule' ) ) {
                                    $schedule = $action->get_schedule();
                                    if ( is_object( $schedule ) ) {
                                        $row['schedule_class'] = get_class( $schedule );
                                    }
                                    if ( is_object( $schedule ) && method_exists( $schedule, 'next' ) ) {
                                        $next = $schedule->next();
                                        $row['schedule_next_type'] = is_object( $next ) ? get_class( $next ) : gettype( $next );
                                        if ( $next instanceof \DateTimeInterface ) {
                                            $next = ( clone $next )->setTimezone( new \DateTimeZone( 'UTC' ) );
                                            $row['next_scheduled_gmt'] = $next->format( 'Y-m-d H:i:s' );
                                        }
                                    }
                                }
                            }
                        } catch ( \Throwable $e ) {
                            $row['error'] = $e->getMessage();
                        }

                        $samples['pending'][] = $row;
                    }
                }

                if ( $run_queue ) {
                    $queue_run['before'] = $scheduled_counts;

                    try {
                        $store = null;
                        if ( class_exists( '\\ActionScheduler' ) && method_exists( '\\ActionScheduler', 'store' ) ) {
                            $store = \ActionScheduler::store();
                        } elseif ( class_exists( '\\ActionScheduler_Store' ) && method_exists( '\\ActionScheduler_Store', 'instance' ) ) {
                            $store = \ActionScheduler_Store::instance();
                        }

                        $claim_probe['attempted'] = true;
                        if ( is_object( $store ) && method_exists( $store, 'stake_claim' ) ) {
                            $claim_probe['supported'] = true;
                            $claim = $store->stake_claim( 1 );
                            if ( is_object( $claim ) ) {
                                if ( method_exists( $claim, 'get_id' ) ) {
                                    $claim_probe['claim_id'] = $claim->get_id();
                                }
                                if ( method_exists( $claim, 'get_actions' ) ) {
                                    $actions = $claim->get_actions();
                                    $claim_probe['actions'] = $actions;
                                    $claim_probe['actions_count'] = is_array( $actions ) ? count( $actions ) : null;
                                }
                                if ( method_exists( $store, 'release_claim' ) ) {
                                    $store->release_claim( $claim );
                                    $claim_probe['released'] = true;
                                }
                            }
                        }
                    } catch ( \Throwable $e ) {
                        $claim_probe['error'] = $e->getMessage();
                    }

                    if ( class_exists( '\\ActionScheduler_QueueRunner' ) && method_exists( '\\ActionScheduler_QueueRunner', 'instance' ) ) {
                        $queue_run['supported'] = true;
                        $runner = \ActionScheduler_QueueRunner::instance();
                        if ( is_object( $runner ) && method_exists( $runner, 'run' ) ) {
                            $time_filter = static function () {
                                return 5;
                            };
                            $batch_filter = static function () {
                                return 20;
                            };
                            add_filter( 'action_scheduler_queue_runner_time_limit', $time_filter );
                            add_filter( 'action_scheduler_queue_runner_batch_size', $batch_filter );

                            $processed = $runner->run();

                            remove_filter( 'action_scheduler_queue_runner_time_limit', $time_filter );
                            remove_filter( 'action_scheduler_queue_runner_batch_size', $batch_filter );

                            $queue_run['ran'] = true;
                            $queue_run['processed'] = is_numeric( $processed ) ? (int) $processed : null;
                        }
                    }

                    if ( class_exists( '\\ActionScheduler_AsyncRequest_QueueRunner' ) ) {
                        try {
                            $runner_class = '\\ActionScheduler_AsyncRequest_QueueRunner';
                            if ( method_exists( $runner_class, 'maybe_dispatch' ) ) {
                                $rm = new \ReflectionMethod( $runner_class, 'maybe_dispatch' );
                                if ( $rm->isStatic() ) {
                                    $runner_class::maybe_dispatch();
                                } else {
                                    if ( method_exists( $runner_class, 'instance' ) ) {
                                        $runner_class::instance()->maybe_dispatch();
                                    }
                                }
                            }
                        } catch ( \Throwable $e ) {
                            // ignore
                        }
                    } elseif ( function_exists( 'spawn_cron' ) ) {
                        spawn_cron();
                    }

                    $scheduled_counts = $get_counts( $hook );
                    $queue_run['after'] = $scheduled_counts;
                }
            } catch ( \Throwable $e ) {
                $queue_run['error'] = $e->getMessage();
                $samples['error'] = $e->getMessage();
            }
        }

        return new WP_REST_Response(
            [
                'success' => true,
                'data'    => [
                    'hook'                  => $hook,
                    'hook_registered'       => (int) $has_hook,
                    'action_scheduler'      => [
                        'available' => $as_available,
                        'store_class' => $store_class,
                        'store_claim_count' => $store_claim_count,
                        'store_action_counts' => $store_action_counts,
                        'store_next_claimable' => $store_next_claimable,
                        'runner_allowed_concurrent_batches' => $runner_allowed_concurrent_batches,
                        'counts'    => $scheduled_counts,
                        'queue_run' => $queue_run,
                        'claim_probe' => $claim_probe,
                        'samples'   => $samples,
                    ],
                    'now_gmt'               => $now_gmt,
                ],
            ],
            200
        );
    }

    public function diagnostics_purge( WP_REST_Request $request ): WP_REST_Response {
        $hook = 'pifwc_process_import_job';

        if ( ! function_exists( 'as_unschedule_all_actions' ) || ! function_exists( 'as_get_scheduled_actions' ) ) {
            return $this->error_response( __( 'Action Scheduler is not available.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
        }

        try {
            $before = as_get_scheduled_actions(
                [
                    'hook'     => $hook,
                    'group'    => 'pifwc_import',
                    'status'   => 'pending',
                    'per_page' => 1000,
                ],
                'ids'
            );

            as_unschedule_all_actions( $hook, null, 'pifwc_import' );

            $after = as_get_scheduled_actions(
                [
                    'hook'     => $hook,
                    'group'    => 'pifwc_import',
                    'status'   => 'pending',
                    'per_page' => 1000,
                ],
                'ids'
            );

            return $this->success_response( [
                'hook'   => $hook,
                'before' => is_array( $before ) ? count( $before ) : 0,
                'after'  => is_array( $after ) ? count( $after ) : 0,
            ] );
        } catch ( \Throwable $e ) {
            return $this->error_response( $e->getMessage(), 500 );
        }
    }

    public function diagnostics_cleanup( WP_REST_Request $request ): WP_REST_Response {
        $hook = 'pifwc_process_import_job';
        $group = 'pifwc_import';
        $mode = (string) $request->get_param( 'mode' );
        $max = (int) $request->get_param( 'max' );
        if ( $max <= 0 ) {
            $max = 500;
        }

        if ( ! function_exists( 'as_get_scheduled_actions' ) ) {
            return $this->error_response( __( 'Action Scheduler is not available.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
        }

        $store = null;
        if ( class_exists( '\\ActionScheduler' ) && method_exists( '\\ActionScheduler', 'store' ) ) {
            try {
                $store = \ActionScheduler::store();
            } catch ( \Throwable $e ) {
                $store = null;
            }
        } elseif ( class_exists( '\\ActionScheduler_Store' ) && method_exists( '\\ActionScheduler_Store', 'instance' ) ) {
            $store = \ActionScheduler_Store::instance();
        }

        if ( ! is_object( $store ) || ! method_exists( $store, 'cancel_action' ) ) {
            return $this->error_response( __( 'Action Scheduler store does not support cancel_action.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
        }

        $pending_ids = as_get_scheduled_actions( [
            'hook'     => $hook,
            'group'    => $group,
            'status'   => 'pending',
            'per_page' => $max,
        ], 'ids' );

        $found = is_array( $pending_ids ) ? count( $pending_ids ) : 0;
        $canceled = 0;
        $skipped = 0;
        $errors = [];

        if ( is_array( $pending_ids ) ) {
            foreach ( $pending_ids as $action_id ) {
                $action_id = (int) $action_id;

                try {
                    $action = null;
                    if ( function_exists( 'as_get_scheduled_action' ) ) {
                        $action = as_get_scheduled_action( $action_id );
                    }
                    if ( null === $action && method_exists( $store, 'fetch_action' ) ) {
                        $action = $store->fetch_action( $action_id );
                    }

                    $args = null;
                    if ( is_object( $action ) && method_exists( $action, 'get_args' ) ) {
                        $args = $action->get_args();
                    }

                    $job_id = 0;
                    if ( is_array( $args ) && isset( $args['job_id'] ) ) {
                        $job_id = (int) $args['job_id'];
                    }

                    $should_cancel = false;
                    if ( 'all' === $mode ) {
                        $should_cancel = true;
                    } else {
                        if ( $job_id <= 0 ) {
                            $should_cancel = true;
                        } else {
                            $job_status = $this->import_engine->get_job_status( $job_id );
                            if ( null === $job_status ) {
                                $should_cancel = true;
                            } else {
                                $st = (string) ( $job_status['status'] ?? '' );
                                if ( in_array( $st, [ 'completed', 'failed', 'aborted', 'completed_with_errors' ], true ) ) {
                                    $should_cancel = true;
                                }
                            }
                        }
                    }

                    if ( $should_cancel ) {
                        $store->cancel_action( $action_id );
                        $canceled++;
                    } else {
                        $skipped++;
                    }
                } catch ( \Throwable $e ) {
                    $errors[] = [
                        'action_id' => $action_id,
                        'error'     => $e->getMessage(),
                    ];
                }
            }
        }

        return $this->success_response( [
            'hook'     => $hook,
            'group'    => $group,
            'mode'     => $mode,
            'max'      => $max,
            'found'    => $found,
            'canceled' => $canceled,
            'skipped'  => $skipped,
            'errors'   => $errors,
        ] );
    }

    /**
     * Run import job.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function run_import( WP_REST_Request $request ): WP_REST_Response {
        $file_id    = $request->get_param( 'file_id' );
        $profile_id = $request->get_param( 'profile_id' );
        $mode       = $request->get_param( 'mode' );
        $match_by   = $request->get_param( 'match_by' );

        $options = [
            'mode' => $mode,
        ];
        if ( is_string( $match_by ) && $match_by !== '' ) {
            $options['match_by'] = $match_by;
        }

        $result = $this->import_engine->start_import( $file_id, $profile_id, $options );

        if ( ! $result['success'] ) {
            return $this->error_response( $result['error'], 400 );
        }

        return $this->success_response( [
            'job_id'     => $result['job_id'],
            'history_id' => $result['history_id'],
            'stats'      => $result['result']['stats'] ?? null,
            'message'    => __( 'Import completed.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    public function start_chunked_import( WP_REST_Request $request ): WP_REST_Response {
        $profile_id = (int) $request->get_param( 'profile_id' );
        $file_id = $request->get_param( 'file_id' );
        $mode = $request->get_param( 'mode' );
        $match_by = $request->get_param( 'match_by' );

        $options_override = [];
        if ( is_string( $mode ) && $mode !== '' ) {
            $options_override['mode'] = $mode;
        }
        if ( is_string( $match_by ) && $match_by !== '' ) {
            $options_override['match_by'] = $match_by;
        }

        $result = $this->import_engine->start_chunked_import(
            $profile_id,
            is_string( $file_id ) && $file_id !== '' ? $file_id : null,
            $options_override
        );

        if ( empty( $result['success'] ) ) {
            return $this->error_response( (string) ( $result['error'] ?? __( 'Failed to start import.', 'badamsoft-product-importer-for-woocommerce' ) ), 400 );
        }

        return $this->success_response( $result );
    }

    public function process_chunk( WP_REST_Request $request ): WP_REST_Response {
        $job_id = (int) $request->get_param( 'job_id' );
        $limit = (int) $request->get_param( 'limit' );
        $max_seconds = (int) $request->get_param( 'max_seconds' );

        try {
            $result = $this->import_engine->process_import_chunk( $job_id, $limit, $max_seconds );
            if ( empty( $result['success'] ) ) {
                return $this->error_response( (string) ( $result['error'] ?? __( 'Chunk processing failed.', 'badamsoft-product-importer-for-woocommerce' ) ), 400 );
            }

            $status = $this->import_engine->get_job_status( $job_id );

            return $this->success_response( [
                'result' => $result,
                'status' => $status,
            ] );
        } catch ( \Throwable $e ) {
            return $this->error_response(
                sprintf(
                    'Chunk processing exception: %s in %s:%d',
                    $e->getMessage(),
                    $e->getFile(),
                    $e->getLine()
                ),
                500
            );
        }
    }

    public function process_async( WP_REST_Request $request ): WP_REST_Response {
        $job_id = (int) $request->get_param( 'job_id' );

        $is_pump = false;
        if ( method_exists( $request, 'get_route' ) ) {
            $route = (string) $request->get_route();
            if ( strpos( $route, '/import/pump/' ) !== false ) {
                $is_pump = true;
            }
        }
        $pump_header = $request->get_header( 'x-pifwc-pump' );
        if ( ! empty( $pump_header ) ) {
            $is_pump = true;
        }

        $response_payload = [
            'message' => __( 'Background processing started.', 'badamsoft-product-importer-for-woocommerce' ),
            'job_id' => $job_id
        ];

        $status = $this->import_engine->get_cached_job_status( $job_id );
        if ( is_array( $status ) ) {
            $status_text = $status['status'] ?? '';
            if ( in_array( $status_text, [ 'completed', 'failed', 'aborted', 'completed_with_errors' ], true ) ) {
                return $this->error_response( __( 'Job is already finished.', 'badamsoft-product-importer-for-woocommerce' ), 400 );
            }
        }

        $hook = 'pifwc_process_import_job';
        $fast_mode = function_exists( 'apply_filters' )
            ? (bool) apply_filters( 'pifwc_manual_import_fast_mode', true, $job_id )
            : true;
        $args = [ 'job_id' => $job_id ];
        if ( $fast_mode ) {
            $args['fast'] = 1;
        }

        $lock_ttl = 15;
        $lock_path = $this->get_runtime_file_path( 'import-pump-' . $job_id . '.lock' );
        $has_lock = false;
        $lock_mtime = file_exists( $lock_path ) ? filemtime( $lock_path ) : false;
        if ( false !== $lock_mtime && ( time() - (int) $lock_mtime ) < $lock_ttl ) {
            $has_lock = true;
        }
        if ( $has_lock ) {
            return $this->success_response( $response_payload );
        }
        file_put_contents( $lock_path, (string) time() );

        if ( $is_pump ) {
            if ( ! function_exists( 'as_enqueue_async_action' ) && ! function_exists( 'as_schedule_single_action' ) ) {
                return $this->error_response( __( 'Action Scheduler is not available.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
            }
            if ( function_exists( 'as_schedule_single_action' ) ) {
                as_schedule_single_action( time() - ( 86400 * 400 ), $hook, $args, 'pifwc_import' );
            } else {
                as_enqueue_async_action( $hook, $args, 'pifwc_import' );
            }

            return $this->success_response( $response_payload );
        }

        $runner = null;
        $has_runner = false;
        if ( function_exists( 'apply_filters' ) ) {
            $runner = apply_filters( 'pifwc_schedule_runner', null );
            $has_runner = is_object( $runner ) && method_exists( $runner, 'pump_import_jobs' );
        }

        $use_action_scheduler = ! $has_runner && ! $is_pump;
        if ( ! $is_pump && function_exists( 'apply_filters' ) ) {
            $use_action_scheduler = (bool) apply_filters( 'pifwc_manual_import_use_action_scheduler', $use_action_scheduler, $job_id );
        }

        $run_immediately = ! $is_pump && $fast_mode && ! $has_runner;

        if ( $run_immediately ) {
            $this->handle_process_import_job( $job_id, 1 );

            return $this->success_response( $response_payload );
        }

        if ( $use_action_scheduler ) {
            if ( ! function_exists( 'as_enqueue_async_action' ) && ! function_exists( 'as_schedule_single_action' ) ) {
                return $this->error_response( __( 'Action Scheduler is not available.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
            }
            if ( function_exists( 'as_schedule_single_action' ) ) {
                as_schedule_single_action( time() - ( 86400 * 400 ), $hook, $args, 'pifwc_import' );
            } else {
                as_enqueue_async_action( $hook, $args, 'pifwc_import' );
            }
        }

        $pumped = false;
        if ( $has_runner ) {
            if ( $fast_mode ) {
                $this->touch_fast_manual_flag( $job_id );
                $runner->pump_import_jobs( 1, 8 );
            } else {
                $runner->pump_import_jobs( 5, 25 );
            }
            $pumped = true;
        }

        if ( ! $pumped ) {
            // Trigger runner immediately if possible
            if ( class_exists( '\ActionScheduler_AsyncRequest_QueueRunner' ) ) {
                try {
                    $runner_class = '\ActionScheduler_AsyncRequest_QueueRunner';
                    if ( method_exists( $runner_class, 'maybe_dispatch' ) ) {
                        // Modern AS
                        $rm = new \ReflectionMethod( $runner_class, 'maybe_dispatch' );
                        if ( $rm->isStatic() ) {
                            $runner_class::maybe_dispatch();
                        } else {
                            // Attempt singleton
                            if ( method_exists( $runner_class, 'instance' ) ) {
                                $runner_class::instance()->maybe_dispatch();
                            }
                        }
                    }
                } catch ( \Throwable $e ) {
                    // ignore
                }
            } elseif ( function_exists( 'spawn_cron' ) ) {
                spawn_cron();
            }
        }

        return $this->success_response( $response_payload );
    }

    public function handle_process_import_job( $job_id, $fast = 0 ): void {
        $job_id = (int) $job_id;
        if ( $job_id <= 0 ) {
            return;
        }

        $this->import_engine->run_existing_job( $job_id );
    }

    private function get_runtime_dir(): string {
        $upload_dir = wp_upload_dir();
        $dir = trailingslashit( $upload_dir['basedir'] ) . 'badamsoft-product-importer-for-woocommerce/runtime';
        if ( ! is_dir( $dir ) ) {
            wp_mkdir_p( $dir );
        }
        return $dir;
    }

    private function get_runtime_file_path( string $file_name ): string {
        return trailingslashit( $this->get_runtime_dir() ) . ltrim( $file_name, '/\\' );
    }

    private function get_fast_manual_flag_path(): string {
        return $this->get_runtime_file_path( 'fast-manual.flag' );
    }

    private function touch_fast_manual_flag( int $job_id ): void {
        $path = $this->get_fast_manual_flag_path();
        file_put_contents( $path, (string) time() );
    }

    public function is_fast_manual_flag_active( int $ttl = 120 ): bool {
        $ttl = max( 10, min( 600, $ttl ) );
        $path = $this->get_fast_manual_flag_path();
        $mtime = file_exists( $path ) ? filemtime( $path ) : false;
        if ( ! $mtime ) {
            return false;
        }
        return ( time() - (int) $mtime ) <= $ttl;
    }

    /**
     * Get import job status.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_status( WP_REST_Request $request ): WP_REST_Response {
        $job_id = $request->get_param( 'job_id' );

        $cached = $this->import_engine->get_cached_job_status( (int) $job_id );
        if ( is_array( $cached ) ) {
            return $this->success_response( $cached );
        }

        $stale = $this->import_engine->get_cached_job_status_stale( (int) $job_id );
        if ( is_array( $stale ) ) {
            $stale['stale'] = true;
            return $this->success_response( $stale );
        }

        $force = (int) $request->get_param( 'force' ) === 1;
        if ( $force ) {
            $status = $this->import_engine->get_job_status( (int) $job_id );
            if ( null === $status ) {
                return $this->error_response(
                    __( 'Job not found.', 'badamsoft-product-importer-for-woocommerce' ),
                    404
                );
            }

            return $this->success_response( $status );
        }

        return $this->success_response( [
            'job_id'     => (int) $job_id,
            'id'         => (int) $job_id,
            'status'     => 'pending',
            'total_rows' => 0,
            'processed'  => 0,
            'added'      => 0,
            'updated'    => 0,
            'skipped'    => 0,
            'errors'     => 0,
            'progress'   => 0,
            'current_row'=> 0,
            'timestamp'  => time(),
            'cached'     => false,
        ] );
    }

    /**
     * Get import job logs.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_logs( WP_REST_Request $request ): WP_REST_Response {
        $job_id = $request->get_param( 'job_id' );
        $limit  = $request->get_param( 'limit' );
        $offset = $request->get_param( 'offset' );

        $logs = $this->import_engine->get_job_logs( $job_id, $limit, $offset );

        return $this->success_response( [
            'logs'   => $logs,
            'total'  => count( $logs ),
            'limit'  => $limit,
            'offset' => $offset,
        ] );
    }

    /**
     * Abort import job.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function abort_import( WP_REST_Request $request ): WP_REST_Response {
        $job_id = $request->get_param( 'job_id' );

        $result = $this->import_engine->abort_job( $job_id );

        if ( ! $result ) {
            return $this->error_response(
                __( 'Failed to abort job.', 'badamsoft-product-importer-for-woocommerce' ),
                400
            );
        }

        return $this->success_response( [
            'message' => __( 'Job aborted.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * List import jobs.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function list_jobs( WP_REST_Request $request ): WP_REST_Response {
        $limit  = $request->get_param( 'limit' );
        $offset = $request->get_param( 'offset' );

        $jobs  = $this->history_repository->get_recent( $limit, $offset );
        $total = method_exists( $this->history_repository, 'count_distinct_jobs' )
            ? $this->history_repository->count_distinct_jobs()
            : $this->history_repository->count();

        // Parse jobs and calculate progress.
        $parsed_jobs = [];
        foreach ( $jobs as $job ) {
            $job_meta = null;
            if ( isset( $job->job_meta ) && is_string( $job->job_meta ) && '' !== $job->job_meta ) {
                $decoded = json_decode( $job->job_meta, true );
                $job_meta = is_array( $decoded ) ? $decoded : null;
            }

            $trigger = 'manual';
            if ( is_array( $job_meta ) ) {
                if ( isset( $job_meta['trigger'] ) && is_string( $job_meta['trigger'] ) && '' !== $job_meta['trigger'] ) {
                    $trigger = (string) $job_meta['trigger'];
                } elseif ( isset( $job_meta['scheduled'] ) && $job_meta['scheduled'] ) {
                    $trigger = 'scheduled';
                }
            }

            $schedule_name = null;
            if ( is_array( $job_meta ) && isset( $job_meta['schedule_name'] ) && is_string( $job_meta['schedule_name'] ) ) {
                $schedule_name = trim( (string) $job_meta['schedule_name'] );
                if ( '' === $schedule_name ) {
                    $schedule_name = null;
                }
            }

            $processed = ( $job->added ?? 0 ) + ( $job->updated ?? 0 ) + ( $job->skipped ?? 0 );
            $total_rows = $job->total_rows ?? 0;

            $started_at = $job->started_at;
            if ( isset( $job->earliest_started_at ) && $job->earliest_started_at ) {
                $started_at = $job->earliest_started_at;
            }

            $finished_at = $job->finished_at;
            if ( isset( $job->latest_finished_at ) && $job->latest_finished_at ) {
                $finished_at = $job->latest_finished_at;
            }

            $duration_seconds = null;
            if ( $started_at && $finished_at ) {
                $start_ts = strtotime( (string) $started_at );
                $end_ts   = strtotime( (string) $finished_at );
                if ( false !== $start_ts && false !== $end_ts && $end_ts >= $start_ts ) {
                    $duration_seconds = (int) ( $end_ts - $start_ts );
                }
            }
            
            $parsed_jobs[] = [
                'id'           => (int) $job->id,
                'job_id'       => (int) $job->job_id,
                'profile_id'   => $job->profile_id ? (int) $job->profile_id : null,
                'type'         => $trigger,
                'schedule_name'=> $schedule_name,
                'meta'         => $job_meta,
                'status'       => $this->get_job_status_text( $job ),
                'total_rows'   => (int) $total_rows,
                'added'        => (int) ( $job->added ?? 0 ),
                'updated'      => (int) ( $job->updated ?? 0 ),
                'skipped'      => (int) ( $job->skipped ?? 0 ),
                'errors'       => (int) ( $job->errors ?? 0 ),
                'processed'    => $processed,
                'progress'     => $total_rows > 0 ? round( ( $processed / $total_rows ) * 100, 1 ) : 0,
                'started_at'   => $started_at,
                'finished_at'  => $finished_at,
                'duration_seconds' => $duration_seconds,
            ];
        }

        return $this->success_response( [
            'jobs'   => $parsed_jobs,
            'total'  => $total,
            'limit'  => $limit,
            'offset' => $offset,
        ] );
    }

    /**
     * Get WooCommerce fields for mapping.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function get_wc_fields( WP_REST_Request $request ): WP_REST_Response {
        $fields = [
            'general' => [
                [
                    'id' => 'post_title',
                    'label' => __( 'Product Title', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'text',
                    'required' => true,
                    'section' => 'general',
                ],
                [
                    'id' => 'post_content',
                    'label' => __( 'Description', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'textarea',
                    'required' => false,
                    'section' => 'general',
                ],
                [
                    'id' => 'post_excerpt',
                    'label' => __( 'Short Description', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'textarea',
                    'required' => false,
                    'section' => 'general',
                ],
                [
                    'id' => '_sku',
                    'label' => __( 'SKU', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'text',
                    'required' => false,
                    'section' => 'general',
                ],
                [
                    'id' => 'product_type',
                    'label' => __( 'Product Type', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'select',
                    'required' => false,
                    'section' => 'general',
                    'options' => [
                        'simple' => __( 'Simple', 'badamsoft-product-importer-for-woocommerce' ),
                    ],
                ],
                [
                    'id' => '_regular_price',
                    'label' => __( 'Regular Price', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'number',
                    'required' => false,
                    'section' => 'general',
                ],
                [
                    'id' => '_sale_price',
                    'label' => __( 'Sale Price', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'number',
                    'required' => false,
                    'section' => 'general',
                ],
                [
                    'id' => 'product_cat',
                    'label' => __( 'Categories', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'multiselect',
                    'required' => false,
                    'section' => 'general',
                ],
                [
                    'id' => 'product_tag',
                    'label' => __( 'Tags', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'multiselect',
                    'required' => false,
                    'section' => 'general',
                ],
            ],
            'inventory' => [
                [
                    'id' => '_manage_stock',
                    'label' => __( 'Manage Stock', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'select',
                    'required' => false,
                    'section' => 'inventory',
                ],
                [
                    'id' => '_stock_quantity',
                    'label' => __( 'Stock Quantity', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'number',
                    'required' => false,
                    'section' => 'inventory',
                ],
                [
                    'id' => '_stock_status',
                    'label' => __( 'Stock Status', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'select',
                    'required' => false,
                    'section' => 'inventory',
                ],
                [
                    'id' => '_backorders',
                    'label' => __( 'Backorders', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'select',
                    'required' => false,
                    'section' => 'inventory',
                ],
            ],
            'shipping' => [
                [
                    'id' => '_weight',
                    'label' => __( 'Weight', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'text',
                    'required' => false,
                    'section' => 'shipping',
                ],
                [
                    'id' => '_length',
                    'label' => __( 'Length', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'text',
                    'required' => false,
                    'section' => 'shipping',
                ],
                [
                    'id' => '_width',
                    'label' => __( 'Width', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'text',
                    'required' => false,
                    'section' => 'shipping',
                ],
                [
                    'id' => '_height',
                    'label' => __( 'Height', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'text',
                    'required' => false,
                    'section' => 'shipping',
                ],
            ],
            'images' => [
                [
                    'id' => '_thumbnail_id',
                    'label' => __( 'Featured Image', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'image',
                    'required' => false,
                    'section' => 'images',
                ],
                [
                    'id' => '_product_image_gallery',
                    'label' => __( 'Gallery Images', 'badamsoft-product-importer-for-woocommerce' ),
                    'type' => 'multiselect',
                    'required' => false,
                    'section' => 'images',
                ],
            ],
        ];

        $fields = apply_filters( 'pifwc_wc_fields_schema', $fields );

        return $this->success_response( $fields );
    }

    /**
     * Stream import progress via Server-Sent Events.
     *
     * @param WP_REST_Request $request Request object.
     * @return void
     */
    public function stream_progress( WP_REST_Request $request ): void {
        $job_id = (int) $request->get_param( 'job_id' );

        if ( function_exists( 'ignore_user_abort' ) ) {
            ignore_user_abort( true );
        }

        if ( function_exists( 'set_time_limit' ) ) {
            // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged
            @set_time_limit( 0 );
        }

        if ( function_exists( 'ini_set' ) ) {
            // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- Needed to disable buffering/compression for SSE stream stability.
            @ini_set( 'zlib.output_compression', '0' );
            // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- Needed to disable buffering/compression for SSE stream stability.
            @ini_set( 'output_buffering', 'off' );
            // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged -- Needed to disable buffering/compression for SSE stream stability.
            @ini_set( 'implicit_flush', '1' );
        }

        if ( function_exists( 'apache_setenv' ) ) {
            @apache_setenv( 'no-gzip', '1' );
        }

        // Set headers for SSE
        header( 'Content-Type: text/event-stream; charset=utf-8' );
        header( 'Cache-Control: no-cache, no-store, must-revalidate, max-age=0, private' );
        header( 'Pragma: no-cache' );
        header( 'Expires: 0' );
        header( 'X-Accel-Buffering: no' );
        header( 'X-Content-Type-Options: nosniff' );
        header( 'Content-Encoding: none' );

        // Disable output buffering completely
        while ( ob_get_level() > 0 ) {
            @ob_end_flush();
        }

        flush();
        
        $last_processed = 0;
        $last_heartbeat = time();
        $max_iterations = 600; // 10 minutes max
        $iteration = 0;
        
        while ( $iteration < $max_iterations ) {
            $status = $this->import_engine->get_cached_job_status( $job_id );
            if ( ! is_array( $status ) ) {
                $status = $this->import_engine->get_cached_job_status_stale( $job_id );
            }
            if ( ! is_array( $status ) ) {
                $status = [
                    'job_id'     => $job_id,
                    'id'         => $job_id,
                    'status'     => 'pending',
                    'total_rows' => 0,
                    'added'      => 0,
                    'updated'    => 0,
                    'skipped'    => 0,
                    'errors'     => 0,
                    'progress'   => 0,
                    'current_row'=> 0,
                    'started_at' => null,
                    'finished_at'=> null,
                    'timestamp'  => time(),
                ];
            }
            
            // Calculate processed count
            $processed = ( $status['added'] ?? 0 ) + ( $status['updated'] ?? 0 ) + 
                        ( $status['skipped'] ?? 0 );
            
            // Heartbeat to keep proxies/load balancers from closing the connection.
            $now = time();
            if ( ( $now - $last_heartbeat ) >= 15 ) {
                echo ": ping\n\n";
                flush();
                $last_heartbeat = $now;
            }

            // Send progress update if changed or first iteration
            if ( $processed > $last_processed || $iteration === 0 ) {
                $progress_data = [
                    'job_id'      => $job_id,
                    'status'      => $status['status'] ?? 'pending',
                    'total_rows'  => $status['total_rows'] ?? 0,
                    'processed'   => $processed,
                    'added'       => $status['added'] ?? 0,
                    'updated'     => $status['updated'] ?? 0,
                    'skipped'     => $status['skipped'] ?? 0,
                    'errors'      => $status['errors'] ?? 0,
                    'progress'    => $status['progress'] ?? 0,
                    'current_row' => $processed,
                    'started_at'  => $status['started_at'] ?? null,
                    'finished_at' => $status['finished_at'] ?? null,
                    'timestamp'   => time(),
                ];
                
                echo "event: progress\n";
                echo 'data: ' . wp_json_encode( $progress_data ) . "\n\n";
                flush();
                
                $last_processed = $processed;
            }
            
            // Check if job is finished
            $finished_statuses = [ 'completed', 'failed', 'aborted', 'completed_with_errors' ];
            if ( in_array( $status['status'] ?? '', $finished_statuses, true ) ) {
                echo "event: complete\n";
                echo 'data: ' . wp_json_encode( $status ) . "\n\n";
                flush();
                break;
            }
            
            // Wait 1 second before next check
            sleep( 1 );
            $iteration++;
        }
        
        // Close connection
        echo "event: close\n";
        echo "data: Connection closed\n\n";
        flush();
        exit;
    }

    /**
     * Delete import history record.
     *
     * @param WP_REST_Request $request Request object.
     * @return WP_REST_Response
     */
    public function delete_history( WP_REST_Request $request ): WP_REST_Response {
        $id = $request->get_param( 'id' );

        // Check if history record exists
        $history = $this->history_repository->find( $id );
        if ( ! $history ) {
            return $this->error_response( __( 'History record not found.', 'badamsoft-product-importer-for-woocommerce' ), 404 );
        }

        // Delete associated logs first
        $this->logs_repository->delete_by_history( (int) $id );

        // Delete history record
        $result = $this->history_repository->delete( $id );

        if ( ! $result ) {
            return $this->error_response( __( 'Failed to delete history record.', 'badamsoft-product-importer-for-woocommerce' ), 500 );
        }

        return $this->success_response( [
            'message' => __( 'History record deleted successfully.', 'badamsoft-product-importer-for-woocommerce' ),
        ] );
    }

    /**
     * Get job status text.
     */
    private function get_job_status_text( object $job ): string {
        if ( isset( $job->job_status ) && is_string( $job->job_status ) && '' !== $job->job_status ) {
            if ( 'aborted' === $job->job_status ) {
                return 'aborted';
            }

            if ( 'failed' === $job->job_status ) {
                return 'failed';
            }

            if ( 'pending' === $job->job_status ) {
                return 'pending';
            }

            if ( 'processing' === $job->job_status ) {
                return 'running';
            }
        }

        if ( $job->finished_at ) {
            return $job->errors > 0 ? 'completed_with_errors' : 'completed';
        }
        
        if ( $job->started_at ) {
            return 'running';
        }
        
        return 'pending';
    }

    /**
     * Create a success response.
     *
     * @param mixed $data Response data.
     * @return WP_REST_Response
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
     *
     * @param string $message Error message.
     * @param int    $code    HTTP status code.
     * @param array  $errors  Additional error details.
     * @return WP_REST_Response
     */
    private function error_response( string $message, int $code = 400, array $errors = [] ): WP_REST_Response {
        $response = new WP_REST_Response(
            [
                'status' => 'error',
                'data'   => null,
                'errors' => array_merge( [ $message ], $errors ),
            ],
            $code
        );
        
        return ResponseHelper::add_no_cache_headers( $response );
    }
}
