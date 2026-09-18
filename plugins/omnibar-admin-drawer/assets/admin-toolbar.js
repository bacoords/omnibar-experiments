( function () {
	'use strict';

	const root = document.documentElement;
	const enabledClass = 'omnibar-admin-toolbar-enabled';

	root.classList.add( enabledClass );

	function initializeToolbar() {
		const settings = window.OmnibarAdminToolbar || {};
		const labels = {
			commandPalette: settings.commandPalette || 'Open command palette',
			updates: settings.updates || 'Updates',
			comments: settings.comments || 'Comments',
		};
		const accountItem = document.getElementById( 'wp-admin-bar-my-account' );
		const toolbarGroup = accountItem?.parentElement;

		if ( ! accountItem || ! toolbarGroup ) {
			root.classList.remove( enabledClass );
			return;
		}

		[
			[ 'wp-admin-bar-command-palette', labels.commandPalette ],
			[ 'wp-admin-bar-updates', labels.updates ],
			[ 'wp-admin-bar-comments', labels.comments ],
		].forEach( ( [ id, accessibleLabel ] ) => {
			const item = document.getElementById( id );
			const link = item?.querySelector( ':scope > .ab-item' );

			if ( ! item || ! link ) {
				return;
			}

			item.classList.add( 'omnibar-admin-bar-utility' );
			link.setAttribute(
				'aria-label',
				link.querySelector( '.screen-reader-text' )?.textContent.trim() || accessibleLabel
			);
			toolbarGroup.insertBefore( item, accountItem );
		} );

		document
			.getElementById( 'menu-comments' )
			?.classList.add( 'omnibar-admin-menu-item-relocated' );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initializeToolbar );
	} else {
		initializeToolbar();
	}
} )();
