<?php
/**
 * Funciones del tema Radar Venezuela.
 *
 * @package Radar_Venezuela
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function radar_venezuela_setup() {
	load_theme_textdomain( 'radar-venezuela', get_template_directory() . '/languages' );
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'custom-logo', array( 'height' => 92, 'width' => 310, 'flex-height' => true, 'flex-width' => true ) );
	add_theme_support( 'html5', array( 'search-form', 'gallery', 'caption', 'style', 'script' ) );
	register_nav_menus( array( 'primary' => __( 'Navegación principal', 'radar-venezuela' ) ) );
}
add_action( 'after_setup_theme', 'radar_venezuela_setup' );

function radar_venezuela_assets() {
	$theme = wp_get_theme();
	wp_enqueue_style( 'radar-venezuela', get_stylesheet_uri(), array(), $theme->get( 'Version' ) );
}
add_action( 'wp_enqueue_scripts', 'radar_venezuela_assets' );

function radar_venezuela_menu_fallback() {
	echo '<ul class="radar-menu">';
	foreach ( array(
		__( 'Inicio', 'radar-venezuela' ) => home_url( '/' ),
		__( 'Inmuebles', 'radar-venezuela' ) => get_post_type_archive_link( 'radar_inmueble' ) ?: home_url( '/#inmuebles' ),
		__( 'Cómo funciona', 'radar-venezuela' ) => home_url( '/#como-funciona' ),
		__( 'Contacto', 'radar-venezuela' ) => home_url( '/#contacto' ),
	) as $label => $url ) {
		printf( '<li><a href="%s">%s</a></li>', esc_url( $url ), esc_html( $label ) );
	}
	echo '</ul>';
}

