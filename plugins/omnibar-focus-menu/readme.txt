=== Omnibar Focus Menu ===
Contributors: briancoords
Tags: admin, menu, navigation, focus
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: omnibar-admin-drawer
Stable tag: 0.1.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Code-defined focus modes for the WordPress admin menu.

== Description ==

Omnibar Focus Menu is an alternative to the collapsible menu-groups experiment.

When the current admin screen belongs to a registered focus group, the sidebar initially shows Dashboard followed by that group's top-level menu items. The Dashboard home icon becomes a back chevron; its first click reveals the complete WordPress menu, restores the home icon, and leaves the Dashboard link to navigate normally on its next click. There is no in-page control for returning to focus mode. Screens that do not belong to a group, including Dashboard itself, retain the normal menu.

The prototype registers three WordPress groups:

* Content: Posts, Media, Pages, and Comments.
* Appearance: the Appearance menu and its native submenu.
* Settings: Plugins, Users, Tools, and Settings.

It also fakes the integration WooCommerce could provide for WooCommerce, Products, Payments, Analytics, Marketing, and legacy Reports.

== Registering a group ==

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

WordPress continues to own menu capabilities, URLs, callbacks, active states, and submenu behavior. This extension changes only which top-level rows are presented in focus mode.

== Changelog ==

= 0.1.3 =

* Use the shared focus-group API provided by Omnibar Admin Drawer.

= 0.1.2 =

* Keep Dashboard at the top of every focused menu.
* Use the Dashboard icon as a one-way back control for revealing the full menu.

= 0.1.1 =

* Label the focused-state control with the active group name.
* Recalculate the admin-menu layout and page height when showing the full menu.

= 0.1.0 =

* Add the focus-group registration API.
* Add default Content, Appearance, Settings, and prototype WooCommerce groups.
* Add automatic focus mode with a reversible All menu control.
