( function () {
	'use strict';

	const root = document.documentElement;
	const enabledClass = 'omnibar-admin-drawer-enabled';
	const openClass = 'omnibar-admin-drawer-open';
	const settings = window.OmnibarAdminDrawer || {};
	const startsOpen = [ true, 1, '1' ].includes( settings.startOpen );
	const transitionDuration = window.matchMedia(
		'(prefers-reduced-motion: reduce)'
	).matches
		? 0
		: 260;

	// CSS only changes the admin layout when JavaScript is available.
	root.classList.add( enabledClass );
	root.classList.toggle( openClass, startsOpen );

	function initializeDrawer() {
		const body = document.body;
		const drawer = document.getElementById( 'adminmenumain' );
		const toggle = document.querySelector(
			'#wp-admin-bar-wp-logo > .ab-item'
		);

		if ( ! body || ! drawer || ! toggle ) {
			root.classList.remove( enabledClass, openClass );
			return;
		}

		const labels = {
			openLabel: settings.openLabel || 'Open admin menu',
			closeLabel: settings.closeLabel || 'Close admin menu',
		};
		const responsiveClasses = [ 'folded', 'auto-fold' ];
		const originalResponsiveClasses = responsiveClasses.filter( ( className ) =>
			body.classList.contains( className )
		);
		let closeTimer;

		toggle.id = 'omnibar-admin-drawer-toggle';
		toggle.setAttribute( 'href', '#adminmenumain' );
		toggle.setAttribute( 'aria-controls', 'adminmenumain' );
		toggle.setAttribute( 'aria-expanded', 'false' );
		toggle.setAttribute( 'aria-label', labels.openLabel );

		drawer.setAttribute( 'aria-hidden', 'true' );
		drawer.inert = true;

		const backdrop = document.createElement( 'button' );
		backdrop.id = 'omnibar-admin-drawer-backdrop';
		backdrop.type = 'button';
		backdrop.hidden = true;
		backdrop.setAttribute( 'aria-label', labels.closeLabel );
		document.body.appendChild( backdrop );

		function restoreResponsiveClasses() {
			originalResponsiveClasses.forEach( ( className ) => {
				body.classList.add( className );
			} );
		}

		function setDrawerOpen( shouldOpen, returnFocus = false ) {
			window.clearTimeout( closeTimer );

			if ( shouldOpen ) {
				responsiveClasses.forEach( ( className ) => {
					body.classList.remove( className );
				} );
				backdrop.hidden = false;
				root.classList.add( openClass );
				drawer.inert = false;
				drawer.setAttribute( 'aria-hidden', 'false' );
				toggle.setAttribute( 'aria-expanded', 'true' );
				toggle.setAttribute( 'aria-label', labels.closeLabel );
				return;
			}

			root.classList.remove( openClass );
			drawer.inert = true;
			drawer.setAttribute( 'aria-hidden', 'true' );
			toggle.setAttribute( 'aria-expanded', 'false' );
			toggle.setAttribute( 'aria-label', labels.openLabel );

			closeTimer = window.setTimeout( () => {
				backdrop.hidden = true;
				restoreResponsiveClasses();
			}, transitionDuration + 20 );

			if ( returnFocus ) {
				toggle.focus();
			}
		}

		function isDrawerOpen() {
			return root.classList.contains( openClass );
		}

		setDrawerOpen( startsOpen );

		toggle.addEventListener( 'click', ( event ) => {
			event.preventDefault();
			event.stopPropagation();
			setDrawerOpen( ! isDrawerOpen() );
		} );

		toggle.addEventListener( 'keydown', ( event ) => {
			if ( event.key === ' ' ) {
				event.preventDefault();
				setDrawerOpen( ! isDrawerOpen() );
			}
		} );

		backdrop.addEventListener( 'click', () => {
			setDrawerOpen( false );
		} );

		document.addEventListener( 'keydown', ( event ) => {
			if ( event.key === 'Escape' && isDrawerOpen() ) {
				const activeDialog = event.target instanceof Element
					? event.target.closest( '[role="dialog"], [aria-modal="true"]' )
					: null;

				if ( activeDialog ) {
					return;
				}

				event.preventDefault();
				setDrawerOpen( false, true );
			}
		} );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initializeDrawer );
	} else {
		initializeDrawer();
	}
} )();
