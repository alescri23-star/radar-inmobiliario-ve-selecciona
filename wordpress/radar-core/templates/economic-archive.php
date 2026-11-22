<?php
/** Página pública con todas las señales económicas. */
if ( ! defined( 'ABSPATH' ) ) { exit; }

$hero_payload = radar_core_economic_signals( array( 'limit' => 60 ) );
$hero_signals = is_array( $hero_payload['signals'] ?? null ) ? $hero_payload['signals'] : array();
$hero_scenes = array(
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-caracas.jpg', 'sector' => __( 'Caracas · Distrito Capital', 'radar-core' ), 'title' => __( 'El valle urbano al pie del Ávila', 'radar-core' ), 'summary' => __( 'Centro financiero, empresarial y de servicios del país.', 'radar-core' ), 'credit' => 'Gabriela Camaton', 'license' => 'CC BY 2.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:Caracas_panorama.jpg' ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-barquisimeto.jpg', 'sector' => __( 'Barquisimeto · Lara', 'radar-core' ), 'title' => __( 'Conexión comercial y productiva', 'radar-core' ), 'summary' => __( 'Un nodo estratégico para distribución, servicios e inversión regional.', 'radar-core' ), 'credit' => 'Wilfredor', 'license' => 'CC BY-SA 3.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:Vista_Panoramica_de_Barquisimeto.jpg' ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-la-guaira.jpg', 'sector' => __( 'La Guaira · Litoral Central', 'radar-core' ), 'title' => __( 'Mar, puerto y acceso a la capital', 'radar-core' ), 'summary' => __( 'Costa cercana a Caracas con potencial turístico, logístico y residencial.', 'radar-core' ), 'credit' => 'Karla García Fernández', 'license' => 'CC BY 2.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:La_Guaira.jpg' ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-los-roques.jpg', 'sector' => __( 'Los Roques · Dependencias Federales', 'radar-core' ), 'title' => __( 'Turismo de naturaleza en el Caribe', 'radar-core' ), 'summary' => __( 'Un archipiélago protegido con oportunidades para experiencias sostenibles de alto valor.', 'radar-core' ), 'credit' => 'JavierEVidalM', 'license' => 'CC BY-SA 3.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:Vista_a%C3%A9rea_de_Los_Roques_-_Venezuela..JPG' ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-morrocoy.jpg', 'sector' => __( 'Morrocoy · Falcón', 'radar-core' ), 'title' => __( 'Cayos y servicios turísticos', 'radar-core' ), 'summary' => __( 'Playas, navegación y hospitalidad conectadas con Tucacas y Chichiriviche.', 'radar-core' ), 'credit' => 'José ILIDIO Spinola', 'license' => 'CC BY-SA 2.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:BeachMorrocoy.jpg' ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-mochima.jpg', 'sector' => __( 'Mochima · Sucre y Anzoátegui', 'radar-core' ), 'title' => __( 'Bahías entre montañas y mar', 'radar-core' ), 'summary' => __( 'Turismo costero, rutas marítimas y comunidades con identidad propia.', 'radar-core' ), 'credit' => 'Paolo Costa Baldi', 'license' => 'CC BY-SA 3.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:Venezuela_-_Mochima_-_Playa_Manzanilla.jpg' ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-choroni.jpg', 'sector' => __( 'Choroní · Aragua', 'radar-core' ), 'title' => __( 'Costa, selva y patrimonio local', 'radar-core' ), 'summary' => __( 'Un destino conectado con el parque Henri Pittier y el turismo de pequeña escala.', 'radar-core' ), 'credit' => 'Matthias Scholz', 'license' => 'CC BY-SA 3.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:Beach_choroni_venezuela.jpg' ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-margarita.jpg', 'sector' => __( 'Margarita · Nueva Esparta', 'radar-core' ), 'title' => __( 'Turismo e inversión insular', 'radar-core' ), 'summary' => __( 'Hospitalidad, gastronomía, comercio y desarrollo local frente al Caribe.', 'radar-core' ), 'credit' => 'Wilfredor', 'license' => 'CC BY-SA 3.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:Islet,_Margarita_island,_Venezuela.jpg' ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-puerto-la-cruz.jpg', 'sector' => __( 'Puerto La Cruz · Anzoátegui', 'radar-core' ), 'title' => __( 'Marina, puertos y puerta a las islas', 'radar-core' ), 'summary' => __( 'Actividad turística, náutica, energética y logística en el oriente venezolano.', 'radar-core' ), 'credit' => 'Valerysabel', 'license' => 'CC BY-SA 3.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:Veleros_en_el_puerto_(pto_la_cruz).jpg' ),
	array( 'imageUrl' => RADAR_CORE_URL . 'assets/photo-real-canaima.jpg', 'sector' => __( 'Canaima · Bolívar', 'radar-core' ), 'title' => __( 'Naturaleza que proyecta a Venezuela', 'radar-core' ), 'summary' => __( 'Paisaje, cultura y turismo sostenible en uno de los grandes destinos del país.', 'radar-core' ), 'credit' => 'NileGuide.com', 'license' => 'CC BY 2.0', 'sourceUrl' => 'https://commons.wikimedia.org/wiki/File:Canaima,_Venezuela.jpg' ),
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
		<div class="radar-market-visual" data-radar-market-visual data-interval="6500" aria-label="<?php esc_attr_e( 'Fotografías reales de ciudades y destinos de Venezuela', 'radar-core' ); ?>">
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
						<p class="radar-market-credit"><?php esc_html_e( 'Foto:', 'radar-core' ); ?> <a href="<?php echo esc_url( $scene['sourceUrl'] ); ?>" target="_blank" rel="noopener noreferrer"><?php echo esc_html( $scene['credit'] ); ?></a> · <?php echo esc_html( $scene['license'] ); ?></p>
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
