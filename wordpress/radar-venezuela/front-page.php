<?php
/** Página principal pública. @package Radar_Venezuela */
get_header();
?>
<section class="hero">
	<div class="hero-copy">
		<p class="eyebrow"><?php esc_html_e( 'RADAR INMOBILIARIO · BARQUISIMETO', 'radar-venezuela' ); ?></p>
		<h1><?php esc_html_e( 'Encuentra oportunidades con una visión más completa.', 'radar-venezuela' ); ?></h1>
		<p class="hero-lead"><?php esc_html_e( 'Explora inmuebles publicados, compara sus datos y solicita orientación para estimar compra y reforma.', 'radar-venezuela' ); ?></p>
		<div class="hero-actions">
			<a class="button" href="#inmuebles"><?php esc_html_e( 'Explorar inmuebles', 'radar-venezuela' ); ?></a>
			<a class="text-link" href="#como-funciona"><?php esc_html_e( 'Conocer el proceso', 'radar-venezuela' ); ?> →</a>
		</div>
		<ul class="trust-list"><li><?php esc_html_e( 'Datos identificados por fuente', 'radar-venezuela' ); ?></li><li><?php esc_html_e( 'Estimaciones con supuestos visibles', 'radar-venezuela' ); ?></li><li><?php esc_html_e( 'Privacidad desde el diseño', 'radar-venezuela' ); ?></li></ul>
	</div>
	<div class="hero-radar" aria-hidden="true"><span></span><span></span><span></span><i></i><b>Barquisimeto</b></div>
</section>

<section class="section intro-grid">
	<div><p class="eyebrow">01 · <?php esc_html_e( 'UNA DECISIÓN INFORMADA', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Del anuncio a una visión realista de la inversión.', 'radar-venezuela' ); ?></h2></div>
	<p><?php esc_html_e( 'Radar reúne información publicada y herramientas orientativas para ayudarte a comparar ubicación, precio, superficie y posibles necesidades de reforma. Cada dato debe confirmarse antes de tomar una decisión.', 'radar-venezuela' ); ?></p>
</section>

<section id="inmuebles" class="section section-soft">
	<header class="section-heading"><div><p class="eyebrow">02 · <?php esc_html_e( 'INMUEBLES', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Oportunidades publicadas', 'radar-venezuela' ); ?></h2></div><a href="<?php echo esc_url( get_post_type_archive_link( 'radar_inmueble' ) ?: '#inmuebles' ); ?>"><?php esc_html_e( 'Ver todos', 'radar-venezuela' ); ?> →</a></header>
	<?php echo do_shortcode( '[radar_inmuebles limite="6"]' ); ?>
</section>

<section id="como-funciona" class="section process">
	<header class="section-heading"><div><p class="eyebrow">03 · <?php esc_html_e( 'CÓMO FUNCIONA', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Un recorrido sencillo y transparente', 'radar-venezuela' ); ?></h2></div></header>
	<div class="process-grid">
		<article><span>1</span><h3><?php esc_html_e( 'Explora', 'radar-venezuela' ); ?></h3><p><?php esc_html_e( 'Filtra los inmuebles publicados y revisa sus datos principales.', 'radar-venezuela' ); ?></p></article>
		<article><span>2</span><h3><?php esc_html_e( 'Compara', 'radar-venezuela' ); ?></h3><p><?php esc_html_e( 'Contrasta precio, superficie, zona y estado de la información.', 'radar-venezuela' ); ?></p></article>
		<article><span>3</span><h3><?php esc_html_e( 'Calcula', 'radar-venezuela' ); ?></h3><p><?php esc_html_e( 'Obtén una primera estimación orientativa de compra y reforma.', 'radar-venezuela' ); ?></p></article>
		<article><span>4</span><h3><?php esc_html_e( 'Consulta', 'radar-venezuela' ); ?></h3><p><?php esc_html_e( 'Envía tu solicitud para revisar el caso con mayor detalle.', 'radar-venezuela' ); ?></p></article>
	</div>
</section>

<section id="contacto" class="section contact-section">
	<div><p class="eyebrow">04 · <?php esc_html_e( 'CONTACTO', 'radar-venezuela' ); ?></p><h2><?php esc_html_e( 'Cuéntanos qué estás buscando.', 'radar-venezuela' ); ?></h2><p><?php esc_html_e( 'La solicitud se guardará de forma privada para que un administrador autorizado pueda revisarla.', 'radar-venezuela' ); ?></p></div>
	<div><?php echo do_shortcode( '[radar_contacto]' ); ?></div>
</section>
<?php get_footer(); ?>

