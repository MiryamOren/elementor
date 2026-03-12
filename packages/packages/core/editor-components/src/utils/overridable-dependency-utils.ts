import { type Props, type PropValue } from '@elementor/editor-props';

import { componentOverridablePropTypeUtil } from '../prop-types/component-overridable-prop-type';

type TransformableValue = { $$type: string; value: unknown };

function isTransformableObject( val: unknown ): val is TransformableValue {
	return (
		typeof val === 'object' &&
		val !== null &&
		'$$type' in val &&
		typeof ( val as TransformableValue ).$$type === 'string' &&
		'value' in val
	);
}

/**
 * Recursively unwraps all overridable wrappers in a settings object, replacing each
 * `{ $$type: "overridable", value: { override_key, origin_value } }` with its `origin_value`.
 * This allows the dependency system to operate on the actual prop values.
 */
export function unwrapOverridableValues( settings: Props ): Props {
	const result: Props = {};

	for ( const [ key, val ] of Object.entries( settings ) ) {
		result[ key ] = unwrapValue( val );
	}

	return result;
}

function unwrapValue( val: PropValue ): PropValue {
	if ( ! isTransformableObject( val ) ) {
		return val;
	}

	if ( componentOverridablePropTypeUtil.isValid( val ) ) {
		const extracted = componentOverridablePropTypeUtil.extract( val );
		return extracted?.origin_value ?? null;
	}

	return val;
}

type OverridableInfo = {
	override_key: string;
};

/**
 * Builds a map of prop keys to their overridable metadata (override_key) from the
 * original settings. Used after dependency computation to re-wrap updated values.
 */
export function extractOverridableMap( settings: Props ): Record< string, OverridableInfo > {
	const map: Record< string, OverridableInfo > = {};

	for ( const [ key, val ] of Object.entries( settings ) ) {
		if ( isTransformableObject( val ) && componentOverridablePropTypeUtil.isValid( val ) ) {
			const extracted = componentOverridablePropTypeUtil.extract( val );
			if ( extracted ) {
				map[ key ] = { override_key: extracted.override_key };
			}
		}
	}

	return map;
}

/**
 * Re-wraps values that were originally overridable after the dependency system has computed
 * new values. Only wraps values whose keys existed in the original overridable map.
 */
export function rewrapOverridableValues(
	updatedSettings: Props,
	overridableMap: Record< string, OverridableInfo >
): Props {
	const result: Props = {};

	for ( const [ key, val ] of Object.entries( updatedSettings ) ) {
		const info = overridableMap[ key ];

		if ( info && ! componentOverridablePropTypeUtil.isValid( val ) ) {
			result[ key ] = componentOverridablePropTypeUtil.create( {
				override_key: info.override_key,
				origin_value: val as TransformableValue | null,
			} );
		} else {
			result[ key ] = val;
		}
	}

	return result;
}
