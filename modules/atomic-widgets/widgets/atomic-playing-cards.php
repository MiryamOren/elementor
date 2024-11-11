<?php
namespace Elementor\Modules\AtomicWidgets\Widgets;

use Elementor\Modules\AtomicWidgets\Controls\Section;
use Elementor\Modules\AtomicWidgets\Controls\Types\Select_Control;
use Elementor\Modules\AtomicWidgets\Base\Atomic_Widget_Base;
use Elementor\Modules\AtomicWidgets\PropTypes\Classes_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Primitives\String_Prop_Type;
use Elementor\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Atomic_Playing_Cards extends Atomic_Widget_Base {
	public function get_name() {
		return 'a-palying-cards';
	}

	public function get_title() {
		return esc_html__( 'Atomic Palying Cards', 'elementor' );
	}

	public function get_icon() {
		return 'eicon-gallery-grid';
	}

	protected function render() {
		$settings = $this->get_atomic_settings();

		$number = $settings['number'];
		$suite = $settings['suite'];
		$default_class = 'atomic-palying-card';
		$attrs = array_filter( [
			'class' => $settings['classes'] . ' ' . $default_class ?? $default_class,
		] );

		echo sprintf(
			'<div %2$s><header>%1$s</header><main>%3$s</main><footer>%1$s</footer></div>',
			esc_html( $number),
			Utils::render_html_attributes( $attrs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			esc_html( $suite )
		);
	}

	protected function define_atomic_controls(): array {
		return [
			Section::make()
				->set_label( __( 'Content', 'elementor' ) )
				->set_items( [
					Select_Control::bind_to( 'number' )
						->set_label( esc_html__( 'Number', 'elementor' ) )
						->set_options( [
							[
								'value' => 'A',
								'label' => 'A',
							],
							[
								'value' => '2',
								'label' => '2',
							],
							[
								'value' => '3',
								'label' => '3',
							],
							[
								'value' => '4',
								'label' => '4',
							],
							[
								'value' => '5',
								'label' => '5',
							],
							[
								'value' => '6',
								'label' => '6',
							],
							[
								'value' => '7',
								'label' => '7',
							],
							[
								'value' => '8',
								'label' => '8',
							],
							[
								'value' => '9',
								'label' => '9',
							],
							[
								'value' => '10',
								'label' => '10',
							],
							[
								'value' => 'J',
								'label' => 'J',
							],
							[
								'value' => 'Q',
								'label' => 'Q',
							],
							[
								'value' => 'K',
								'label' => 'K',
							],
						]),

						Select_Control::bind_to( 'suite' )
						->set_label( esc_html__( 'Suite', 'elementor' ) )
						->set_options( [
							[
								'value' => '♣',
								'label' => '♣',
							],
							[
								'value' => '♠',
								'label' => '♠',
							],
							[
								'value' => '♦',
								'label' => '♦',
							],
							[
								'value' => '♥',
								'label' => '♥',
							]
						])
				]),
		];
	}

	protected static function define_props_schema(): array {
		return [
			'classes' => Classes_Prop_Type::make()
				->default( [] ),

			'number' => String_Prop_Type::make()
				->enum( [ 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K' ] )
				->default( 'A' ),

			'suite' => String_Prop_Type::make()
				->enum( [ '♣', '♠', '♦', '♥' ] )
				->default( '♣' ),

		];
	}
}
