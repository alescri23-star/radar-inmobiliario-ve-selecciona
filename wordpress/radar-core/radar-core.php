<?php
/**
 * Plugin Name: Radar Venezuela Core
 * Description: Inmuebles publicados y solicitudes privadas para Radar Venezuela.
 * Version: 0.1.0
 * Requires at least: 6.5
 * Requires PHP: 8.1
 * Author: Radar Venezuela
 * Text Domain: radar-core
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

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

function radar_core_activate() {
	radar_core_register_content();
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

