import { type Document, getV1DocumentsManager } from '@elementor/editor-documents';

type ComponentDocumentData = Document;

export const getComponentDocumentData = async ( id: number ) => {
	const documentManager = getV1DocumentsManager();

	try {
		const document = await documentManager.request< ComponentDocumentData >( id );

		if ( ! document || 'elementor_component' !== document.type.value ) {
			return null;
		}

		return document;
	} catch {
		return null;
	}
};

export const invalidateComponentDocumentData = ( id: number ) => {
	const documentManager = getV1DocumentsManager();

	documentManager.invalidateCache( id );
};
