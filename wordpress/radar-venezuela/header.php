<?php /** @package Radar_Venezuela */ ?>
<!doctype html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#contenido"><?php esc_html_e( 'Saltar al contenido', 'radar-venezuela' ); ?></a>
<header class="site-header">
	<a class="site-brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php esc_attr_e( 'Radar Venezuela, inicio', 'radar-venezuela' ); ?>">
		<?php if ( has_custom_logo() ) : ?>
			<?php the_custom_logo(); ?>
		<?php else : ?>
			<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/logo-radar.svg' ); ?>" alt="Radar Venezuela" width="310" height="92">
		<?php endif; ?>
	</a>
	<nav class="site-nav" aria-label="<?php esc_attr_e( 'Navegación principal', 'radar-venezuela' ); ?>">
		<?php wp_nav_menu( array( 'theme_location' => 'primary', 'container' => false, 'menu_class' => 'radar-menu', 'fallback_cb' => 'radar_venezuela_menu_fallback' ) ); ?>
	</nav>
	<a class="button button-small" href="<?php echo esc_url( home_url( '/#contacto' ) ); ?>"><?php esc_html_e( 'Hablar con Radar', 'radar-venezuela' ); ?></a>
</header>
<main id="contenido" class="site-main">

