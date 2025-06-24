<?php

namespace Elementor\Modules\AtomicWidgets\Base;

use JsonSerializable;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

abstract class Atomic_Control_Base implements JsonSerializable {
	private string $bind;
	private array $path;
	private $label = null;
	private $description = null;
	private $meta = null;

	abstract public function get_type(): string;

	abstract public function get_props(): array;

	public static function bind_to( string $prop_name, array $path = [] ) {
		return new static( $prop_name, $path );
	}

	protected function __construct( string $prop_name, array $path = [] ) {
		$this->bind = $prop_name;
		$this->path = $path;
	}

	public function get_bind() {
		return $this->bind;
	}

	public function get_path() {
		return $this->path;
	}

	public function set_label( string $label ): self {
		$this->label = $label;

		return $this;
	}

	public function set_description( string $description ): self {
		$this->description = $description;

		return $this;
	}

	public function set_meta( $meta ): self {
		$this->meta = $meta;

		return $this;
	}

	public function jsonSerialize(): array {
		return [
			'type' => 'control',
			'value' => [
				'type' => $this->get_type(),
				'bind' => $this->get_bind(),
				'path' => $this->get_path(),
				'label' => $this->label,
				'description' => $this->description,
				'props' => $this->get_props(),
				'meta' => $this->meta,
			],
		];
	}
}
