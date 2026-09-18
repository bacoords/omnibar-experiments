( function () {
	'use strict';

	const config = window.OmnibarMenuOrganizer || {};
	const labels = config.labels || {};
	const menuOwners = config.menuOwners && typeof config.menuOwners === 'object'
		? config.menuOwners
		: {};
	const menu = document.getElementById( 'adminmenu' );
	const root = document.documentElement;
	const groupTokenPrefix = 'group:';
	const itemTokenPrefix = 'item:';

	if ( ! menu ) {
		return;
	}

	let layout = normalizeLayout( config.layout );
	let isEditing = false;
	let dragged = null;
	let dropIntent = null;
	let saveTimer = null;
	let savedStatusTimer = null;

	const nativeMenuNodes = Array.from( menu.children ).filter( ( item ) =>
		! item.classList.contains( 'omnibar-menu-organizer-generated' )
	);
	const nativeItems = nativeMenuNodes.filter( ( item ) =>
		item.tagName === 'LI' &&
		! item.classList.contains( 'wp-menu-separator' ) &&
		item.id !== 'collapse-menu'
	);
	const nativeTrailingNodes = nativeMenuNodes.filter( ( item ) =>
		item.id === 'collapse-menu'
	);
	const itemByKey = new Map();
	const autoVisibleItemKeys = new Set();

	nativeItems.forEach( ( item, index ) => {
		const fallbackKey = `menu-item-${ index + 1 }`;
		const key = sanitizeKey( item.id || fallbackKey );
		const style = window.getComputedStyle( item );

		item.dataset.omnibarMenuKey = key;
		itemByKey.set( key, item );

		if ( style.display !== 'none' && style.visibility !== 'hidden' ) {
			autoVisibleItemKeys.add( key );
		}
	} );

	const controls = createControls();
	const dialog = createGroupDialog();

	function sanitizeKey( value ) {
		return String( value || '' )
			.toLowerCase()
			.replace( /[^a-z0-9_-]+/g, '-' )
			.replace( /^-+|-+$/g, '' );
	}

	function normalizeLayout( value ) {
		const normalized = {
			version: 1,
			order: [],
			groups: [],
		};

		if ( ! value || typeof value !== 'object' ) {
			return normalized;
		}

		const seenGroups = new Set();

		if ( Array.isArray( value.groups ) ) {
			value.groups.slice( 0, 50 ).forEach( ( candidate ) => {
				const id = sanitizeKey( candidate?.id );
				const label = String( candidate?.label || '' ).trim().slice( 0, 80 );

				if ( ! id || ! label || seenGroups.has( id ) ) {
					return;
				}

				seenGroups.add( id );
				normalized.groups.push( {
					id,
					label,
					items: Array.from(
						new Set(
							( Array.isArray( candidate.items ) ? candidate.items : [] )
								.map( sanitizeKey )
								.filter( Boolean )
						)
					),
					collapsed: Boolean( candidate.collapsed ),
				} );
			} );
		}

		if ( Array.isArray( value.order ) ) {
			const seenTokens = new Set();

			value.order.slice( 0, 500 ).forEach( ( rawToken ) => {
				const token = String( rawToken || '' );
				let cleanToken = '';

				if ( token.startsWith( groupTokenPrefix ) ) {
					const id = sanitizeKey( token.slice( groupTokenPrefix.length ) );

					if ( seenGroups.has( id ) ) {
						cleanToken = groupTokenPrefix + id;
					}
				} else if ( token.startsWith( itemTokenPrefix ) ) {
					const id = sanitizeKey( token.slice( itemTokenPrefix.length ) );

					if ( id ) {
						cleanToken = itemTokenPrefix + id;
					}
				}

				if ( cleanToken && ! seenTokens.has( cleanToken ) ) {
					seenTokens.add( cleanToken );
					normalized.order.push( cleanToken );
				}
			} );
		}

		return normalized;
	}

	function hasCustomLayout() {
		return layout.order.length > 0 || layout.groups.length > 0;
	}

	function getGroup( groupId ) {
		return layout.groups.find( ( group ) => group.id === groupId ) || null;
	}

	function getDirectMenuItem( target ) {
		const item = target instanceof Element ? target.closest( '#adminmenu > li' ) : null;

		return item?.parentElement === menu ? item : null;
	}

	function getGroupItems( groupId ) {
		return nativeItems.filter( ( item ) => item.dataset.omnibarGroupId === groupId );
	}

	function getGroupHeading( groupId ) {
		return menu.querySelector(
			`:scope > .omnibar-menu-organizer-group[data-omnibar-group-id="${ CSS.escape( groupId ) }"]`
		);
	}

	function getGroupBlock( heading ) {
		if ( ! heading ) {
			return [];
		}

		const groupId = heading.dataset.omnibarGroupId;
		const block = [ heading ];
		let sibling = heading.nextElementSibling;

		while ( sibling && sibling.dataset.omnibarGroupId === groupId ) {
			block.push( sibling );
			sibling = sibling.nextElementSibling;
		}

		return block;
	}

	function createGroupHeading( group ) {
		const heading = document.createElement( 'li' );
		const button = document.createElement( 'button' );
		const label = document.createElement( 'span' );
		const chevron = document.createElement( 'span' );

		heading.id = `omnibar-menu-organizer-group-${ group.id }`;
		heading.className = 'omnibar-menu-organizer-generated omnibar-menu-organizer-group';
		heading.dataset.omnibarGroupId = group.id;
		button.type = 'button';
		button.className = 'omnibar-menu-organizer-group-toggle';
		button.setAttribute( 'aria-expanded', String( ! group.collapsed ) );
		button.setAttribute( 'aria-label', group.label );
		label.className = 'omnibar-menu-organizer-group-label';
		label.textContent = group.label;
		chevron.className = 'omnibar-menu-organizer-group-chevron';
		chevron.setAttribute( 'aria-hidden', 'true' );
		button.append( label, chevron );
		heading.appendChild( button );

		button.addEventListener( 'click', () => {
			group.collapsed = button.getAttribute( 'aria-expanded' ) === 'true';
			button.setAttribute( 'aria-expanded', String( ! group.collapsed ) );
			syncGroupVisibility( group );
			layout = serializeLayout();
			scheduleSave();
		} );

		return heading;
	}

	function syncGroupVisibility( group ) {
		getGroupItems( group.id ).forEach( ( item ) => {
			item.classList.toggle(
				'omnibar-menu-organizer-group-item-collapsed',
				group.collapsed
			);
		} );
	}

	function applyLayout() {
		menu
			.querySelectorAll( ':scope > .omnibar-menu-organizer-group' )
			.forEach( ( heading ) => heading.remove() );

			nativeItems.forEach( ( item ) => {
			delete item.dataset.omnibarGroupId;
			item.classList.remove( 'omnibar-menu-organizer-group-item-collapsed' );
		} );

		if ( ! hasCustomLayout() ) {
			const nativeFragment = document.createDocumentFragment();

			nativeMenuNodes.forEach( ( item ) => nativeFragment.appendChild( item ) );
			menu.appendChild( nativeFragment );

			const lastNativeItem = nativeItems[ nativeItems.length - 1 ];

			if ( lastNativeItem ) {
				lastNativeItem.after( controls );
			} else {
				menu.appendChild( controls );
			}

			root.classList.remove( 'omnibar-menu-organizer-has-layout' );

			if ( isEditing ) {
				setEditingStateOnRows();
			}

			return;
		}

		nativeMenuNodes.forEach( ( item ) => item.remove() );

		const fragment = document.createDocumentFragment();
		const groupsById = new Map( layout.groups.map( ( group ) => [ group.id, group ] ) );
		const assignedItems = new Set();
		const appendedGroups = new Set();

		function appendItem( key, groupId = '' ) {
			const item = itemByKey.get( key );

			if ( ! item || assignedItems.has( key ) ) {
				return;
			}

			assignedItems.add( key );

			if ( groupId ) {
				item.dataset.omnibarGroupId = groupId;
			}

			fragment.appendChild( item );
		}

		function appendGroup( group ) {
			if ( appendedGroups.has( group.id ) ) {
				return;
			}

			appendedGroups.add( group.id );
			fragment.appendChild( createGroupHeading( group ) );
			group.items.forEach( ( key ) => appendItem( key, group.id ) );
		}

		layout.order.forEach( ( token ) => {
			if ( token.startsWith( groupTokenPrefix ) ) {
				const group = groupsById.get( token.slice( groupTokenPrefix.length ) );

				if ( group ) {
					appendGroup( group );
				}
			} else if ( token.startsWith( itemTokenPrefix ) ) {
				appendItem( token.slice( itemTokenPrefix.length ) );
			}
		} );

		layout.groups.forEach( appendGroup );
		nativeItems.forEach( ( item ) => appendItem( item.dataset.omnibarMenuKey ) );
		menu.appendChild( fragment );
		menu.appendChild( controls );
		nativeTrailingNodes.forEach( ( item ) => menu.appendChild( item ) );

		layout.groups.forEach( syncGroupVisibility );
		root.classList.toggle( 'omnibar-menu-organizer-has-layout', hasCustomLayout() );

		if ( isEditing ) {
			setEditingStateOnRows();
		}
	}

	function serializeLayout() {
		const serialized = {
			version: 1,
			order: [],
			groups: [],
		};
		const seenGroups = new Set();

		Array.from( menu.children ).forEach( ( element ) => {
			if ( element.classList.contains( 'omnibar-menu-organizer-group' ) ) {
				const id = sanitizeKey( element.dataset.omnibarGroupId );

				if ( ! id || seenGroups.has( id ) ) {
					return;
				}

				const button = element.querySelector( '.omnibar-menu-organizer-group-toggle' );
				const label = element.querySelector( '.omnibar-menu-organizer-group-label' )?.textContent.trim() || id;

				seenGroups.add( id );
				serialized.order.push( groupTokenPrefix + id );
				serialized.groups.push( {
					id,
					label,
					items: getGroupItems( id ).map( ( item ) => item.dataset.omnibarMenuKey ),
					collapsed: button?.getAttribute( 'aria-expanded' ) !== 'true',
				} );
				return;
			}

			const key = element.dataset.omnibarMenuKey;

			if ( key && ! element.dataset.omnibarGroupId ) {
				serialized.order.push( itemTokenPrefix + key );
			}
		} );

		return normalizeLayout( serialized );
	}

	function createControls() {
		const container = document.createElement( 'li' );
		const editButton = document.createElement( 'button' );
		const createButton = document.createElement( 'button' );
		const autoButton = document.createElement( 'button' );
		const resetButton = document.createElement( 'button' );
		const status = document.createElement( 'span' );

		container.id = 'omnibar-menu-organizer-controls';
		container.className = 'omnibar-menu-organizer-generated';
		editButton.type = 'button';
		editButton.className = 'omnibar-menu-organizer-control omnibar-menu-organizer-edit';
		editButton.title = labels.edit || 'Edit menu';
		editButton.setAttribute( 'aria-label', labels.edit || 'Edit menu' );
		editButton.setAttribute( 'aria-pressed', 'false' );
		editButton.innerHTML = '<span class="dashicons dashicons-edit" aria-hidden="true"></span>';
		createButton.type = 'button';
		createButton.className = 'omnibar-menu-organizer-control omnibar-menu-organizer-add';
		createButton.title = labels.createGroup || 'Create group';
		createButton.setAttribute( 'aria-label', labels.createGroup || 'Create group' );
		createButton.innerHTML = '<span class="dashicons dashicons-plus-alt2" aria-hidden="true"></span>';
		createButton.hidden = true;
		autoButton.type = 'button';
		autoButton.className = 'omnibar-menu-organizer-control omnibar-menu-organizer-auto';
		autoButton.title = labels.autoOrganize || 'Auto organize';
		autoButton.setAttribute( 'aria-label', labels.autoOrganize || 'Auto organize' );
		autoButton.innerHTML = '<span class="dashicons dashicons-randomize" aria-hidden="true"></span>';
		autoButton.hidden = true;
		resetButton.type = 'button';
		resetButton.className = 'omnibar-menu-organizer-control omnibar-menu-organizer-reset';
		resetButton.title = labels.resetDefault || 'Reset to default';
		resetButton.setAttribute( 'aria-label', labels.resetDefault || 'Reset to default' );
		resetButton.innerHTML = '<span class="dashicons dashicons-image-rotate" aria-hidden="true"></span>';
		resetButton.hidden = true;
		status.className = 'omnibar-menu-organizer-status';
		status.setAttribute( 'aria-live', 'polite' );
		container.append( editButton, createButton, autoButton, resetButton, status );

		if ( ! config.canEdit ) {
			editButton.hidden = true;
			createButton.hidden = true;
			autoButton.hidden = true;
			resetButton.hidden = true;
		}

		editButton.addEventListener( 'click', () => {
			setEditing( ! isEditing );

			if ( ! isEditing ) {
				saveLayout();
			}
		} );
		createButton.addEventListener( 'click', openGroupDialog );
		autoButton.addEventListener( 'click', applyAutoLayout );
		resetButton.addEventListener( 'click', resetToDefaultLayout );

		return container;
	}

	function createGroupDialog() {
		const overlay = document.createElement( 'div' );
		const panel = document.createElement( 'div' );
		const form = document.createElement( 'form' );
		const title = document.createElement( 'h2' );
		const label = document.createElement( 'label' );
		const input = document.createElement( 'input' );
		const actions = document.createElement( 'div' );
		const cancelButton = document.createElement( 'button' );
		const createButton = document.createElement( 'button' );

		overlay.className = 'omnibar-menu-organizer-dialog-backdrop';
		overlay.hidden = true;
		panel.className = 'omnibar-menu-organizer-dialog';
		panel.setAttribute( 'role', 'dialog' );
		panel.setAttribute( 'aria-modal', 'true' );
		panel.setAttribute( 'aria-labelledby', 'omnibar-menu-organizer-dialog-title' );
		title.id = 'omnibar-menu-organizer-dialog-title';
		title.textContent = labels.createGroup || 'Create group';
		label.setAttribute( 'for', 'omnibar-menu-organizer-group-name' );
		label.textContent = labels.groupName || 'Group name';
		input.id = 'omnibar-menu-organizer-group-name';
		input.type = 'text';
		input.maxLength = 80;
		input.required = true;
		actions.className = 'omnibar-menu-organizer-dialog-actions';
		cancelButton.type = 'button';
		cancelButton.className = 'button';
		cancelButton.textContent = labels.cancel || 'Cancel';
		createButton.type = 'submit';
		createButton.className = 'button button-primary';
		createButton.textContent = labels.create || 'Create';
		actions.append( cancelButton, createButton );
		form.append( title, label, input, actions );
		panel.appendChild( form );
		overlay.appendChild( panel );
		document.body.appendChild( overlay );

		cancelButton.addEventListener( 'click', closeGroupDialog );
		overlay.addEventListener( 'click', ( event ) => {
			if ( event.target === overlay ) {
				closeGroupDialog();
			}
		} );
		panel.addEventListener( 'keydown', ( event ) => {
			if ( event.key === 'Escape' ) {
				closeGroupDialog();
			}
		} );
		form.addEventListener( 'submit', ( event ) => {
			event.preventDefault();

			const groupLabel = input.value.trim();

			if ( ! groupLabel ) {
				return;
			}

			createGroup( groupLabel );
			closeGroupDialog();
		} );

		overlay.omnibarInput = input;

		return overlay;
	}

	function openGroupDialog() {
		if ( ! config.canEdit ) {
			return;
		}

		if ( ! isEditing ) {
			setEditing( true );
		}

		dialog.hidden = false;
		dialog.omnibarInput.value = labels.newGroup || 'New group';
		dialog.omnibarInput.focus();
		dialog.omnibarInput.select();
	}

	function closeGroupDialog() {
		dialog.hidden = true;
		controls.querySelector( '.omnibar-menu-organizer-add' )?.focus();
	}

	function createGroup( label ) {
		layout = serializeLayout();

		const id = `group-${ Date.now().toString( 36 ) }-${ Math.random().toString( 36 ).slice( 2, 7 ) }`;

		layout.groups.push( {
			id,
			label: label.slice( 0, 80 ),
			items: [],
			collapsed: false,
		} );
		layout.order.push( groupTokenPrefix + id );
		applyLayout();
		scheduleSave();
	}

	function isContentItem( key ) {
		return [ 'menu-posts', 'menu-media', 'menu-links', 'menu-pages', 'menu-comments' ].includes( key ) ||
			key.startsWith( 'menu-posts-' );
	}

	function isSettingsItem( key ) {
		return [ 'menu-plugins', 'menu-users', 'menu-tools', 'menu-settings' ].includes( key );
	}

	function buildAutoLayout() {
		const contentId = 'auto-content';
		const settingsId = 'auto-settings';
		const sharedPluginsId = 'auto-plugins';
		const contentItems = nativeItems
			.map( ( item ) => item.dataset.omnibarMenuKey )
			.filter( ( key ) => isContentItem( key ) && ! menuOwners[ key ] );
		const settingsItems = nativeItems
			.map( ( item ) => item.dataset.omnibarMenuKey )
			.filter( isSettingsItem );
		const contentSet = new Set( contentItems );
		const settingsSet = new Set( settingsItems );
		const pluginItemsByOwner = new Map();
		const itemGroup = new Map();
		const automaticLayout = {
			version: 1,
			order: [],
			groups: [],
		};
		const addedGroups = new Set();

		function addGroup( id, label, items ) {
			if ( ! items.length ) {
				return;
			}

			automaticLayout.groups.push( {
				id,
				label,
				items,
				collapsed: false,
			} );
			items.forEach( ( key ) => itemGroup.set( key, id ) );
		}

		addGroup( contentId, labels.contentGroup || 'Content', contentItems );
		addGroup( settingsId, labels.settingsGroup || 'Settings', settingsItems );

		nativeItems.forEach( ( item ) => {
			const key = item.dataset.omnibarMenuKey;
			const owner = menuOwners[ key ];
			const ownerSlug = sanitizeKey( owner?.slug );

			if (
				contentSet.has( key ) ||
				settingsSet.has( key ) ||
				! autoVisibleItemKeys.has( key ) ||
				! ownerSlug
			) {
				return;
			}

			if ( ! pluginItemsByOwner.has( ownerSlug ) ) {
				pluginItemsByOwner.set( ownerSlug, {
					name: String( owner?.name || ownerSlug ).trim().slice( 0, 80 ),
					items: [],
				} );
			}

			pluginItemsByOwner.get( ownerSlug ).items.push( key );
		} );

		const sharedPluginItems = [];

		pluginItemsByOwner.forEach( ( owner, ownerSlug ) => {
			if ( owner.items.length > 1 ) {
				addGroup(
					`auto-plugin-${ ownerSlug }`,
					owner.name || ownerSlug,
					owner.items
				);
			} else {
				sharedPluginItems.push( ...owner.items );
			}
		} );

		addGroup(
			sharedPluginsId,
			labels.pluginsGroup || 'Plugins',
			sharedPluginItems
		);

		nativeItems.forEach( ( item ) => {
			const key = item.dataset.omnibarMenuKey;
			const groupId = itemGroup.get( key );

			if ( groupId ) {
				if ( ! addedGroups.has( groupId ) ) {
					automaticLayout.order.push( groupTokenPrefix + groupId );
					addedGroups.add( groupId );
				}
				return;
			}

			automaticLayout.order.push( itemTokenPrefix + key );
		} );

		const pluginsToken = groupTokenPrefix + sharedPluginsId;
		const settingsToken = groupTokenPrefix + settingsId;
		const pluginsIndex = automaticLayout.order.indexOf( pluginsToken );

		if ( pluginsIndex !== -1 ) {
			automaticLayout.order.splice( pluginsIndex, 1 );

			const settingsIndex = automaticLayout.order.indexOf( settingsToken );

			if ( settingsIndex !== -1 ) {
				automaticLayout.order.splice( settingsIndex, 0, pluginsToken );
			} else {
				automaticLayout.order.push( pluginsToken );
			}
		}

		return normalizeLayout( automaticLayout );
	}

	function applyAutoLayout() {
		if ( ! isEditing ) {
			return;
		}

		layout = buildAutoLayout();
		applyLayout();
		scheduleSave();
	}

	function resetToDefaultLayout() {
		if ( ! isEditing ) {
			return;
		}

		window.clearTimeout( saveTimer );
		layout = normalizeLayout( {} );
		applyLayout();
		saveLayout( false );
	}

	function setEditing( shouldEdit ) {
		if ( ! config.canEdit ) {
			return;
		}

		isEditing = shouldEdit;
		root.classList.toggle( 'omnibar-menu-organizer-editing', isEditing );
		controls.querySelector( '.omnibar-menu-organizer-edit' )?.setAttribute( 'aria-pressed', String( isEditing ) );

		const editButton = controls.querySelector( '.omnibar-menu-organizer-edit' );
		const createButton = controls.querySelector( '.omnibar-menu-organizer-add' );
		const autoButton = controls.querySelector( '.omnibar-menu-organizer-auto' );
		const resetButton = controls.querySelector( '.omnibar-menu-organizer-reset' );

		if ( editButton ) {
			const label = isEditing ? labels.done || 'Finish editing' : labels.edit || 'Edit menu';

			editButton.title = label;
			editButton.setAttribute( 'aria-label', label );
			editButton.innerHTML = isEditing
				? '<span class="dashicons dashicons-yes-alt" aria-hidden="true"></span>'
				: '<span class="dashicons dashicons-edit" aria-hidden="true"></span>';
		}

		if ( createButton ) {
			createButton.hidden = ! isEditing;
		}

		if ( autoButton ) {
			autoButton.hidden = ! isEditing;
		}

		if ( resetButton ) {
			resetButton.hidden = ! isEditing;
		}

		setEditingStateOnRows();

		if ( ! isEditing ) {
			clearDropIndicators();
			dragged = null;
			dropIntent = null;
		}
	}

	function setEditingStateOnRows() {
		nativeItems.forEach( ( item ) => {
			item.draggable = isEditing;
			item.classList.toggle( 'omnibar-menu-organizer-movable', isEditing );
		} );

		menu.querySelectorAll( ':scope > .omnibar-menu-organizer-group' ).forEach( ( heading ) => {
			heading.draggable = isEditing;
			heading.classList.toggle( 'omnibar-menu-organizer-movable', isEditing );
		} );
	}

	function clearDropIndicators() {
		menu.querySelectorAll( '.omnibar-menu-organizer-drop-before, .omnibar-menu-organizer-drop-after, .omnibar-menu-organizer-drop-into' )
			.forEach( ( item ) => item.classList.remove(
				'omnibar-menu-organizer-drop-before',
				'omnibar-menu-organizer-drop-after',
				'omnibar-menu-organizer-drop-into'
			) );
	}

	function getDropSide( event, target, intoGroup = false ) {
		const rect = target.getBoundingClientRect();
		const ratio = rect.height ? ( event.clientY - rect.top ) / rect.height : 0.5;

		if ( intoGroup && ratio >= 0.25 && ratio <= 0.75 ) {
			return 'into';
		}

		return ratio < 0.5 ? 'before' : 'after';
	}

	function markDropIntent( target, side ) {
		clearDropIndicators();
		dropIntent = { target, side };
		target.classList.add( `omnibar-menu-organizer-drop-${ side }` );
	}

	function moveItem( item, target, side ) {
		if ( target.classList.contains( 'omnibar-menu-organizer-group' ) ) {
			const groupId = target.dataset.omnibarGroupId;

			if ( side === 'into' ) {
				item.dataset.omnibarGroupId = groupId;
				const members = getGroupItems( groupId ).filter( ( member ) => member !== item );
				const lastMember = members[ members.length - 1 ];

				menu.insertBefore( item, lastMember ? lastMember.nextSibling : target.nextSibling );
				return;
			}

			delete item.dataset.omnibarGroupId;
			const block = getGroupBlock( target );
			const reference = side === 'before' ? target : block[ block.length - 1 ].nextSibling;

			menu.insertBefore( item, reference );
			return;
		}

		const targetGroupId = target.dataset.omnibarGroupId || '';

		if ( targetGroupId ) {
			item.dataset.omnibarGroupId = targetGroupId;
		} else {
			delete item.dataset.omnibarGroupId;
		}

		menu.insertBefore( item, side === 'before' ? target : target.nextSibling );
	}

	function moveGroup( heading, target, side ) {
		const block = getGroupBlock( heading );
		const fragment = document.createDocumentFragment();

		block.forEach( ( element ) => fragment.appendChild( element ) );

		if ( target.dataset.omnibarGroupId && ! target.classList.contains( 'omnibar-menu-organizer-group' ) ) {
			target = getGroupHeading( target.dataset.omnibarGroupId ) || target;
		}

		if ( target.classList.contains( 'omnibar-menu-organizer-group' ) ) {
			const targetBlock = getGroupBlock( target );
			const reference = side === 'before' ? target : targetBlock[ targetBlock.length - 1 ].nextSibling;

			menu.insertBefore( fragment, reference );
			return;
		}

		menu.insertBefore( fragment, side === 'before' ? target : target.nextSibling );
	}

	menu.addEventListener( 'click', ( event ) => {
		if ( ! isEditing ) {
			return;
		}

		const directItem = getDirectMenuItem( event.target );

		if ( directItem?.dataset.omnibarMenuKey && event.target.closest( 'a' ) ) {
			event.preventDefault();
		}
	}, true );

	menu.addEventListener( 'dragstart', ( event ) => {
		if ( ! isEditing ) {
			return;
		}

		const item = getDirectMenuItem( event.target );

		if ( ! item || item === controls ) {
			event.preventDefault();
			return;
		}

		if ( item.classList.contains( 'omnibar-menu-organizer-group' ) ) {
			dragged = { type: 'group', element: item };
		} else if ( item.dataset.omnibarMenuKey ) {
			dragged = { type: 'item', element: item };
		} else {
			event.preventDefault();
			return;
		}

		item.classList.add( 'omnibar-menu-organizer-dragging' );
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData( 'text/plain', dragged.type );
	} );

	menu.addEventListener( 'dragover', ( event ) => {
		if ( ! isEditing || ! dragged ) {
			return;
		}

		const target = getDirectMenuItem( event.target );

		if ( ! target || target === controls || target.classList.contains( 'wp-menu-separator' ) ) {
			return;
		}

		const draggedBlock = dragged.type === 'group' ? getGroupBlock( dragged.element ) : [];

		if ( target === dragged.element || draggedBlock.includes( target ) ) {
			return;
		}

		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';

		const intoGroup = dragged.type === 'item' && target.classList.contains( 'omnibar-menu-organizer-group' );
		markDropIntent( target, getDropSide( event, target, intoGroup ) );
	} );

	menu.addEventListener( 'drop', ( event ) => {
		if ( ! isEditing || ! dragged || ! dropIntent ) {
			return;
		}

		event.preventDefault();

		if ( dragged.type === 'item' ) {
			moveItem( dragged.element, dropIntent.target, dropIntent.side );
		} else {
			moveGroup( dragged.element, dropIntent.target, dropIntent.side );
		}

		layout = serializeLayout();
		layout.groups.forEach( syncGroupVisibility );
		root.classList.add( 'omnibar-menu-organizer-has-layout' );
		setEditingStateOnRows();
		scheduleSave();
		clearDropIndicators();
	} );

	menu.addEventListener( 'dragend', () => {
		dragged?.element.classList.remove( 'omnibar-menu-organizer-dragging' );
		dragged = null;
		dropIntent = null;
		clearDropIndicators();
	} );

	function setStatus( message, state = '' ) {
		const status = controls.querySelector( '.omnibar-menu-organizer-status' );

		window.clearTimeout( savedStatusTimer );
		status.textContent = message;
		status.dataset.state = state;

		if ( 'saved' === state ) {
			savedStatusTimer = window.setTimeout( () => {
				status.textContent = '';
				delete status.dataset.state;
			}, 1800 );
		}
	}

	function scheduleSave() {
		if ( ! config.canEdit ) {
			return;
		}

		window.clearTimeout( saveTimer );
		setStatus( labels.saving || 'Saving…', 'saving' );
		saveTimer = window.setTimeout( saveLayout, 300 );
	}

	async function saveLayout( shouldSerialize = true ) {
		if ( ! config.canEdit || ! config.restUrl ) {
			return;
		}

		window.clearTimeout( saveTimer );

		if ( shouldSerialize ) {
			layout = serializeLayout();
		}

		setStatus( labels.saving || 'Saving…', 'saving' );

		try {
			const response = await window.fetch( config.restUrl, {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': config.restNonce || '',
				},
				body: JSON.stringify( layout ),
			} );

			if ( ! response.ok ) {
				throw new Error( `HTTP ${ response.status }` );
			}

			layout = normalizeLayout( await response.json() );
			setStatus( labels.saved || 'Saved', 'saved' );
		} catch ( error ) {
			setStatus( labels.saveError || 'Could not save the menu layout.', 'error' );
			window.console.error( 'Omnibar Menu Organizer:', error );
		}
	}

	root.classList.add( 'omnibar-menu-organizer-enabled' );
	applyLayout();
} )();
