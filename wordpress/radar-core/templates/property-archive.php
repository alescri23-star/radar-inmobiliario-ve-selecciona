<?php
/** Catálogo público sincronizado con el inventario del Radar. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

// Renderizar antes de la cabecera permite cargar los estilos del portal en el <head>.
$portal = do_shortcode( '[radar_portal]' );
wp_enqueue_style( 'radar-property-archive', RADAR_CORE_URL . 'assets/property-archive.css', array( 'radar-public-portal' ), RADAR_CORE_VERSION );

get_header();
?>
<main id="contenido" class="radar-property-archive">
	<header class="radar-market-intelligence" data-market-intelligence>
		<div class="radar-intelligence-heading">
			<div><p><?php esc_html_e( 'INTELIGENCIA COMERCIAL · MERCADO INMOBILIARIO', 'radar-core' ); ?></p><h1><?php esc_html_e( 'Pulso del mercado', 'radar-core' ); ?></h1><span><?php esc_html_e( 'Indicadores calculados con los inmuebles activos del Radar.', 'radar-core' ); ?></span></div>
			<div class="radar-intelligence-status"><i></i><span data-intel-updated><?php esc_html_e( 'Sincronizando inventario…', 'radar-core' ); ?></span></div>
		</div>
		<div class="radar-intelligence-metrics" aria-label="<?php esc_attr_e( 'Indicadores comerciales', 'radar-core' ); ?>">
			<article><span><?php esc_html_e( 'Inmuebles activos', 'radar-core' ); ?></span><strong data-intel-total>—</strong><small data-intel-mapped><?php esc_html_e( 'Calculando ubicaciones', 'radar-core' ); ?></small></article>
			<article><span><?php esc_html_e( 'Precio típico de venta', 'radar-core' ); ?></span><strong data-intel-sale>—</strong><small><?php esc_html_e( 'Mediana en USD', 'radar-core' ); ?></small></article>
			<article><span><?php esc_html_e( 'Alquiler típico', 'radar-core' ); ?></span><strong data-intel-rent>—</strong><small><?php esc_html_e( 'Mediana mensual', 'radar-core' ); ?></small></article>
			<article><span><?php esc_html_e( 'Precio típico por m²', 'radar-core' ); ?></span><strong data-intel-unit>—</strong><small><?php esc_html_e( 'Ventas con superficie', 'radar-core' ); ?></small></article>
			<article class="is-new"><span><?php esc_html_e( 'Nuevos esta semana', 'radar-core' ); ?></span><strong data-intel-new>—</strong><small><?php esc_html_e( 'Primera detección', 'radar-core' ); ?></small></article>
			<article class="is-drop"><span><?php esc_html_e( 'Bajadas de precio', 'radar-core' ); ?></span><strong data-intel-drops>—</strong><small><?php esc_html_e( 'Cambios detectados', 'radar-core' ); ?></small></article>
		</div>
		<div class="radar-intelligence-signal">
			<div><span>✦ <?php esc_html_e( 'SEÑAL DEL RADAR', 'radar-core' ); ?></span><strong data-intel-insight><?php esc_html_e( 'Analizando oportunidades comparables…', 'radar-core' ); ?></strong></div>
			<nav aria-label="<?php esc_attr_e( 'Filtros de inteligencia comercial', 'radar-core' ); ?>"><button type="button" data-market-filter="opportunities"><?php esc_html_e( 'Ver oportunidades', 'radar-core' ); ?></button><button type="button" data-market-filter="new"><?php esc_html_e( 'Nuevos', 'radar-core' ); ?></button><button type="button" data-market-filter="drops"><?php esc_html_e( 'Bajadas', 'radar-core' ); ?></button></nav>
		</div>
	</header>
	<section class="radar-property-archive-catalog" aria-label="<?php esc_attr_e( 'Catálogo de inmuebles', 'radar-core' ); ?>">
		<?php echo $portal; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	</section>
</main>
<?php get_footer(); ?>
