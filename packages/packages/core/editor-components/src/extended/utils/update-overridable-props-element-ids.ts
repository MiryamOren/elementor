import { __dispatch as dispatch, __getState as getState } from '@elementor/store';

import { type ComponentsSlice, selectCurrentComponentId, selectOverridableProps, slice } from '../../store/store';

type UpdateOverridablePropsElementIdsParams = {
	idMapping: Map< string, string >;
};

export function updateOverridablePropsElementIds( { idMapping }: UpdateOverridablePropsElementIdsParams ): void {
	if ( idMapping.size === 0 ) {
		return;
	}

	const state = getState() as ComponentsSlice | undefined;

	if ( ! state ) {
		return;
	}

	const currentComponentId = selectCurrentComponentId( state );

	if ( ! currentComponentId ) {
		return;
	}

	const overridableProps = selectOverridableProps( state, currentComponentId );

	if ( ! overridableProps || Object.keys( overridableProps.props ).length === 0 ) {
		return;
	}

	let hasChanges = false;
	const updatedProps = { ...overridableProps.props };

	for ( const [ propKey, prop ] of Object.entries( updatedProps ) ) {
		const newElementId = idMapping.get( prop.elementId );

		if ( newElementId ) {
			updatedProps[ propKey ] = {
				...prop,
				elementId: newElementId,
			};
			hasChanges = true;
		}

		if ( prop.originPropFields ) {
			const newOriginElementId = idMapping.get( prop.originPropFields.elementId );

			if ( newOriginElementId ) {
				updatedProps[ propKey ] = {
					...updatedProps[ propKey ],
					originPropFields: {
						...prop.originPropFields,
						elementId: newOriginElementId,
					},
				};
				hasChanges = true;
			}
		}
	}

	if ( ! hasChanges ) {
		return;
	}

	dispatch(
		slice.actions.setOverridableProps( {
			componentId: currentComponentId,
			overridableProps: {
				...overridableProps,
				props: updatedProps,
			},
		} )
	);
}
