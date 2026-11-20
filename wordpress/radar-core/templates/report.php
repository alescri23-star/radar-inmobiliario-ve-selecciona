<?php
/** Página pública de un informe especial del Radar. */
if ( ! defined( 'ABSPATH' ) ) { exit; }
$signal = radar_core_report_signal( get_query_var( 'radar_report' ) );
if ( ! $signal ) {
	status_header( 404 ); nocache_headers(); get_header();
	echo '<main class="radar-report-not-found"><h1>' . esc_html__( 'Informe no encontrado', 'radar-core' ) . '</h1><a href="' . esc_url( home_url( '/' ) ) . '">' . esc_html__( 'Volver al inicio', 'radar-core' ) . '</a></main>';
	get_footer(); return;
}
wp_enqueue_style( 'radar-report', RADAR_CORE_URL . 'assets/report.css', array(), RADAR_CORE_VERSION );
wp_enqueue_style( 'radar-report-count', RADAR_CORE_URL . 'assets/report-count.css', array( 'radar-report' ), RADAR_CORE_VERSION );
wp_enqueue_script( 'radar-report', RADAR_CORE_URL . 'assets/report.js', array(), RADAR_CORE_VERSION, true );
$figures = is_array( $signal['reportFigures'] ?? null ) ? $signal['reportFigures'] : array();
$timeline = is_array( $signal['reportTimeline'] ?? null ) ? $signal['reportTimeline'] : array();
$topics = is_array( $signal['topics'] ?? null ) ? $signal['topics'] : array();
get_header();
?>
<main class="radar-report-page">
	<section class="radar-report-hero">
		<div class="radar-report-hero-copy">
			<a class="radar-report-back" href="<?php echo esc_url( home_url( '/#radar-economico' ) ); ?>">← <?php esc_html_e( 'Volver al Radar económico', 'radar-core' ); ?></a>
			<p class="radar-report-kicker"><?php echo esc_html( $signal['reportKicker'] ?? 'INFORME ESPECIAL' ); ?></p>
			<h1><?php echo esc_html( $signal['title'] ?? '' ); ?></h1>
			<p class="radar-report-lead"><?php echo esc_html( $signal['summary'] ?? '' ); ?></p>
			<div class="radar-report-meta"><span><?php echo esc_html( $signal['source'] ?? '' ); ?></span><span><?php echo esc_html( $signal['reportPeriod'] ?? '' ); ?></span></div>
			<div class="radar-report-actions"><a class="radar-report-primary" href="#hallazgos"><?php esc_html_e( 'Explorar los datos', 'radar-core' ); ?></a><a href="<?php echo esc_url( $signal['reportPdfUrl'] ?? '' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Descargar informe original', 'radar-core' ); ?> ↗</a></div>
		</div>
		<figure class="radar-report-network" aria-label="Representación conceptual de las relaciones estudiadas en el informe">
			<div class="network-orbit orbit-one"></div><div class="network-orbit orbit-two"></div><div class="network-orbit orbit-three"></div>
			<span class="network-core">Súper red<small>30.467 relaciones</small></span>
			<span class="network-node node-state">Estado</span><span class="network-node node-pdvsa">PDVSA</span><span class="network-node node-business">Empresas</span><span class="network-node node-family">Vínculos familiares</span><span class="network-node node-illicit">Economías ilícitas</span>
			<figcaption>Visualización conceptual de las categorías analizadas; no atribuye responsabilidad penal.</figcaption>
		</figure>
	</section>
	<section id="hallazgos" class="radar-report-stats" aria-label="Cifras clave del informe"><?php foreach ( $figures as $figure ) : ?><article><strong class="radar-report-count" data-report-value="<?php echo esc_attr( $figure['value'] ?? '' ); ?>" aria-label="<?php echo esc_attr( $figure['value'] ?? '' ); ?>"><?php echo esc_html( $figure['value'] ?? '' ); ?></strong><p><?php echo esc_html( $figure['label'] ?? '' ); ?></p></article><?php endforeach; ?></section>
	<section class="radar-report-section radar-report-evidence">
		<header><p>QUÉ ANALIZA</p><h2>De la evidencia documental a una red de relaciones</h2><span>El estudio organiza fuentes primarias en tres bases de datos para observar conexiones, mecanismos y patrones. Una relación en la base no equivale por sí sola a responsabilidad penal.</span></header>
		<div class="radar-report-evidence-grid"><article><span>01</span><h3>Fuentes primarias</h3><p>Gacetas oficiales, sentencias, nombramientos, registros mercantiles y vínculos familiares.</p></article><article><span>02</span><h3>Súper red</h3><p>30.467 relaciones entre 13.521 actores identificados durante el periodo analizado.</p></article><article><span>03</span><h3>Empresas</h3><p>865 empresas incorporadas a la base analítica presentada por la organización.</p></article><article><span>04</span><h3>Casos</h3><p>154 casos documentados, de los cuales el informe señala 110 en tribunales.</p></article></div>
	</section>
	<section class="radar-report-section radar-report-timeline"><header><p>RECORRIDO DOCUMENTAL</p><h2>Una investigación construida durante una década</h2></header><div class="radar-report-timeline-list"><?php foreach ( $timeline as $item ) : ?><article><time><?php echo esc_html( $item['date'] ?? '' ); ?></time><div><h3><?php echo esc_html( $item['title'] ?? '' ); ?></h3><p><?php echo esc_html( $item['body'] ?? '' ); ?></p></div></article><?php endforeach; ?></div></section>
	<section class="radar-report-section radar-report-impact"><div><p>LECTURA PARA RADAR</p><h2>¿Por qué importa para la economía y la inversión?</h2><p><?php echo esc_html( $signal['opportunity'] ?? '' ); ?></p><div class="radar-report-topics"><?php foreach ( $topics as $topic ) : ?><span><?php echo esc_html( $topic ); ?></span><?php endforeach; ?></div></div><aside><strong>Riesgo y comprobaciones</strong><p><?php echo esc_html( $signal['risk'] ?? '' ); ?></p></aside></section>
	<section class="radar-report-source"><div><p>FUENTE PRINCIPAL</p><h2><?php echo esc_html( $signal['source'] ?? '' ); ?></h2><p><?php echo esc_html( $signal['reportDisclaimer'] ?? '' ); ?></p></div><div class="radar-report-actions"><a class="radar-report-primary" href="<?php echo esc_url( $signal['url'] ?? '' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Abrir investigación interactiva', 'radar-core' ); ?> ↗</a><a href="<?php echo esc_url( $signal['reportPdfUrl'] ?? '' ); ?>" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Descargar PDF', 'radar-core' ); ?> ↗</a></div></section>
</main>
<?php get_footer(); ?>
