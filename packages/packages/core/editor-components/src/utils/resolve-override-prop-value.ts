import { type V1Element } from '@elementor/editor-elements';
import { type Props, type PropValue } from '@elementor/editor-props';
import { __getState as getState } from '@elementor/store';

import { resolveOriginValue } from '../components/instance-editing-panel/use-resolved-origin-value';
import { COMPONENT_WIDGET_TYPE } from '../consts';
import {
	type ComponentInstanceOverrideProp,
	componentInstanceOverridePropTypeUtil,
} from '../prop-types/component-instance-override-prop-type';
import {
	type ComponentInstanceOverride,
	type ComponentInstanceOverridesPropValue,
} from '../prop-types/component-instance-overrides-prop-type';
import { componentInstancePropTypeUtil } from '../prop-types/component-instance-prop-type';
import {
	type ComponentOverridableProp,
	componentOverridablePropTypeUtil,
} from '../prop-types/component-overridable-prop-type';
import { selectData } from '../store/store';
import { type OverridableProp, type OverridableProps } from '../types';
import { getMatchingOverride } from './overridable-props-utils';

export const resolveOverridePropValue = ( originalPropValue: ComponentInstanceOverride | PropValue ): PropValue => {
	const isOverridable = componentOverridablePropTypeUtil.isValid( originalPropValue );
	if ( isOverridable ) {
		return getOverridableValue( originalPropValue as ComponentOverridableProp );
	}

	const isOverride = componentInstanceOverridePropTypeUtil.isValid( originalPropValue );
	if ( isOverride ) {
		return getOverrideValue( originalPropValue );
	}

	return originalPropValue;
};

export function resolveInstanceElementSettings( {
	elementSettings,
	overrides,
	overridableProps,
	originElementId,
	innerElementContainer,
}: {
	elementSettings: Props;
	overrides: ComponentInstanceOverridesPropValue;
	overridableProps: OverridableProps;
	originElementId: string;
	innerElementContainer: V1Element;
} ): Props {
	const resolvedSettings: Props = {};
	const components = selectData( getState() );

	for ( const [ propKey, propValue ] of Object.entries( elementSettings ) ) {
		const overridable = componentOverridablePropTypeUtil.extract( propValue );

		if ( ! overridable ) {
			resolvedSettings[ propKey ] = propValue;
			continue;
		}

		const overridableProp = findOverridablePropByOrigin( overridableProps, originElementId, propKey );

		if ( overridableProp ) {
			const matchingOverride = getMatchingOverride( overrides, overridableProp.overrideKey );
			const recursiveOriginValue = resolveOriginValue( components, matchingOverride, overridableProp );
			const resolvedOverrideValue = matchingOverride ? resolveOverridePropValue( matchingOverride ) : null;

			resolvedSettings[ propKey ] = unwrapIfOverridable(
				resolvedOverrideValue ?? recursiveOriginValue ?? overridableProp.originValue
			);
			continue;
		}

		const intermediateOverrideValue = resolveFromIntermediateComponent(
			innerElementContainer,
			overridable.override_key
		);
		resolvedSettings[ propKey ] = intermediateOverrideValue ?? unwrapIfOverridable( propValue );
	}

	return resolvedSettings;
}

function resolveFromIntermediateComponent(
	container: V1Element,
	overrideKey: string,
	lastResolvedValue: PropValue | null = null
): PropValue | null {
	const parentComponentInstance = findNearestParentComponentInstance( container );

	if ( ! parentComponentInstance ) {
		return lastResolvedValue;
	}

	const componentInstanceSetting = parentComponentInstance.settings.get( 'component_instance' );
	const instanceData = componentInstancePropTypeUtil.extract( componentInstanceSetting );
	const intermediateOverrides = instanceData?.overrides?.value;
	const matchingOverride = intermediateOverrides ? getMatchingOverride( intermediateOverrides, overrideKey ) : null;

	if ( ! matchingOverride ) {
		return lastResolvedValue;
	}

	const overridableValue = componentOverridablePropTypeUtil.extract( matchingOverride );

	if ( overridableValue ) {
		const resolved = resolveOverridePropValue( matchingOverride );
		const updatedValue = resolved ?? lastResolvedValue;

		return resolveFromIntermediateComponent( parentComponentInstance, overridableValue.override_key, updatedValue );
	}

	return resolveOverridePropValue( matchingOverride );
}

function findNearestParentComponentInstance( container: V1Element ): V1Element | null {
	let current = container.parent;

	while ( current ) {
		const widgetType = current.model.get( 'widgetType' );

		if ( widgetType === COMPONENT_WIDGET_TYPE ) {
			return current;
		}

		current = current.parent;
	}

	return null;
}

function findOverridablePropByOrigin(
	overridableProps: OverridableProps,
	originElementId: string,
	propKey: string
): OverridableProp | null {
	return (
		Object.values( overridableProps.props ).find( ( prop ) => {
			const origin = prop.originPropFields ?? prop;
			return origin.elementId === originElementId && origin.propKey === propKey;
		} ) ?? null
	);
}

function getOverridableValue( overridableProp: ComponentOverridableProp | null ): PropValue {
	const overridableValue = componentOverridablePropTypeUtil.extract( overridableProp );

	if ( ! overridableValue ) {
		return null;
	}

	const isOverride = componentInstanceOverridePropTypeUtil.isValid( overridableValue.origin_value );

	if ( isOverride ) {
		return getOverrideValue( overridableValue.origin_value as ComponentInstanceOverrideProp );
	}

	return overridableValue.origin_value;
}

function getOverrideValue( overrideProp: ComponentInstanceOverrideProp | null ): PropValue {
	const overrideValue = componentInstanceOverridePropTypeUtil.extract( overrideProp );

	if ( ! overrideValue ) {
		return null;
	}

	return overrideValue.override_value as PropValue;
}

function unwrapIfOverridable( val: PropValue ): PropValue {
	if ( componentOverridablePropTypeUtil.isValid( val ) ) {
		const extracted = componentOverridablePropTypeUtil.extract( val );
		return extracted?.origin_value ?? null;
	}

	return val;
}
