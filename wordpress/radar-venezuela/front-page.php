<?php
/** Página principal pública. @package Radar_Venezuela */
get_header();
?>
<section class="hero">
	<div class="hero-copy">
		<p class="eyebrow"><?php esc_html_e( 'RADAR INMOBILIARIO · BARQUISIMETO', 'radar-venezuela' ); ?></p>
		<h1><?php esc_html_e( 'Encuentra oportunidades con una visión más completa.', 'radar-venezuela' ); ?></h1>
		<p class="hero-lead"><?php esc_html_e( 'Explora inmuebles publicados, compara sus datos y solicita orientación para estimar compra y reforma.', 'radar-venezuela' ); ?></p>
		<?php echo do_shortcode( '[radar_ia]' ); ?>
		<div class="hero-actions">
			<a class="button" href="#inmuebles"><?php esc_html_e( 'Explorar inmuebles', 'radar-venezuela' ); ?></a>
			<a class="text-link" href="#como-funciona"><?php esc_html_e( 'Conocer el proceso', 'radar-venezuela' ); ?> →</a>
		</div>
		<ul class="trust-list"><li><?php esc_html_e( 'Datos identificados por fuente', 'radar-venezuela' ); ?></li><li><?php esc_html_e( 'Estimaciones con supuestos visibles', 'radar-venezuela' ); ?></li><li><?php esc_html_e( 'Privacidad desde el diseño', 'radar-venezuela' ); ?></li></ul>
	</div>
	<div class="hero-places" role="region" aria-roledescription="carrusel" aria-label="Paisajes de Venezuela" data-hero-places>
		<div class="hero-places-track">
			<article class="hero-place is-active" data-place-slide aria-hidden="false">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/places/salto-angel.jpg' ); ?>" alt="Salto Ángel descendiendo desde el Auyán-tepui en Canaima" width="1440" height="957" fetchpriority="high">
				<div class="hero-place-shade"></div><div class="hero-place-copy"><span>01 · ESTADO BOLÍVAR</span><strong>Salto Ángel · Canaima</strong><small><?php esc_html_e( 'La caída de agua más alta del mundo.', 'radar-venezuela' ); ?></small></div>
				<a class="hero-place-credit" href="https://commons.wikimedia.org/wiki/File:Angel_Falls_in_Venezuela.jpg" target="_blank" rel="noopener">Luis Carillo · CC BY 3.0</a>
			</article>
			<article class="hero-place" data-place-slide aria-hidden="true">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/places/los-roques.jpg' ); ?>" alt="Aguas turquesas y cayos del archipiélago Los Roques" width="1440" height="1080" loading="lazy">
				<div class="hero-place-shade"></div><div class="hero-place-copy"><span>02 · DEPENDENCIAS FEDERALES</span><strong>Archipiélago Los Roques</strong><small><?php esc_html_e( 'Un mosaico caribeño de luz y aguas turquesas.', 'radar-venezuela' ); ?></small></div>
				<a class="hero-place-credit" href="https://commons.wikimedia.org/wiki/File:Los_Roques_Venezuela.jpg" target="_blank" rel="noopener">Rodrigo Accurcio · CC BY 2.0</a>
			</article>
			<article class="hero-place" data-place-slide aria-hidden="true">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/places/pico-bolivar.jpg' ); ?>" alt="Paisaje de alta montaña en el Pico Bolívar de Mérida" width="1440" height="1081" loading="lazy">
				<div class="hero-place-shade"></div><div class="hero-place-copy"><span>03 · ESTADO MÉRIDA</span><strong>Pico Bolívar · Los Andes</strong><small><?php esc_html_e( 'La Venezuela de cumbres, páramos y horizontes infinitos.', 'radar-venezuela' ); ?></small></div>
				<a class="hero-place-credit" href="https://commons.wikimedia.org/wiki/File:Pico_Bol%C3%ACvar,_Venezuela_(12679701683).jpg" target="_blank" rel="noopener">M M · CC BY-SA 2.0</a>
			</article>
			<article class="hero-place" data-place-slide aria-hidden="true">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/places/morrocoy.jpg' ); ?>" alt="Playa de aguas transparentes en el Parque Nacional Morrocoy" width="1280" height="960" loading="lazy">
				<div class="hero-place-shade"></div><div class="hero-place-copy"><span>04 · ESTADO FALCÓN</span><strong>Parque Nacional Morrocoy</strong><small><?php esc_html_e( 'Cayos, manglares y refugios frente al Caribe.', 'radar-venezuela' ); ?></small></div>
				<a class="hero-place-credit" href="https://commons.wikimedia.org/wiki/File:BeachMorrocoy.jpg" target="_blank" rel="noopener">José I. Spinola · CC BY 2.0</a>
			</article>
			<article class="hero-place" data-place-slide aria-hidden="true">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/places/gran-sabana.jpg' ); ?>" alt="Camino entre la sabana y los tepuyes de la Gran Sabana" width="1440" height="1080" loading="lazy">
				<div class="hero-place-shade"></div><div class="hero-place-copy"><span>05 · ESTADO BOLÍVAR</span><strong>La Gran Sabana</strong><small><?php esc_html_e( 'Tepuyes milenarios sobre una tierra sin fronteras.', 'radar-venezuela' ); ?></small></div>
				<a class="hero-place-credit" href="https://commons.wikimedia.org/wiki/File:Gran_Sabana.jpg" target="_blank" rel="noopener">portodaspartes · CC BY 2.0</a>
			</article>
		</div>
		<div class="hero-places-radar" aria-hidden="true"><span></span><span></span><span></span><i></i></div>
		<div class="hero-places-controls">
			<button type="button" class="hero-place-arrow" data-place-prev aria-label="Paisaje anterior">←</button>
			<div class="hero-place-dots" aria-label="Elegir paisaje">
				<?php for ( $place_index = 0; $place_index < 5; $place_index++ ) : ?><button type="button" data-place-dot="<?php echo esc_attr( $place_index ); ?>" aria-label="Ver paisaje <?php echo esc_attr( $place_index + 1 ); ?>" <?php echo 0 === $place_index ? 'aria-current="true"' : ''; ?>></button><?php endfor; ?>
			</div>
			<button type="button" class="hero-place-toggle" data-place-toggle aria-label="Pausar carrusel">Ⅱ</button>
			<button type="button" class="hero-place-arrow" data-place-next aria-label="Paisaje siguiente">→</button>
		</div>
		<p class="screen-reader-text" aria-live="polite" data-place-status>1 de 5: Salto Ángel, Canaima</p>
	</div>
</section>

<section class="section intro-grid">
	<div><p class="eyebrow">01 · <?php esc_html_e( 'UNA DECISIÓN INFORMADA', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Del anuncio a una visión realista de la inversión.', 'radar-venezuela' ); ?></h2></div>
	<p><?php esc_html_e( 'Radar reúne información publicada y herramientas orientativas para ayudarte a comparar ubicación, precio, superficie y posibles necesidades de reforma. Cada dato debe confirmarse antes de tomar una decisión.', 'radar-venezuela' ); ?></p>
</section>

<section id="radar-economico" class="section economic-public-section">
	<header class="section-heading"><div><p class="eyebrow">02 · <?php esc_html_e( 'RADAR ECONÓMICO', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Las señales que están moviendo Venezuela', 'radar-venezuela' ); ?></h2><p><?php esc_html_e( 'Noticias, iniciativas empresariales y cambios de entorno convertidos en pistas verificables para seguir nuevas oportunidades.', 'radar-venezuela' ); ?></p></div></header>
	<?php echo do_shortcode( '[radar_economico limit="6"]' ); ?>
</section>

<section id="inmuebles" class="section section-soft">
	<header class="section-heading"><div><p class="eyebrow">03 · <?php esc_html_e( 'PORTAL INMOBILIARIO', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Explora el mercado en un solo mapa', 'radar-venezuela' ); ?></h2><p><?php esc_html_e( 'Busca, filtra y compara los inmuebles rastreados por Radar Venezuela.', 'radar-venezuela' ); ?></p></div></header>
	<?php echo do_shortcode( '[radar_portal]' ); ?>
</section>

<section id="como-funciona" class="section process">
	<header class="section-heading"><div><p class="eyebrow">04 · <?php esc_html_e( 'CÓMO FUNCIONA', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Un recorrido sencillo y transparente', 'radar-venezuela' ); ?></h2></div></header>
	<div class="process-grid">
		<article><span>1</span><h3><?php esc_html_e( 'Explora', 'radar-venezuela' ); ?></h3><p><?php esc_html_e( 'Filtra los inmuebles publicados y revisa sus datos principales.', 'radar-venezuela' ); ?></p></article>
		<article><span>2</span><h3><?php esc_html_e( 'Compara', 'radar-venezuela' ); ?></h3><p><?php esc_html_e( 'Contrasta precio, superficie, zona y estado de la información.', 'radar-venezuela' ); ?></p></article>
		<article><span>3</span><h3><?php esc_html_e( 'Calcula', 'radar-venezuela' ); ?></h3><p><?php esc_html_e( 'Obtén una primera estimación orientativa de compra y reforma.', 'radar-venezuela' ); ?></p></article>
		<article><span>4</span><h3><?php esc_html_e( 'Consulta', 'radar-venezuela' ); ?></h3><p><?php esc_html_e( 'Envía tu solicitud para revisar el caso con mayor detalle.', 'radar-venezuela' ); ?></p></article>
	</div>
</section>

<section id="contacto" class="section contact-section">
	<div><p class="eyebrow">05 · <?php esc_html_e( 'CONTACTO', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Cuéntanos qué estás buscando.', 'radar-venezuela' ); ?></h2><p><?php esc_html_e( 'La solicitud se guardará de forma privada para que un administrador autorizado pueda revisarla.', 'radar-venezuela' ); ?></p></div>
	<div><?php echo do_shortcode( '[radar_contacto]' ); ?></div>
</section>
<?php get_footer(); ?>

