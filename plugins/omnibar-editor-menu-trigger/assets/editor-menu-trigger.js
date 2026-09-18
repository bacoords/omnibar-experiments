( function () {
	'use strict';

	const settings = window.OmnibarEditorMenuTrigger || {};
	const slotClass = 'omnibar-editor-menu-trigger-slot';
	const toggleClass = 'omnibar-editor-menu-trigger';
	const toggleSelector = `.${ toggleClass }`;
	let renderFrame = 0;

	function createDrawerLeftIcon() {
		const namespace = 'http://www.w3.org/2000/svg';
		const icon = document.createElementNS( namespace, 'svg' );
		const path = document.createElementNS( namespace, 'path' );

		icon.setAttribute( 'viewBox', '0 0 24 24' );
		icon.setAttribute( 'width', '24' );
		icon.setAttribute( 'height', '24' );
		icon.setAttribute( 'fill', 'none' );
		icon.style.fill = 'none';
		icon.setAttribute( 'stroke', 'currentColor' );
		icon.setAttribute( 'stroke-width', '1.5' );
		icon.setAttribute( 'aria-hidden', 'true' );
		icon.setAttribute( 'focusable', 'false' );
		path.setAttribute(
			'd',
			'M9.75 4.75H6C5.30964 4.75 4.75 5.30964 4.75 6V18C4.75 18.6904 5.30964 19.25 6 19.25H9.75M9.75 4.75H18C18.6904 4.75 19.25 5.30964 19.25 6V18C19.25 18.6904 18.6904 19.25 18 19.25H9.75M9.75 4.75V19.25'
		);
		path.setAttribute( 'vector-effect', 'non-scaling-stroke' );
		icon.appendChild( path );

		return icon;
	}

	function initializeEditorMenuTrigger() {
		const controller = window.OmnibarAdminDrawerController;

		if ( ! controller || ! document.body ) {
			return;
		}

		function updateButtonState() {
			const button = document.querySelector( toggleSelector );

			if ( ! button ) {
				return;
			}

			const isOpen = controller.isOpen();
			const label = isOpen
				? settings.closeLabel || 'Close WordPress menu'
				: settings.openLabel || 'Open WordPress menu';

			button.setAttribute( 'aria-expanded', String( isOpen ) );
			button.setAttribute( 'aria-label', label );
			button.setAttribute( 'title', label );
		}

		function createToggle() {
			const button = document.createElement( 'button' );

			button.id = 'omnibar-editor-menu-trigger';
			button.type = 'button';
			button.className = `components-button is-compact has-icon ${ toggleClass }`;
			button.setAttribute( 'aria-controls', 'adminmenumain' );
			button.appendChild( createDrawerLeftIcon() );
			button.addEventListener( 'click', ( event ) => {
				event.preventDefault();
				event.stopPropagation();
				controller.toggle();
				window.requestAnimationFrame( updateButtonState );
			} );

			return button;
		}

		function ensureButtonInSlot( slot ) {
			if ( ! slot.querySelector( `:scope > ${ toggleSelector }` ) ) {
				slot.appendChild( createToggle() );
			}

			controller.setReturnFocusElement?.(
				slot.querySelector( `:scope > ${ toggleSelector }` )
			);
			updateButtonState();
		}

		function ensureToggle() {
			const header = document.querySelector( '.editor-header' );

			if ( ! header ) {
				return;
			}

			let slot = header.querySelector( '.editor-header__back-button' );

			if ( ! slot ) {
				slot = document.createElement( 'div' );
				slot.className = 'editor-header__back-button';
				header.insertBefore( slot, header.firstElementChild );
			}

			slot.classList.add( slotClass );
			ensureButtonInSlot( slot );
		}

		function scheduleToggle() {
			if ( renderFrame ) {
				return;
			}

			renderFrame = window.requestAnimationFrame( () => {
				renderFrame = 0;
				ensureToggle();
			} );
		}

		const editorObserver = new MutationObserver( scheduleToggle );
		editorObserver.observe( document.body, {
			childList: true,
			subtree: true,
		} );
		document.addEventListener(
			'omnibar-admin-drawer-state-change',
			updateButtonState
		);

		ensureToggle();
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', initializeEditorMenuTrigger );
	} else {
		initializeEditorMenuTrigger();
	}
} )();
