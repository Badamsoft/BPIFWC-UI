<?php

declare(strict_types=1);

namespace BadamSoft\ProductImporterForWooCommerce\Mapper;

class Mapper {
    /**
     * WooCommerce product fields with their categories.
     */
    public const PRODUCT_FIELDS = [
        'general' => [
            'product.title'       => [ 'label' => 'Product Title', 'required' => true ],
            'product.slug'        => [ 'label' => 'Slug', 'required' => false ],
            'product.type'        => [ 'label' => 'Product Type', 'required' => false ],
            'product.status'      => [ 'label' => 'Status', 'required' => false ],
            'product.featured'    => [ 'label' => 'Featured', 'required' => false ],
            'product.catalog_visibility' => [ 'label' => 'Catalog Visibility', 'required' => false ],
        ],
        'pricing' => [
            'product.sku'           => [ 'label' => 'SKU', 'required' => false ],
            'product.regular_price' => [ 'label' => 'Regular Price', 'required' => false ],
            'product.sale_price'    => [ 'label' => 'Sale Price', 'required' => false ],
            'product.tax_status'    => [ 'label' => 'Tax Status', 'required' => false ],
            'product.tax_class'     => [ 'label' => 'Tax Class', 'required' => false ],
        ],
        'inventory' => [
            'product.manage_stock'   => [ 'label' => 'Manage Stock', 'required' => false ],
            'product.stock_quantity' => [ 'label' => 'Stock Quantity', 'required' => false ],
            'product.stock_status'   => [ 'label' => 'Stock Status', 'required' => false ],
            'product.backorders'     => [ 'label' => 'Backorders', 'required' => false ],
            'product.low_stock_amount' => [ 'label' => 'Low Stock Threshold', 'required' => false ],
            'product.sold_individually' => [ 'label' => 'Sold Individually', 'required' => false ],
        ],
        'content' => [
            'product.description'       => [ 'label' => 'Description', 'required' => false ],
            'product.short_description' => [ 'label' => 'Short Description', 'required' => false ],
        ],
        'shipping' => [
            'product.weight'        => [ 'label' => 'Weight', 'required' => false ],
            'product.length'        => [ 'label' => 'Length', 'required' => false ],
            'product.width'         => [ 'label' => 'Width', 'required' => false ],
            'product.height'        => [ 'label' => 'Height', 'required' => false ],
            'product.shipping_class' => [ 'label' => 'Shipping Class', 'required' => false ],
        ],
        'categories' => [
            'product.categories' => [ 'label' => 'Categories', 'required' => false ],
            'product.tags'       => [ 'label' => 'Tags', 'required' => false ],
        ],
        'images' => [
            'product.images'          => [ 'label' => 'Images', 'required' => false ],
            'product.featured_image'  => [ 'label' => 'Featured Image', 'required' => false ],
            'product.gallery_images'  => [ 'label' => 'Gallery Images', 'required' => false ],
        ],
        'attributes' => [
            'product.attributes' => [ 'label' => 'Attributes', 'required' => false ],
        ],
        'meta' => [
            'product.meta' => [ 'label' => 'Custom Meta', 'required' => false ],
        ],
    ];

    /**
     * Header name patterns for auto-mapping heuristics.
     */
    private const HEADER_PATTERNS = [
        'product.title' => [
            '/^(product[_\s-]?)?(name|title)$/i',
            '/^название$/i',
            '/^наименование$/i',
            '/^товар$/i',
        ],
        'product.sku' => [
            '/^sku$/i',
            '/^(product[_\s-]?)?code$/i',
            '/^артикул$/i',
            '/^код$/i',
        ],
        'product.regular_price' => [
            '/^(regular[_\s-]?)?price$/i',
            '/^цена$/i',
            '/^стоимость$/i',
        ],
        'product.sale_price' => [
            '/^sale[_\s-]?price$/i',
            '/^(special|promo)[_\s-]?price$/i',
            '/^скидка$/i',
            '/^акци(я|онная)[_\s-]?цена$/i',
        ],
        'product.description' => [
            '/^(full[_\s-]?)?description$/i',
            '/^(product[_\s-]?)?desc(ription)?$/i',
            '/^описание$/i',
        ],
        'product.short_description' => [
            '/^short[_\s-]?desc(ription)?$/i',
            '/^excerpt$/i',
            '/^краткое[_\s-]?описание$/i',
        ],
        'product.stock_quantity' => [
            '/^stock([_\s-]?qty|[_\s-]?quantity)?$/i',
            '/^quantity$/i',
            '/^qty$/i',
            '/^остаток$/i',
            '/^количество$/i',
        ],
        'product.stock_status' => [
            '/^stock[_\s-]?status$/i',
            '/^availability$/i',
            '/^наличие$/i',
        ],
        'product.categories' => [
            '/^categor(y|ies)$/i',
            '/^(product[_\s-]?)?cat(egory)?$/i',
            '/^категори(я|и)$/i',
        ],
        'product.tags' => [
            '/^tags?$/i',
            '/^(product[_\s-]?)?tags?$/i',
            '/^теги?$/i',
            '/^метки?$/i',
        ],
        'product.images' => [
            '/^images?$/i',
            '/^(product[_\s-]?)?image(s|[_\s-]?url)?$/i',
            '/^(фото|изображени[яе])$/i',
        ],
        'product.featured_image' => [
            '/^(featured|main|primary)[_\s-]?image$/i',
            '/^thumbnail$/i',
            '/^главное[_\s-]?(фото|изображение)$/i',
        ],
        'product.gallery_images' => [
            '/^gallery([_\s-]?images)?$/i',
            '/^additional[_\s-]?images?$/i',
            '/^галерея$/i',
        ],
        'product.weight' => [
            '/^weight$/i',
            '/^вес$/i',
        ],
        'product.length' => [
            '/^length$/i',
            '/^длина$/i',
        ],
        'product.width' => [
            '/^width$/i',
            '/^ширина$/i',
        ],
        'product.height' => [
            '/^height$/i',
            '/^высота$/i',
        ],
        'product.slug' => [
            '/^slug$/i',
            '/^url[_\s-]?slug$/i',
            '/^permalink$/i',
        ],
        'product.type' => [
            '/^(product[_\s-]?)?type$/i',
            '/^тип([_\s-]?товара)?$/i',
        ],
        'product.status' => [
            '/^status$/i',
            '/^(product[_\s-]?)?status$/i',
            '/^статус$/i',
        ],
        'product.attributes' => [
            '/^attributes?$/i',
            '/^атрибуты?$/i',
        ],
    ];

    /**
     * Get all product fields grouped by category.
     *
     * @return array
     */
    public function get_product_fields(): array {
        return apply_filters( 'pifwc_mapper_product_fields', self::PRODUCT_FIELDS );
    }

    /**
     * Get flat list of all product fields.
     *
     * @return array
     */
    public function get_flat_product_fields(): array {
        $fields = [];
        foreach ( $this->get_product_fields() as $category => $category_fields ) {
            foreach ( $category_fields as $key => $field ) {
                $fields[ $key ] = array_merge( $field, [ 'category' => $category ] );
            }
        }
        return $fields;
    }

    /**
     * Auto-map file columns to product fields using heuristics.
     *
     * @param array $headers File column headers.
     * @return array Mapping configuration.
     */
    public function auto_map( array $headers ): array {
        $mapping = [
            'columns' => [],
            'options' => [
                'has_header'  => true,
                'skip_rows'   => 0,
            ],
        ];

        foreach ( $headers as $index => $header ) {
            $header_clean = trim( (string) $header );
            $target       = $this->find_matching_field( $header_clean );

            $mapping['columns'][ $header_clean ] = [
                'target'    => $target,
                'transform' => null,
            ];
        }

        return $mapping;
    }

    /**
     * Find matching product field for a header name.
     *
     * @param string $header Header name.
     * @return string|null Target field or null if no match.
     */
    private function find_matching_field( string $header ): ?string {
        $header_patterns = apply_filters( 'pifwc_mapper_header_patterns', self::HEADER_PATTERNS );

        foreach ( $header_patterns as $field => $patterns ) {
            foreach ( $patterns as $pattern ) {
                if ( preg_match( $pattern, $header ) ) {
                    return $field;
                }
            }
        }
        return null;
    }

    /**
     * Validate mapping configuration.
     *
     * @param array $mapping Mapping configuration.
     * @return array Validation result with 'valid' and 'errors' keys.
     */
    public function validate_mapping( array $mapping ): array {
        $errors = [];
        $mapped_targets = [];

        // Check required fields.
        $required_fields = $this->get_required_fields();

        if ( empty( $mapping['columns'] ) ) {
            $errors[] = __( 'No columns mapped.', 'badamsoft-product-importer-for-woocommerce' );
            return [ 'valid' => false, 'errors' => $errors ];
        }

        foreach ( $mapping['columns'] as $column => $config ) {
            if ( ! empty( $config['target'] ) ) {
                $mapped_targets[] = $config['target'];
            }
        }

        // Check if title or SKU is mapped (at least one identifier).
        $has_identifier = in_array( 'product.title', $mapped_targets, true ) ||
                          in_array( 'product.sku', $mapped_targets, true );

        if ( ! $has_identifier ) {
            $errors[] = __( 'At least Product Title or SKU must be mapped.', 'badamsoft-product-importer-for-woocommerce' );
        }

        return [
            'valid'  => empty( $errors ),
            'errors' => $errors,
        ];
    }

    /**
     * Get required fields.
     *
     * @return array
     */
    private function get_required_fields(): array {
        $required = [];
        foreach ( $this->get_product_fields() as $category => $fields ) {
            foreach ( $fields as $key => $field ) {
                if ( ! empty( $field['required'] ) ) {
                    $required[] = $key;
                }
            }
        }
        return $required;
    }

    /**
     * Apply mapping to a data row.
     *
     * @param array $row     Data row (header => value).
     * @param array $mapping Mapping configuration.
     * @return array Mapped product data.
     */
    public function apply_mapping( array $row, array $mapping ): array {
        $product = [];

        foreach ( $mapping['columns'] as $column => $config ) {
            if ( empty( $config['target'] ) ) {
                continue;
            }

            $value = $row[ $column ] ?? null;

            // Apply simple transform if specified.
            if ( ! empty( $config['transform'] ) && null !== $value ) {
                $value = $this->apply_transform( $value, (string) $config['transform'] );
            }

            // Parse target field path (e.g., 'product.title' => ['product', 'title']).
            $parts = explode( '.', $config['target'] );
            if ( count( $parts ) === 2 ) {
                $product[ $parts[1] ] = $value;
            } else {
                $product[ $config['target'] ] = $value;
            }
        }

        return $product;
    }

    /**
     * Apply transformation to a value.
     *
     * @param mixed  $value     Value to transform.
     * @param string $transform Transform type.
     * @return mixed Transformed value.
     */
    private function apply_transform( $value, string $transform ) {
        switch ( $transform ) {
            case 'trim':
                return is_string( $value ) ? trim( $value ) : $value;

            case 'lowercase':
                return is_string( $value ) ? strtolower( $value ) : $value;

            case 'uppercase':
                return is_string( $value ) ? strtoupper( $value ) : $value;

            case 'number':
                return is_numeric( $value ) ? (float) $value : 0;

            case 'integer':
                return (int) $value;

            case 'boolean':
                return filter_var( $value, FILTER_VALIDATE_BOOLEAN );

            case 'array_comma':
                return is_string( $value ) ? array_map( 'trim', explode( ',', $value ) ) : (array) $value;

            case 'array_pipe':
                return is_string( $value ) ? array_map( 'trim', explode( '|', $value ) ) : (array) $value;

            default:
                return $value;
        }
    }

    /**
     * Preview mapped data.
     *
     * @param array $rows    Data rows.
     * @param array $mapping Mapping configuration.
     * @param int   $limit   Max rows to preview.
     * @return array Mapped products preview.
     */
    public function preview_mapping( array $rows, array $mapping, int $limit = 10 ): array {
        $products = [];
        $count    = 0;

        foreach ( $rows as $row ) {
            if ( $count >= $limit ) {
                break;
            }

            $products[] = $this->apply_mapping( $row, $mapping );
            $count++;
        }

        return $products;
    }
}
