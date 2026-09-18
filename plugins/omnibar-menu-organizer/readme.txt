=== Omnibar Menu Organizer ===
Contributors: briancoords
Tags: admin, menu, navigation, organization
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Requires Plugins: omnibar-admin-drawer
Stable tag: 0.2.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Build a custom WordPress admin-menu order with user-created collapsible groups.

== Description ==

Omnibar Menu Organizer adds a small Edit control after the WordPress admin menu. Entering edit mode reveals Create Group, Auto organize, and Reset to default controls beside it. Administrators can reorder top-level menu items, move them into user-created collapsible groups, reorder complete groups, and move items back outside groups. Auto organize groups core and unowned content types under Content and the core Plugins, Users, Tools, and Settings rows under Settings. Visible plugin-owned rows, including plugin-owned post types, go into Plugins directly above Settings; when one plugin registers multiple visible top-level rows, those rows receive a dedicated group named after that plugin. Grouped items receive a subtle visual inset while retaining their normal top-level behavior.

Existing WordPress parent and submenu relationships remain intact. The organizer moves only top-level menu rows in the rendered sidebar, so plugin callbacks, screen IDs, capabilities, and nested submenu items continue to use WordPress's native hierarchy.

The layout is stored as a site-wide option through a capability-protected REST endpoint. Newly registered or unavailable menu items are handled without removing them from the saved layout.
