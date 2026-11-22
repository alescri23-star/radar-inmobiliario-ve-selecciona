<?php
/**
 * Plugin Name: Radar Venezuela Core
 * Description: Inmuebles publicados y solicitudes privadas para Radar Venezuela.
 * Version: 0.6.8
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Author: Radar Venezuela
 * Text Domain: radar-core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'RADAR_CORE_VERSION', '0.6.8' );
define( 'RADAR_CORE_URL', plugin_dir_url( __FILE__ ) );

function radar_core_register_content() {
	register_post_type( 'radar_inmueble', array(
		'labels' => array(
			'name' => __( 'Inmuebles', 'radar-core' ),
			'singular_name' => __( 'Inmueble', 'radar-core' ),
			'add_new_item' => __( 'Añadir inmueble', 'radar-core' ),
			'edit_item' => __( 'Editar inmueble', 'radar-core' ),
		),
		'public' => true,
		'show_in_rest' => true,
		'has_archive' => 'inmuebles',
		'rewrite' => array( 'slug' => 'inmuebles' ),
		'menu_icon' => 'dashicons-building',
		'supports' => array( 'title', 'editor', 'excerpt', 'thumbnail' ),
	) );
	register_post_type( 'radar_solicitud', array(
		'labels' => array( 'name' => __( 'Solicitudes', 'radar-core' ), 'singular_name' => __( 'Solicitud', 'radar-core' ) ),
		'public' => false,
		'show_ui' => true,
		'show_in_menu' => true,
		'menu_icon' => 'dashicons-email-alt',
		'capability_type' => 'post',
		'capabilities' => array(
			'edit_post' => 'manage_options', 'read_post' => 'manage_options', 'delete_post' => 'manage_options',
			'edit_posts' => 'manage_options', 'edit_others_posts' => 'manage_options', 'publish_posts' => 'manage_options',
			'read_private_posts' => 'manage_options', 'delete_posts' => 'manage_options', 'delete_private_posts' => 'manage_options',
			'delete_published_posts' => 'manage_options', 'delete_others_posts' => 'manage_options', 'create_posts' => 'do_not_allow',
		),
		'map_meta_cap' => true,
		'supports' => array( 'title' ),
	) );
	foreach ( array(
		'radar_operacion' => 'sanitize_key',
		'radar_tipo' => 'sanitize_text_field',
		'radar_precio' => 'floatval',
		'radar_moneda' => 'sanitize_key',
		'radar_zona' => 'sanitize_text_field',
		'radar_superficie' => 'floatval',
		'radar_habitaciones' => 'absint',
		'radar_banos' => 'absint',
	) as $key => $sanitize ) {
		register_post_meta( 'radar_inmueble', $key, array( 'type' => in_array( $key, array( 'radar_precio', 'radar_superficie' ), true ) ? 'number' : ( in_array( $key, array( 'radar_habitaciones', 'radar_banos' ), true ) ? 'integer' : 'string' ), 'single' => true, 'show_in_rest' => true, 'sanitize_callback' => function( $value ) use ( $sanitize ) { return call_user_func( $sanitize, $value ); }, 'auth_callback' => function() { return current_user_can( 'edit_posts' ); } ) );
	}
}
add_action( 'init', 'radar_core_register_content' );

function radar_core_report_routes() {
	add_rewrite_rule( '^informes/([^/]+)/?$', 'index.php?radar_report=$matches[1]', 'top' );
	add_rewrite_rule( '^actualidad/?$', 'index.php?radar_economic_archive=1', 'top' );
}
add_action( 'init', 'radar_core_report_routes' );

function radar_core_report_query_vars( $vars ) {
	$vars[] = 'radar_report';
	$vars[] = 'radar_economic_archive';
	return $vars;
}
add_filter( 'query_vars', 'radar_core_report_query_vars' );

function radar_core_refresh_routes() {
	if ( RADAR_CORE_VERSION !== get_option( 'radar_core_rewrite_version' ) ) {
		flush_rewrite_rules( false );
		update_option( 'radar_core_rewrite_version', RADAR_CORE_VERSION, false );
	}
}
add_action( 'init', 'radar_core_refresh_routes', 99 );

function radar_core_activate() {
	radar_core_register_content();
	radar_core_report_routes();
	flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'radar_core_activate' );
register_deactivation_hook( __FILE__, 'flush_rewrite_rules' );

function radar_core_meta_box() {
	add_meta_box( 'radar-property-data', __( 'Datos del inmueble', 'radar-core' ), 'radar_core_render_meta_box', 'radar_inmueble', 'normal', 'high' );
	add_meta_box( 'radar-request-data', __( 'Datos de la solicitud', 'radar-core' ), 'radar_core_render_request', 'radar_solicitud', 'normal', 'high' );
}
add_action( 'add_meta_boxes', 'radar_core_meta_box' );

function radar_core_render_request( $post ) {
	$rows = array(
		__( 'Nombre', 'radar-core' ) => get_post_meta( $post->ID, 'radar_nombre', true ),
		__( 'Contacto', 'radar-core' ) => get_post_meta( $post->ID, 'radar_contacto', true ),
		__( 'Mensaje', 'radar-core' ) => get_post_meta( $post->ID, 'radar_mensaje', true ),
		__( 'Consentimiento', 'radar-core' ) => get_post_meta( $post->ID, 'radar_consentimiento', true ),
	);
	echo '<table class="widefat striped"><tbody>';
	foreach ( $rows as $label => $value ) {
		printf( '<tr><th style="width:180px">%s</th><td>%s</td></tr>', esc_html( $label ), nl2br( esc_html( $value ) ) );
	}
	echo '</tbody></table><p>' . esc_html__( 'Estos datos son privados. Úsalos únicamente para responder a la solicitud.', 'radar-core' ) . '</p>';
}

function radar_core_render_meta_box( $post ) {
	wp_nonce_field( 'radar_save_property', 'radar_property_nonce' );
	$fields = array(
		'radar_operacion' => array( 'Operación', 'select', array( 'venta' => 'Venta', 'alquiler' => 'Alquiler' ) ),
		'radar_tipo' => array( 'Tipo', 'text' ),
		'radar_precio' => array( 'Precio', 'number' ),
		'radar_moneda' => array( 'Moneda', 'select', array( 'USD' => 'USD', 'VES' => 'VES' ) ),
		'radar_zona' => array( 'Zona', 'text' ),
		'radar_superficie' => array( 'Superficie (m²)', 'number' ),
		'radar_habitaciones' => array( 'Habitaciones', 'number' ),
		'radar_banos' => array( 'Baños', 'number' ),
	);
	echo '<table class="form-table"><tbody>';
	foreach ( $fields as $key => $field ) {
		$value = get_post_meta( $post->ID, $key, true );
		printf( '<tr><th><label for="%1$s">%2$s</label></th><td>', esc_attr( $key ), esc_html( $field[0] ) );
		if ( 'select' === $field[1] ) {
			printf( '<select id="%1$s" name="%1$s">', esc_attr( $key ) );
			foreach ( $field[2] as $option => $label ) {
				printf( '<option value="%s" %s>%s</option>', esc_attr( $option ), selected( $value, $option, false ), esc_html( $label ) );
			}
			echo '</select>';
		} else {
			printf( '<input class="regular-text" id="%1$s" name="%1$s" type="%2$s" min="0" step="%3$s" value="%4$s">', esc_attr( $key ), esc_attr( $field[1] ), in_array( $key, array( 'radar_precio', 'radar_superficie' ), true ) ? '0.01' : '1', esc_attr( $value ) );
		}
		echo '</td></tr>';
	}
	echo '</tbody></table><p><strong>' . esc_html__( 'Publica únicamente información autorizada y comprobada.', 'radar-core' ) . '</strong></p>';
}

function radar_core_save_property( $post_id ) {
	if ( ! isset( $_POST['radar_property_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['radar_property_nonce'] ) ), 'radar_save_property' ) || ! current_user_can( 'edit_post', $post_id ) || wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
		return;
	}
	$sanitizers = array( 'radar_operacion' => 'sanitize_key', 'radar_tipo' => 'sanitize_text_field', 'radar_precio' => 'floatval', 'radar_moneda' => 'sanitize_key', 'radar_zona' => 'sanitize_text_field', 'radar_superficie' => 'floatval', 'radar_habitaciones' => 'absint', 'radar_banos' => 'absint' );
	foreach ( $sanitizers as $key => $sanitize ) {
		if ( isset( $_POST[ $key ] ) ) {
			update_post_meta( $post_id, $key, call_user_func( $sanitize, wp_unslash( $_POST[ $key ] ) ) );
		}
	}
}
add_action( 'save_post_radar_inmueble', 'radar_core_save_property' );

function radar_core_property_card( $post_id ) {
	$operation = get_post_meta( $post_id, 'radar_operacion', true );
	$price = get_post_meta( $post_id, 'radar_precio', true );
	$currency = get_post_meta( $post_id, 'radar_moneda', true ) ?: 'USD';
	$meta = array_filter( array(
		get_post_meta( $post_id, 'radar_zona', true ),
		get_post_meta( $post_id, 'radar_superficie', true ) ? get_post_meta( $post_id, 'radar_superficie', true ) . ' m²' : '',
		get_post_meta( $post_id, 'radar_habitaciones', true ) ? get_post_meta( $post_id, 'radar_habitaciones', true ) . ' hab.' : '',
		get_post_meta( $post_id, 'radar_banos', true ) ? get_post_meta( $post_id, 'radar_banos', true ) . ' baños' : '',
	) );
	ob_start(); ?>
	<article class="radar-property">
		<a href="<?php echo esc_url( get_permalink( $post_id ) ); ?>"><?php echo get_the_post_thumbnail( $post_id, 'large' ) ?: '<span class="radar-property-placeholder">' . esc_html__( 'Foto pendiente', 'radar-core' ) . '</span>'; ?></a>
		<div class="radar-property-copy"><span class="tag"><?php echo esc_html( $operation ?: __( 'Inmueble', 'radar-core' ) ); ?></span><h3><a href="<?php echo esc_url( get_permalink( $post_id ) ); ?>"><?php echo esc_html( get_the_title( $post_id ) ); ?></a></h3><strong class="property-price"><?php echo $price ? esc_html( number_format_i18n( (float) $price, 0 ) . ' ' . $currency ) : esc_html__( 'Consultar precio', 'radar-core' ); ?></strong><p class="property-meta"><?php echo esc_html( implode( ' · ', $meta ) ); ?></p></div>
	</article>
	<?php return ob_get_clean();
}

function radar_core_properties_shortcode( $attributes ) {
	$attributes = shortcode_atts( array( 'limite' => 6, 'filtros' => 'false' ), $attributes, 'radar_inmuebles' );
	$args = array( 'post_type' => 'radar_inmueble', 'post_status' => 'publish', 'posts_per_page' => min( 24, max( 1, absint( $attributes['limite'] ) ) ), 'paged' => max( 1, get_query_var( 'paged' ) ) );
	$meta_query = array();
	$operation = isset( $_GET['operacion'] ) ? sanitize_key( wp_unslash( $_GET['operacion'] ) ) : '';
	$type = isset( $_GET['tipo'] ) ? sanitize_text_field( wp_unslash( $_GET['tipo'] ) ) : '';
	$max_price = isset( $_GET['precio_max'] ) ? (float) wp_unslash( $_GET['precio_max'] ) : 0;
	if ( in_array( $operation, array( 'venta', 'alquiler' ), true ) ) { $meta_query[] = array( 'key' => 'radar_operacion', 'value' => $operation ); }
	if ( $type ) { $meta_query[] = array( 'key' => 'radar_tipo', 'value' => $type ); }
	if ( $max_price > 0 ) { $meta_query[] = array( 'key' => 'radar_precio', 'value' => $max_price, 'compare' => '<=', 'type' => 'NUMERIC' ); }
	if ( $meta_query ) { $args['meta_query'] = $meta_query; }
	$query = new WP_Query( $args );
	ob_start();
	if ( 'true' === $attributes['filtros'] ) : ?>
	<form class="filter-form" method="get"><label><?php esc_html_e( 'Operación', 'radar-core' ); ?><select name="operacion"><option value=""><?php esc_html_e( 'Todas', 'radar-core' ); ?></option><option value="venta" <?php selected( $operation, 'venta' ); ?>><?php esc_html_e( 'Venta', 'radar-core' ); ?></option><option value="alquiler" <?php selected( $operation, 'alquiler' ); ?>><?php esc_html_e( 'Alquiler', 'radar-core' ); ?></option></select></label><label><?php esc_html_e( 'Tipo', 'radar-core' ); ?><input name="tipo" value="<?php echo esc_attr( $type ); ?>"></label><label><?php esc_html_e( 'Precio máximo', 'radar-core' ); ?><input type="number" min="0" name="precio_max" value="<?php echo esc_attr( $max_price ?: '' ); ?>"></label><button class="button" type="submit"><?php esc_html_e( 'Filtrar', 'radar-core' ); ?></button></form>
	<?php endif;
	echo '<div class="radar-property-grid">';
	if ( $query->have_posts() ) { while ( $query->have_posts() ) { $query->the_post(); echo radar_core_property_card( get_the_ID() ); } } else { echo '<div class="radar-empty"><h3>' . esc_html__( 'Todavía no hay inmuebles publicados', 'radar-core' ) . '</h3><p>' . esc_html__( 'Los anuncios aparecerán aquí cuando el administrador los revise y publique.', 'radar-core' ) . '</p></div>'; }
	echo '</div>';
	if ( 'true' === $attributes['filtros'] && $query->max_num_pages > 1 ) {
		echo '<nav class="pagination" aria-label="' . esc_attr__( 'Páginas de inmuebles', 'radar-core' ) . '">';
		echo wp_kses_post( paginate_links( array( 'total' => $query->max_num_pages, 'current' => max( 1, get_query_var( 'paged' ) ), 'type' => 'plain' ) ) );
		echo '</nav>';
	}
	wp_reset_postdata();
	return ob_get_clean();
}
add_shortcode( 'radar_inmuebles', 'radar_core_properties_shortcode' );

function radar_core_normalize_search( $value ) {
	return trim( preg_replace( '/[^a-z0-9]+/', ' ', strtolower( remove_accents( (string) $value ) ) ) );
}

function radar_core_public_inventory() {
	$cached = get_transient( 'radar_core_public_inventory_v2' );
	$api_base = untrailingslashit( apply_filters( 'radar_core_api_base', 'https://white-shrew-789999.hostingersite.com' ) );
	$response = wp_remote_get( $api_base . '/api/public/properties', array( 'timeout' => 8, 'redirection' => 2, 'headers' => array( 'Accept' => 'application/json' ) ) );
	if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
		$payload = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( is_array( $payload ) && isset( $payload['properties'] ) && is_array( $payload['properties'] ) ) {
			set_transient( 'radar_core_public_inventory_v2', $payload['properties'], 15 * MINUTE_IN_SECONDS );
			return $payload['properties'];
		}
	}
	return is_array( $cached ) ? $cached : array();
}

function radar_core_public_properties() {
	$properties = array();
	foreach ( radar_core_public_inventory() as $item ) {
		$latitude = isset( $item['latitude'] ) && is_numeric( $item['latitude'] ) ? (float) $item['latitude'] : null;
		$longitude = isset( $item['longitude'] ) && is_numeric( $item['longitude'] ) ? (float) $item['longitude'] : null;
		if ( null !== $latitude && ( $latitude < 0 || $latitude > 16 ) ) { $latitude = null; }
		if ( null !== $longitude && ( $longitude < -75 || $longitude > -57 ) ) { $longitude = null; }
		$properties[] = array(
			'id' => sanitize_text_field( (string) ( $item['id'] ?? '' ) ),
			'title' => sanitize_text_field( (string) ( $item['title'] ?? __( 'Inmueble', 'radar-core' ) ) ),
			'photo' => esc_url_raw( (string) ( $item['photo'] ?? '' ) ),
			'zone' => sanitize_text_field( (string) ( $item['zone'] ?? '' ) ),
			'municipality' => sanitize_text_field( (string) ( $item['municipality'] ?? '' ) ),
			'parish' => sanitize_text_field( (string) ( $item['parish'] ?? '' ) ),
			'operation' => sanitize_key( (string) ( $item['operation'] ?? '' ) ),
			'price' => isset( $item['price'] ) && is_numeric( $item['price'] ) ? (float) $item['price'] : 0,
			'currency' => sanitize_text_field( (string) ( $item['currency'] ?? 'USD' ) ),
			'type' => sanitize_text_field( (string) ( $item['type'] ?? '' ) ),
			'bedrooms' => absint( $item['bedrooms'] ?? 0 ),
			'bathrooms' => absint( $item['bathrooms'] ?? 0 ),
			'area' => isset( $item['area'] ) && is_numeric( $item['area'] ) ? (float) $item['area'] : 0,
			'latitude' => $latitude,
			'longitude' => $longitude,
			'source' => esc_url_raw( (string) ( $item['source'] ?? '' ) ),
			'firstSeenAt' => sanitize_text_field( (string) ( $item['firstSeenAt'] ?? '' ) ),
			'lastSeenAt' => sanitize_text_field( (string) ( $item['lastSeenAt'] ?? '' ) ),
			'previousPrice' => isset( $item['previousPrice'] ) && is_numeric( $item['previousPrice'] ) ? (float) $item['previousPrice'] : 0,
			'priceChangedAt' => sanitize_text_field( (string) ( $item['priceChangedAt'] ?? '' ) ),
		);
	}
	$response = rest_ensure_response( array( 'properties' => $properties, 'count' => count( $properties ) ) );
	$response->header( 'Cache-Control', 'public, max-age=300' );
	return $response;
}

function radar_core_public_assistant_search( WP_REST_Request $request ) {
	$question = sanitize_text_field( (string) $request->get_param( 'question' ) );
	if ( ! $question || mb_strlen( $question ) > 240 ) {
		return new WP_Error( 'radar_invalid_question', __( 'Escribe una búsqueda de hasta 240 caracteres.', 'radar-core' ), array( 'status' => 400 ) );
	}
	$q = radar_core_normalize_search( $question );
	$operation = str_contains( $q, 'alquiler' ) || str_contains( $q, 'alquilar' ) ? 'alquiler' : ( str_contains( $q, 'venta' ) || str_contains( $q, 'comprar' ) ? 'venta' : '' );
	$bedrooms = preg_match( '/(\d+)\s*(?:habitacion|habitaciones|hab\b)/', $q, $room_match ) ? absint( $room_match[1] ) : 0;
	$max_price = preg_match( '/(?:menos de|hasta|maximo(?: de)?)\s*(?:usd|\$)?\s*([\d.,]+)/', $q, $price_match ) ? (float) preg_replace( '/[^\d]/', '', $price_match[1] ) : 0;
	$opportunity = str_contains( $q, 'oportunidad' ) || str_contains( $q, 'metro cuadrado' ) || str_contains( $q, 'm2' );
	$cheap = str_contains( $q, 'barato' ) || str_contains( $q, 'economico' ) || str_contains( $q, 'menor precio' );
	$stop = array( 'quiero','busco','buscar','muestrame','inmueble','inmuebles','propiedad','propiedades','con','para','por','una','uno','unos','unas','que','del','las','los','mas','menos','venta','comprar','alquiler','alquilar','habitacion','habitaciones','hasta','maximo','usd' );
	$tokens = array_values( array_filter( array_unique( explode( ' ', $q ) ), function( $token ) use ( $stop ) { return strlen( $token ) > 2 && ! in_array( $token, $stop, true ) && ! is_numeric( $token ); } ) );
	$candidates = array();
	$remote_inventory = radar_core_public_inventory();
	if ( $remote_inventory ) {
		foreach ( $remote_inventory as $item ) {
			$candidates[] = array(
				'id' => sanitize_text_field( (string) ( $item['id'] ?? '' ) ),
				'title' => sanitize_text_field( (string) ( $item['title'] ?? __( 'Inmueble', 'radar-core' ) ) ),
				'url' => esc_url_raw( (string) ( $item['source'] ?? '' ) ) ?: home_url( '/#contacto' ),
				'image' => esc_url_raw( (string) ( $item['photo'] ?? '' ) ),
				'operation' => sanitize_key( (string) ( $item['operation'] ?? '' ) ),
				'type' => sanitize_text_field( (string) ( $item['type'] ?? '' ) ),
				'price' => (float) ( $item['price'] ?? 0 ),
				'currency' => sanitize_text_field( (string) ( $item['currency'] ?? 'USD' ) ),
				'zone' => sanitize_text_field( trim( implode( ', ', array_filter( array( $item['zone'] ?? '', $item['parish'] ?? '', $item['municipality'] ?? '' ) ) ) ) ),
				'area' => (float) ( $item['area'] ?? 0 ),
				'bedrooms' => absint( $item['bedrooms'] ?? 0 ),
				'bathrooms' => absint( $item['bathrooms'] ?? 0 ),
			);
		}
	} else {
		$post_ids = get_posts( array( 'post_type' => 'radar_inmueble', 'post_status' => 'publish', 'posts_per_page' => 120, 'fields' => 'ids', 'no_found_rows' => true, 'orderby' => 'date', 'order' => 'DESC' ) );
		foreach ( $post_ids as $post_id ) {
			$candidates[] = array(
				'id' => $post_id, 'title' => get_the_title( $post_id ), 'url' => get_permalink( $post_id ),
				'image' => get_the_post_thumbnail_url( $post_id, 'medium_large' ) ?: '',
				'operation' => get_post_meta( $post_id, 'radar_operacion', true ), 'type' => get_post_meta( $post_id, 'radar_tipo', true ),
				'price' => (float) get_post_meta( $post_id, 'radar_precio', true ), 'currency' => get_post_meta( $post_id, 'radar_moneda', true ) ?: 'USD',
				'zone' => get_post_meta( $post_id, 'radar_zona', true ), 'area' => (float) get_post_meta( $post_id, 'radar_superficie', true ),
				'bedrooms' => absint( get_post_meta( $post_id, 'radar_habitaciones', true ) ), 'bathrooms' => absint( get_post_meta( $post_id, 'radar_banos', true ) ),
			);
		}
	}
	$rows = array();
	foreach ( $candidates as $candidate ) {
		$row_operation = $candidate['operation'];
		$price = $candidate['price'];
		$row_bedrooms = $candidate['bedrooms'];
		if ( $operation && $row_operation !== $operation ) { continue; }
		if ( $bedrooms && $row_bedrooms < $bedrooms ) { continue; }
		if ( $max_price && ( ! $price || $price > $max_price ) ) { continue; }
		$type = $candidate['type'];
		$zone = $candidate['zone'];
		$area = $candidate['area'];
		$haystack = radar_core_normalize_search( $candidate['title'] . ' ' . $type . ' ' . $zone );
		$score = 0;
		foreach ( $tokens as $token ) { if ( str_contains( $haystack, $token ) ) { $score++; } }
		$unit_price = $price && $area ? round( $price / $area ) : 0;
		$rows[] = array_merge( $candidate, array( 'unitPrice' => $unit_price, 'score' => $score ) );
	}
	usort( $rows, function( $a, $b ) use ( $opportunity, $cheap ) {
		if ( $opportunity ) {
			$a_unit = $a['unitPrice'] ?: PHP_INT_MAX; $b_unit = $b['unitPrice'] ?: PHP_INT_MAX;
			return $a_unit <=> $b_unit ?: $b['score'] <=> $a['score'];
		}
		if ( $cheap ) {
			$a_price = $a['price'] ?: PHP_INT_MAX; $b_price = $b['price'] ?: PHP_INT_MAX;
			return $a_price <=> $b_price ?: $b['score'] <=> $a['score'];
		}
		return $b['score'] <=> $a['score'] ?: $b['id'] <=> $a['id'];
	} );
	$results = array_slice( $rows, 0, 6 );
	if ( empty( $results ) ) {
		$answer = __( 'No encontramos inmuebles publicados con todos esos criterios. Prueba ampliando el precio, la zona o el número de habitaciones.', 'radar-core' );
	} elseif ( $opportunity ) {
		$answer = sprintf( __( 'Encontramos %d opciones comparables. Primero aparecen las que tienen menor precio por metro cuadrado.', 'radar-core' ), count( $rows ) );
	} elseif ( $cheap ) {
		$answer = sprintf( __( 'Encontramos %d opciones. Primero aparecen las de menor precio publicado.', 'radar-core' ), count( $rows ) );
	} else {
		$answer = sprintf( __( 'Encontramos %d inmuebles publicados relacionados con tu búsqueda.', 'radar-core' ), count( $rows ) );
	}
	$response = rest_ensure_response( array( 'answer' => $answer, 'count' => count( $rows ), 'results' => $results ) );
	$response->header( 'Cache-Control', 'no-store, max-age=0' );
	return $response;
}

function radar_core_register_public_assistant_route() {
	register_rest_route( 'radar/v1', '/assistant', array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => 'radar_core_public_assistant_search', 'permission_callback' => '__return_true' ) );
	register_rest_route( 'radar/v1', '/properties', array( 'methods' => WP_REST_Server::READABLE, 'callback' => 'radar_core_public_properties', 'permission_callback' => '__return_true' ) );
}
add_action( 'rest_api_init', 'radar_core_register_public_assistant_route' );

function radar_core_public_portal_shortcode() {
	wp_enqueue_style( 'radar-leaflet', plugin_dir_url( __FILE__ ) . 'assets/vendor/leaflet/leaflet.css', array(), '1.9.4' );
	wp_enqueue_style( 'radar-public-portal', plugin_dir_url( __FILE__ ) . 'assets/public-portal.css', array( 'radar-leaflet' ), RADAR_CORE_VERSION );
	wp_enqueue_script( 'radar-leaflet', plugin_dir_url( __FILE__ ) . 'assets/vendor/leaflet/leaflet.js', array(), '1.9.4', true );
	wp_enqueue_script( 'radar-public-portal', plugin_dir_url( __FILE__ ) . 'assets/public-portal.js', array( 'radar-leaflet' ), RADAR_CORE_VERSION, true );
	wp_localize_script( 'radar-public-portal', 'RadarPublicPortal', array( 'restUrl' => esc_url_raw( rest_url( 'radar/v1/properties' ) ), 'contactUrl' => esc_url_raw( home_url( '/#contacto' ) ) ) );
	ob_start(); ?>
	<div class="radar-portal" data-radar-portal>
		<div class="radar-portal-bar">
			<div class="radar-portal-searchbox"><span aria-hidden="true">⌕</span><label class="screen-reader-text" for="radar-portal-search"><?php esc_html_e( 'Buscar por zona, tipo o palabra clave', 'radar-core' ); ?></label><input id="radar-portal-search" data-search placeholder="Busca por zona, urbanización o tipo de inmueble"></div>
			<div class="radar-portal-operations" aria-label="<?php esc_attr_e( 'Operación', 'radar-core' ); ?>"><button class="is-active" type="button" data-operation=""><?php esc_html_e( 'Todos', 'radar-core' ); ?></button><button type="button" data-operation="venta"><?php esc_html_e( 'Comprar', 'radar-core' ); ?></button><button type="button" data-operation="alquiler"><?php esc_html_e( 'Alquilar', 'radar-core' ); ?></button></div>
			<button class="radar-portal-filter-toggle" type="button" data-filter-toggle aria-expanded="true">⚙ <?php esc_html_e( 'Filtros', 'radar-core' ); ?></button>
		</div>
		<div class="radar-portal-filters" data-filters>
			<label><?php esc_html_e( 'Tipo de inmueble', 'radar-core' ); ?><select data-type><option value=""><?php esc_html_e( 'Todos los tipos', 'radar-core' ); ?></option><option value="Casa"><?php esc_html_e( 'Casa', 'radar-core' ); ?></option><option value="Apartamento"><?php esc_html_e( 'Apartamento', 'radar-core' ); ?></option><option value="Local comercial"><?php esc_html_e( 'Local comercial', 'radar-core' ); ?></option><option value="Terreno urbano"><?php esc_html_e( 'Terreno urbano', 'radar-core' ); ?></option><option value="Terreno rústico"><?php esc_html_e( 'Terreno rústico', 'radar-core' ); ?></option><option value="Galpón"><?php esc_html_e( 'Galpón', 'radar-core' ); ?></option></select></label>
			<label><?php esc_html_e( 'Zona', 'radar-core' ); ?><select data-zone><option value=""><?php esc_html_e( 'Todas las zonas', 'radar-core' ); ?></option></select></label>
			<label><?php esc_html_e( 'Habitaciones', 'radar-core' ); ?><select data-bedrooms><option value="0"><?php esc_html_e( 'Cualquiera', 'radar-core' ); ?></option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></label>
			<label><?php esc_html_e( 'Precio mínimo', 'radar-core' ); ?><input type="number" min="0" step="1000" data-min-price placeholder="Sin mínimo"></label>
			<label><?php esc_html_e( 'Precio máximo', 'radar-core' ); ?><input type="number" min="0" step="1000" data-max-price placeholder="Sin límite"></label>
			<label><?php esc_html_e( 'Ordenar', 'radar-core' ); ?><select data-sort><option value="recent"><?php esc_html_e( 'Relevancia', 'radar-core' ); ?></option><option value="price-asc"><?php esc_html_e( 'Precio más bajo', 'radar-core' ); ?></option><option value="price-desc"><?php esc_html_e( 'Precio más alto', 'radar-core' ); ?></option><option value="area-desc"><?php esc_html_e( 'Mayor superficie', 'radar-core' ); ?></option></select></label>
			<button class="radar-portal-reset" type="button" data-reset><?php esc_html_e( 'Limpiar filtros', 'radar-core' ); ?></button>
		</div>
		<div class="radar-portal-summary"><div><strong data-count>0</strong> <?php esc_html_e( 'inmuebles encontrados', 'radar-core' ); ?><span data-map-count></span></div><div class="radar-portal-view-tabs"><button class="is-active" type="button" data-view="list">☷ <?php esc_html_e( 'Lista', 'radar-core' ); ?></button><button type="button" data-view="map">⌖ <?php esc_html_e( 'Mapa', 'radar-core' ); ?></button></div></div>
		<div class="radar-portal-layout">
			<div class="radar-portal-list" data-list><div class="radar-portal-loading"><?php esc_html_e( 'Cargando inmuebles…', 'radar-core' ); ?></div></div>
			<div class="radar-portal-map-panel" data-map-panel><div class="radar-portal-map" data-map aria-label="<?php esc_attr_e( 'Mapa de inmuebles', 'radar-core' ); ?>"></div><div class="radar-portal-legend"><span><i class="sale"></i><?php esc_html_e( 'Venta', 'radar-core' ); ?></span><span><i class="rent"></i><?php esc_html_e( 'Alquiler', 'radar-core' ); ?></span></div></div>
		</div>
	</div>
	<?php return ob_get_clean();
}
add_shortcode( 'radar_portal', 'radar_core_public_portal_shortcode' );

function radar_core_public_assistant_shortcode() {
	wp_enqueue_style( 'radar-public-assistant', plugin_dir_url( __FILE__ ) . 'assets/public-assistant.css', array(), '0.3.1' );
	wp_enqueue_script( 'radar-public-assistant', plugin_dir_url( __FILE__ ) . 'assets/public-assistant.js', array(), '0.3.1', true );
	wp_localize_script( 'radar-public-assistant', 'RadarPublicAssistant', array( 'restUrl' => esc_url_raw( rest_url( 'radar/v1/assistant' ) ), 'contactUrl' => esc_url_raw( home_url( '/#contacto' ) ) ) );
	ob_start(); ?>
	<section id="radar-ia" class="radar-public-assistant" aria-labelledby="radar-public-title">
		<div class="radar-public-heading"><span>✦</span><div><strong id="radar-public-title"><?php esc_html_e( 'Pregúntale a Radar IA', 'radar-core' ); ?></strong><small><?php esc_html_e( 'Busca entre los inmuebles publicados', 'radar-core' ); ?></small></div></div>
		<form class="radar-public-search"><label class="screen-reader-text" for="radar-public-question"><?php esc_html_e( 'Describe el inmueble que buscas', 'radar-core' ); ?></label><input id="radar-public-question" maxlength="240" placeholder="Ej.: apartamento de 3 habitaciones por menos de 70.000 USD" required><button type="submit"><?php esc_html_e( 'Buscar', 'radar-core' ); ?></button></form>
		<div class="radar-public-examples"><button type="button" data-radar-example="Apartamentos en venta por menos de 70000 USD"><?php esc_html_e( 'Hasta 70.000 USD', 'radar-core' ); ?></button><button type="button" data-radar-example="Inmuebles de 3 habitaciones"><?php esc_html_e( '3 habitaciones', 'radar-core' ); ?></button><button type="button" data-radar-example="Oportunidades por precio por metro cuadrado"><?php esc_html_e( 'Oportunidades', 'radar-core' ); ?></button></div>
		<div class="radar-public-response" hidden aria-live="polite"><p></p><div class="radar-public-results"></div><a class="radar-public-contact" href="<?php echo esc_url( home_url( '/#contacto' ) ); ?>"><?php esc_html_e( 'Solicitar una búsqueda personalizada', 'radar-core' ); ?> →</a></div>
	</section>
	<?php return ob_get_clean();
}
add_shortcode( 'radar_ia', 'radar_core_public_assistant_shortcode' );

function radar_core_contact_shortcode() {
	$sent = isset( $_GET['radar_sent'] ) && '1' === $_GET['radar_sent'];
	ob_start();
	if ( $sent ) { echo '<p class="radar-message" role="status">' . esc_html__( 'Solicitud recibida. La revisaremos de forma privada.', 'radar-core' ) . '</p>'; }
	?>
	<form class="radar-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<input type="hidden" name="action" value="radar_contact">
		<?php wp_nonce_field( 'radar_contact', 'radar_contact_nonce' ); ?>
		<input type="text" name="website" value="" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
		<label><?php esc_html_e( 'Nombre', 'radar-core' ); ?><input name="name" maxlength="120" required autocomplete="name"></label>
		<label><?php esc_html_e( 'Email o teléfono', 'radar-core' ); ?><input name="contact" maxlength="200" required autocomplete="email"></label>
		<label><?php esc_html_e( '¿Qué estás buscando?', 'radar-core' ); ?><textarea name="message" maxlength="2000" required></textarea></label>
		<label class="consent"><input type="checkbox" name="consent" value="1" required><span><?php esc_html_e( 'Acepto que Radar Venezuela trate estos datos para responder a mi solicitud.', 'radar-core' ); ?></span></label>
		<button class="button" type="submit"><?php esc_html_e( 'Enviar solicitud', 'radar-core' ); ?></button>
	</form>
	<?php return ob_get_clean();
}
add_shortcode( 'radar_contacto', 'radar_core_contact_shortcode' );

function radar_core_handle_contact() {
	if ( ! isset( $_POST['radar_contact_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['radar_contact_nonce'] ) ), 'radar_contact' ) ) { wp_die( esc_html__( 'La sesión del formulario ha caducado.', 'radar-core' ), '', array( 'response' => 403 ) ); }
	if ( ! empty( $_POST['website'] ) ) { wp_safe_redirect( home_url( '/' ) ); exit; }
	$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown';
	$rate_key = 'radar_contact_' . hash_hmac( 'sha256', $ip, wp_salt( 'nonce' ) );
	if ( get_transient( $rate_key ) ) { wp_die( esc_html__( 'Espera unos minutos antes de enviar otra solicitud.', 'radar-core' ), '', array( 'response' => 429 ) ); }
	$name = isset( $_POST['name'] ) ? sanitize_text_field( wp_unslash( $_POST['name'] ) ) : '';
	$contact = isset( $_POST['contact'] ) ? sanitize_text_field( wp_unslash( $_POST['contact'] ) ) : '';
	$message = isset( $_POST['message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['message'] ) ) : '';
	if ( ! $name || ! $contact || ! $message || empty( $_POST['consent'] ) ) { wp_die( esc_html__( 'Completa todos los campos y acepta el consentimiento.', 'radar-core' ), '', array( 'response' => 400 ) ); }
	$post_id = wp_insert_post( array( 'post_type' => 'radar_solicitud', 'post_status' => 'private', 'post_title' => sprintf( 'Solicitud %s', wp_date( 'Y-m-d H:i' ) ) ), true );
	if ( is_wp_error( $post_id ) ) { wp_die( esc_html__( 'No se pudo guardar la solicitud.', 'radar-core' ), '', array( 'response' => 500 ) ); }
	update_post_meta( $post_id, 'radar_nombre', $name ); update_post_meta( $post_id, 'radar_contacto', $contact ); update_post_meta( $post_id, 'radar_mensaje', $message ); update_post_meta( $post_id, 'radar_consentimiento', wp_date( DATE_ATOM ) );
	set_transient( $rate_key, 1, 5 * MINUTE_IN_SECONDS );
	wp_safe_redirect( home_url( '/?radar_sent=1#contacto' ) ); exit;
}
add_action( 'admin_post_nopriv_radar_contact', 'radar_core_handle_contact' );
add_action( 'admin_post_radar_contact', 'radar_core_handle_contact' );

/**
 * Devuelve las señales públicas desde el Radar. La respuesta correcta no se
 * almacena para que cada guardado en el panel se vea en la web al recargar.
 * Solo conservamos la última copia válida como respaldo ante una caída breve.
 */
function radar_core_economic_signals( $attributes = array() ) {
	$api_base = untrailingslashit( apply_filters( 'radar_core_api_base', 'https://white-shrew-789999.hostingersite.com' ) );
	$query = array( 'limit' => min( 60, max( 1, absint( $attributes['limit'] ?? 24 ) ) ) );
	if ( ! empty( $attributes['topic'] ) ) { $query['topic'] = sanitize_text_field( $attributes['topic'] ); }
	if ( ! empty( $attributes['featured'] ) && 'true' === $attributes['featured'] ) { $query['featured'] = 'true'; }
	$url = add_query_arg( $query, $api_base . '/api/public/economic-signals' );
	$cache_key = 'radar_economic_' . md5( $url );
	$response = wp_remote_get( $url, array( 'timeout' => 8, 'redirection' => 3, 'headers' => array( 'Accept' => 'application/json' ) ) );
	$payload = null;
	if ( ! is_wp_error( $response ) && 200 === wp_remote_retrieve_response_code( $response ) ) {
		$decoded = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( is_array( $decoded ) && isset( $decoded['signals'] ) && is_array( $decoded['signals'] ) ) {
			$payload = $decoded;
			set_transient( $cache_key, $payload, HOUR_IN_SECONDS );
		}
	}
	if ( null === $payload ) { $payload = get_transient( $cache_key ); }
	return is_array( $payload ) ? $payload : array( 'signals' => array(), 'updatedAt' => '' );
}

function radar_core_topic_slug( $topic ) {
	return sanitize_html_class( remove_accents( strtolower( (string) $topic ) ) );
}

function radar_core_report_fallback( $path ) {
	if ( 'expediente-maduro' !== $path ) { return null; }
	return array(
		'title' => 'Un informe reconstruye la súper red de corrupción y captura del Estado en Venezuela',
		'summary' => 'Diez años de fuentes primarias conectan casos, empresas, instituciones y economías ilícitas para analizar la posición de Nicolás Maduro en una red transnacional.',
		'source' => 'Transparencia Venezuela', 'sector' => 'Riesgo institucional', 'impact' => 'alto',
		'topics' => array( 'Corrupción', 'Política', 'Justicia', 'Riesgo país' ),
		'url' => 'https://expedientemaduro.transparenciave.org/es',
		'reportPath' => 'expediente-maduro', 'reportKicker' => 'RIESGO INSTITUCIONAL · INVESTIGACIÓN',
		'reportPeriod' => '2013–2026 · Datos con corte a agosto de 2026',
		'reportPdfUrl' => 'https://expedientemaduro.transparenciave.org/documents/informe-maduro-red-de-corrupcion-es.pdf',
		'reportDisclaimer' => 'Informe de apoyo analítico elaborado por Transparencia Venezuela. No constituye una determinación de responsabilidad penal, que corresponde exclusivamente a los tribunales competentes.',
		'opportunity' => 'La investigación aporta contexto para evaluar seguridad jurídica, sanciones, recuperación de activos y exposición institucional antes de analizar inversiones o proyectos inmobiliarios.',
		'risk' => 'El estudio es un análisis documental. No constituye una determinación de responsabilidad penal, que corresponde exclusivamente a los tribunales competentes.',
		'reportFigures' => array(
			array( 'value' => '154', 'label' => 'casos de corrupción documentados desde 2013' ),
			array( 'value' => 'USD 36.115 M', 'label' => 'en fondos públicos comprometidos en 96 casos con cifras' ),
			array( 'value' => '26', 'label' => 'países donde existen casos en tribunales' ),
			array( 'value' => '13.521', 'label' => 'actores analizados dentro de la red' ),
		),
		'reportTimeline' => array(
			array( 'date' => '2013', 'title' => 'Inicio del periodo principal', 'body' => 'La investigación concentra el análisis en el periodo 2013–enero de 2026, incorporando antecedentes desde 1999.' ),
			array( 'date' => '10 años', 'title' => 'Construcción de la evidencia', 'body' => 'Gacetas oficiales, sentencias, nombramientos, registros mercantiles y vínculos familiares se ordenaron en tres bases de datos.' ),
			array( 'date' => '110 casos', 'title' => 'Procesos en tribunales', 'body' => 'De los 154 casos documentados, el estudio identifica 110 con actuaciones en instancias judiciales.' ),
			array( 'date' => '2026', 'title' => 'Publicación del informe', 'body' => 'Transparencia Venezuela presenta el análisis de 30.467 relaciones y 13.521 actores, con datos actualizados hasta agosto de 2026.' ),
		),
	);
}

function radar_core_report_signal( $path ) {
	$path = sanitize_title( $path );
	$payload = radar_core_economic_signals( array() );
	foreach ( $payload['signals'] as $signal ) {
		if ( $path === sanitize_title( $signal['reportPath'] ?? '' ) ) { return $signal; }
	}
	return radar_core_report_fallback( $path );
}

function radar_core_report_template( $template ) {
	if ( is_post_type_archive( 'radar_inmueble' ) ) {
		$property_archive_template = plugin_dir_path( __FILE__ ) . 'templates/property-archive.php';
		return file_exists( $property_archive_template ) ? $property_archive_template : $template;
	}
	$path = get_query_var( 'radar_report' );
	if ( $path ) {
		$report_template = plugin_dir_path( __FILE__ ) . 'templates/report.php';
		return file_exists( $report_template ) ? $report_template : $template;
	}
	if ( get_query_var( 'radar_economic_archive' ) ) {
		$archive_template = plugin_dir_path( __FILE__ ) . 'templates/economic-archive.php';
		return file_exists( $archive_template ) ? $archive_template : $template;
	}
	return $template;
}
add_filter( 'template_include', 'radar_core_report_template', 99 );

function radar_core_public_page_title( $parts ) {
	if ( is_post_type_archive( 'radar_inmueble' ) ) {
		$parts['title'] = __( 'Inmuebles', 'radar-core' );
	}
	if ( get_query_var( 'radar_economic_archive' ) ) {
		$parts['title'] = __( 'Actualidad económica', 'radar-core' );
	}
	return $parts;
}
add_filter( 'document_title_parts', 'radar_core_public_page_title' );

function radar_core_economic_shortcode( $attributes ) {
	$attributes = shortcode_atts( array( 'topic' => '', 'featured' => 'false', 'limit' => 6, 'carousel' => 'false' ), $attributes, 'radar_economico' );
	$attributes['limit'] = min( 60, max( 1, absint( $attributes['limit'] ) ) );
	$is_carousel = 'true' === $attributes['carousel'];
	$payload = radar_core_economic_signals( $attributes );
	$signals = $payload['signals'];
	wp_enqueue_style( 'radar-economic', plugin_dir_url( __FILE__ ) . 'assets/economic.css', array(), RADAR_CORE_VERSION );
	wp_enqueue_style( 'radar-economic-dynamic', plugin_dir_url( __FILE__ ) . 'assets/economic-dynamic.css', array( 'radar-economic' ), RADAR_CORE_VERSION );
	wp_enqueue_style( 'radar-economic-report-card', plugin_dir_url( __FILE__ ) . 'assets/economic-report.css', array( 'radar-economic' ), RADAR_CORE_VERSION );
	wp_enqueue_style( 'radar-economic-colors', plugin_dir_url( __FILE__ ) . 'assets/economic-colors.css', array( 'radar-economic' ), '0.3.2' );
	wp_enqueue_script( 'radar-economic', plugin_dir_url( __FILE__ ) . 'assets/economic.js', array(), RADAR_CORE_VERSION, true );
	ob_start();
	if ( empty( $signals ) ) {
		echo '<p class="radar-economic-empty">' . esc_html__( 'El Radar económico se está actualizando. Vuelve a intentarlo en unos minutos.', 'radar-core' ) . '</p>';
		return ob_get_clean();
	}
	$preferred_topics = array( 'Corrupción', 'Política', 'Justicia', 'Riesgo país', 'Empresas', 'LinkedIn', 'Petróleo', 'Electricidad', 'Inversión', 'Tecnología' );
	$topic_counts = array();
	foreach ( $signals as $signal ) {
		foreach ( is_array( $signal['topics'] ?? null ) ? $signal['topics'] : array() as $topic ) {
			$topic = sanitize_text_field( $topic );
			$topic_counts[ $topic ] = ( $topic_counts[ $topic ] ?? 0 ) + 1;
		}
	}
	echo '<div class="radar-economic-tabs" role="group" aria-label="' . esc_attr__( 'Filtrar noticias por tema', 'radar-core' ) . '">';
	echo '<button type="button" class="topic-todo is-active" data-radar-economic-topic="todo">' . esc_html__( 'Todo', 'radar-core' ) . '<span>' . count( $signals ) . '</span></button>';
	foreach ( $preferred_topics as $topic ) {
		if ( empty( $topic_counts[ $topic ] ) ) { continue; }
		echo '<button type="button" class="topic-' . esc_attr( radar_core_topic_slug( $topic ) ) . '" data-radar-economic-topic="' . esc_attr( radar_core_topic_slug( $topic ) ) . '">' . esc_html( $topic ) . '<span>' . absint( $topic_counts[ $topic ] ) . '</span></button>';
	}
	echo '</div>';
	if ( $is_carousel ) { echo '<div class="radar-economic-carousel" data-radar-economic-carousel data-interval="2000">'; }
	echo '<div class="radar-economic-grid' . ( $is_carousel ? ' is-carousel' : '' ) . '">';
	foreach ( $signals as $signal ) {
		$title = sanitize_text_field( $signal['title'] ?? '' );
		$source = sanitize_text_field( $signal['source'] ?? 'Radar Venezuela' );
		$sector = sanitize_text_field( $signal['sector'] ?? 'Actualidad' );
		$topics = array_map( 'sanitize_text_field', is_array( $signal['topics'] ?? null ) ? $signal['topics'] : array() );
		$topic_slugs = array_map( 'radar_core_topic_slug', $topics );
		$is_report = ! empty( $signal['reportPath'] );
		$card_url = $is_report ? home_url( '/informes/' . sanitize_title( $signal['reportPath'] ) . '/' ) : ( $signal['url'] ?? '' );
		$link_target = $is_report ? '' : ' target="_blank" rel="noopener noreferrer"';
		?>
		<?php $palette = absint( crc32( (string) ( $signal['id'] ?? $title ) ) ) % 6; ?>
		<article class="radar-economic-card news-palette-<?php echo absint( $palette ); ?><?php echo ! empty( $signal['featured'] ) ? ' is-featured' : ''; ?><?php echo $is_report ? ' is-report' : ''; ?>" data-radar-economic-topics="<?php echo esc_attr( implode( ' ', $topic_slugs ) ); ?>">
			<a class="radar-economic-image is-loading" href="<?php echo esc_url( $card_url ); ?>"<?php echo $link_target; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
				<span class="radar-economic-fallback" aria-hidden="true"><b><?php echo esc_html( strtoupper( mb_substr( $source, 0, 1 ) ) ); ?></b><small><?php echo esc_html( $sector ); ?></small><em><?php echo esc_html( $source ); ?></em></span>
				<img src="<?php echo esc_url( $signal['imageUrl'] ?? '' ); ?>" alt="<?php echo esc_attr( $title ); ?>" loading="lazy" decoding="async">
				<span class="radar-economic-source"><?php echo esc_html( $source ); ?></span>
			</a>
			<div class="radar-economic-copy"><div class="radar-economic-meta"><span><?php echo esc_html( $sector ); ?></span><time datetime="<?php echo esc_attr( $signal['date'] ?? '' ); ?>"><?php echo esc_html( $signal['date'] ?? '' ); ?></time></div><h3><a href="<?php echo esc_url( $card_url ); ?>"<?php echo $link_target; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo esc_html( $title ); ?></a></h3><p><?php echo esc_html( $signal['summary'] ?? '' ); ?></p>
			<?php if ( $is_report && ! empty( $signal['reportFigures'] ) ) : ?><div class="radar-report-mini-stats"><?php foreach ( array_slice( $signal['reportFigures'], 0, 4 ) as $figure ) : ?><span><strong><?php echo esc_html( $figure['value'] ?? '' ); ?></strong><small><?php echo esc_html( $figure['label'] ?? '' ); ?></small></span><?php endforeach; ?></div><?php endif; ?>
			<?php if ( ! empty( $signal['opportunity'] ) ) : ?><div class="radar-economic-opportunity"><strong><?php esc_html_e( 'Por qué importa', 'radar-core' ); ?></strong><p><?php echo esc_html( $signal['opportunity'] ); ?></p></div><?php endif; ?>
			<footer><div><?php foreach ( array_slice( $topics, 0, 3 ) as $topic ) { echo '<span class="topic-' . esc_attr( radar_core_topic_slug( $topic ) ) . '">' . esc_html( $topic ) . '</span>'; } ?></div><a href="<?php echo esc_url( $card_url ); ?>"<?php echo $link_target; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo $is_report ? esc_html__( 'Explorar informe', 'radar-core' ) : esc_html__( 'Leer fuente', 'radar-core' ); ?> →</a></footer></div>
		</article>
		<?php
	}
	echo '</div>';
	if ( $is_carousel ) { echo '<div class="radar-economic-carousel-controls"><button type="button" data-carousel-prev aria-label="' . esc_attr__( 'Noticia anterior', 'radar-core' ) . '">←</button><div class="radar-economic-carousel-status" data-carousel-status aria-live="polite"></div><button type="button" data-carousel-toggle aria-label="' . esc_attr__( 'Pausar carrusel', 'radar-core' ) . '">Ⅱ</button><button type="button" data-carousel-next aria-label="' . esc_attr__( 'Noticia siguiente', 'radar-core' ) . '">→</button></div></div>'; }
	if ( ! empty( $payload['updatedAt'] ) ) { echo '<p class="radar-economic-updated">' . esc_html__( 'Última edición del Radar:', 'radar-core' ) . ' ' . esc_html( wp_date( 'd/m/Y H:i', strtotime( $payload['updatedAt'] ) ) ) . '</p>'; }
	return ob_get_clean();
}
add_shortcode( 'radar_economico', 'radar_core_economic_shortcode' );

