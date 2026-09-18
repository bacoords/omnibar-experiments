<?php
/**
 * Plugin Name:       Omnibar Focus Menu
 * Description:       Shows a focused WordPress admin menu when the current screen belongs to a registered menu group.
 * Version:           0.1.3
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Requires Plugins:  omnibar-admin-drawer
 * Author:            Brian Coords
 * Text Domain:       omnibar-focus-menu
 */

defined( 'ABSPATH' ) || exit;

define( 'OMNIBAR_FOCUS_MENU_VERSION', '0.1.3' );

/**
 * Register WordPress's default focus groups.
 */
function omnibar_focus_menu_register_core_groups() {
	omnibar_register_focus_group(
		'content',
		array(
			'label'      => __( 'Content', 'omnibar-focus-menu' ),
			'menu_slugs' => array(
				'edit.php',
				'upload.php',
				'edit.php?post_type=page',
				'edit-comments.php',
			),
			'priority'   => 10,
		)
	);

	omnibar_register_focus_group(
		'appearance',
		array(
			'label'      => __( 'Appearance', 'omnibar-focus-menu' ),
			'menu_slugs' => array( 'themes.php' ),
			'priority'   => 20,
		)
	);

	omnibar_register_focus_group(
		'settings',
		array(
			'label'      => __( 'Settings', 'omnibar-focus-menu' ),
			'menu_slugs' => array(
				'plugins.php',
				'users.php',
				'tools.php',
				'options-general.php',
			),
			'priority'   => 30,
		)
	);
}
add_action( 'omnibar_register_focus_groups', 'omnibar_focus_menu_register_core_groups' );

/**
 * Register the prototype WooCommerce focus group.
 *
 * This deliberately lives here rather than in WooCommerce so the extension
 * can demonstrate how a plugin would opt its top-level destinations into a
 * shared focus group.
 */
function omnibar_focus_menu_register_woocommerce_group() {
	omnibar_register_focus_group(
		'woocommerce',
		array(
			'label'      => __( 'WooCommerce', 'omnibar-focus-menu' ),
			'menu_slugs' => array(
				'woocommerce',
				'edit.php?post_type=product',
				'admin.php?page=wc-settings&tab=checkout&from=PAYMENTS_MENU_ITEM',
				'wc-admin&path=/payments/connect',
				'wc-admin&path=/analytics/overview',
				'woocommerce-marketing',
				'wc-reports',
			),
			'priority'   => 40,
		)
	);
}
add_action( 'omnibar_register_focus_groups', 'omnibar_focus_menu_register_woocommerce_group' );

/**
 * Determine whether a top-level menu item belongs to a focus group.
 *
 * @param array<string, mixed> $group    Registered group.
 * @param array                $item     WordPress top-level menu item.
 * @param int|float|string     $position WordPress menu position.
 * @return bool
 */
function omnibar_focus_menu_group_matches_item( $group, $item, $position ) {
	$slug    = isset( $item[2] ) ? omnibar_normalize_focus_group_menu_slug( $item[2] ) : '';
	$menu_id = isset( $item[5] ) ? sanitize_key( (string) $item[5] ) : '';

	if ( '' !== $slug && in_array( $slug, $group['menu_slugs'], true ) ) {
		return true;
	}

	if ( '' !== $menu_id && in_array( $menu_id, $group['menu_ids'], true ) ) {
		return true;
	}

	if ( is_callable( $group['matcher'] ) ) {
		return (bool) call_user_func( $group['matcher'], $item, $position, $group );
	}

	return false;
}

/**
 * Register groups and annotate their existing top-level WordPress menu items.
 */
function omnibar_focus_menu_prepare_menu() {
	global $menu;

	omnibar_reset_focus_groups();

	/**
	 * Fires after plugins have registered their admin menus and before focus
	 * groups are applied.
	 */
	do_action( 'omnibar_register_focus_groups' );

	if ( ! is_array( $menu ) ) {
		return;
	}

	$groups = omnibar_get_focus_groups();

	foreach ( $menu as $position => &$item ) {
		if ( ! is_array( $item ) ) {
			continue;
		}

		$classes = isset( $item[4] )
			? preg_split( '/\s+/', trim( (string) $item[4] ) )
			: array();
		$classes = array_values( array_filter( (array) $classes ) );

		if ( in_array( 'wp-menu-separator', $classes, true ) ) {
			continue;
		}

		$matched_group = '';

		foreach ( $groups as $group_id => $group ) {
			if ( omnibar_focus_menu_group_matches_item( $group, $item, $position ) ) {
				$matched_group = $group_id;
				break;
			}
		}

		/**
		 * Filters the group assigned to one top-level admin-menu item.
		 *
		 * Return an empty string to leave the item ungrouped.
		 *
		 * @param string           $matched_group Matched group ID.
		 * @param array            $item          WordPress menu item.
		 * @param int|float|string $position      WordPress menu position.
		 * @param array            $groups        All registered groups.
		 */
		$matched_group = sanitize_key(
			(string) apply_filters(
				'omnibar_focus_group_for_menu_item',
				$matched_group,
				$item,
				$position,
				$groups
			)
		);

		if ( '' === $matched_group || ! isset( $groups[ $matched_group ] ) ) {
			continue;
		}

		$classes[] = 'omnibar-focus-menu-item';
		$classes[] = 'omnibar-focus-menu-item--' . sanitize_html_class( $matched_group );
		$item[4]   = implode( ' ', array_unique( $classes ) );
	}
	unset( $item );
}
add_action( 'admin_menu', 'omnibar_focus_menu_prepare_menu', PHP_INT_MAX );

/**
 * Load the focus-menu behavior throughout wp-admin.
 */
function omnibar_focus_menu_enqueue_assets() {
	$asset_url = plugin_dir_url( __FILE__ ) . 'assets/';
	$groups    = omnibar_get_focus_groups();

	wp_enqueue_style(
		'omnibar-focus-menu',
		$asset_url . 'focus-menu.css',
		array(),
		OMNIBAR_FOCUS_MENU_VERSION
	);

	wp_enqueue_script(
		'omnibar-focus-menu',
		$asset_url . 'focus-menu.js',
		array(),
		OMNIBAR_FOCUS_MENU_VERSION,
		false
	);

	wp_localize_script(
		'omnibar-focus-menu',
		'OmnibarFocusMenu',
		array(
			'groupOrder' => array_keys( $groups ),
			'labels'     => array(
				'showAllMenu' => __( 'Show all menu items', 'omnibar-focus-menu' ),
			),
		)
	);
}
add_action( 'admin_enqueue_scripts', 'omnibar_focus_menu_enqueue_assets' );
