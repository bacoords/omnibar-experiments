=== Omnibar Editor Menu Trigger ===
Contributors: briancoords
Tags: admin, editor, navigation
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: omnibar-admin-drawer
Stable tag: 0.1.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Moves the Omnibar admin-drawer trigger into the editor header's back-button position.

== Description ==

This experiment keeps the shared Omnibar admin drawer while replacing the editor header's native back control with a menu button. The WordPress logo and its Core dropdown remain unchanged in the admin toolbar.

The Site Editor's existing back-button position is reused. On editor screens that do not render that position, the plugin creates a matching control, including a temporary top-left control on the Site Editor landing screen. The control follows the drawer's open state and remains available when Gutenberg re-renders the header.

== Changelog ==

= 0.1.2 =

* Keep the default WordPress toolbar icon and dropdown alongside the editor trigger.

= 0.1.1 =

* Use Gutenberg's drawerLeft icon for the editor menu trigger.

= 0.1.0 =

* Add the editor-header menu trigger experiment.
