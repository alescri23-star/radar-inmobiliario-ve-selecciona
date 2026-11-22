<?php /** Página. @package Radar_Venezuela */ get_header(); ?>
<article class="section content-narrow page-content"><?php while ( have_posts() ) : the_post(); ?><p class="eyebrow"><?php esc_html_e( 'RADAR VENEZUELA', 'radar-venezuela' ); ?></p><h1><?php the_title(); ?></h1><?php the_content(); ?><?php endwhile; ?></article>
<?php get_footer(); ?>

