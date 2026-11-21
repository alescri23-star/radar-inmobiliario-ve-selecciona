<?php /** Entrada individual. @package Radar_Venezuela */ get_header(); ?>
<article class="section content-narrow page-content"><?php while ( have_posts() ) : the_post(); ?><p class="eyebrow"><?php echo esc_html( get_the_date() ); ?></p><h1><?php the_title(); ?></h1><?php if ( has_post_thumbnail() ) { the_post_thumbnail( 'large' ); } ?><?php the_content(); ?><?php endwhile; ?></article>
<?php get_footer(); ?>
