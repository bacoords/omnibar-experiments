=== Omnibar Admin Bar & Editor Drawer ===
Contributors: briancoords
Tags: admin, toolbar, navigation
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.17.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Rearranges the admin toolbar and brings the WordPress admin menu into the block and Site Editors.

== Description ==

In the block editor and Site Editor, the plugin replaces the WordPress logo dropdown with an accessible drawer toggle. The drawer reuses WordPress's existing admin menu markup. On desktop it squeezes the complete editor shell beside the menu, keeping the canvas visible and interactive. At narrower widths it falls back to an overlay with backdrop-click support. The Escape key and reduced-motion preferences are supported in both layouts.

Appearance includes direct links to the Site Editor's Templates, Patterns, Styles, and Navigation screens on every admin page.

On block themes, the classic Pages list redirects to the Site Editor's Pages screen, where Pages receives the active admin-menu state instead of Editor.

The drawer starts open in the Site Editor and closed in post and page editors. It does not store its state, and the WordPress logo continues to toggle it in either direction. The Site Editor's native Design sidebar is hidden so it never competes with the admin menu.

Conventional wp-admin screens retain the persistent admin menu. The toolbar keeps its native actions while rearranging the selected utilities described below.

Command palette, Updates, and Comments are compacted into an icon cluster immediately before the account avatar, while New remains in WordPress's native left-side toolbar group. Updates and pending Comments use compact count badges. The redundant Comments entry is removed from the sidebar, and the account trigger shows only the avatar, with the "Howdy" greeting moved into its existing dropdown.

The compact toolbar arrangement also applies to logged-in front-end pages whenever the WordPress admin bar is visible.

The persistent admin sidebar uses a 180-pixel desktop width, increased row spacing, 13-pixel labels, slightly smaller icons, and a simplified active-item treatment. These presentation choices remain active independently of any menu-group experiment.

The plugin also provides the shared `omnibar_register_focus_group()` API used by the alternative menu-group experiments in this repository.

== Changelog ==

= 0.17.0 =

* Add the shared focus-group registration API for companion experiments.
