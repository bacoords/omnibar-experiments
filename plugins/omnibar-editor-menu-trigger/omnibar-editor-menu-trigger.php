<?php
/**
 * Plugin Name:       Omnibar Editor Menu Trigger
 * Description:       Moves the Omnibar admin-drawer trigger into the editor header's back-button position.
 * Version:           0.1.3
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Requires Plugins:  omnibar-admin-drawer
 * Author:            Brian Coords
 * Text Domain:       omnibar-editor-menu-trigger
 */

defined( 'ABSPATH' ) || exit;

define( 'OMNIBAR_EDITOR_MENU_TRIGGER_VERSION', '0.1.3' );

/**
 * Keep the Core WordPress logo and dropdown when this alternative trigger is active.
 *
 * @return bool Always false.
 */
function omnibar_editor_menu_trigger_keep_default_wp_logo() {
	return false;
}
add_filter(
	'omnibar_admin_drawer_use_wp_logo_toggle',
	'omnibar_editor_menu_trigger_keep_default_wp_logo'
);

/**
 * Load the alternative drawer trigger on block and Site Editor screens.
 */
function omnibar_editor_menu_trigger_enqueue_assets() {
	if (
		! function_exists( 'omnibar_admin_drawer_should_enable' ) ||
		! omnibar_admin_drawer_should_enable()
	) {
		return;
	}

	$asset_url = plugin_dir_url( __FILE__ ) . 'assets/';

	wp_enqueue_style(
		'omnibar-editor-menu-trigger',
		$asset_url . 'editor-menu-trigger.css',
		array( 'omnibar-admin-drawer' ),
		OMNIBAR_EDITOR_MENU_TRIGGER_VERSION
	);

	wp_enqueue_script(
		'omnibar-editor-menu-trigger',
		$asset_url . 'editor-menu-trigger.js',
		array( 'omnibar-admin-drawer' ),
		OMNIBAR_EDITOR_MENU_TRIGGER_VERSION,
		false
	);

	wp_localize_script(
		'omnibar-editor-menu-trigger',
		'OmnibarEditorMenuTrigger',
		array(
			'openLabel'  => __( 'Open WordPress menu', 'omnibar-editor-menu-trigger' ),
			'closeLabel' => __( 'Close WordPress menu', 'omnibar-editor-menu-trigger' ),
		)
	);
}
add_action( 'admin_enqueue_scripts', 'omnibar_editor_menu_trigger_enqueue_assets', 20 );
