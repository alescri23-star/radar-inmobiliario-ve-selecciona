<?php
/** Página principal pública. @package Radar_Venezuela */
get_header();
$radar_places = array(
	array( 'salto-angel.jpg', 'Salto Ángel descendiendo desde el Auyán-tepui en Canaima', 'ESTADO BOLÍVAR', 'Salto Ángel · Canaima', 'La caída de agua más alta del mundo.', 'https://commons.wikimedia.org/wiki/File:Angel_Falls_in_Venezuela.jpg', 'Luis Carillo · CC BY 3.0' ),
	array( 'los-roques.jpg', 'Aguas turquesas y cayos del archipiélago Los Roques', 'DEPENDENCIAS FEDERALES', 'Archipiélago Los Roques', 'Un mosaico caribeño de luz y aguas turquesas.', 'https://commons.wikimedia.org/wiki/File:Los_Roques_Venezuela.jpg', 'Rodrigo Accurcio · CC BY 2.0' ),
	array( 'pico-bolivar.jpg', 'Paisaje de alta montaña en el Pico Bolívar de Mérida', 'ESTADO MÉRIDA', 'Pico Bolívar · Los Andes', 'La Venezuela de cumbres, páramos y horizontes infinitos.', 'https://commons.wikimedia.org/wiki/File:Pico_Bol%C3%ACvar,_Venezuela_(12679701683).jpg', 'M M · CC BY-SA 2.0' ),
	array( 'morrocoy.jpg', 'Playa de aguas transparentes en el Parque Nacional Morrocoy', 'ESTADO FALCÓN', 'Parque Nacional Morrocoy', 'Cayos, manglares y refugios frente al Caribe.', 'https://commons.wikimedia.org/wiki/File:BeachMorrocoy.jpg', 'José I. Spinola · CC BY 2.0' ),
	array( 'gran-sabana.jpg', 'Camino entre la sabana y los tepuyes de la Gran Sabana', 'ESTADO BOLÍVAR', 'La Gran Sabana', 'Tepuyes milenarios sobre una tierra sin fronteras.', 'https://commons.wikimedia.org/wiki/File:Gran_Sabana.jpg', 'portodaspartes · CC BY 2.0' ),
	array( 'medanos-coro.jpg', 'Dunas doradas del Parque Nacional Médanos de Coro', 'ESTADO FALCÓN', 'Médanos de Coro', 'Un desierto vivo que cambia con cada viento.', 'https://commons.wikimedia.org/wiki/File:MedanosdeCoro.jpg', 'Carlos Adampol Galindo · CC BY-SA 2.0' ),
	array( 'mochima.jpg', 'Islas y aguas azules del Parque Nacional Mochima', 'ESTADO SUCRE', 'Parque Nacional Mochima', 'Montañas costeras que se encuentran con el Caribe.', 'https://commons.wikimedia.org/wiki/File:Parque_nacional_Mochima_Sucre_Venezuela_2026.jpg', 'Warairarepano&Guaicaipuro · CC0' ),
	array( 'flor-venezuela.jpg', 'Flor de Venezuela en Barquisimeto', 'ESTADO LARA', 'Flor de Venezuela · Barquisimeto', 'Arquitectura, color y orgullo larense.', 'https://commons.wikimedia.org/wiki/File:FlordeVenezuela10.jpg', 'Carlifernandezt · CC BY-SA 4.0' ),
	array( 'llanos-apure.jpg', 'Atardecer sobre los Llanos venezolanos en Apure', 'ESTADO APURE', 'Los Llanos · Hato El Cedral', 'Horizontes abiertos, fauna y atardeceres infinitos.', 'https://commons.wikimedia.org/wiki/File:Los_Llanos_Venezolanos.jpg', 'Fernando Flores · CC BY-SA 3.0' ),
	array( 'colonia-tovar.jpg', 'Vista entre montañas de la Colonia Tovar', 'ESTADO ARAGUA', 'Colonia Tovar', 'Tradición, neblina y montaña en el corazón de Aragua.', 'https://commons.wikimedia.org/wiki/File:Colonia-Tovar.jpg', 'Pascual De Ruvo · CC BY-SA 3.0' ),
	array( 'delta-orinoco.jpg', 'Bosques y canales del Delta del Orinoco', 'ESTADO DELTA AMACURO', 'Delta del Orinoco', 'Una red de agua y selva que desemboca en el Atlántico.', 'https://commons.wikimedia.org/wiki/File:Deltaorinoco.jpg', 'Milito · CC BY-SA 3.0' ),
	array( 'la-restinga.jpg', 'Laguna y manglares de La Restinga en Margarita', 'ESTADO NUEVA ESPARTA', 'La Restinga · Isla de Margarita', 'Manglares, canales y la serenidad de la región insular.', 'https://commons.wikimedia.org/wiki/File:Laguna_de_la_Restinga.jpg', 'Wilfredor · CC BY-SA 3.0' ),
);
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
			<?php foreach ( $radar_places as $place_index => $place ) : ?>
			<article class="hero-place<?php echo 0 === $place_index ? ' is-active' : ''; ?>" data-place-slide data-place-label="<?php echo esc_attr( $place[3] ); ?>" aria-hidden="<?php echo 0 === $place_index ? 'false' : 'true'; ?>">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/places/' . $place[0] ); ?>" alt="<?php echo esc_attr( $place[1] ); ?>" width="1600" height="1067" <?php echo 0 === $place_index ? 'fetchpriority="high"' : 'loading="lazy"'; ?>>
				<div class="hero-place-shade"></div><div class="hero-place-copy"><span><?php echo esc_html( sprintf( '%02d · %s', $place_index + 1, $place[2] ) ); ?></span><strong><?php echo esc_html( $place[3] ); ?></strong><small><?php echo esc_html( $place[4] ); ?></small></div>
				<a class="hero-place-credit" href="<?php echo esc_url( $place[5] ); ?>" target="_blank" rel="noopener"><?php echo esc_html( $place[6] ); ?></a>
			</article>
			<?php endforeach; ?>
		</div>
		<div class="hero-places-radar" aria-hidden="true"><span></span><span></span><span></span><i></i></div>
		<div class="hero-places-controls">
			<button type="button" class="hero-place-arrow" data-place-prev aria-label="Paisaje anterior">←</button>
			<div class="hero-place-dots" aria-label="Elegir paisaje">
				<?php foreach ( $radar_places as $place_index => $place ) : ?><button type="button" data-place-dot="<?php echo esc_attr( $place_index ); ?>" aria-label="Ver <?php echo esc_attr( $place[3] ); ?>" <?php echo 0 === $place_index ? 'aria-current="true"' : ''; ?>></button><?php endforeach; ?>
			</div>
			<button type="button" class="hero-place-toggle" data-place-toggle aria-label="Pausar carrusel">Ⅱ</button>
			<button type="button" class="hero-place-arrow" data-place-next aria-label="Paisaje siguiente">→</button>
		</div>
		<p class="screen-reader-text" aria-live="polite" data-place-status>1 de <?php echo esc_html( count( $radar_places ) ); ?>: <?php echo esc_html( $radar_places[0][3] ); ?></p>
	</div>
</section>

<section id="inmuebles" class="section section-soft portal-first-section">
	<header class="section-heading"><div><p class="eyebrow">01 · <?php esc_html_e( 'PORTAL INMOBILIARIO', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Explora el mercado en un solo mapa', 'radar-venezuela' ); ?></h2><p><?php esc_html_e( 'Busca, filtra y compara los inmuebles rastreados por Radar Venezuela.', 'radar-venezuela' ); ?></p></div></header>
	<?php echo do_shortcode( '[radar_portal]' ); ?>
</section>

<section class="section intro-grid">
	<div><p class="eyebrow">02 · <?php esc_html_e( 'UNA DECISIÓN INFORMADA', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Del anuncio a una visión realista de la inversión.', 'radar-venezuela' ); ?></h2></div>
	<p><?php esc_html_e( 'Radar reúne información publicada y herramientas orientativas para ayudarte a comparar ubicación, precio, superficie y posibles necesidades de reforma. Cada dato debe confirmarse antes de tomar una decisión.', 'radar-venezuela' ); ?></p>
</section>

<section id="radar-economico" class="section economic-public-section">
	<header class="section-heading"><div><p class="eyebrow">03 · <?php esc_html_e( 'RADAR ECONÓMICO', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Las señales que están moviendo Venezuela', 'radar-venezuela' ); ?></h2><p><?php esc_html_e( 'Noticias, iniciativas empresariales y cambios de entorno convertidos en pistas verificables para seguir nuevas oportunidades.', 'radar-venezuela' ); ?></p></div></header>
	<article class="radar-investigation-highlight" aria-labelledby="radar-investigation-title">
		<div class="radar-investigation-copy">
			<p class="radar-investigation-kicker"><?php esc_html_e( 'INVESTIGACIÓN DESTACADA · RIESGO PAÍS', 'radar-venezuela' ); ?></p>
			<h3 id="radar-investigation-title"><?php esc_html_e( 'Maduro, chavismo y riesgo institucional', 'radar-venezuela' ); ?></h3>
			<p><?php esc_html_e( 'Una investigación documental reconstruye vínculos, casos de corrupción y estructuras de poder para entender su impacto en la seguridad jurídica y la inversión en Venezuela.', 'radar-venezuela' ); ?></p>
			<div class="radar-investigation-actions">
				<a class="button" href="<?php echo esc_url( home_url( '/informes/expediente-maduro/' ) ); ?>"><?php esc_html_e( 'Explorar el expediente', 'radar-venezuela' ); ?> <span aria-hidden="true">→</span></a>
				<a class="radar-investigation-source" href="https://expedientemaduro.transparenciave.org/es" target="_blank" rel="noopener noreferrer"><?php esc_html_e( 'Ver investigación original', 'radar-venezuela' ); ?> ↗</a>
			</div>
			<small><?php esc_html_e( 'Fuente: Transparencia Venezuela. La responsabilidad penal solo puede ser determinada por los tribunales competentes.', 'radar-venezuela' ); ?></small>
			<small class="radar-investigation-credits">
				<?php esc_html_e( 'Retratos:', 'radar-venezuela' ); ?>
				<a href="https://commons.wikimedia.org/wiki/File:Hugo_Ch%C3%A1vez_in_Bras%C3%ADlia_2011_(3x4_cropped)_(2).jpg" target="_blank" rel="noopener noreferrer">Hugo Chávez · Roberto Stuckert Filho · CC BY-SA 2.0</a>;
				<a href="https://commons.wikimedia.org/wiki/File:Nicol%C3%A1s_Maduro_official_portrait_(cropped_2).png" target="_blank" rel="noopener noreferrer">Nicolás Maduro</a>,
				<a href="https://commons.wikimedia.org/wiki/File:Diosdado_Cabello_2025.jpg" target="_blank" rel="noopener noreferrer">Diosdado Cabello</a> <?php esc_html_e( 'y', 'radar-venezuela' ); ?>
				<a href="https://commons.wikimedia.org/wiki/File:Delcy_Rodr%C3%ADguez_-_02_(19-01-2026)_(cropped_2)_(b).jpg" target="_blank" rel="noopener noreferrer">Delcy Rodríguez</a> · <?php esc_html_e( 'dominio público vía Wikimedia Commons. Recortes y tratamiento visual.', 'radar-venezuela' ); ?>
			</small>
		</div>
		<div class="radar-investigation-visual" aria-hidden="true">
			<div class="radar-investigation-portraits">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/investigation/hugo-chavez.jpg' ); ?>" alt="" loading="lazy" decoding="async">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/investigation/nicolas-maduro.png' ); ?>" alt="" loading="lazy" decoding="async">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/investigation/diosdado-cabello.jpg' ); ?>" alt="" loading="lazy" decoding="async">
				<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/investigation/delcy-rodriguez.jpg' ); ?>" alt="" loading="lazy" decoding="async">
			</div>
			<span></span><span></span><span></span><i></i>
			<strong><?php esc_html_e( 'EXPEDIENTE', 'radar-venezuela' ); ?></strong>
			<b><?php esc_html_e( 'Corrupción · Justicia · Política', 'radar-venezuela' ); ?></b>
		</div>
	</article>
	<div class="radar-economic-preview"><?php echo do_shortcode( '[radar_economico limit="3"]' ); ?></div>
	<div class="radar-economic-more-wrap"><a class="button radar-economic-more" href="<?php echo esc_url( home_url( '/actualidad/' ) ); ?>"><?php esc_html_e( 'Ver todas las noticias económicas', 'radar-venezuela' ); ?> <span aria-hidden="true">→</span></a></div>
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

