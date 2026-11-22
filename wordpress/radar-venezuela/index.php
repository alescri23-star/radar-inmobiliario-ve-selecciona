<?php /** Archivo general. @package Radar_Venezuela */ get_header(); ?>
<section class="section content-narrow">
	<header class="section-heading"><div><p class="eyebrow"><?php esc_html_e( 'RADAR VENEZUELA', 'radar-venezuela' ); ?></p><h1><?php echo esc_html( is_home() ? __( 'Actualidad', 'radar-venezuela' ) : get_the_archive_title() ); ?></h1></div></header>
	<div class="post-grid">
	<?php if ( have_posts() ) : while ( have_posts() ) : the_post(); ?>
		<article <?php post_class( 'post-card' ); ?>><?php if ( has_post_thumbnail() ) { the_post_thumbnail( 'large' ); } ?><p class="eyebrow"><?php echo esc_html( get_the_date() ); ?></p><h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2><?php the_excerpt(); ?></article>
	<?php endwhile; the_posts_pagination(); else : ?><p><?php esc_html_e( 'Todavía no hay publicaciones.', 'radar-venezuela' ); ?></p><?php endif; ?>
	</div>
</section>
<?php get_footer(); ?>

