<?php
namespace Elementor\Modules\AtomicWidgets\Widgets;

use Elementor\Modules\AtomicWidgets\Controls\Section;
use Elementor\Modules\AtomicWidgets\Controls\Types\Url_Control;
use Elementor\Modules\AtomicWidgets\Controls\Types\Switch_Control;
use Elementor\Modules\AtomicWidgets\Base\Atomic_Widget_Base;
use Elementor\Modules\AtomicWidgets\PropTypes\Classes_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Url_Prop_Type;
use Elementor\Modules\AtomicWidgets\PropTypes\Primitives\Boolean_Prop_Type;
use Elementor\Utils;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Atomic_Video extends Atomic_Widget_Base {
	public function get_name() {
		return 'a-video';
	}

	public function get_title() {
		return esc_html__( 'Atomic Video', 'elementor' );
	}

	public function get_icon() {
		return 'eicon-video-playlist';
	}

	protected function render() {
		$settings = $this->get_atomic_settings();

		$src = $settings['src'];
		$attrs = array_filter( [
			'class' => $settings['classes'] ?? '',
			'autoplay' => $settings['autoplay'] ? 'true' : 'false',
			'controls' => $settings['video_controls'] ? 'true' : 'false',
		] );

		echo $settings['autoplay'];
		echo sprintf(
			'<video %1$s><source src=%2$s type="video/mp4"></video>',
			// TODO: we should avoid using `validate html tag` and use the enum validation instead.
			Utils::render_html_attributes( $attrs ), // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			esc_html( $src ),
		);
	}

	protected function define_atomic_controls(): array {
		return [
			Section::make()
				->set_label( __( 'Content', 'elementor' ) )
				->set_items( [
					Url_Control::bind_to( 'src' )
						->set_label( __( 'Src', 'elementor' ) )
						->set_placeholder( __( 'Enter video URL', 'elementor' ) ),
					Switch_Control::bind_to('video_controls')
						->set_label( __( 'Video Controls', 'elementor' ) ),
					Switch_Control::bind_to('autoplay')
						->set_label( __( 'Autoplay', 'elementor' ) ),
				]),
		];
	}

	protected static function define_props_schema(): array {
		$default_url = 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
		return [
			'classes' => Classes_Prop_Type::make()
				->default( [] ),
			'src' => Url_Prop_Type::make()
				->default( __( $default_url, 'elementor' ) ),
			'video_controls' => Boolean_Prop_Type::make()
				->default(true),
			'autoplay' => Boolean_Prop_Type::make()
				->default(true),
		];
	}
}
