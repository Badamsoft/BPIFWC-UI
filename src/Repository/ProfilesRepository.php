<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Repository;

// phpcs:disable WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching -- Custom table queries inside repository layer.

class ProfilesRepository extends AbstractRepository {
    public function __construct( \wpdb $wpdb ) {
        parent::__construct( $wpdb, $wpdb->prefix . 'pifwc_import_profiles' );
    }

    /**
     * Find profiles by user ID.
     *
     * @param int $user_id User ID.
     * @return array<object>
     */
    public function find_by_user( int $user_id ): array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'find_by_user', [ $user_id ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE created_by = %d ORDER BY created_at DESC",
                $user_id
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Find profile by name.
     *
     * @param string $name Profile name.
     * @return object|null
     */
    public function find_by_name( string $name ): ?object {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'find_by_name', [ $name ] );
        $cached = $this->cache_get( $cache_key );
        if ( false !== $cached ) {
            return $cached instanceof \stdClass ? $cached : null;
        }

        $result = $wpdb->get_row(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE name = %s LIMIT 1",
                $name
            )
        );

        if ( $result ) {
            $this->cache_set( $cache_key, $result );
        }

        return $result ?: null;
    }

    /**
     * Find profiles with schedule.
     *
     * @return array<object>
     */
    public function find_scheduled(): array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'find_scheduled' );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            "SELECT * FROM {$table} WHERE schedule IS NOT NULL AND schedule != '' ORDER BY created_at DESC"
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Search profiles by name.
     *
     * @param string $search Search term.
     * @param int    $limit  Maximum number of records.
     * @param int    $offset Offset for pagination.
     * @return array<object>
     */
    public function search( string $search, int $limit = 20, int $offset = 0 ): array {
        $wpdb  = $this->wpdb;
        $table = function_exists( 'esc_sql' ) ? esc_sql( $this->table_name ) : $this->table_name;

        $cache_key = $this->cache_key( 'search', [ $search, $limit, $offset ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table} WHERE name LIKE %s ORDER BY created_at DESC LIMIT %d OFFSET %d",
                '%' . $wpdb->esc_like( $search ) . '%',
                $limit,
                $offset
            )
        );

        $results = $results ?: [];
        $this->cache_set( $cache_key, $results );

        return $results;
    }

    /**
     * Get profile with full details including mapping and filters.
     *
     * @param int $id Profile ID.
     * @return array<string, mixed>|null
     */
    public function get_full_profile( int $id ): ?array {
        $cache_key = $this->cache_key( 'get_full_profile', [ $id ] );
        $cached = $this->cache_get( $cache_key );
        if ( is_array( $cached ) ) {
            return $cached;
        }

        $profile = $this->find( $id );

        if ( ! $profile ) {
            return null;
        }

        $json_fields = [ 'source_config', 'mapping', 'filters', 'schedule', 'options' ];
        $decoded_data = [];

        foreach ( $json_fields as $field ) {
            if ( ! empty( $profile->$field ) ) {
                $decoded = json_decode( $profile->$field, true );
                $decoded_data[ $field ] = is_array( $decoded ) ? $decoded : [];
            } else {
                $decoded_data[ $field ] = [];
            }
        }

        $full = [
            'id'            => (int) $profile->id,
            'name'          => $profile->name,
            'source'        => $profile->source,
            'source_config' => $decoded_data['source_config'],
            'mapping'       => $decoded_data['mapping'],
            'filters'       => $decoded_data['filters'],
            'schedule'      => $decoded_data['schedule'],
            'options'       => $decoded_data['options'],
            'is_active'     => (bool) $profile->is_active,
            'created_by'    => (int) $profile->created_by,
            'created_at'    => $profile->created_at,
            'updated_at'    => $profile->updated_at,
        ];

        $this->cache_set( $cache_key, $full );

        return $full;
    }
}
