import { injectIntoTop } from '@elementor/editor';
import { EXPERIMENTAL_FEATURES, isExperimentActive } from '@elementor/editor-v1-adapters';

import { CreateComponentForm } from './components/create-component-form';

export function init() {
	if ( ! isExperimentActive( EXPERIMENTAL_FEATURES.COMPONENTS ) ) {
		return;
	}

	injectIntoTop( {
		id: 'create-component-popup',
		component: CreateComponentForm,
	} );
}
