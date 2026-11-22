<?php
/** Página pública con todas las señales económicas. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

$hero_payload = radar_core_economic_signals( array( 'limit' => 60 ) );
$hero_signals = is_array( $hero_payload['signals'] ?? null ) ? $hero_payload['signals'] : array();
$hero_scenes = array(
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/hero-city-caracas-v1.jpg', 'sector' => __( 'Caracas', 'radar-core' ), 'title' => __( 'Centro financiero y empresarial', 'radar-core' ), 'summary' => __( 'Capital, servicios y decisiones que conectan a Venezuela con nuevos mercados.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/hero-city-maracaibo-v1.jpg', 'sector' => __( 'Maracaibo', 'radar-core' ), 'title' => __( 'Energía y economía del occidente', 'radar-core' ), 'summary' => __( 'Una ciudad vinculada al lago, la industria y la actividad petrolera.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/hero-city-valencia-v1.jpg', 'sector' => __( 'Valencia', 'radar-core' ), 'title' => __( 'Industria, comercio y logística', 'radar-core' ), 'summary' => __( 'Uno de los principales corredores productivos y empresariales del país.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/hero-city-barquisimeto-v1.jpg', 'sector' => __( 'Barquisimeto', 'radar-core' ), 'title' => __( 'Conexión comercial y productiva', 'radar-core' ), 'summary' => __( 'Un punto estratégico para servicios, distribución e inversión regional.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/hero-city-puerto-la-cruz-v1.jpg', 'sector' => __( 'Puerto La Cruz', 'radar-core' ), 'title' => __( 'Puertos, turismo y energía', 'radar-core' ), 'summary' => __( 'Actividad costera, logística y oportunidades alrededor del Caribe.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/hero-city-margarita-v1.jpg', 'sector' => __( 'Margarita', 'radar-core' ), 'title' => __( 'Turismo e inversión insular', 'radar-core' ), 'summary' => __( 'Hospitalidad, comercio y desarrollo local frente al mar Caribe.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/banner-mercados.jpg', 'sector' => __( 'Mercados e inversión', 'radar-core' ), 'title' => __( 'El pulso financiero que mueve nuevas decisiones', 'radar-core' ), 'summary' => __( 'Capital, crédito, inflación y actividad empresarial vistos con contexto venezolano.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/banner-energia.jpg', 'sector' => __( 'Petróleo y energía', 'radar-core' ), 'title' => __( 'La energía sigue marcando el ritmo de la economía', 'radar-core' ), 'summary' => __( 'Producción, electricidad, licencias y proyectos con impacto territorial.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/banner-infraestructura.jpg', 'sector' => __( 'Infraestructura y logística', 'radar-core' ), 'title' => __( 'Donde aparecen obras, aparecen nuevas oportunidades', 'radar-core' ), 'summary' => __( 'Construcción, transporte, puertos y suelo productivo conectados en el Radar.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/banner-tecnologia.jpg', 'sector' => __( 'Empresa y tecnología', 'radar-core' ), 'title' => __( 'Innovación venezolana con vocación de crecimiento', 'radar-core' ), 'summary' => __( 'Emprendimiento, telecomunicaciones y soluciones para una economía que cambia.', 'radar-core' ) ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/banner-territorio.jpg', 'sector' => __( 'Territorio productivo', 'radar-core' ), 'title' => __( 'Cada región cuenta una historia económica diferente', 'radar-core' ), 'summary' => __( 'Turismo, agricultura y desarrollo local observados desde todo el país.', 'radar-core' ) ),
);
$hero_sources = array();
$hero_topics = array();

foreach ( $hero_signals as $signal ) {
	$source = sanitize_text_field( $signal['source'] ?? 'Radar Venezuela' );
	$sector = sanitize_text_field( $signal['sector'] ?? 'Economía' );
	foreach ( is_array( $signal['topics'] ?? null ) ? $signal['topics'] : array() as $topic ) {
		$topic = sanitize_text_field( $topic );
		if ( $topic ) { $hero_topics[ $topic ] = ( $hero_topics[ $topic ] ?? 0 ) + 1; }
	}
	if ( $source ) { $hero_sources[ $source ] = true; }
}

get_header();
?>
<section class="radar-news-page">
	<header class="radar-news-hero">
		<div class="radar-news-hero-copy">
			<a class="radar-news-back" href="<?php echo esc_url( home_url( '/#radar-economico' ) ); ?>">← <?php esc_html_e( 'Volver a la portada', 'radar-core' ); ?></a>
			<p class="eyebrow">RADAR ECONÓMICO</p>
			<h1><?php esc_html_e( 'Actualidad y oportunidades en Venezuela', 'radar-core' ); ?></h1>
			<p><?php esc_html_e( 'Noticias económicas, iniciativas empresariales y cambios de entorno reunidos en un solo lugar. Usa las categorías para ir directamente al tema que te interesa.', 'radar-core' ); ?></p>
			<div class="radar-news-hero-actions">
				<a class="radar-news-primary" href="#radar-actualidad-listado"><?php esc_html_e( 'Explorar noticias', 'radar-core' ); ?> ↓</a>
				<a class="radar-news-secondary" href="<?php echo esc_url( home_url( '/informes/expediente-maduro/' ) ); ?>"><?php esc_html_e( 'Ver investigaciones', 'radar-core' ); ?> →</a>
			</div>
			<div class="radar-news-proof" aria-label="<?php esc_attr_e( 'Cobertura actual del Radar', 'radar-core' ); ?>">
				<span><strong><?php echo absint( count( $hero_signals ) ); ?></strong><?php esc_html_e( 'señales', 'radar-core' ); ?></span>
				<span><strong><?php echo absint( count( $hero_sources ) ); ?></strong><?php esc_html_e( 'fuentes', 'radar-core' ); ?></span>
				<span><strong><?php echo absint( count( $hero_topics ) ); ?></strong><?php esc_html_e( 'temas', 'radar-core' ); ?></span>
			</div>
		</div>
		<?php if ( ! empty( $hero_scenes ) ) : ?>
		<div class="radar-market-visual" data-radar-market-visual data-interval="6500" aria-label="<?php esc_attr_e( 'Panorama económico y urbano de Venezuela', 'radar-core' ); ?>">
			<div class="radar-market-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
			<div class="radar-market-scenes">
				<?php foreach ( $hero_scenes as $index => $scene ) :
					$title = sanitize_text_field( $scene['title'] );
					$sector = sanitize_text_field( $scene['sector'] );
				?>
				<article class="radar-market-scene<?php echo 0 === $index ? ' is-active' : ''; ?>" data-market-scene aria-hidden="<?php echo 0 === $index ? 'false' : 'true'; ?>">
					<img src="<?php echo esc_url( $scene['imageUrl'] ); ?>" alt="" loading="<?php echo 0 === $index ? 'eager' : 'lazy'; ?>" decoding="async">
					<div class="radar-market-scene-copy">
						<span><?php echo esc_html( $sector ); ?></span>
						<h2><?php echo esc_html( $title ); ?></h2>
						<p><?php echo esc_html( $scene['summary'] ); ?></p>
					</div>
				</article>
				<?php endforeach; ?>
			</div>
			<div class="radar-market-pulse" aria-hidden="true">
				<span><b><?php echo absint( count( $hero_signals ) ); ?></b><?php esc_html_e( 'señales activas', 'radar-core' ); ?></span>
				<span><b><?php echo absint( count( $hero_sources ) ); ?></b><?php esc_html_e( 'fuentes enlazadas', 'radar-core' ); ?></span>
			</div>
			<div class="radar-market-controls">
				<button type="button" data-market-prev aria-label="<?php esc_attr_e( 'Escena anterior', 'radar-core' ); ?>">←</button>
				<div data-market-dots aria-label="<?php esc_attr_e( 'Escenas', 'radar-core' ); ?>"><?php foreach ( $hero_scenes as $index => $_scene ) : ?><button type="button" data-market-dot="<?php echo absint( $index ); ?>" class="<?php echo 0 === $index ? 'is-active' : ''; ?>" aria-label="<?php echo esc_attr( sprintf( __( 'Ver escena %d', 'radar-core' ), $index + 1 ) ); ?>"></button><?php endforeach; ?></div>
				<button type="button" data-market-toggle aria-label="<?php esc_attr_e( 'Pausar escenas', 'radar-core' ); ?>">Ⅱ</button>
				<button type="button" data-market-next aria-label="<?php esc_attr_e( 'Escena siguiente', 'radar-core' ); ?>">→</button>
			</div>
			<p class="radar-market-freshness"><?php esc_html_e( 'Selección editorial · Datos del Radar', 'radar-core' ); ?><?php if ( ! empty( $hero_payload['updatedAt'] ) ) : ?> · <?php echo esc_html( wp_date( 'd/m/Y H:i', strtotime( $hero_payload['updatedAt'] ) ) ); ?><?php endif; ?></p>
		</div>
		<?php endif; ?>
	</header>
	<div class="radar-news-list" id="radar-actualidad-listado">
		<?php echo do_shortcode( '[radar_economico limit="48"]' ); ?>
	</div>
</section>
<?php get_footer(); ?>
