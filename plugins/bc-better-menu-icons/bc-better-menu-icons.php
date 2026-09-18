<?php
/**
 * Plugin Name: BC Better Menu Icons
 * Description: Replaces WordPress dashicons font with modern @wordpress/icons for the entire admin.
 * Version: 2.0.4
 * Author: Brian Coords
 * License: GPL-2.0-or-later
 */

namespace BC\BetterMenuIcons;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BC_BETTER_MENU_ICONS_VERSION', '2.0.4' );
define( 'BC_BETTER_MENU_ICONS_DIR', plugin_dir_path( __FILE__ ) );
define( 'BC_BETTER_MENU_ICONS_URL', plugin_dir_url( __FILE__ ) );

/**
 * Replace the default dashicons font with our custom version.
 *
 * This dequeues the original WordPress dashicons stylesheet and
 * enqueues our replacement font that uses the same codepoints
 * but with @wordpress/icons designs.
 */
function replace_dashicons() {
	// Only proceed if our font file exists
	$css_file = BC_BETTER_MENU_ICONS_DIR . 'assets/fonts/dashicons.css';
	if ( ! file_exists( $css_file ) ) {
		return;
	}

	// Dequeue and deregister the original dashicons
	wp_dequeue_style( 'dashicons' );
	wp_deregister_style( 'dashicons' );

	// Register and enqueue our replacement
	wp_register_style(
		'dashicons',
		BC_BETTER_MENU_ICONS_URL . 'assets/fonts/dashicons.css',
		array(),
		BC_BETTER_MENU_ICONS_VERSION
	);
	wp_enqueue_style( 'dashicons' );
}

// Hook into all contexts where dashicons are loaded
// Use priority 1 to run before anything else that might depend on dashicons
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\replace_dashicons', 1 );
add_action( 'admin_enqueue_scripts', __NAMESPACE__ . '\replace_dashicons', 1 );
add_action( 'login_enqueue_scripts', __NAMESPACE__ . '\replace_dashicons', 1 );

/**
 * Remove WordPress's Collapse Menu control from the admin sidebar.
 */
function remove_collapse_menu() {
	?>
	<script id="bc-better-menu-icons-remove-collapse-menu">
		document.getElementById( 'collapse-menu' )?.remove();
	</script>
	<?php
}

add_action( 'admin_footer', __NAMESPACE__ . '\remove_collapse_menu', 100 );
