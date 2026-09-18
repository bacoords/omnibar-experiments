=== Omnibar Collapsible Menu Groups ===
Contributors: briancoords
Tags: admin, menu, navigation
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: omnibar-admin-drawer
Stable tag: 0.2.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Experimental collapsible group hierarchy for the WordPress admin menu.

== Description ==

This plugin provides collapsible Content, Appearance, and Settings groups for WordPress's core admin menu. It also exposes a focus-group registration API so plugins can opt their existing top-level destinations into an additional collapsible group. WooCommerce is included as an example integration.

Only explicitly registered menu items are grouped. Every other top-level menu item and separator stays in its original location and retains its normal WordPress behavior.

Open groups persist between page loads, while the active destination's group is always opened. The plugin owns only the injected group headings, collapsed state, compact labels, and chevrons; general sidebar presentation belongs to the main Omnibar plugin.

Activate or deactivate this plugin to toggle the complete grouping and hierarchy experiment without affecting the Omnibar toolbar, editor drawer, Site Editor integration, or Better Menu Icons plugin.

== Registering a focus group ==

Register groups after admin menus exist by using the `omnibar_register_focus_groups` action:

```
add_action(
	'omnibar_register_focus_groups',
	function () {
		omnibar_register_focus_group(
			'my-plugin',
			array(
				'label'      => __( 'My Plugin', 'my-plugin' ),
				'menu_slugs' => array(
					'my-plugin',
					'edit.php?post_type=my-content',
				),
			)
		);
	}
);
```

Groups can match exact `menu_slugs`, exact `menu_ids`, or provide a `matcher` callback. The callback receives the WordPress menu item array, its numeric position, and the registered group.

WordPress continues to own menu capabilities, URLs, callbacks, active states, and submenu behavior. This plugin changes only the grouping and collapsed state of registered top-level rows.

== Changelog ==

= 0.2.1 =

* Use the shared focus-group API provided by Omnibar Admin Drawer.

= 0.2.0 =

* Replace numeric position ranges with explicit focus-group registration.
* Keep unregistered menu items and separators in place.
* Add default Content, Appearance, and Settings groups.
* Add a prototype WooCommerce group through the public API.
