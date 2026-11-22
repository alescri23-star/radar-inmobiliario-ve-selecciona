<?php /** Ficha pública de inmueble. @package Radar_Venezuela */ get_header(); ?>
<?php while ( have_posts() ) : the_post(); $id = get_the_ID(); ?>
<article class="section content-narrow page-content">
	<p class="eyebrow"><?php echo esc_html( strtoupper( get_post_meta( $id, 'radar_operacion', true ) ?: 'INMUEBLE' ) ); ?> · BARQUISIMETO</p>
	<h1><?php the_title(); ?></h1>
	<?php if ( has_post_thumbnail() ) { the_post_thumbnail( 'full' ); } ?>
	<p><strong class="property-price"><?php $price = get_post_meta( $id, 'radar_precio', true ); echo $price ? esc_html( number_format_i18n( (float) $price, 0 ) . ' ' . ( get_post_meta( $id, 'radar_moneda', true ) ?: 'USD' ) ) : esc_html__( 'Consultar precio', 'radar-venezuela' ); ?></strong></p>
	<p class="property-meta"><?php echo esc_html( implode( ' · ', array_filter( array( get_post_meta( $id, 'radar_zona', true ), get_post_meta( $id, 'radar_superficie', true ) ? get_post_meta( $id, 'radar_superficie', true ) . ' m²' : '', get_post_meta( $id, 'radar_habitaciones', true ) ? get_post_meta( $id, 'radar_habitaciones', true ) . ' habitaciones' : '', get_post_meta( $id, 'radar_banos', true ) ? get_post_meta( $id, 'radar_banos', true ) . ' baños' : '' ) ) ) ); ?></p>
	<?php the_content(); ?>
	<hr><h2><?php esc_html_e( 'Solicitar información', 'radar-venezuela' ); ?></h2><?php echo do_shortcode( '[radar_contacto]' ); ?>
</article>
<?php endwhile; get_footer(); ?>
