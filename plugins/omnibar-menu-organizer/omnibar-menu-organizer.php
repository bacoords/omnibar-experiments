<?php
/**
 * Plugin Name:       Omnibar Menu Organizer
 * Description:       Build a custom WordPress admin-menu order with user-created collapsible groups.
 * Version:           0.2.3
 * Requires at least: 6.5
 * Requires PHP:      7.4
 * Requires Plugins:  omnibar-admin-drawer
 * Author:            Brian Coords
 * Text Domain:       omnibar-menu-organizer
 */

defined( 'ABSPATH' ) || exit;

define( 'OMNIBAR_MENU_ORGANIZER_VERSION', '0.2.3' );
define( 'OMNIBAR_MENU_ORGANIZER_OPTION', 'omnibar_menu_organizer_layout' );

/**
 * Return an empty organizer layout.
 *
 * @return array<string, mixed>
 */
function omnibar_menu_organizer_get_default_layout() {
	return array(
		'version' => 1,
		'order'   => array(),
		'groups'  => array(),
	);
}

/**
 * Sanitize a layout received from the browser or loaded from the database.
 *
 * Menu keys are presentation identifiers only. WordPress still owns every
 * item's URL, capability, callback, parent, and submenu hierarchy.
 *
 * @param mixed $value Raw layout.
 * @return array<string, mixed>
 */
function omnibar_menu_organizer_sanitize_layout( $value ) {
	$layout = omnibar_menu_organizer_get_default_layout();

	if ( ! is_array( $value ) ) {
		return $layout;
	}

	$groups         = isset( $value['groups'] ) && is_array( $value['groups'] )
		? array_slice( $value['groups'], 0, 50 )
		: array();
	$sanitized      = array();
	$seen_group_ids = array();

	foreach ( $groups as $group ) {
		if ( ! is_array( $group ) ) {
			continue;
		}

		$id    = isset( $group['id'] ) ? sanitize_key( (string) $group['id'] ) : '';
		$label = isset( $group['label'] ) ? sanitize_text_field( (string) $group['label'] ) : '';

		if ( '' === $id || '' === $label || isset( $seen_group_ids[ $id ] ) ) {
			continue;
		}

		$items      = isset( $group['items'] ) && is_array( $group['items'] )
			? array_slice( $group['items'], 0, 250 )
			: array();
		$clean_items = array();

		foreach ( $items as $item ) {
			$item = sanitize_key( (string) $item );

			if ( '' !== $item && ! in_array( $item, $clean_items, true ) ) {
				$clean_items[] = $item;
			}
		}

		$seen_group_ids[ $id ] = true;
		$sanitized[]           = array(
			'id'        => $id,
			'label'     => $label,
			'items'     => $clean_items,
			'collapsed' => ! empty( $group['collapsed'] ),
		);
	}

	$order       = isset( $value['order'] ) && is_array( $value['order'] )
		? array_slice( $value['order'], 0, 500 )
		: array();
	$clean_order = array();

	foreach ( $order as $token ) {
		$token = (string) $token;

		if ( 0 === strpos( $token, 'group:' ) ) {
			$id = sanitize_key( substr( $token, 6 ) );

			if ( '' !== $id && isset( $seen_group_ids[ $id ] ) ) {
				$clean_order[] = 'group:' . $id;
			}
		} elseif ( 0 === strpos( $token, 'item:' ) ) {
			$id = sanitize_key( substr( $token, 5 ) );

			if ( '' !== $id ) {
				$clean_order[] = 'item:' . $id;
			}
		}
	}

	$layout['order']  = array_values( array_unique( $clean_order ) );
	$layout['groups'] = $sanitized;

	return $layout;
}

/**
 * Return the stored layout.
 *
 * @return array<string, mixed>
 */
function omnibar_menu_organizer_get_layout() {
	return omnibar_menu_organizer_sanitize_layout(
		get_option( OMNIBAR_MENU_ORGANIZER_OPTION, array() )
	);
}

/**
 * Convert WordPress's rendered menu ID into the key used by the browser.
 *
 * @param string $hook_name Menu hook name.
 * @return string
 */
function omnibar_menu_organizer_get_menu_key( $hook_name ) {
	$dom_id = preg_replace( '|[^a-zA-Z0-9_:.]|', '-', (string) $hook_name );
	$key    = preg_replace( '/[^a-z0-9_-]+/', '-', strtolower( (string) $dom_id ) );

	return trim( (string) $key, '-' );
}

/**
 * Return plugin records used to match callback source files to plugins.
 *
 * @return array<int, array<string, string>>
 */
function omnibar_menu_organizer_get_plugin_records() {
	if ( ! function_exists( 'get_plugins' ) ) {
		require_once ABSPATH . 'wp-admin/includes/plugin.php';
	}

	$records = array();

	foreach ( get_plugins() as $plugin_file => $plugin_data ) {
		$directory = dirname( $plugin_file );
		$slug      = '.' === $directory
			? sanitize_key( pathinfo( $plugin_file, PATHINFO_FILENAME ) )
			: sanitize_key( basename( $directory ) );
		$name      = isset( $plugin_data['Name'] )
			? wp_strip_all_tags( (string) $plugin_data['Name'] )
			: $slug;

		$records[] = array(
			'file'      => wp_normalize_path( $plugin_file ),
			'directory' => wp_normalize_path( $directory ),
			'slug'      => $slug,
			'name'      => $name,
		);
	}

	return $records;
}

/**
 * Match a plugin-relative file to its plugin record.
 *
 * @param string                           $relative_file Plugin-relative file.
 * @param array<int, array<string, string>> $records       Installed plugin records.
 * @return array<string, string>|null
 */
function omnibar_menu_organizer_find_plugin_record( $relative_file, $records ) {
	$relative_file = ltrim( wp_normalize_path( (string) $relative_file ), '/' );

	foreach ( $records as $record ) {
		if ( $relative_file === $record['file'] ) {
			return $record;
		}

		if ( '.' !== $record['directory'] && 0 === strpos( $relative_file, $record['directory'] . '/' ) ) {
			return $record;
		}
	}

	return null;
}

/**
 * Return the source filename for a registered hook callback.
 *
 * @param mixed $callback Hook callback.
 * @return string
 */
function omnibar_menu_organizer_get_callback_filename( $callback ) {
	try {
		if ( is_string( $callback ) && false !== strpos( $callback, '::' ) ) {
			$reflection = new ReflectionMethod( ...explode( '::', $callback, 2 ) );
		} elseif ( is_array( $callback ) && 2 === count( $callback ) ) {
			$reflection = new ReflectionMethod( $callback[0], $callback[1] );
		} elseif ( is_object( $callback ) && ! ( $callback instanceof Closure ) ) {
			$reflection = new ReflectionMethod( $callback, '__invoke' );
		} else {
			$reflection = new ReflectionFunction( $callback );
		}

		$file_name = $reflection->getFileName();
	} catch ( ReflectionException $error ) {
		return '';
	}

	return false === $file_name ? '' : wp_normalize_path( $file_name );
}

/**
 * Match a registered admin-page hook to the plugin that owns its callback.
 *
 * @param string                           $hook_name Admin-page hook name.
 * @param array<int, array<string, string>> $records   Installed plugin records.
 * @return array<string, string>|null
 */
function omnibar_menu_organizer_find_plugin_for_hook( $hook_name, $records ) {
	global $wp_filter;

	$hook = isset( $wp_filter[ $hook_name ] ) ? $wp_filter[ $hook_name ] : null;

	if ( ! ( $hook instanceof WP_Hook ) ) {
		return null;
	}

	foreach ( $hook->callbacks as $callbacks ) {
		foreach ( $callbacks as $callback_data ) {
			if ( ! isset( $callback_data['function'] ) ) {
				continue;
			}

			$file_name = omnibar_menu_organizer_get_callback_filename( $callback_data['function'] );

			if ( '' === $file_name ) {
				continue;
			}

			$record = omnibar_menu_organizer_find_plugin_record( plugin_basename( $file_name ), $records );

			if ( null !== $record ) {
				return $record;
			}
		}
	}

	return null;
}

/**
 * Extract the registered page slug from a menu URL or router-style slug.
 *
 * @param string $menu_slug Registered menu slug.
 * @return string
 */
function omnibar_menu_organizer_get_page_slug( $menu_slug ) {
	$menu_slug = html_entity_decode( (string) $menu_slug, ENT_QUOTES, get_bloginfo( 'charset' ) );
	$query_pos = strpos( $menu_slug, '?' );
	$query     = array();

	if ( false !== $query_pos ) {
		wp_parse_str( substr( $menu_slug, $query_pos + 1 ), $query );

		if ( ! empty( $query['page'] ) ) {
			return plugin_basename( (string) $query['page'] );
		}

		$menu_slug = substr( $menu_slug, 0, $query_pos );
	}

	$ampersand_pos = strpos( $menu_slug, '&' );

	if ( false !== $ampersand_pos ) {
		$menu_slug = substr( $menu_slug, 0, $ampersand_pos );
	}

	if ( '' === $menu_slug || '.php' === substr( $menu_slug, -4 ) ) {
		return '';
	}

	return plugin_basename( $menu_slug );
}

/**
 * Build the possible callback hooks behind a rendered top-level menu row.
 *
 * Router-style plugin rows often have no callback on their own hook. Their
 * destination or first submenu item points to the actual registered page.
 *
 * @param array<int, mixed> $item          Top-level menu item.
 * @param array<int, mixed> $submenu_items Child menu items.
 * @return array<int, string>
 */
function omnibar_menu_organizer_get_candidate_hooks( $item, $submenu_items ) {
	global $wp_filter;

	$hooks      = array( (string) $item[5] );
	$page_slugs = array();
	$parent     = (string) $item[2];
	$slugs      = array( $parent );

	foreach ( $submenu_items as $submenu_item ) {
		if ( is_array( $submenu_item ) && ! empty( $submenu_item[2] ) ) {
			$slugs[] = (string) $submenu_item[2];
		}
	}

	foreach ( $slugs as $slug ) {
		$page_slug = omnibar_menu_organizer_get_page_slug( $slug );

		if ( '' !== $page_slug ) {
			$page_slugs[] = $page_slug;
		}

		$hook = get_plugin_page_hook( $slug, $parent );

		if ( null !== $hook ) {
			$hooks[] = $hook;
		}

		if ( '' !== $page_slug ) {
			$hook = get_plugin_page_hook( $page_slug, $parent );

			if ( null !== $hook ) {
				$hooks[] = $hook;
			}
		}
	}

	foreach ( array_unique( $page_slugs ) as $page_slug ) {
		$suffix = '_page_' . preg_replace( '/\.php$/', '', $page_slug );

		foreach ( array_keys( $wp_filter ) as $registered_hook ) {
			if ( $suffix === substr( (string) $registered_hook, -strlen( $suffix ) ) ) {
				$hooks[] = (string) $registered_hook;
			}
		}
	}

	return array_values( array_unique( array_filter( $hooks ) ) );
}

/**
 * Discover which plugin owns each registered top-level admin menu row.
 *
 * WordPress registers the page callback on the top-level row's hook. The
 * callback's reflected source file gives us a stable owner without relying on
 * numeric menu positions, visible labels, or a hardcoded plugin list.
 *
 * @return array<string, array<string, string>>
 */
function omnibar_menu_organizer_get_menu_owners() {
	global $menu, $submenu;

	if ( ! is_array( $menu ) ) {
		return array();
	}

	$records = omnibar_menu_organizer_get_plugin_records();
	$owners  = array();
	$core_menu_keys = array(
		'menu-dashboard',
		'menu-posts',
		'menu-media',
		'menu-links',
		'menu-pages',
		'menu-comments',
		'menu-appearance',
		'menu-plugins',
		'menu-users',
		'menu-tools',
		'menu-settings',
	);

	foreach ( $menu as $item ) {
		if ( ! is_array( $item ) || empty( $item[5] ) || false !== strpos( (string) $item[4], 'wp-menu-separator' ) ) {
			continue;
		}

		$hook_name     = (string) $item[5];
		$key           = omnibar_menu_organizer_get_menu_key( $hook_name );

		if ( in_array( $key, $core_menu_keys, true ) ) {
			continue;
		}

		$record        = null;
		$submenu_items = isset( $submenu[ $item[2] ] ) && is_array( $submenu[ $item[2] ] )
			? $submenu[ $item[2] ]
			: array();

		foreach ( omnibar_menu_organizer_get_candidate_hooks( $item, $submenu_items ) as $candidate_hook ) {
			$record = omnibar_menu_organizer_find_plugin_for_hook( $candidate_hook, $records );

			if ( null !== $record ) {
				break;
			}
		}

		if ( null === $record && ! empty( $item[2] ) ) {
			$menu_file = strtok( (string) $item[2], '?' );
			$record    = omnibar_menu_organizer_find_plugin_record( plugin_basename( $menu_file ), $records );
		}

		if ( null === $record ) {
			continue;
		}

		if ( '' !== $key ) {
			$owners[ $key ] = array(
				'slug' => $record['slug'],
				'name' => $record['name'],
			);
		}
	}

	/**
	 * Filters the plugin ownership map used by Auto organize.
	 *
	 * @param array<string, array<string, string>> $owners Menu-key ownership map.
	 * @param array<int, mixed>                    $menu   Registered admin menu.
	 */
	return apply_filters( 'omnibar_menu_organizer_menu_owners', $owners, $menu );
}

/**
 * Register the REST endpoint used by the editor.
 */
function omnibar_menu_organizer_register_rest_routes() {
	register_rest_route(
		'omnibar-menu-organizer/v1',
		'/layout',
		array(
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => static function () {
					return current_user_can( 'manage_options' );
				},
				'callback'            => static function () {
					return rest_ensure_response( omnibar_menu_organizer_get_layout() );
				},
			),
			array(
				'methods'             => WP_REST_Server::EDITABLE,
				'permission_callback' => static function () {
					return current_user_can( 'manage_options' );
				},
				'callback'            => static function ( WP_REST_Request $request ) {
					$layout = omnibar_menu_organizer_sanitize_layout( $request->get_json_params() );

					update_option( OMNIBAR_MENU_ORGANIZER_OPTION, $layout, false );

					return rest_ensure_response( $layout );
				},
			),
		)
	);
}
add_action( 'rest_api_init', 'omnibar_menu_organizer_register_rest_routes' );

/**
 * Load the organizer on wp-admin screens that render the standard admin menu.
 */
function omnibar_menu_organizer_enqueue_assets() {
	$asset_url = plugin_dir_url( __FILE__ ) . 'assets/';

	wp_enqueue_style(
		'omnibar-menu-organizer',
		$asset_url . 'menu-organizer.css',
		array(),
		OMNIBAR_MENU_ORGANIZER_VERSION
	);

	wp_enqueue_script(
		'omnibar-menu-organizer',
		$asset_url . 'menu-organizer.js',
		array(),
		OMNIBAR_MENU_ORGANIZER_VERSION,
		true
	);

	wp_localize_script(
		'omnibar-menu-organizer',
		'OmnibarMenuOrganizer',
		array(
			'layout'    => omnibar_menu_organizer_get_layout(),
			'menuOwners' => omnibar_menu_organizer_get_menu_owners(),
			'canEdit'   => current_user_can( 'manage_options' ),
			'restUrl'   => esc_url_raw( rest_url( 'omnibar-menu-organizer/v1/layout' ) ),
			'restNonce' => wp_create_nonce( 'wp_rest' ),
			'labels'    => array(
				'edit'             => __( 'Edit menu', 'omnibar-menu-organizer' ),
				'done'             => __( 'Finish editing', 'omnibar-menu-organizer' ),
				'createGroup'      => __( 'Create group', 'omnibar-menu-organizer' ),
				'autoOrganize'     => __( 'Auto organize', 'omnibar-menu-organizer' ),
				'resetDefault'     => __( 'Reset to default', 'omnibar-menu-organizer' ),
				'contentGroup'     => __( 'Content', 'omnibar-menu-organizer' ),
				'settingsGroup'    => __( 'Settings', 'omnibar-menu-organizer' ),
				'pluginsGroup'     => __( 'Plugins', 'omnibar-menu-organizer' ),
				'groupName'        => __( 'Group name', 'omnibar-menu-organizer' ),
				'newGroup'         => __( 'New group', 'omnibar-menu-organizer' ),
				'create'           => __( 'Create', 'omnibar-menu-organizer' ),
				'cancel'           => __( 'Cancel', 'omnibar-menu-organizer' ),
				'saving'           => __( 'Saving…', 'omnibar-menu-organizer' ),
				'saved'            => __( 'Saved', 'omnibar-menu-organizer' ),
				'saveError'        => __( 'Could not save the menu layout.', 'omnibar-menu-organizer' ),
			)
		)
	);
}
add_action( 'admin_enqueue_scripts', 'omnibar_menu_organizer_enqueue_assets' );
