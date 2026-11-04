<?php /** Archivo público de inmuebles. @package Radar_Venezuela */ get_header(); ?>
<section class="section section-soft">
	<header class="archive-header"><p class="eyebrow"><?php esc_html_e( 'RADAR INMOBILIARIO · BARQUISIMETO', 'radar-venezuela' ); ?></p><h1><?php esc_html_e( 'Inmuebles publicados', 'radar-venezuela' ); ?></h1><p><?php esc_html_e( 'Información orientativa. Confirma disponibilidad, precio y ubicación antes de decidir.', 'radar-venezuela' ); ?></p></header>
	<?php echo do_shortcode( '[radar_inmuebles limite="12" filtros="true"]' ); ?>
</section>
<?php get_footer(); ?>

