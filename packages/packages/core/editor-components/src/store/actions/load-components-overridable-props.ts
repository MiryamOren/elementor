import { __dispatch as dispatch, __getState as getState } from '@elementor/store';

import { apiClient } from '../../api';
import { selectIsOverridablePropsLoaded, slice } from '../store';

export async function loadComponentsOverridableProps( componentIds: number[], options?: { force?: boolean } ) {
	let componentIdsToFetch = componentIds;

	if ( ! options?.force ) {
		componentIdsToFetch = componentIds.filter( ( id ) => ! selectIsOverridablePropsLoaded( getState(), id ) );
	}

	if ( ! componentIdsToFetch.length ) {
		return;
	}

	const { data } = await apiClient.getOverridableProps( componentIdsToFetch );

	dispatch( slice.actions.loadOverridableProps( data ) );
}
