import { type V1Element } from '@elementor/editor-elements';
import { registerDataHook } from '@elementor/editor-v1-adapters';

import { COMPONENT_DOCUMENT_TYPE } from '../components/consts';
import { V1Document } from '@elementor/editor-documents';

type Container = Omit< V1Element, 'children' > & {
	document: V1Document;
	children: Container[];
};

type DropArgs = {
	container?: Container;
	containers?: Container[];
	model?: unknown;
	options?: unknown;
};

export function initRedirectDropIntoComponent() {
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

	if  ( ! isDocument ) {
		return false;
	}

	return container.document.config.type === COMPONENT_DOCUMENT_TYPE;
}
