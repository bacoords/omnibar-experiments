( function () {
	'use strict';

	const root = document.documentElement;
	const config = window.OmnibarFocusMenu || {};
	const groupOrder = Array.isArray( config.groupOrder )
		? config.groupOrder
		: [];
	const labels = config.labels || {};
	const groupClassPrefix = 'omnibar-focus-menu-item--';
	const hiddenClass = 'omnibar-focus-menu-hidden';
	const dashboardBackClass = 'omnibar-focus-menu-dashboard-back';

	root.classList.add( 'omnibar-focus-menu-enabled' );

	function initializeFocusMenu() {
		const menu = document.getElementById( 'adminmenu' );

		if ( ! menu ) {
			root.classList.remove( 'omnibar-focus-menu-enabled' );
			return;
		}

		const items = Array.from( menu.children ).filter(
			( item ) => item.tagName === 'LI'
		);

		function getItemGroup( item ) {
			const groupClass = Array.from( item.classList ).find( ( className ) =>
				className.startsWith( groupClassPrefix )
			);

			if ( ! groupClass ) {
				return '';
			}

			const groupId = groupClass.slice( groupClassPrefix.length );

			return groupOrder.includes( groupId ) ? groupId : '';
		}

		function findBestUrlMatch() {
			const currentUrl = new URL( window.location.href );

			return items
				.reduce( ( matches, item ) => {
					const groupId = getItemGroup( item );
					const link = item.querySelector( ':scope > a.menu-top' );

					if ( ! groupId || ! link ) {
						return matches;
					}

					const targetUrl = new URL( link.href, currentUrl );

					if ( targetUrl.pathname !== currentUrl.pathname ) {
						return matches;
					}

					const requiredParams = Array.from( targetUrl.searchParams.entries() );

					if ( ! requiredParams.length && currentUrl.searchParams.size ) {
						return matches;
					}

					const queryMatches = requiredParams.every(
						( [ key, value ] ) => currentUrl.searchParams.get( key ) === value
					);

					if ( queryMatches ) {
						matches.push( {
							item,
							score: requiredParams.length,
						} );
					}

					return matches;
				}, [] )
				.sort( ( first, second ) => second.score - first.score )[ 0 ]?.item || null;
		}

		const currentItem = items.find(
			( item ) =>
				item.classList.contains( 'wp-has-current-submenu' ) ||
				item.classList.contains( 'current' )
		);
		const activeItem = currentItem
			? ( getItemGroup( currentItem ) ? currentItem : null )
			: findBestUrlMatch();
		const activeGroup = activeItem ? getItemGroup( activeItem ) : '';

		if ( ! activeGroup ) {
			return;
		}

		const dashboardItem = items.find( ( item ) => item.id === 'menu-dashboard' );
		const dashboardLink = dashboardItem
			? dashboardItem.querySelector( ':scope > a.menu-top' )
			: null;
		const menuWrap = document.getElementById( 'adminmenuwrap' );
		const pageWrap = document.getElementById( 'wpwrap' );
		const adminBar = document.getElementById( 'wpadminbar' );
		let isFocused = true;
		let layoutFrame = 0;

		if ( ! dashboardItem || ! dashboardLink ) {
			return;
		}

		if ( menu.firstElementChild !== dashboardItem ) {
			menu.insertBefore( dashboardItem, menu.firstElementChild );
		}

		const dashboardAriaLabel = dashboardLink.getAttribute( 'aria-label' );
		const dashboardTitle = dashboardLink.getAttribute( 'title' );

		function refreshMenuLayout() {
			window.cancelAnimationFrame( layoutFrame );
			layoutFrame = window.requestAnimationFrame( () => {
				if ( ! isFocused && menuWrap && pageWrap ) {
					const adminBarHeight = adminBar
						? adminBar.getBoundingClientRect().height
						: 0;
					const minimumPageHeight = Math.max(
						window.innerHeight,
						menuWrap.scrollHeight + adminBarHeight + 24
					);

					root.style.setProperty(
						'--omnibar-focus-menu-page-min-height',
						`${ Math.ceil( minimumPageHeight ) }px`
					);
				} else {
					root.style.removeProperty( '--omnibar-focus-menu-page-min-height' );
				}

				if ( window.jQuery ) {
					window.jQuery( document ).trigger( 'wp-pin-menu' );
				}
			} );
		}

		function updateMenu() {
			root.classList.toggle( 'omnibar-focus-menu-active', isFocused );
			root.classList.toggle( 'omnibar-focus-menu-showing-all', ! isFocused );
			root.dataset.omnibarFocusGroup = activeGroup;

			if ( isFocused ) {
				dashboardItem.classList.add( dashboardBackClass );
				dashboardLink.setAttribute(
					'aria-label',
					labels.showAllMenu || 'Show all menu items'
				);
				dashboardLink.setAttribute(
					'title',
					labels.showAllMenu || 'Show all menu items'
				);
			} else {
				dashboardItem.classList.remove( dashboardBackClass );

				if ( dashboardAriaLabel ) {
					dashboardLink.setAttribute( 'aria-label', dashboardAriaLabel );
				} else {
					dashboardLink.removeAttribute( 'aria-label' );
				}

				if ( dashboardTitle ) {
					dashboardLink.setAttribute( 'title', dashboardTitle );
				} else {
					dashboardLink.removeAttribute( 'title' );
				}
			}

			items.forEach( ( item ) => {
				const isDashboard = item === dashboardItem;
				const isUtility = item.id === 'collapse-menu';
				const shouldHide =
					isFocused &&
					! isDashboard &&
					! isUtility &&
					getItemGroup( item ) !== activeGroup;

				item.classList.toggle( hiddenClass, shouldHide );

				if ( shouldHide ) {
					item.setAttribute( 'aria-hidden', 'true' );
				} else {
					item.removeAttribute( 'aria-hidden' );
				}
			} );

			refreshMenuLayout();
		}

		dashboardLink.addEventListener( 'click', ( event ) => {
			if ( ! isFocused ) {
				return;
			}

			event.preventDefault();
			isFocused = false;
			updateMenu();
		} );
		window.addEventListener( 'resize', refreshMenuLayout );

		updateMenu();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initializeFocusMenu );
	} else {
		initializeFocusMenu();
	}
} )();
