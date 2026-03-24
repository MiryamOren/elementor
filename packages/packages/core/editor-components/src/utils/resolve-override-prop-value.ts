import { type Props, type PropValue } from '@elementor/editor-props';
import { __getState as getState } from '@elementor/store';

import { resolveOriginValue } from '../components/instance-editing-panel/use-resolved-origin-value';
import {
	type ComponentInstanceOverrideProp,
	componentInstanceOverridePropTypeUtil,
} from '../prop-types/component-instance-override-prop-type';
import {
	type ComponentInstanceOverride,
	type ComponentInstanceOverridesPropValue,
} from '../prop-types/component-instance-overrides-prop-type';
import {
	type ComponentOverridableProp,
	componentOverridablePropTypeUtil,
} from '../prop-types/component-overridable-prop-type';
import { selectData, selectOverridablePropByKey } from '../store/store';
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
}: {
	elementSettings: Props;
	overrides: ComponentInstanceOverridesPropValue;
} ): Props {
	const resolvedSettings: Props = {};
	const components = selectData( getState() );

	for ( const [ propKey, propValue ] of Object.entries( elementSettings ) ) {
		const overridable = componentOverridablePropTypeUtil.extract( propValue );

		if ( ! overridable ) {
			resolvedSettings[ propKey ] = propValue;
			continue;
		}

		const overrideKey = overridable.override_key;

		const matchingOverride = getMatchingOverride( overrides, overrideKey );
		const overridableProp = selectOverridablePropByKey( getState(), overrideKey );

		if ( ! overridableProp ) {
			resolvedSettings[ propKey ] = unwrapIfOverridable( propValue );
			console.error( `Overridable prop ${ overrideKey } not found`, { propKey, propValue } );
			continue;
		}

		const recursiveOriginValue = resolveOriginValue( components, matchingOverride, overridableProp );
		const resolvedOverrideValue = matchingOverride ? resolveOverridePropValue( matchingOverride ) : null;

		const resolvedPropValue = resolvedOverrideValue ?? recursiveOriginValue ?? overridableProp.originValue;
		resolvedSettings[ propKey ] = unwrapIfOverridable( resolvedPropValue );
	}

	return resolvedSettings;
}

getMatchingOverrideByElementIdAndPropKey = ( overrides: ComponentInstanceOverridesPropValue, elementId: string, propKey: string ): ComponentInstanceOverride | null => {
	return overrides.find( ( override ) => {
		const overridableValue = componentOverridablePropTypeUtil.extract( override );
		return overridableValue?.override_key === overrideKey;
	} ) ?? null;
};

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
