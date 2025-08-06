import { injectIntoTop } from '@elementor/editor';
import { CreateComponentForm } from './components/create-component-form';
import { isExperimentActive } from '@elementor/editor-v1-adapters';
import { EXPERIMENTAL_FEATURES } from '@elementor/editor-v1-adapters';

export function init() {
	if ( ! isExperimentActive( EXPERIMENTAL_FEATURES.COMPONENTS ) ) {
		return;
	}

	injectIntoTop( {
		id: 'create-component-popup',
		component: CreateComponentForm,
	} );
}