import * as React from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { PropKeyProvider, PropProvider, type SetValueMeta } from '@elementor/editor-controls';
import { setDocumentModifiedStatus } from '@elementor/editor-documents';
import { type ElementID, getElementLabel, getElementSettings, updateElementSettings } from '@elementor/editor-elements';
import {
	type CreateOptions,
	isDependency,
	isDependencyMet,
	type PropKey,
	type Props,
	type PropsSchema,
	type PropType,
} from '@elementor/editor-props';
import { undoable } from '@elementor/editor-v1-adapters';
import { __ } from '@wordpress/i18n';

import { useElement } from '../contexts/element-context';
import {
	extractOrderedDependencies,
	getElementSettingsWithDefaults,
	getUpdatedValues,
	type Value,
	type Values,
} from '../utils/prop-dependency-utils';
import { createTopLevelObjectType } from './create-top-level-object-type';

type SettingsFieldProps = {
	bind: PropKey;
	propDisplayName: string;
	children: React.ReactNode;
	customSetValue?: ( newValues: Values ) => void;
};

const HISTORY_DEBOUNCE_WAIT = 800;

const extractDependencyEffect = ( bind: string, propsSchema: PropsSchema, currentElementSettings: Props ) => {
	const elementSettingsForDepCheck = getElementSettingsWithDefaults( propsSchema, currentElementSettings );
	const propType = propsSchema[ bind ];
	const depCheck = isDependencyMet( propType?.dependencies, elementSettingsForDepCheck );
	const isHidden =
		! depCheck.isMet &&
		! isDependency( depCheck.failingDependencies[ 0 ] ) &&
		depCheck.failingDependencies[ 0 ]?.effect === 'hide';

	return {
		isDisabled: ( prop: PropType ) => {
			const result = ! isDependencyMet( prop?.dependencies, elementSettingsForDepCheck ).isMet;
			return result;
		},
		isHidden,
		settingsWithDefaults: elementSettingsForDepCheck as Values,
	};
};

export const SettingsField = ( { bind, children, propDisplayName, customSetValue }: SettingsFieldProps ) => {
	const {
		element: { id: elementId },
		elementType: { propsSchema, dependenciesPerTargetMapping = {} },
		settings: currentElementSettings,
	} = useElement();

	const value = { [ bind ]: currentElementSettings?.[ bind ] ?? null };

	const propType = createTopLevelObjectType( { schema: propsSchema } );

	const undoableUpdateElementProp = useUndoableUpdateElementProp( {
		elementId,
		propDisplayName,
	} );

	const { isDisabled, isHidden, settingsWithDefaults } = extractDependencyEffect(
		bind,
		propsSchema,
		currentElementSettings
	);

	const setValue = useCallback(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		( newValue: Values, _: CreateOptions = {}, meta?: SetValueMeta ) => {
			const { withHistory = true } = meta ?? {};
			const dependents = extractOrderedDependencies( dependenciesPerTargetMapping );

			const settings = getUpdatedValues( newValue, dependents, propsSchema, settingsWithDefaults, elementId );
			if ( customSetValue ) {
				customSetValue( settings );
			} else if ( withHistory ) {
				undoableUpdateElementProp( settings );
			} else {
				updateElementSettings( { id: elementId, props: settings, withHistory: false } );
			}
		},
		[
			customSetValue,
			undoableUpdateElementProp,
			elementId,
			dependenciesPerTargetMapping,
			propsSchema,
			settingsWithDefaults,
		]
	);

	useEffect( () => {
		const elementSettingsForDepCheck = getElementSettingsWithDefaults( propsSchema, currentElementSettings );
		const propType2 = propsSchema[ bind ];
		const depCheck = isDependencyMet( propType2?.dependencies, elementSettingsForDepCheck );
		const shouldHaveNewValue =
			! depCheck.isMet &&
			! isDependency( depCheck.failingDependencies[ 0 ] ) &&
			Boolean( depCheck.failingDependencies[ 0 ]?.newValue );

		const a = shouldHaveNewValue;
		console.log( a );
		if ( shouldHaveNewValue ) {
			const newValue = depCheck.failingDependencies[ 0 ].newValue as Value;
			setValue( { [ bind ]: newValue }, undefined, { withHistory: false } );
		}
	}, [ currentElementSettings, bind, propsSchema, setValue ] );

	if ( isHidden ) {
		return null;
	}

	return (
		<PropProvider propType={ propType } value={ value } setValue={ setValue } isDisabled={ isDisabled }>
			<PropKeyProvider bind={ bind }>{ children }</PropKeyProvider>
		</PropProvider>
	);
};

function useUndoableUpdateElementProp( {
	elementId,
	propDisplayName,
}: {
	elementId: ElementID;
	propDisplayName: string;
} ) {
	return useMemo( () => {
		return undoable(
			{
				do: ( newSettings: Props ) => {
					const prevPropValue = getElementSettings( elementId, Object.keys( newSettings ) ) as Props;

					updateElementSettings( { id: elementId, props: newSettings as Props, withHistory: false } );
					setDocumentModifiedStatus( true );

					return prevPropValue;
				},

				undo: ( {}, prevProps ) => {
					updateElementSettings( { id: elementId, props: prevProps, withHistory: false } );
				},
			},
			{
				title: getElementLabel( elementId ),
				// translators: %s is the name of the property that was edited.
				subtitle: __( '%s edited', 'elementor' ).replace( '%s', propDisplayName ),
				debounce: { wait: HISTORY_DEBOUNCE_WAIT },
			}
		);
	}, [ elementId, propDisplayName ] );
}
