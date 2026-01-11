<?php
namespace Elementor\Modules\Components\Documents;

use Elementor\Core\Base\Document;
use Elementor\Core\Utils\Api\Parse_Result;
use Elementor\Modules\Components\OverridableProps\Component_Overridable_Props_Parser;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly
}

class Component extends Document {
	const TYPE = 'elementor_component';
	const COMPONENT_UID_META_KEY = '_elementor_component_uid';
	const OVERRIDABLE_PROPS_META_KEY = '_elementor_component_overridable_props';
	const ARCHIVED_META_KEY = '_elementor_component_is_archived';
	const ARCHIVED_AT_META_KEY = '_elementor_component_archived_at';

	public static function get_properties() {
		$properties = parent::get_properties();

		$properties['cpt'] = [ self::TYPE ];

		return $properties;
	}

	public static function get_type() {
		return self::TYPE;
	}

	public static function get_title() {
		return esc_html__( 'Component', 'elementor' );
	}

	public static function get_plural_title() {
		return esc_html__( 'Components', 'elementor' );
	}

	public static function get_labels(): array {
		$plural_label   = static::get_plural_title();
		$singular_label = static::get_title();

		$labels = [
			'name' => $plural_label,
			'singular_name' => $singular_label,
		];

		return $labels;
	}

	public static function get_supported_features(): array {
		return [
			'title',
			'author',
			'thumbnail',
			'custom-fields',
			'revisions',
			'elementor',
		];
	}

	public function get_component_uid() {
		return $this->get_meta( self::COMPONENT_UID_META_KEY );
	}

	public function get_overridable_props(): Component_Overridable_Props {
		$meta = $this->get_json_meta( self::OVERRIDABLE_PROPS_META_KEY );

		return Component_Overridable_Props::make( $meta ?? [] );
	}

	public function archive() {
		try {
			$this->update_main_meta( self::ARCHIVED_META_KEY, json_encode( [
				'is_archived' => true,
				'archived_at' => time(),
			] ) );
		} catch ( \Exception $e ) {
			throw new \Exception( 'Failed to archive component: ' . esc_html( $e->getMessage() ) );
		}
	}

	public function get_is_archived() {
		$archived_meta = $this->get_main_meta( self::ARCHIVED_META_KEY );
		if ( ! $archived_meta ) {
			return false;
		}
		return json_decode( $archived_meta, true );
	}

	public function update_overridable_props( $data ): Parse_Result {
		$parser = Component_Overridable_Props_Parser::make();

		$result = $parser->parse( $data );

		if ( ! $result->is_valid() ) {
			return $result;
		}

		$sanitized_data = $result->unwrap();

		$this->update_json_meta( self::OVERRIDABLE_PROPS_META_KEY, $sanitized_data );

		return $result;
	}

	public function get_export_data() {
		$data = parent::get_export_data();

		// #region agent log
		$log_path = '/Users/miryamo/Dev/elementor/.cursor/debug.log';
		$log_entry = json_encode( [ 'location' => 'component.php:get_export_data', 'message' => 'Component export data', 'data' => [ 'post_id' => $this->get_main_id(), 'component_uid' => $this->get_meta( self::COMPONENT_UID_META_KEY ), 'overridable_props_exists' => ! empty( $this->get_meta( self::OVERRIDABLE_PROPS_META_KEY ) ), 'metadata_keys_before' => array_keys( $data['metadata'] ?? [] ) ], 'timestamp' => time(), 'sessionId' => 'debug-session', 'hypothesisId' => 'export' ] ) . "\n";
		file_put_contents( $log_path, $log_entry, FILE_APPEND );
		// #endregion

		$component_uid = $this->get_meta( self::COMPONENT_UID_META_KEY );
		if ( $component_uid ) {
			$data['metadata'][ self::COMPONENT_UID_META_KEY ] = $component_uid;
		}

		$overridable_props = $this->get_meta( self::OVERRIDABLE_PROPS_META_KEY );
		if ( $overridable_props ) {
			$data['metadata'][ self::OVERRIDABLE_PROPS_META_KEY ] = $overridable_props;
		}

		$archived = $this->get_meta( self::ARCHIVED_META_KEY );
		if ( $archived ) {
			$data['metadata'][ self::ARCHIVED_META_KEY ] = $archived;
		}

		$archived_at = $this->get_meta( self::ARCHIVED_AT_META_KEY );
		if ( $archived_at ) {
			$data['metadata'][ self::ARCHIVED_AT_META_KEY ] = $archived_at;
		}

		// #region agent log
		$log_entry2 = json_encode( [ 'location' => 'component.php:get_export_data:after', 'message' => 'Component export data after adding meta', 'data' => [ 'metadata_keys_after' => array_keys( $data['metadata'] ?? [] ), 'has_component_uid' => isset( $data['metadata'][ self::COMPONENT_UID_META_KEY ] ), 'has_overridable_props' => isset( $data['metadata'][ self::OVERRIDABLE_PROPS_META_KEY ] ) ], 'timestamp' => time(), 'sessionId' => 'debug-session', 'hypothesisId' => 'export' ] ) . "\n";
		file_put_contents( $log_path, $log_entry2, FILE_APPEND );
		// #endregion

		return $data;
	}
}
