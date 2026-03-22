import * as React from 'react';
import { ControlReplacementsProvider, getControlReplacements, useBoundProp } from '@elementor/editor-controls';
import {
	BaseControl,
	controlsRegistry,
	type ControlType,
	ControlTypeContainer,
	createTopLevelObjectType,
	ElementProvider,
	isDynamicPropValue,
	SettingsField,
	useElement,
} from '@elementor/editor-editing-panel';
import { type Control, getElementSettings, getElementType } from '@elementor/editor-elements';
import { type AnyTransformable, type PropType, type PropValue } from '@elementor/editor-props';
import { Values } from '@elementor/schema';
import { Box } from '@elementor/ui';

import { useControlsByWidgetType } from '../../hooks/use-controls-by-widget-type';
import {
	type ComponentInstanceOverrideProp,
	componentInstanceOverridePropTypeUtil,
} from '../../prop-types/component-instance-override-prop-type';
import {
	type ComponentInstanceOverride,
	componentInstanceOverridesPropTypeUtil,
} from '../../prop-types/component-instance-overrides-prop-type';
import { componentInstancePropTypeUtil } from '../../prop-types/component-instance-prop-type';
import {
	type ComponentOverridableProp,
	componentOverridablePropTypeUtil,
} from '../../prop-types/component-overridable-prop-type';
import {
	useComponentId,
	useComponentInstanceOverrides,
	useComponentOverridableProps,
} from '../../provider/component-instance-context';
import { OverridablePropProvider } from '../../provider/overridable-prop-context';
import { updateOverridableProp } from '../../store/actions/update-overridable-prop';
import { useCurrentComponentId } from '../../store/store';
import { type OriginPropFields, type OverridableProp, type OverridableProps } from '../../types';
import { getContainerByOriginId } from '../../utils/get-container-by-origin-id';
import { getPropTypeForComponentOverride } from '../../utils/get-prop-type-for-component-override';
import { getMatchingOverride } from '../../utils/overridable-props-utils';
import { resolveInstanceSettingsForDependencies } from '../../utils/resolve-instance-settings-for-dependencies';
import { resolveOverridePropValue } from '../../utils/resolve-override-prop-value';
import { ControlLabel } from '../control-label';
import { OverrideControlInnerElementNotFoundError } from '../errors';

type Props = {
	overrideKey: string;
};

export function OverridePropControl( { overrideKey }: Props ) {
	const overridableProps = useComponentOverridableProps();
	const overridableProp = overridableProps?.props[ overrideKey ];

	if ( ! overridableProp ) {
		return null;
	}

	return (
		<SettingsField bind="component_instance" propDisplayName={ overridableProp.label }>
			<OverrideControl overridableProp={ overridableProp } />
		</SettingsField>
	);
}

type InternalProps = {
	overridableProp: OverridableProp;
};
type OverridesSchema = Record< string, ComponentInstanceOverride >;

function OverrideControl( { overridableProp }: InternalProps ) {
	const componentInstanceElement = useElement();
	const { value: instanceValue, setValue: setInstanceValue } = useBoundProp( componentInstancePropTypeUtil );
	const wrappingComponentId = useCurrentComponentId();
	const componentId = useComponentId();
	const overridableProps = useComponentOverridableProps();
	const overrides = useComponentInstanceOverrides();

	const controls = useControlsByWidgetType(
		overridableProp?.originPropFields?.widgetType ?? overridableProp.widgetType
	);
	const controlReplacements = getControlReplacements();

	const matchingOverride = getMatchingOverride( overrides, overridableProp.overrideKey );

	// const recursiveOriginValue = useResolvedOriginValue( matchingOverride, overridableProp );

	if ( ! componentId ) {
		throw new Error( 'Component ID is required' );
	}

	if ( ! overridableProps ) {
		throw new Error( 'Component has no overridable props' );
	}

	const propType = getPropTypeForComponentOverride( overridableProp );

	if ( ! propType ) {
		return null;
	}

	// const resolvedOverrideValue = matchingOverride ? resolveOverridePropValue( matchingOverride ) : null;
	// const propValue = resolvedOverrideValue ?? recursiveOriginValue ?? overridableProp.originValue;

	// const value = {
	// 	[ overridableProp.overrideKey ]: propValue,
	// } as OverridesSchema;

	const setValue = ( newValues: Record< string, AnyTransformable | null > ) => {
		if ( ! overridableProps ) {
			setInstanceValue( {
				...instanceValue,
				overrides: undefined,
			} );

			return;
		}

		const changedKeys = Object.keys( newValues );
		// there might be dependent props that need to be updated -
		// we should check if the other keys are exposed as overrides too
		const overridableKeys: {
			propKey: string;
			propKeyOverridableProp: OverridableProp;
		}[] = changedKeys
			.map( ( propKey ) => ( {
				propKey,
				propKeyOverridableProp: Object.values( overridableProps.props ).find(
					( prop ) => prop.propKey === propKey
				),
			} ) )
			.filter( ( { propKeyOverridableProp } ) => propKeyOverridableProp !== undefined );

		const newOverrides: Record<
			string,
			{
				override: ComponentInstanceOverride;
				isExistingOverride?: boolean;
			}
		> = {};

		overridableKeys.forEach( ( { propKey, propKeyOverridableProp } ) => {
			const propKeyMatchingOverride = getMatchingOverride( overrides, propKeyOverridableProp.overrideKey );
			const previousOverrideValue = propKeyMatchingOverride
				? resolveOverridePropValue( propKeyMatchingOverride )
				: null;

			const newPropValue = getTempNewValueForDynamicProp( propType, previousOverrideValue, newValues[ propKey ] );

			const newOverrideValue = createOverrideValue( {
				matchingOverride: propKeyMatchingOverride,
				overrideKey: propKeyOverridableProp.overrideKey,
				overrideValue: newPropValue,
				componentId,
			} );

			newOverrides[ propKeyOverridableProp.overrideKey ] = {
				override: newOverrideValue,
			};

			const overridableValue = componentOverridablePropTypeUtil.extract( newOverrideValue );
			if ( overridableValue && wrappingComponentId ) {
				if ( overridableProp.originPropFields ) {
					updateOverridableProp( wrappingComponentId, overridableValue, overridableProp.originPropFields );

					return;
				}

				updateOverridableProp( wrappingComponentId, overridableValue, {
					elType: overridableProp.elType,
					widgetType: overridableProp.widgetType,
					propKey: overridableProp.propKey,
					elementId: overridableProp.elementId,
				} );
			}
		} );

		let updatedOverrides: ComponentInstanceOverride[] = ( overrides ?? [] )
			.filter( ( override ) => isValidOverride( overridableProps, override ) )
			.map( ( override ) => {
				const existingOverrideKey =
					componentOverridablePropTypeUtil.extract( override )?.override_key ?? override.value.override_key;

				const matchingNewOverride = newOverrides[ existingOverrideKey ];
				if ( matchingNewOverride ) {
					newOverrides[ existingOverrideKey ].isExistingOverride = true;
					return matchingNewOverride.override;
				}

				return override;
			} );
		const remainingOverrides: ComponentInstanceOverride[] = Object.values( newOverrides )
			.filter( ( { isExistingOverride } ) => ! isExistingOverride )
			.map( ( { override } ) => override );
		if ( ! matchingOverride ) {
			updatedOverrides = [ ...updatedOverrides, ...remainingOverrides ];
		}

		setInstanceValue( {
			...instanceValue,
			overrides: componentInstanceOverridesPropTypeUtil.create( updatedOverrides ),
		} );
	};

	const { control, controlProps, layout } = getControlParams(
		controls,
		overridableProp?.originPropFields ?? overridableProp,
		overridableProp.label
	);

	const {
		elementId: originElementId,
		widgetType,
		elType,
		propKey,
	} = overridableProp.originPropFields ?? overridableProp;

	const element = getContainerByOriginId( originElementId, componentInstanceElement.element.id );

	if ( ! element ) {
		throw new OverrideControlInnerElementNotFoundError( {
			context: { componentId, elementId: originElementId },
		} );
	}
	const elementId = element.id;

	const type = elType === 'widget' ? widgetType : elType;
	const elementType = getElementType( type );

	if ( ! elementType ) {
		return null;
	}

	const rawSettings = getElementSettings< AnyTransformable >( elementId, Object.keys( elementType.propsSchema ) );

	const resolvedSettings = resolveInstanceSettingsForDependencies( {
		elementSettings: rawSettings,
		elementId: originElementId,
		overridableProps,
		overrides: overrides ?? [],
	} );

	const propTypeSchema = createTopLevelObjectType( {
		schema: {
			[ overridableProp.overrideKey ]: propType,
		},
	} );

	console.log( `resolvedSettings for ${ propTypeSchema.key }`, resolvedSettings );

	return (
		<OverridablePropProvider
			value={ componentOverridablePropTypeUtil.extract( matchingOverride ) ?? undefined }
			componentInstanceElement={ componentInstanceElement }
		>
			<ElementProvider
				element={ { id: elementId, type } }
				elementType={ elementType }
				settings={ resolvedSettings as Record< string, AnyTransformable | null > }
			>
				<SettingsField bind={ propKey } propDisplayName={ overridableProp.label } customSetValue={ setValue }>
					{ /* <PropProvider propType={ propTypeSchema } value={ value } setValue={ setValue }>
						<PropKeyProvider bind={ overridableProp.overrideKey }> */ }
					<ControlReplacementsProvider replacements={ controlReplacements }>
						<Box mb={ 1.5 }>
							<ControlTypeContainer layout={ layout }>
								{ layout !== 'custom' && <ControlLabel>{ overridableProp.label }</ControlLabel> }
								<OriginalControl control={ control } controlProps={ controlProps } />
							</ControlTypeContainer>
						</Box>
					</ControlReplacementsProvider>
					{ /* </PropKeyProvider>
					</PropProvider> */ }
				</SettingsField>
			</ElementProvider>
		</OverridablePropProvider>
	);
}

// temp solution to allow dynamic values to be overridden, will be removed once placeholder is implemented
function getTempNewValueForDynamicProp( propType: PropType, propValue: PropValue, newPropValue: PropValue ) {
	const isRemovingOverride = newPropValue === null;

	if ( isRemovingOverride && isDynamicPropValue( propValue ) ) {
		return ( propType.default ?? null ) as ComponentInstanceOverrideProp | ComponentOverridableProp;
	}

	return newPropValue as ComponentInstanceOverrideProp | ComponentOverridableProp;
}

function createOverrideValue( {
	matchingOverride,
	overrideKey,
	overrideValue,
	componentId,
}: {
	matchingOverride: ComponentInstanceOverride | null;
	overrideKey: string;
	overrideValue: ComponentInstanceOverrideProp | ComponentOverridableProp;
	componentId: number;
} ): ComponentInstanceOverride {
	// this is for an override that's already set as overridable
	const overridableValue = componentOverridablePropTypeUtil.extract( matchingOverride );

	// this is for changes via the overridable-prop-indicator
	const newOverridableValue = componentOverridablePropTypeUtil.extract( overrideValue );

	const anyOverridable = newOverridableValue ?? overridableValue;

	if ( anyOverridable ) {
		const innerOverride = componentInstanceOverridePropTypeUtil.create( {
			override_key: overrideKey,
			override_value: resolveOverridePropValue( overrideValue ),
			schema_source: {
				type: 'component',
				id: componentId,
			},
		} );

		return componentOverridablePropTypeUtil.create( {
			override_key: anyOverridable.override_key,
			origin_value: innerOverride,
		} );
	}

	return componentInstanceOverridePropTypeUtil.create( {
		override_key: overrideKey,
		override_value: overrideValue,
		schema_source: {
			type: 'component',
			id: componentId,
		},
	} );
}

function getControlParams( controls: Record< string, Control >, originPropFields: OriginPropFields, label?: string ) {
	const control = controls[ originPropFields.propKey ];
	const { value } = control;

	const layout = getControlLayout( control );

	const controlProps = populateChildControlProps( value.props );

	if ( layout === 'custom' ) {
		controlProps.label = label ?? value.label;
	}

	return {
		control,
		controlProps,
		layout,
	};
}

function OriginalControl( { control, controlProps }: { control: Control; controlProps: Record< string, unknown > } ) {
	const { value } = control;

	return <BaseControl type={ value.type as ControlType } props={ controlProps } />;
}

function getControlLayout( control: Control ) {
	return control.value.meta?.layout || controlsRegistry.getLayout( control.value.type as ControlType );
}

function populateChildControlProps( props: Record< string, unknown > ) {
	if ( props.childControlType ) {
		const childComponent = controlsRegistry.get( props.childControlType as ControlType );
		const childPropType = controlsRegistry.getPropTypeUtil( props.childControlType as ControlType );
		props = {
			...props,
			childControlConfig: {
				component: childComponent,
				props: props.childControlProps || {},
				propTypeUtil: childPropType,
			},
		};
	}

	return props;
}

function isValidOverride( overridableProps: OverridableProps, override: ComponentInstanceOverride ): boolean {
	const overridableKey = componentOverridablePropTypeUtil.isValid( override )
		? ( override.value.origin_value as ComponentInstanceOverrideProp )?.value.override_key
		: override.value.override_key;

	return !! overridableProps.props[ overridableKey ];
}
