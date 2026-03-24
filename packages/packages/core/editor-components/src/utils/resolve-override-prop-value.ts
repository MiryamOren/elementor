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
import { selectData } from '../store/store';
import { getOverridableProp } from './get-overridable-prop';
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
	componentId,
}: {
	elementSettings: Props;
	overrides: ComponentInstanceOverridesPropValue;
	componentId: number;
} ): { resolvedSettings: Props; overridablePropKeys: Record< string, string > } {
	const resolvedSettings: Props = {};
	const overridablePropKeys: Record< string, string > = {};
	const components = selectData( getState() );

	for ( const [ propKey, propValue ] of Object.entries( elementSettings ) ) {
		resolvedSettings[ propKey ] = unwrapIfOverridable( propValue );

		const isOverridable = componentOverridablePropTypeUtil.isValid( propValue );

		if ( isOverridable ) {
			const overrideKey = componentOverridablePropTypeUtil.extract( propValue )?.override_key;
			if ( ! overrideKey ) {
				resolvedSettings[ propKey ] = unwrapIfOverridable( propValue );
				continue;
			}

			overridablePropKeys[ propKey ] = overrideKey;

			const matchingOverride = getMatchingOverride( overrides, overrideKey );
			const overridableProp = getOverridableProp( { componentId, overrideKey } );

			if ( ! overridableProp ) {
				resolvedSettings[ propKey ] = unwrapIfOverridable( propValue );
				console.error( `Overridable prop ${ overrideKey } not found`, { componentId, propKey, propValue } );
				continue;
			}

			const recursiveOriginValue = resolveOriginValue( components, matchingOverride, overridableProp );
			const resolvedOverrideValue = matchingOverride ? resolveOverridePropValue( matchingOverride ) : null;

			const resolvedPropValue = resolvedOverrideValue ?? recursiveOriginValue ?? overridableProp.originValue;
			resolvedSettings[ propKey ] = unwrapIfOverridable( resolvedPropValue );
		}
	}

	return { resolvedSettings, overridablePropKeys };
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
