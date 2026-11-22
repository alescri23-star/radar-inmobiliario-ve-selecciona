<?php
/** Página pública con todas las señales económicas. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

$hero_payload = radar_core_economic_signals( array( 'limit' => 60 ) );
$hero_signals = is_array( $hero_payload['signals'] ?? null ) ? $hero_payload['signals'] : array();
$hero_scenes = array();
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

foreach ( $hero_signals as $signal ) {
	if ( count( $hero_scenes ) >= 5 || empty( $signal['imageUrl'] ) ) { continue; }
	$scene_key = radar_core_topic_slug( sanitize_text_field( $signal['sector'] ?? 'Economía' ) );
	if ( in_array( $scene_key, wp_list_pluck( $hero_scenes, 'key' ), true ) ) { continue; }
	$signal['key'] = $scene_key ?: 'economia';
	$hero_scenes[] = $signal;
}
foreach ( $hero_signals as $signal ) {
	if ( count( $hero_scenes ) >= 5 || empty( $signal['imageUrl'] ) ) { continue; }
	$scene_id = (string) ( $signal['id'] ?? $signal['imageUrl'] );
	if ( in_array( $scene_id, array_map( static function ( $scene ) { return (string) ( $scene['id'] ?? $scene['imageUrl'] ); }, $hero_scenes ), true ) ) { continue; }
	$signal['key'] = radar_core_topic_slug( sanitize_text_field( $signal['sector'] ?? 'Economía' ) ) ?: 'economia';
	$hero_scenes[] = $signal;
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
		<div class="radar-market-visual" data-radar-market-visual data-interval="6000" aria-label="<?php esc_attr_e( 'Panorama económico destacado', 'radar-core' ); ?>">
			<div class="radar-market-orbit" aria-hidden="true"><i></i><i></i><i></i></div>
			<div class="radar-market-scenes">
				<?php foreach ( $hero_scenes as $index => $scene ) :
					$title = sanitize_text_field( $scene['title'] ?? '' );
					$source = sanitize_text_field( $scene['source'] ?? 'Radar Venezuela' );
					$sector = sanitize_text_field( $scene['sector'] ?? 'Economía' );
					$url = ! empty( $scene['reportPath'] ) ? home_url( '/informes/' . sanitize_title( $scene['reportPath'] ) . '/' ) : ( $scene['url'] ?? '' );
				?>
				<article class="radar-market-scene<?php echo 0 === $index ? ' is-active' : ''; ?>" data-market-scene aria-hidden="<?php echo 0 === $index ? 'false' : 'true'; ?>">
					<img src="<?php echo esc_url( $scene['imageUrl'] ); ?>" alt="" loading="<?php echo 0 === $index ? 'eager' : 'lazy'; ?>" decoding="async">
					<div class="radar-market-scene-copy">
						<span><?php echo esc_html( $sector ); ?></span>
						<h2><?php echo esc_html( $title ); ?></h2>
						<a href="<?php echo esc_url( $url ); ?>"<?php echo empty( $scene['reportPath'] ) ? ' target="_blank" rel="noopener noreferrer"' : ''; ?>><?php echo esc_html( $source ); ?> →</a>
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
