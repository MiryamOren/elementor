import { type V1ElementData, type V1ElementSettingsProps } from '@elementor/editor-elements';
import { type AnyTransformable, type PropValue } from '@elementor/editor-props';
import { __getState as getState } from '@elementor/store';

import { setOverridableProp } from '../../extended/store/actions/set-overridable-prop';
import {
	type ComponentInstanceOverrideProp,
	componentInstanceOverridePropTypeUtil,
} from '../../prop-types/component-instance-override-prop-type';
import { type ComponentInstanceOverride } from '../../prop-types/component-instance-overrides-prop-type';
import {
	type ComponentInstanceProp,
	componentInstancePropTypeUtil,
} from '../../prop-types/component-instance-prop-type';
import { componentOverridablePropTypeUtil } from '../../prop-types/component-overridable-prop-type';
import { selectCurrentComponentId, selectOverridableProps } from '../../store/store';
import { isComponentInstance } from '../is-component-instance';

export function resolveOverridableSettings(
	element: V1ElementData,
	overrideMap: Map< string, ComponentInstanceOverride >
): V1ElementSettingsProps {
	if ( isComponentInstance( { widgetType: element.widgetType, elType: element.elType } ) ) {
		return resolveOverridableSettingsForComponentInstance( element, overrideMap );
	}

	return resolveOverridableSettingsForRegularElement( element, overrideMap );
}

function resolveOverridableSettingsForRegularElement(
	element: V1ElementData,
	overrideMap: Map< string, ComponentInstanceOverride >
): V1ElementSettingsProps {
	const updatedSettings = { ...( element.settings ?? {} ) };

	for ( const [ settingKey, settingValue ] of Object.entries( element.settings ?? {} ) ) {
		if ( ! componentOverridablePropTypeUtil.isValid( settingValue ) ) {
			continue;
		}

		const innerOverrideKey = settingValue.value.override_key;
		const matchingOverride = overrideMap.get( innerOverrideKey );

		if ( ! matchingOverride ) {
			updatedSettings[ settingKey ] = settingValue.value.origin_value as PropValue;
			continue;
		}

		if ( componentOverridablePropTypeUtil.isValid( matchingOverride ) ) {
			const innerOverride = matchingOverride.value.origin_value as ComponentInstanceOverrideProp;
			const overrideKey = matchingOverride.value.override_key;
			const originValue = innerOverride.value.override_value as AnyTransformable;

			updatedSettings[ settingKey ] = componentOverridablePropTypeUtil.create( {
				override_key: overrideKey,
				origin_value: originValue,
			} );

			updateOverridableProp( {
				overrideKey,
				element,
				propKey: settingKey,
				originValue,
			} );
		} else if ( componentInstanceOverridePropTypeUtil.isValid( matchingOverride ) ) {
			updatedSettings[ settingKey ] = matchingOverride.value.override_value as PropValue;
		}
	}

	return updatedSettings;
}

function resolveOverridableSettingsForComponentInstance(
	element: V1ElementData,
	overrideMap: Map< string, ComponentInstanceOverride >
): V1ElementSettingsProps {
	const componentInstance = element.settings?.component_instance as ComponentInstanceProp | undefined;

	if ( ! componentInstancePropTypeUtil.isValid( componentInstance ) ) {
		return element.settings ?? {};
	}

	const instanceOverrides = componentInstance.value.overrides?.value;

	if ( ! instanceOverrides?.length ) {
		return element.settings ?? {};
	}

	const updatedOverrides = instanceOverrides.map( ( item ) => {
		if ( ! componentOverridablePropTypeUtil.isValid( item ) ) {
			return item;
		}

		const innerOverrideKey = item.value.override_key;
		const matchingOverride = overrideMap.get( innerOverrideKey );
		const innerOriginValue = item.value.origin_value as ComponentInstanceOverrideProp;

		if ( ! matchingOverride ) {
			return innerOriginValue;
		}

		if ( componentOverridablePropTypeUtil.isValid( matchingOverride ) ) {
			const outerOriginValue = matchingOverride.value.origin_value as ComponentInstanceOverrideProp;
			const newOverridableOverride = componentOverridablePropTypeUtil.create( {
				override_key: matchingOverride.value.override_key,
				origin_value: componentInstanceOverridePropTypeUtil.create( {
					override_key: innerOriginValue.value.override_key,
					override_value: outerOriginValue.value.override_value,
					schema_source: innerOriginValue.value.schema_source,
				} ),
			} );

			updateOverridableProp( {
				overrideKey: matchingOverride.value.override_key,
				element,
				propKey: innerOriginValue.value.override_key,
				originValue: outerOriginValue.value.override_value as AnyTransformable,
			} );

			return newOverridableOverride;
		}

		if ( componentInstanceOverridePropTypeUtil.isValid( matchingOverride ) ) {
			return componentInstanceOverridePropTypeUtil.create( {
				override_key: innerOriginValue.value.override_key,
				override_value: matchingOverride.value.override_value,
				schema_source: innerOriginValue.value.schema_source,
			} );
		}

		return innerOriginValue;
	} );

	return {
		...element.settings,
		component_instance: {
			...componentInstance,
			value: {
				...componentInstance.value,
				overrides: {
					...componentInstance.value.overrides,
					value: updatedOverrides,
				},
			},
		},
	};
}

export function updateOverridableProp( {
	overrideKey,
	element,
	propKey,
	originValue,
}: {
	overrideKey: string;
	element: V1ElementData;
	propKey: string;
	originValue: AnyTransformable | null;
} ): void {
	const currentComponentId = selectCurrentComponentId( getState() );
	if ( ! currentComponentId ) {
		throw new Error( 'Should not update overridable props meta outside of component edit mode' );
	}

	const currentOverridableProps = selectOverridableProps( getState(), currentComponentId );
	const currentOverridableProp = currentOverridableProps?.props[ overrideKey ];

	if ( ! currentOverridableProp ) {
		throw new Error(
			`Overridable prop with key "${ overrideKey }" not found for component ${ currentComponentId }`
		);
	}

	const { originPropFields, ...rest } = currentOverridableProp;
	const isComponent = isComponentInstance( { widgetType: element.widgetType, elType: element.elType } );
	const overridableBase = isComponent ? { ...currentOverridableProp } : { ...rest };

	setOverridableProp( {
		...overridableBase,
		elementId: element.id,
		elType: element.elType ?? 'widget',
		widgetType: element.widgetType ?? element.elType,
		propKey,
		originValue,
		originPropFields,
		componentId: currentComponentId,
		source: 'system',
	} );
}
