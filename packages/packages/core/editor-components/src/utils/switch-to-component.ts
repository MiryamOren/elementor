import { invalidateDocumentData, switchToDocument } from '@elementor/editor-documents';
import { getCurrentDocumentContainer, selectElement } from '@elementor/editor-elements';
import { __privateRunCommand as runCommand } from '@elementor/editor-v1-adapters';

import { loadComponentsOverridableProps } from '../store/actions/load-components-overridable-props';
import { getComponentDocumentData } from './component-document-data';

export async function switchToComponent(
	componentId: number,
	componentInstanceId?: string | null,
	element?: HTMLElement | null
) {
	const document = await getComponentDocumentData( componentId );
	console.log( document );
	// @ts-ignore
	const isComponent = document?.type === 'elementor_component';
	const selector = getSelector( element, componentInstanceId );

	if ( isComponent ) {
		invalidateDocumentData( componentId );
		await loadComponentsOverridableProps( [ componentId ], { force: true } );
	}

	await switchToDocument( componentId, {
		selector,
		mode: 'autosave',
		setAsInitial: false,
		shouldScroll: false,
	} );

	if ( isComponent ) {
		const currentDocumentContainer = getCurrentDocumentContainer();
		const topLevelElement = currentDocumentContainer?.children?.[ 0 ];

		if ( topLevelElement ) {
			selectElement( topLevelElement.id );
			expandNavigator();
		}
	}
}

export async function expandNavigator() {
	await runCommand( 'navigator/expand-all' );
}

function getSelector( element?: HTMLElement | null, componentInstanceId?: string | null ): string | undefined {
	if ( element ) {
		return buildUniqueSelector( element );
	}

	if ( componentInstanceId ) {
		return `[data-id="${ componentInstanceId }"]`;
	}

	return undefined;
}

export function buildUniqueSelector( element: HTMLElement ): string {
	const selectors: string[] = [];
	let current = element.closest< HTMLElement >( '[data-id]' );

	while ( current ) {
		const dataId = current.dataset.id;
		const isComponentInstance = current.hasAttribute( 'data-elementor-id' );

		if ( isComponentInstance ) {
			selectors.unshift( `[data-id="${ dataId }"]` );
		}

		current = current.parentElement?.closest( '[data-id]' ) ?? null;
	}

	if ( selectors.length === 0 ) {
		const closestElement = element.closest< HTMLElement >( '[data-id]' );

		if ( closestElement?.dataset?.id ) {
			return `[data-id="${ closestElement.dataset.id }"]`;
		}
	}

	return selectors.join( ' ' );
}
