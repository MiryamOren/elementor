import { type V1Document } from '@elementor/editor-documents';
import { createElement, selectElement, type V1Element } from '@elementor/editor-elements';
import { registerDataHook } from '@elementor/editor-v1-adapters';

import { COMPONENT_DOCUMENT_TYPE } from '../components/consts';

const V4_DEFAULT_CONTAINER_TYPE = 'e-flexbox';

type Container = Omit< V1Element, 'children' | 'parent' > & {
	document: V1Document;
	parent: Container;
	children: Container[];
};

export function initHandleComponentPreviewContainer() {
	initRedirectDropIntoComponent();
	initHandleTopLevelElementDelete();
}

type DeleteArgs = {
	container?: Container;
	containers?: Container[];
};

function initHandleTopLevelElementDelete() {
	registerDataHook( 'after', 'document/elements/delete', ( args: DeleteArgs ) => {
		const containers = args.containers ?? ( args.container ? [ args.container ] : [] );

		for ( const container of containers ) {
			if ( ! container.parent || ! isComponent( container.parent ) ) {
				continue;
			}

			const isParentComponentEmpty = container.parent.children.length === 0;

			if ( ! isParentComponentEmpty ) {
				continue;
			}

			addDefaultEmptyContainer( container.parent );
		}
	} );
}

function addDefaultEmptyContainer( container: Container ) {
	const newContainer = createElement( {
		containerId: container.id,
		model: { elType: V4_DEFAULT_CONTAINER_TYPE },
		options: { useHistory: false },
	} );

	selectElement( newContainer.id );
}

type DropArgs = {
	container?: Container;
	containers?: Container[];
	model?: unknown;
	options?: unknown;
};

function initRedirectDropIntoComponent() {
	registerDataHook( 'dependency', 'preview/drop', ( args: DropArgs ) => {
		const containers = args.containers ?? ( args.container ? [ args.container ] : [] );

		for ( const container of containers ) {
			if ( ! isComponent( container ) ) {
				continue;
			}

			const redirectedContainer = getComponentContainer( container );

			if ( redirectedContainer !== container ) {
				if ( args.containers ) {
					const index = args.containers.indexOf( container );
					args.containers[ index ] = redirectedContainer;
				} else {
					args.container = redirectedContainer;
				}
			}
		}

		return true;
	} );
}

function getComponentContainer( container: Container ): Container {
	const topLevelElement = container.children?.[ 0 ];

	if ( topLevelElement ) {
		return topLevelElement;
	}

	return container;
}

function isComponent( container: Container ): boolean {
	const isDocument = container.id === 'document';

	if ( ! isDocument ) {
		return false;
	}

	return container.document.config.type === COMPONENT_DOCUMENT_TYPE;
}
