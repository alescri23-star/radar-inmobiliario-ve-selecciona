<?php
/** Página pública con todas las señales económicas. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

get_header();
?>
<section class="radar-news-page">
	<header class="radar-news-hero">
		<div>
			<a class="radar-news-back" href="<?php echo esc_url( home_url( '/#radar-economico' ) ); ?>">← <?php esc_html_e( 'Volver a la portada', 'radar-core' ); ?></a>
			<p class="eyebrow">RADAR ECONÓMICO</p>
			<h1><?php esc_html_e( 'Actualidad y oportunidades en Venezuela', 'radar-core' ); ?></h1>
			<p><?php esc_html_e( 'Noticias económicas, iniciativas empresariales y cambios de entorno reunidos en un solo lugar. Usa las categorías para ir directamente al tema que te interesa.', 'radar-core' ); ?></p>
		</div>
	</header>
	<div class="radar-news-list">
		<?php echo do_shortcode( '[radar_economico limit="48"]' ); ?>
	</div>
</section>
<?php get_footer(); ?>
