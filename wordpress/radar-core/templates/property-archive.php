<?php
/** Catálogo público sincronizado con el inventario del Radar. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

// Renderizar antes de la cabecera permite cargar los estilos del portal en el <head>.
$portal = do_shortcode( '[radar_portal]' );
wp_enqueue_style( 'radar-property-archive', RADAR_CORE_URL . 'assets/property-archive.css', array( 'radar-public-portal' ), RADAR_CORE_VERSION );

get_header();
?>
<main id="contenido" class="radar-property-archive">
	<header class="radar-property-archive-hero">
		<div>
			<p><?php esc_html_e( 'RADAR INMOBILIARIO · INVENTARIO ACTUALIZADO', 'radar-core' ); ?></p>
			<h1><?php esc_html_e( 'Inmuebles en Venezuela', 'radar-core' ); ?></h1>
			<span><?php esc_html_e( 'Explora todos los inmuebles disponibles en nuestra base de datos. Filtra la lista o localízalos directamente en el mapa.', 'radar-core' ); ?></span>
		</div>
		<a href="<?php echo esc_url( home_url( '/#contacto' ) ); ?>"><?php esc_html_e( 'Solicitar una búsqueda', 'radar-core' ); ?> →</a>
	</header>
	<section class="radar-property-archive-catalog" aria-label="<?php esc_attr_e( 'Catálogo de inmuebles', 'radar-core' ); ?>">
		<?php echo $portal; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</section>
</main>
<?php get_footer(); ?>
