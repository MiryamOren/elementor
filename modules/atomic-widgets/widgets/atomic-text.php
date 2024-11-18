<?php
namespace Elementor\Modules\AtomicWidgets\Widgets;

use Elementor\Modules\AtomicWidgets\Controls\Section;
use Elementor\Modules\AtomicWidgets\Controls\Types\Select_Control;
use Elementor\Modules\AtomicWidgets\Controls\Types\Textarea_Control;
use Elementor\Modules\AtomicWidgets\Base\Atomic_Widget_Base;
use Elementor\Modules\AtomicWidgets\PropTypes\Classes_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Primitives\String_Prop_Type;
use Elementor\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Atomic_Text extends Atomic_Widget_Base {
	public function get_name() {
		return 'a-text';
	}

	public function get_title() {
		return esc_html__( 'Atomic text', 'elementor' );
	}

	public function get_icon() {
		return 'eicon-t-letter';
	}

	protected function render() {
		$settings = $this->get_atomic_settings();

		$text = $settings['text'];
		$attrs = array_filter( [
			'class' => $settings['classes'] ?? '',
		] );

		echo sprintf(
			'<p %1$s>%2$s</p>',
			// TODO: we should avoid using `validate html tag` and use the enum validation instead.
			Utils::render_html_attributes( $attrs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			esc_html( $text )
		);
	}

	protected function define_atomic_controls(): array {
		return [
			Section::make()
				->set_label( __( 'Content', 'elementor' ) )
				->set_items( [
					Textarea_Control::bind_to( 'text' )
						->set_label( __( 'Text', 'elementor' ) )
						->set_placeholder( __( 'Type your text here', 'elementor' ) ),
				]),
		];
	}

	protected static function define_props_schema(): array {
		return [
			'classes' => Classes_Prop_Type::make()
				->default( [] ),
			'text' => String_Prop_Type::make()
				->default( __( 'Your text Here', 'elementor' ) ),
		];
	}
}
