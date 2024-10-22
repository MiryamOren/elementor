export default class PlayingCards extends elementorModules.frontend.handlers.Base {
	getDefaultSettings() {
		return {
			selectors: {
				cardFront: '.elementor-playing-card',
				cardBack: '.elementor-playing-card-back',
			},
		};
	}

	getDefaultElements() {
		const selectors = this.getSettings( 'selectors' );
		return {
			$cardFront: this.$element.find( selectors.cardFront ),
			$cardBack: this.$element.find( selectors.cardBack ),
		};
	}

	bindEvents() {
		this.elements.$cardFront.on( 'click', this.onCardFrontClick.bind( this ) );
		this.elements.$cardBack.on( 'click', this.onCardBackClick.bind( this ) );
	}

	onCardFrontClick() {
		debugger
		this.elements.$cardFront.fadeOut();
		this.elements.$cardBack.fadeIn();
	}

	onCardBackClick() {
		this.elements.$cardBack.fadeOut();
		this.elements.$cardFront.fadeIn();
	}
}
