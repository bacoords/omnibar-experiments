=== Omnibar Editor Menu Trigger ===
Contributors: briancoords
Tags: admin, editor, navigation
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: omnibar-admin-drawer
Stable tag: 0.1.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Moves the Omnibar admin-drawer trigger into the editor header's back-button position.

== Description ==

This experiment keeps the shared Omnibar admin drawer while replacing the editor header's native back control with a menu button. The WordPress logo and its Core dropdown remain unchanged in the admin toolbar.

The Site Editor's existing back-button position is reused, and the control follows the drawer's open state when Gutenberg re-renders the editor header. Site Editor browsing screens such as Styles, Templates, and Patterns keep the fully visible menu without an injected toolbar.

== Changelog ==

= 0.1.3 =

* Do not inject a toolbar on Site Editor browsing screens where the menu is already visible.

= 0.1.2 =

* Keep the default WordPress toolbar icon and dropdown alongside the editor trigger.

= 0.1.1 =

* Use Gutenberg's drawerLeft icon for the editor menu trigger.

= 0.1.0 =

* Add the editor-header menu trigger experiment.
