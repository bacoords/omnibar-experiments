# Omnibar Experiments

Plugin-based experiments for a more focused and flexible WordPress admin navigation experience. These are ordinary WordPress plugins, not WordPress or Gutenberg forks.

## Try the experiments

| Experiment | Playground |
| --- | --- |
| Admin Drawer | [Launch in WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/bacoords/omnibar-experiments/v0.1.3/blueprints/admin-drawer.json) |
| Collapsible Menu Groups | [Launch in WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/bacoords/omnibar-experiments/v0.1.3/blueprints/collapsible-menu-groups.json) |
| Menu Organizer | [Launch in WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/bacoords/omnibar-experiments/v0.1.3/blueprints/menu-organizer.json) |
| Focus Menu | [Launch in WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/bacoords/omnibar-experiments/v0.1.3/blueprints/focus-menu.json) |
| Editor Menu Trigger | [Launch in WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/bacoords/omnibar-experiments/v0.1.3/blueprints/editor-menu-trigger.json) |

Playground starts a temporary WordPress installation and logs you into wp-admin automatically. Changes disappear when the Playground is reset.

## Repository layout

```text
plugins/
  omnibar-admin-drawer/       Shared toolbar, editor drawer, sidebar styling, and focus-group API
  omnibar-admin-menu-groups/  Code-defined collapsible menu groups
  omnibar-menu-organizer/     User-configurable menu ordering and groups
  omnibar-focus-menu/         Contextual one-way focus mode
  omnibar-editor-menu-trigger/ Editor-header trigger for the shared admin drawer
  bc-better-menu-icons/       Optional @wordpress/icons-based Dashicons replacement
blueprints/                   Public WordPress Playground configurations
```

`omnibar-admin-drawer` is the shared foundation. Each menu experiment depends on it. The Collapsible Menu Groups, Menu Organizer, and Focus Menu plugins are alternative presentations; use one at a time. Editor Menu Trigger can be layered onto the drawer with or without one of those menu presentations.

## Local installation

1. Copy `plugins/omnibar-admin-drawer` into `wp-content/plugins/` and activate it.
2. Copy and activate one menu experiment.
3. Optionally copy and activate `plugins/bc-better-menu-icons` to match the visual treatment used by the Playground demos.

## Releases and previews

Tags beginning with `v` publish installable ZIP files for every plugin. Pull requests receive a WordPress Playground preview of the Focus Menu configuration.

## License

GPL-2.0-or-later.
