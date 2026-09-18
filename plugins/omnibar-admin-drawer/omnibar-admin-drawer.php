<?php
/**
 * Plugin Name:       Omnibar Admin Bar & Editor Drawer
 * Description:       Rearranges the admin toolbar and brings the WordPress admin menu into the block and Site Editors.
 * Version:           0.17.1
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Author:            Brian Coords
 * Text Domain:       omnibar-admin-drawer
 */

defined( 'ABSPATH' ) || exit;

define( 'OMNIBAR_ADMIN_DRAWER_VERSION', '0.17.1' );

/**
 * Register a code-defined admin-menu focus group.
 *
 * Plugins should call this function on the `omnibar_register_focus_groups`
 * action. WordPress continues to own the menu items, their capabilities, and
 * their destinations; a focus group associates existing top-level items with
 * a named presentation group.
 *
 * @param string               $group_id Unique group identifier.
 * @param array<string, mixed> $args {
 *     Focus-group arguments.
 *
 *     @type string        $label      Human-readable group label.
 *     @type string[]      $menu_slugs Exact top-level menu slugs.
 *     @type string[]      $menu_ids   Exact top-level menu hook IDs.
 *     @type callable|null $matcher    Optional callback receiving the menu item and position.
 *     @type int           $priority   Matching and presentation priority. Default 10.
 * }
 * @return bool Whether the group was registered.
 */
function omnibar_register_focus_group( $group_id, $args = array() ) {
	global $omnibar_focus_groups;

	$group_id = sanitize_key( (string) $group_id );
	$args     = wp_parse_args(
		$args,
		array(
			'label'      => '',
			'menu_slugs' => array(),
			'menu_ids'   => array(),
			'matcher'    => null,
			'priority'   => 10,
		)
	);

	$label      = sanitize_text_field( (string) $args['label'] );
	$menu_slugs = array_values(
		array_unique(
			array_filter(
				array_map( 'omnibar_normalize_focus_group_menu_slug', (array) $args['menu_slugs'] )
			)
		)
	);
	$menu_ids   = array_values(
		array_unique(
			array_filter(
				array_map( 'sanitize_key', (array) $args['menu_ids'] )
			)
		)
	);
	$matcher    = is_callable( $args['matcher'] ) ? $args['matcher'] : null;

	if ( '' === $group_id || '' === $label || ( ! $menu_slugs && ! $menu_ids && null === $matcher ) ) {
		return false;
	}

	if ( ! is_array( $omnibar_focus_groups ) ) {
		$omnibar_focus_groups = array();
	}

	$omnibar_focus_groups[ $group_id ] = array(
		'id'         => $group_id,
		'label'      => $label,
		'menu_slugs' => $menu_slugs,
		'menu_ids'   => $menu_ids,
		'matcher'    => $matcher,
		'priority'   => (int) $args['priority'],
	);

	return true;
}

/**
 * Explicitly admin-scoped registration alias.
 *
 * @param string               $group_id Unique group identifier.
 * @param array<string, mixed> $args     Focus-group arguments.
 * @return bool Whether the group was registered.
 */
function omnibar_register_admin_focus_group( $group_id, $args = array() ) {
	return omnibar_register_focus_group( $group_id, $args );
}

/**
 * Normalize a registered WordPress menu slug for exact matching.
 *
 * @param mixed $slug Raw menu slug.
 * @return string
 */
function omnibar_normalize_focus_group_menu_slug( $slug ) {
	return trim( html_entity_decode( (string) $slug, ENT_QUOTES, 'UTF-8' ) );
}

/**
 * Clear registered focus groups before rebuilding the registry.
 */
function omnibar_reset_focus_groups() {
	global $omnibar_focus_groups;

	$omnibar_focus_groups = array();
}

/**
 * Return all registered focus groups in deterministic priority order.
 *
 * @return array<string, array<string, mixed>>
 */
function omnibar_get_focus_groups() {
	global $omnibar_focus_groups;

	$groups = is_array( $omnibar_focus_groups )
		? $omnibar_focus_groups
		: array();

	uasort(
		$groups,
		static function ( $first, $second ) {
			return $first['priority'] <=> $second['priority'];
		}
	);

	return $groups;
}

/**
 * Simplify the account toolbar trigger while keeping its greeting available in
 * the existing account dropdown.
 *
 * @param WP_Admin_Bar $wp_admin_bar Admin toolbar instance.
 */
function omnibar_admin_customize_account_toolbar( $wp_admin_bar ) {
	$user_id      = get_current_user_id();
	$current_user = wp_get_current_user();
	$account      = $wp_admin_bar->get_node( 'my-account' );
	$user_info    = $wp_admin_bar->get_node( 'user-info' );

	if ( ! $user_id || ! $account ) {
		return;
	}

	/* translators: %s: Current user's display name. */
	$account_label = sprintf( __( 'Account: %s', 'omnibar-admin-drawer' ), $current_user->display_name );
	$account_meta  = (array) $account->meta;
	$avatar        = get_avatar( $user_id, 28 );

	$account_meta['menu_title'] = $account_label;
	$account_meta['title']      = $account_label;

	$wp_admin_bar->add_node(
		array(
			'id'     => 'my-account',
			'parent' => $account->parent,
			'group'  => $account->group,
			'title'  => $avatar . '<span class="screen-reader-text">' . esc_html( $account_label ) . '</span>',
			'href'   => $account->href,
			'meta'   => $account_meta,
		)
	);

	if ( ! $user_info ) {
		return;
	}

	/* translators: %s: Current user's display name. */
	$howdy = sprintf( __( 'Howdy, %s' ), esc_html( $current_user->display_name ) );
	$title = get_avatar( $user_id, 64 );
	$title .= '<span class="display-name omnibar-account-greeting">' . $howdy . '</span>';

	if ( $current_user->display_name !== $current_user->user_login ) {
		$title .= '<span class="username">' . esc_html( $current_user->user_login ) . '</span>';
	}

	if ( false !== $user_info->href ) {
		$title .= '<span class="display-name edit-profile">' . esc_html__( 'Edit Profile' ) . '</span>';
	}

	$wp_admin_bar->add_node(
		array(
			'id'     => 'user-info',
			'parent' => $user_info->parent,
			'group'  => $user_info->group,
			'title'  => $title,
			'href'   => $user_info->href,
			'meta'   => (array) $user_info->meta,
		)
	);
}
add_action( 'admin_bar_menu', 'omnibar_admin_customize_account_toolbar', PHP_INT_MAX );

/**
 * Determine whether the current screen uses the block or Site Editor.
 *
 * Conventional wp-admin screens retain their native toolbar and persistent
 * admin menu.
 *
 * @return bool
 */
function omnibar_admin_drawer_should_enable() {
	if ( ! is_admin() ) {
		return false;
	}

	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

	if ( ! $screen ) {
		return false;
	}

	if ( method_exists( $screen, 'is_block_editor' ) && $screen->is_block_editor() ) {
		return true;
	}

	$screen_id   = isset( $screen->id ) ? (string) $screen->id : '';
	$screen_base = isset( $screen->base ) ? (string) $screen->base : '';

	if ( false !== strpos( $screen_id, 'site-editor' ) || false !== strpos( $screen_base, 'site-editor' ) ) {
		return true;
	}

	return false;
}

/**
 * Determine whether the current screen is the Site Editor.
 *
 * @return bool
 */
function omnibar_admin_drawer_is_site_editor() {
	if ( ! is_admin() ) {
		return false;
	}

	$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;

	if ( ! $screen ) {
		return false;
	}

	$screen_id   = isset( $screen->id ) ? (string) $screen->id : '';
	$screen_base = isset( $screen->base ) ? (string) $screen->base : '';

	return false !== strpos( $screen_id, 'site-editor' ) || false !== strpos( $screen_base, 'site-editor' );
}

/**
 * Determine whether the current Site Editor route is the Pages screen.
 *
 * @return bool
 */
function omnibar_admin_is_site_editor_pages_route() {
	if ( ! omnibar_admin_drawer_is_site_editor() ) {
		return false;
	}

	$route = isset( $_GET['p'] )
		? sanitize_text_field( wp_unslash( $_GET['p'] ) )
		: '';

	return '/page' === untrailingslashit( $route );
}

/**
 * Make Pages the active admin menu parent on the Site Editor Pages route.
 *
 * @param string $parent_file Current parent menu file.
 * @return string
 */
function omnibar_admin_use_pages_menu_parent( $parent_file ) {
	if ( omnibar_admin_is_site_editor_pages_route() ) {
		return 'edit.php?post_type=page';
	}

	return $parent_file;
}
add_filter( 'parent_file', 'omnibar_admin_use_pages_menu_parent', PHP_INT_MAX );

/**
 * Highlight the Pages submenu entry on the Site Editor Pages route.
 *
 * @param string $submenu_file Current submenu file.
 * @return string
 */
function omnibar_admin_use_pages_submenu_file( $submenu_file ) {
	if ( omnibar_admin_is_site_editor_pages_route() ) {
		return 'edit.php?post_type=page';
	}

	return $submenu_file;
}
add_filter( 'submenu_file', 'omnibar_admin_use_pages_submenu_file', PHP_INT_MAX );

/**
 * Determine whether the WordPress logo should control the drawer.
 *
 * Companion experiments can provide another trigger while leaving the Core
 * WordPress logo and its dropdown unchanged.
 *
 * @return bool Whether to use the WordPress logo as the drawer toggle.
 */
function omnibar_admin_drawer_should_use_wp_logo_toggle() {
	return (bool) apply_filters( 'omnibar_admin_drawer_use_wp_logo_toggle', true );
}

/**
 * Replace the WordPress logo dropdown with the drawer toggle.
 *
 * @param WP_Admin_Bar $wp_admin_bar Admin toolbar instance.
 */
function omnibar_admin_drawer_customize_toolbar( $wp_admin_bar ) {
	if (
		! omnibar_admin_drawer_should_enable() ||
		! omnibar_admin_drawer_should_use_wp_logo_toggle()
	) {
		return;
	}

	$wp_logo = $wp_admin_bar->get_node( 'wp-logo' );

	if ( ! $wp_logo ) {
		return;
	}

	// Remove all existing dropdown descendants, including plugin-added nodes.
	$nodes       = (array) $wp_admin_bar->get_nodes();
	$descendants = array( 'wp-logo' => true );
	$found_node  = true;

	while ( $found_node ) {
		$found_node = false;

		foreach ( $nodes as $node ) {
			if ( isset( $descendants[ $node->parent ] ) && ! isset( $descendants[ $node->id ] ) ) {
				$descendants[ $node->id ] = true;
				$found_node               = true;
			}
		}
	}

	unset( $descendants['wp-logo'] );

	foreach ( array_keys( $descendants ) as $node_id ) {
		$wp_admin_bar->remove_node( $node_id );
	}

	$meta               = (array) $wp_logo->meta;
	$classes            = isset( $meta['class'] ) ? preg_split( '/\s+/', $meta['class'] ) : array();
	$classes[]          = 'omnibar-admin-drawer-toggle';
	$meta['class']      = implode( ' ', array_unique( array_filter( $classes ) ) );
	$meta['title']      = __( 'Toggle admin menu', 'omnibar-admin-drawer' );
	$meta['menu_title'] = __( 'Admin menu', 'omnibar-admin-drawer' );

	$wp_admin_bar->add_node(
		array(
			'id'     => 'wp-logo',
			'parent' => $wp_logo->parent,
			'group'  => $wp_logo->group,
			'title'  => '<span class="ab-icon" aria-hidden="true"></span><span class="screen-reader-text">' .
				esc_html__( 'Admin menu', 'omnibar-admin-drawer' ) .
				'</span>',
			'href'   => '#adminmenumain',
			'meta'   => $meta,
		)
	);
}
add_action( 'admin_bar_menu', 'omnibar_admin_drawer_customize_toolbar', PHP_INT_MAX );

/**
 * Register direct Site Editor destinations beneath Appearance on every admin
 * screen.
 */
function omnibar_admin_register_site_editor_appearance_destinations() {
	global $submenu;

	if (
		! wp_is_block_theme() ||
		! current_user_can( 'edit_theme_options' )
	) {
		return;
	}

	if ( ! isset( $submenu['themes.php'] ) || ! is_array( $submenu['themes.php'] ) ) {
		return;
	}

	$destinations = array(
		array( __( 'Templates', 'omnibar-admin-drawer' ), '/template' ),
		array( __( 'Patterns', 'omnibar-admin-drawer' ), '/pattern' ),
		array( __( 'Styles', 'omnibar-admin-drawer' ), '/styles' ),
		array( __( 'Navigation', 'omnibar-admin-drawer' ), '/navigation' ),
	);
	$appearance   = array_values( $submenu['themes.php'] );
	$existing     = array();
	$insert_at    = count( $appearance );

	foreach ( $appearance as $index => $item ) {
		if ( isset( $item[2] ) ) {
			$existing[] = $item[2];

			if ( 'site-editor.php' === $item[2] ) {
				$insert_at = $index + 1;
			}
		}
	}

	$new_items = array();

	foreach ( $destinations as $destination ) {
		$menu_slug = add_query_arg( 'p', $destination[1], 'site-editor.php' );

		if ( in_array( $menu_slug, $existing, true ) ) {
			continue;
		}

		$new_items[] = array(
			$destination[0],
			'edit_theme_options',
			$menu_slug,
		);
	}

	if ( $new_items ) {
		array_splice( $appearance, $insert_at, 0, $new_items );
		$submenu['themes.php'] = $appearance;
	}
}
add_action( 'admin_menu', 'omnibar_admin_register_site_editor_appearance_destinations', PHP_INT_MAX - 2 );

/**
 * Load the shared admin-sidebar presentation independently of menu grouping.
 */
function omnibar_admin_sidebar_enqueue_assets() {
	wp_enqueue_style(
		'omnibar-admin-sidebar',
		plugin_dir_url( __FILE__ ) . 'assets/admin-sidebar.css',
		array(),
		OMNIBAR_ADMIN_DRAWER_VERSION
	);
}
add_action( 'admin_enqueue_scripts', 'omnibar_admin_sidebar_enqueue_assets' );

/**
 * Load the drawer behavior only on editor screens.
 */
function omnibar_admin_drawer_enqueue_assets() {
	if ( ! omnibar_admin_drawer_should_enable() ) {
		return;
	}

	$asset_url = plugin_dir_url( __FILE__ ) . 'assets/';

	wp_enqueue_style(
		'omnibar-admin-drawer',
		$asset_url . 'admin-drawer.css',
		array(),
		OMNIBAR_ADMIN_DRAWER_VERSION
	);

	// Load in the head so the menu can be moved off-canvas before the page paints.
	wp_enqueue_script(
		'omnibar-admin-drawer',
		$asset_url . 'admin-drawer.js',
		array(),
		OMNIBAR_ADMIN_DRAWER_VERSION,
		false
	);

	wp_localize_script(
		'omnibar-admin-drawer',
		'OmnibarAdminDrawer',
		array(
			'openLabel'       => __( 'Open admin menu', 'omnibar-admin-drawer' ),
			'closeLabel'      => __( 'Close admin menu', 'omnibar-admin-drawer' ),
			'startOpen'       => omnibar_admin_drawer_is_site_editor(),
			'useWpLogoToggle' => omnibar_admin_drawer_should_use_wp_logo_toggle(),
		)
	);
}
add_action( 'admin_enqueue_scripts', 'omnibar_admin_drawer_enqueue_assets' );

/**
 * Load the compact toolbar arrangement in wp-admin and on logged-in front-end
 * pages whenever the WordPress admin bar is visible.
 */
function omnibar_admin_toolbar_enqueue_assets() {
	if ( ! is_admin_bar_showing() ) {
		return;
	}

	$asset_url = plugin_dir_url( __FILE__ ) . 'assets/';

	wp_enqueue_style(
		'omnibar-admin-toolbar',
		$asset_url . 'admin-toolbar.css',
		array(),
		OMNIBAR_ADMIN_DRAWER_VERSION
	);

	wp_enqueue_script(
		'omnibar-admin-toolbar',
		$asset_url . 'admin-toolbar.js',
		array(),
		OMNIBAR_ADMIN_DRAWER_VERSION,
		false
	);

	wp_localize_script(
		'omnibar-admin-toolbar',
		'OmnibarAdminToolbar',
		array(
			'commandPalette' => __( 'Open command palette', 'omnibar-admin-drawer' ),
			'updates'        => __( 'Updates', 'omnibar-admin-drawer' ),
			'comments'       => __( 'Comments', 'omnibar-admin-drawer' ),
		)
	);
}
add_action( 'admin_enqueue_scripts', 'omnibar_admin_toolbar_enqueue_assets' );
add_action( 'wp_enqueue_scripts', 'omnibar_admin_toolbar_enqueue_assets' );
