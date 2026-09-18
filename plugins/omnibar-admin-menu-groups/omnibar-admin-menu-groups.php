<?php
/**
 * Plugin Name:       Omnibar Collapsible Menu Groups
 * Description:       Experimental collapsible group hierarchy for the WordPress admin menu.
 * Version:           0.2.1
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Requires Plugins:  omnibar-admin-drawer
 * Author:            Brian Coords
 * Text Domain:       omnibar-admin-menu-groups
 */

defined( 'ABSPATH' ) || exit;

define( 'OMNIBAR_ADMIN_MENU_GROUPS_VERSION', '0.2.1' );

/**
 * Register WordPress's default collapsible groups.
 */
function omnibar_admin_menu_groups_register_core_groups() {
	omnibar_register_focus_group(
		'content',
		array(
			'label'      => __( 'Content', 'omnibar-admin-menu-groups' ),
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
			'label'      => __( 'Appearance', 'omnibar-admin-menu-groups' ),
			'menu_slugs' => array( 'themes.php' ),
			'matcher'    => static function ( $item ) {
				$classes = isset( $item[4] )
					? preg_split( '/\s+/', trim( (string) $item[4] ) )
					: array();

				return in_array( 'omnibar-admin-appearance-item', (array) $classes, true );
			},
			'priority'   => 20,
		)
	);

	omnibar_register_focus_group(
		'settings',
		array(
			'label'      => __( 'Settings', 'omnibar-admin-menu-groups' ),
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
add_action( 'omnibar_register_focus_groups', 'omnibar_admin_menu_groups_register_core_groups' );

/**
 * Register the prototype WooCommerce focus group.
 *
 * This deliberately lives here rather than in WooCommerce so the extension
 * can demonstrate how a plugin opts its top-level destinations into a shared
 * focus group.
 */
function omnibar_admin_menu_groups_register_woocommerce_group() {
	omnibar_register_focus_group(
		'woocommerce',
		array(
			'label'      => __( 'WooCommerce', 'omnibar-admin-menu-groups' ),
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
add_action( 'omnibar_register_focus_groups', 'omnibar_admin_menu_groups_register_woocommerce_group' );

/**
 * Determine whether a top-level menu item belongs to a focus group.
 *
 * @param array<string, mixed> $group    Registered group.
 * @param array                $item     WordPress top-level menu item.
 * @param int|float|string     $position WordPress menu position.
 * @return bool
 */
function omnibar_admin_menu_groups_group_matches_item( $group, $item, $position ) {
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
 * Register focus groups and annotate their existing top-level menu items.
 */
function omnibar_admin_menu_groups_prepare_menu() {
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
			if ( omnibar_admin_menu_groups_group_matches_item( $group, $item, $position ) ) {
				$matched_group = $group_id;
				break;
			}
		}

		/**
		 * Filters the focus group assigned to one top-level admin-menu item.
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

		$classes[] = 'omnibar-admin-menu-group';
		$classes[] = 'omnibar-admin-menu-group--' . sanitize_html_class( $matched_group );
		$item[4]   = implode( ' ', array_unique( $classes ) );
	}
	unset( $item );
}
add_action( 'admin_menu', 'omnibar_admin_menu_groups_prepare_menu', PHP_INT_MAX );

/**
 * Resolve a submenu slug to the URL WordPress would render beneath Appearance.
 *
 * @param string $slug Original submenu slug.
 * @return string
 */
function omnibar_admin_menu_groups_get_appearance_destination( $slug ) {
	$slug = html_entity_decode( $slug, ENT_QUOTES, 'UTF-8' );

	if ( 'themes.php' === $slug ) {
		return 'themes.php#omnibar-appearance-themes';
	}

	$route = isset( $_GET['p'] )
		? sanitize_text_field( wp_unslash( $_GET['p'] ) )
		: '';

	if ( 'site-editor.php' === $slug && '/page' === untrailingslashit( $route ) ) {
		return 'site-editor.php?p=/';
	}

	if ( get_plugin_page_hook( $slug, 'themes.php' ) ) {
		return add_query_arg( 'page', $slug, 'themes.php' );
	}

	return $slug;
}

/**
 * Return a meaningful Dashicon for one promoted Appearance destination.
 *
 * @param string $slug Appearance destination.
 * @param array  $item Original submenu item.
 * @return string
 */
function omnibar_admin_menu_groups_get_appearance_icon( $slug, $item ) {
	$icons = array(
		'themes.php'                    => 'dashicons-admin-appearance',
		'site-editor.php'               => 'dashicons-edit',
		'site-editor.php?p=/'           => 'dashicons-edit',
		'site-editor.php?p=/template'   => 'dashicons-layout',
		'site-editor.php?p=/pattern'    => 'dashicons-block-default',
		'site-editor.php?p=/styles'     => 'dashicons-art',
		'site-editor.php?p=/navigation' => 'dashicons-menu',
	);
	$slug  = html_entity_decode( $slug, ENT_QUOTES, 'UTF-8' );
	$icon  = isset( $icons[ $slug ] ) ? $icons[ $slug ] : 'dashicons-admin-appearance';

	if ( false !== strpos( $slug, 'font' ) ) {
		$icon = 'dashicons-editor-textcolor';
	}

	/**
	 * Filters the icon used by a promoted Appearance menu item.
	 *
	 * @param string $icon Dashicon class.
	 * @param string $slug Destination slug.
	 * @param array  $item Original submenu item.
	 */
	return (string) apply_filters( 'omnibar_admin_menu_groups_appearance_icon', $icon, $slug, $item );
}

/**
 * Promote every Appearance submenu item into the top-level Appearance group.
 */
function omnibar_admin_menu_groups_promote_appearance_items() {
	global $menu, $submenu;

	if (
		! current_user_can( 'edit_theme_options' ) ||
		! is_array( $menu ) ||
		empty( $submenu['themes.php'] ) ||
		! is_array( $submenu['themes.php'] )
	) {
		return;
	}

	$parent_position = null;
	$parent_item     = null;

	foreach ( $menu as $position => $item ) {
		if ( is_array( $item ) && isset( $item[2] ) && 'themes.php' === $item[2] ) {
			$parent_position = $position;
			$parent_item     = $item;
			break;
		}
	}

	if ( null === $parent_item ) {
		return;
	}

	$appearance = array_values(
		array_filter(
			$submenu['themes.php'],
			static function ( $item ) {
				return is_array( $item ) && ! empty( $item[2] ) && current_user_can( $item[1] );
			}
		)
	);

	if ( ! $appearance ) {
		return;
	}

	foreach ( $appearance as &$item ) {
		$item[2] = omnibar_admin_menu_groups_get_appearance_destination( (string) $item[2] );
	}
	unset( $item );

	$menu[ $parent_position ][4] = trim(
		( isset( $menu[ $parent_position ][4] ) ? (string) $menu[ $parent_position ][4] : '' ) .
		' omnibar-admin-appearance-parent'
	);

	$base_position  = (float) $parent_position;
	$parent_classes = isset( $parent_item[4] )
		? preg_split( '/\s+/', trim( (string) $parent_item[4] ) )
		: array();
	$parent_classes = array_values( array_filter( (array) $parent_classes ) );
	$parent_classes = array_diff(
		$parent_classes,
		array( 'current', 'wp-has-current-submenu', 'wp-menu-open', 'menu-top-first', 'menu-top-last' )
	);
	$slot           = 1;
	$seen_slugs     = array();

	foreach ( $appearance as $item ) {
		$slug = (string) $item[2];

		if ( isset( $seen_slugs[ $slug ] ) ) {
			continue;
		}

		$seen_slugs[ $slug ] = true;
		$position            = number_format( $base_position + ( $slot / 1000 ), 3, '.', '' );

		while ( isset( $menu[ $position ] ) ) {
			++$slot;
			$position = number_format( $base_position + ( $slot / 1000 ), 3, '.', '' );
		}

		$classes   = $parent_classes;
		$classes[] = 'omnibar-admin-appearance-item';

		$id_suffix = sanitize_key( preg_replace( '/[^a-z0-9]+/i', '-', $slug ) );
		$title     = isset( $item[3] ) && '' !== $item[3]
			? $item[3]
			: wp_strip_all_tags( $item[0] );

		$menu[ $position ] = array(
			$item[0],
			$item[1],
			$slug,
			$title,
			implode( ' ', array_unique( $classes ) ),
			'omnibar-menu-appearance-' . $id_suffix,
			omnibar_admin_menu_groups_get_appearance_icon( $slug, $item ),
		);

		++$slot;
	}
}
add_action( 'admin_menu', 'omnibar_admin_menu_groups_promote_appearance_items', PHP_INT_MAX - 1 );

/**
 * Load the collapsible group presentation throughout wp-admin.
 */
function omnibar_admin_menu_groups_enqueue_assets() {
	$asset_url = plugin_dir_url( __FILE__ ) . 'assets/';
	$groups    = omnibar_get_focus_groups();
	$labels    = array();

	foreach ( $groups as $group_id => $group ) {
		$labels[ $group_id ] = $group['label'];
	}

	wp_enqueue_style(
		'omnibar-admin-menu-groups',
		$asset_url . 'admin-menu-groups.css',
		array(),
		OMNIBAR_ADMIN_MENU_GROUPS_VERSION
	);

	wp_enqueue_script(
		'omnibar-admin-menu-groups',
		$asset_url . 'admin-menu-groups.js',
		array(),
		OMNIBAR_ADMIN_MENU_GROUPS_VERSION,
		false
	);

	wp_localize_script(
		'omnibar-admin-menu-groups',
		'OmnibarAdminMenuGroups',
		array(
			'groupOrder'  => array_keys( $groups ),
			'groupLabels' => $labels,
		)
	);
}
add_action( 'admin_enqueue_scripts', 'omnibar_admin_menu_groups_enqueue_assets' );
