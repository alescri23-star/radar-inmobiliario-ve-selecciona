<?php /** @package Radar_Venezuela */ ?>
</main>
<footer class="site-footer">
	<div>
		<img src="<?php echo esc_url( get_template_directory_uri() . '/assets/logo-radar.svg' ); ?>" alt="Radar Venezuela" width="230" height="68">
		<p><?php esc_html_e( 'Información inmobiliaria organizada para decidir con mayor claridad.', 'radar-venezuela' ); ?></p>
	</div>
	<div>
		<strong><?php esc_html_e( 'Piloto', 'radar-venezuela' ); ?></strong>
		<p><?php esc_html_e( 'Barquisimeto, estado Lara, Venezuela.', 'radar-venezuela' ); ?></p>
	</div>
	<div>
		<strong><?php esc_html_e( 'Información', 'radar-venezuela' ); ?></strong>
		<p><a href="<?php echo esc_url( get_privacy_policy_url() ?: home_url( '/privacidad/' ) ); ?>"><?php esc_html_e( 'Privacidad', 'radar-venezuela' ); ?></a></p>
	</div>
	<p class="footer-note">© <?php echo esc_html( wp_date( 'Y' ) ); ?> Radar Venezuela. <?php esc_html_e( 'Los precios y estimaciones son orientativos y deben verificarse.', 'radar-venezuela' ); ?></p>
</footer>
<?php wp_footer(); ?>
</body>
</html>

