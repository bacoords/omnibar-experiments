( function () {
	'use strict';

	const root = document.documentElement;
	const config = window.OmnibarAdminMenuGroups || {};
	const enabledClass = 'omnibar-admin-menu-groups-enabled';
	const groupClassPrefix = 'omnibar-admin-menu-group--';
	const groupOrder = Array.isArray( config.groupOrder )
		? config.groupOrder
		: [];
	const openGroupsStorageKey = 'omnibarAdminMenuGroups.openGroups.v1';

	root.classList.add( enabledClass );

	function getStoredOpenGroups() {
		try {
			const storedGroups = JSON.parse(
				window.localStorage.getItem( openGroupsStorageKey ) || '[]'
			);

			if ( ! Array.isArray( storedGroups ) ) {
				return [];
			}

			return storedGroups.filter( ( groupName ) =>
				groupOrder.includes( groupName )
			);
		} catch {
			return [];
		}
	}

	function storeOpenGroups( openGroups ) {
		try {
			window.localStorage.setItem(
				openGroupsStorageKey,
				JSON.stringify( openGroups )
			);
		} catch {
			// Storage can be unavailable in restricted browsing contexts.
		}
	}

	function initializeMenuGroups() {
		const menu = document.getElementById( 'adminmenu' );

		if ( ! menu ) {
			root.classList.remove( enabledClass );
			return;
		}

		const labels = config.groupLabels || {};

		function getItemGroup( item ) {
			const groupClass = Array.from( item.classList ).find( ( className ) =>
				className.startsWith( groupClassPrefix )
			);

			return groupClass ? groupClass.slice( groupClassPrefix.length ) : '';
		}

		function getMenuItems() {
			return Array.from( menu.children ).filter(
				( item ) => item.tagName === 'LI'
			);
		}

		function syncCurrentAppearanceItem() {
			const currentUrl = new URL( window.location.href );
			const rows = Array.from(
				menu.querySelectorAll( ':scope > .omnibar-admin-appearance-item' )
			);
			const matches = rows.reduce( ( candidates, item ) => {
				const link = item.querySelector( ':scope > a.menu-top' );

				if ( ! link ) {
					return candidates;
				}

				const targetUrl = new URL( link.href, currentUrl );

				if ( targetUrl.pathname !== currentUrl.pathname ) {
					return candidates;
				}

				const requiredParams = Array.from( targetUrl.searchParams.entries() );
				const queryMatches = requiredParams.every(
					( [ key, value ] ) => currentUrl.searchParams.get( key ) === value
				);

				if ( queryMatches ) {
					candidates.push( { item, link, score: requiredParams.length } );
				}

				return candidates;
			}, [] );

			matches.sort( ( first, second ) => second.score - first.score );

			const currentItem = matches[ 0 ]?.item || null;

			rows.forEach( ( item ) => {
				const link = item.querySelector( ':scope > a.menu-top' );
				const isCurrent = item === currentItem;

				item.classList.toggle( 'current', isCurrent );
				link?.classList.toggle( 'current', isCurrent );

				if ( isCurrent ) {
					link?.setAttribute( 'aria-current', 'page' );
				} else {
					link?.removeAttribute( 'aria-current' );
				}
			} );
		}

		syncCurrentAppearanceItem();

		const items = getMenuItems();
		const activeItem = items.find(
			( item ) =>
				item.classList.contains( 'wp-has-current-submenu' ) ||
				item.classList.contains( 'current' )
		);
		const activeGroup = activeItem ? getItemGroup( activeItem ) : '';
		const groups = [];

		groupOrder.forEach( ( groupName ) => {
			const groupItems = items.filter(
				( item ) => getItemGroup( item ) === groupName
			);

			if ( ! groupItems.length ) {
				return;
			}

			const heading = document.createElement( 'li' );
			const button = document.createElement( 'button' );
			const label = document.createElement( 'span' );
			const compactLabel = document.createElement( 'span' );
			const controlledIds = [];

			groupItems.forEach( ( item, index ) => {
				if ( ! item.id ) {
					item.id = `omnibar-admin-menu-group-item-${ groupName }-${ index + 1 }`;
				}

				controlledIds.push( item.id );
			} );

			heading.id = `omnibar-admin-menu-group-heading-${ groupName }`;
			heading.className = `omnibar-admin-menu-group-heading omnibar-admin-menu-group-heading--${ groupName } hide-if-no-js`;
			heading.dataset.omnibarMenuGroupHeading = groupName;
			button.type = 'button';
			button.className = 'omnibar-admin-menu-group-toggle';
			button.setAttribute( 'aria-controls', controlledIds.join( ' ' ) );
			button.setAttribute( 'aria-expanded', 'false' );
			label.className = 'omnibar-admin-menu-group-label';
			label.textContent = labels[ groupName ] || groupName;
			compactLabel.className = 'omnibar-admin-menu-group-label-compact';
			compactLabel.textContent = ( labels[ groupName ] || groupName ).charAt( 0 );
			compactLabel.setAttribute( 'aria-hidden', 'true' );
			button.append( label, compactLabel );
			heading.appendChild( button );
			menu.insertBefore( heading, groupItems[ 0 ] );
			groups.push( { name: groupName, items: groupItems, button } );
		} );

		if ( ! groups.length ) {
			root.classList.remove( enabledClass );
			return;
		}

		function setGroupExpanded( group, isExpanded ) {
			group.button.setAttribute( 'aria-expanded', String( isExpanded ) );
			group.items.forEach( ( item ) => {
				item.classList.toggle( 'omnibar-admin-menu-group-expanded', isExpanded );
			} );
		}

		function updateOpenGroupsDataset( shouldPersist = false ) {
			const openGroups = groups
				.filter( ( group ) => group.button.getAttribute( 'aria-expanded' ) === 'true' )
				.map( ( group ) => group.name );

			if ( openGroups.length ) {
				root.dataset.omnibarOpenMenuGroups = openGroups.join( ' ' );
			} else {
				delete root.dataset.omnibarOpenMenuGroups;
			}

			if ( shouldPersist ) {
				storeOpenGroups( openGroups );
			}
		}

		groups.forEach( ( group ) => {
			group.button.addEventListener( 'click', () => {
				const isOpen = group.button.getAttribute( 'aria-expanded' ) === 'true';

				setGroupExpanded( group, ! isOpen );
				updateOpenGroupsDataset( true );
			} );
		} );

		if ( activeGroup ) {
			root.dataset.omnibarActiveMenuGroup = activeGroup;
		}

		const initiallyOpenGroups = new Set( getStoredOpenGroups() );

		if ( activeGroup ) {
			initiallyOpenGroups.add( activeGroup );
		}

		groups.forEach( ( group ) => {
			setGroupExpanded( group, initiallyOpenGroups.has( group.name ) );
		} );
		updateOpenGroupsDataset( true );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initializeMenuGroups );
	} else {
		initializeMenuGroups();
	}
} )();
