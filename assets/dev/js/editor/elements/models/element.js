import BaseElementModel from './base-element-model';

var ColumnSettingsModel = require( 'elementor-elements/models/column-settings' ),
	ElementModel;

/**
 * @name ElementModel
 */
ElementModel = BaseElementModel.extend( {
	defaults: {
		id: '',
		elType: '',
		isInner: false,
		isLocked: false,
		settings: {},
		defaultEditSettings: {
			defaultEditRoute: 'content',
		},
	},

	remoteRender: false,
	_htmlCache: null,
	_jqueryXhr: null,
	renderOnLeave: false,

	initialize( options ) {
		var elType = this.get( 'elType' ),
			elements = this.get( 'elements' );

		if ( undefined !== elements ) {
			var ElementsCollection = require( 'elementor-elements/collections/elements' );

			this.set( 'elements', new ElementsCollection( elements ) );
		}

		if ( 'widget' === elType ) {
			this.remoteRender = true;
			this.setHtmlCache( options.htmlCache || '' );
		}

		// No need this variable anymore
		delete options.htmlCache;

		// Make call to remote server as throttle function
		this.renderRemoteServer = _.throttle( this.renderRemoteServer, 1000 );

		this.initSettings();

		this.initEditSettings();

		this.on( {
			destroy: this.onDestroy,
			'editor:close': this.onCloseEditor,
		} );
	},

	initSettings() {
		var elType = this.get( 'elType' ),
			settings = this.get( 'settings' ),
			settingModels = {
				column: ColumnSettingsModel,
			},
			SettingsModel = settingModels[ elType ] || elementorModules.editor.elements.models.BaseSettings;

		if ( jQuery.isEmptyObject( settings ) ) {
			settings = structuredClone( settings );
		}

		if ( 'widget' === elType ) {
			settings.widgetType = this.get( 'widgetType' );
		}

		settings = { ...settings, elType }; // Create a shallow copy as elType is sometimes read only when trying to drop a widget preset.
		settings.isInner = this.get( 'isInner' );

		// Allow passing custom `_title` from model.
		const customTitle = this.get( '_title' );

		if ( customTitle ) {
			settings._title = customTitle;
		}

		settings = new SettingsModel( settings, {
			controls: elementor.getElementControls( this ),
		} );

		this.set( 'settings', settings );

		elementorFrontend.config.elements.data[ this.cid ] = settings;
	},

	initEditSettings() {
		var editSettings = new Backbone.Model( this.get( 'defaultEditSettings' ) );

		this.set( 'editSettings', editSettings );

		elementorFrontend.config.elements.editSettings[ this.cid ] = editSettings;
	},

	setSetting( key, value ) {
		var settings = this.get( 'settings' );

		if ( 'object' !== typeof key ) {
			var keyParts = key.split( '.' ),
				isRepeaterKey = 3 === keyParts.length;

			key = keyParts[ 0 ];

			if ( isRepeaterKey ) {
				settings = settings.get( key ).models[ keyParts[ 1 ] ];

				key = keyParts[ 2 ];
			}
		}

		settings.setExternalChange( key, value );
	},

	getSetting( key ) {
		var keyParts = key.split( '.' ),
			isRepeaterKey = 3 === keyParts.length,
			settings = this.get( 'settings' );

		key = keyParts[ 0 ];

		var value = settings.get( key );

		if ( undefined === value ) {
			return '';
		}

		if ( isRepeaterKey ) {
			value = value.models[ keyParts[ 1 ] ].get( keyParts[ 2 ] );
		}

		return value;
	},

	setHtmlCache( htmlCache ) {
		this._htmlCache = htmlCache;
	},

	getHtmlCache() {
		return this._htmlCache;
	},

	getDefaultTitle() {
		return elementor.getElementData( this ).title;
	},

	getTitle() {
		const editorSettings = this.get( 'editor_settings' );
		let title = editorSettings?.title || this.getSetting( '_title' ) || this.getSetting( 'presetTitle' );

		const custom = this.get( 'custom' );

		if ( ! title && ( custom?.isPreset ?? false ) ) {
			return this.get( 'title' ) || title;
		}

		if ( ! title ) {
			title = this.getDefaultTitle();
		}

		return title;
	},

	getVisibility() {
		if ( elementor.helpers.isAtomicWidget( this ) ) {
			return !! this.get( 'editor_settings' )?.is_hidden;
		}

		return !! this.get( 'hidden' );
	},

	setVisibility( isHidden = false ) {
		if ( elementor.helpers.isAtomicWidget( this ) ) {
			const prevEditorSettings = this.get( 'editor_settings' ) || {};

			this.set( 'editor_settings', { ...prevEditorSettings, is_hidden: isHidden } );
		} else {
			this.set( 'hidden', isHidden );
		}
	},

	toggleVisibility() {
		const isHidden = this.getVisibility();

		this.setVisibility( ! isHidden );
	},

	getIcon() {
		const mainIcon = elementor.getElementData( this ).icon,
			custom = this.get( 'custom' );

		if ( custom?.isPreset ?? false ) {
			return this.attributes.custom.preset_settings.presetIcon || mainIcon;
		}

		const savedPresetIcon = this.getSetting( 'presetIcon' );

		if ( 'string' === typeof savedPresetIcon && '' !== savedPresetIcon.trim() ) {
			return savedPresetIcon;
		}

		return mainIcon;
	},

	createRemoteRenderRequest() {
		var data = this.toJSON();

		return elementorCommon.ajax.addRequest( 'render_widget', {
			unique_id: this.cid,
			data: {
				data,
			},
			success: this.onRemoteGetHtml.bind( this ),
		}, true ).jqXhr;
	},

	renderRemoteServer() {
		if ( ! this.remoteRender ) {
			return;
		}

		this.renderOnLeave = false;

		this.trigger( 'before:remote:render' );

		if ( this.isRemoteRequestActive() ) {
			this._jqueryXhr.abort();
		}

		this._jqueryXhr = this.createRemoteRenderRequest();
	},

	isRemoteRequestActive() {
		return this._jqueryXhr && 4 !== this._jqueryXhr.readyState;
	},

	onRemoteGetHtml( data ) {
		this.setHtmlCache( data.render );
		this.trigger( 'remote:render' );
	},

	clone() {
		var newModel = new this.constructor( elementorCommon.helpers.cloneObject( this.attributes ) );

		newModel.set( 'id', elementorCommon.helpers.getUniqueId() );

		newModel.setHtmlCache( this.getHtmlCache() );

		var elements = this.get( 'elements' );

		if ( ! _.isEmpty( elements ) ) {
			newModel.set( 'elements', elements.clone() );
		}

		return newModel;
	},

	toJSON( options ) {
		options = options || {};

		// Call parent's toJSON method
		var data = Backbone.Model.prototype.toJSON.call( this );

		_.each( data, function( attribute, key ) {
			if ( attribute && attribute.toJSON ) {
				data[ key ] = attribute.toJSON( options );
			}
		} );

		if ( options.copyHtmlCache ) {
			data.htmlCache = this.getHtmlCache();
		} else {
			delete data.htmlCache;
		}

		if ( options.remove ) {
			options.remove.forEach( ( key ) => delete data[ key ] );
		}

		return data;
	},

	onCloseEditor() {
		if ( this.renderOnLeave ) {
			this.renderRemoteServer();
		}
	},

	onDestroy() {
		// Clean the memory for all use instances
		var settings = this.get( 'settings' ),
			elements = this.get( 'elements' );

		if ( undefined !== elements ) {
			_.each( _.clone( elements.models ), function( model ) {
				model.destroy();
			} );
		}

		settings.destroy();
	},

} );

ElementModel.prototype.sync = ElementModel.prototype.fetch = ElementModel.prototype.save = _.noop;

module.exports = ElementModel;
