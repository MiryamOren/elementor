import * as React from 'react';
import { type CSSProperties, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { __ } from '@wordpress/i18n';

import { type BorderRadii, useBorderRadius } from '../../hooks/use-border-radius';
import { useCanvasDocument } from '../../hooks/use-canvas-document';
import { useElementRect } from '../../hooks/use-element-rect';

type ModalProps = {
	element: HTMLElement;
	topLevelElement?: HTMLElement | null;
	onClose: () => void;
};

export function ComponentModal({ element, onClose, topLevelElement }: ModalProps) {
	const canvasDocument = useCanvasDocument();
	const borderRadius = useBorderRadius(topLevelElement ?? null);

	useEffect(() => {
		const handleEsc = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		canvasDocument?.body.addEventListener('keydown', handleEsc);

		return () => {
			canvasDocument?.body.removeEventListener('keydown', handleEsc);
		};
	}, [canvasDocument, onClose]);

	if (!canvasDocument?.body) {
		return null;
	}

	return createPortal(
		<>
			<BlockEditPage />
			<Backdrop canvas={canvasDocument} element={element} onClose={onClose} borderRadius={borderRadius} />
		</>,
		canvasDocument.body
	);
}

function Backdrop({ canvas, element, onClose, borderRadius }: { canvas: HTMLDocument; element: HTMLElement; onClose: () => void; borderRadius: BorderRadii }) {
	const rect = useElementRect(element);
	const viewport = canvas.defaultView as Window;

	const backdropStyle: CSSProperties = {
		position: 'fixed',
		top: 0,
		left: 0,
		width: '100vw',
		height: '100vh',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		zIndex: 999,
		pointerEvents: 'painted',
		cursor: 'pointer',
		clipPath: getRectangularCutoutPath(rect, viewport),
	};

	const handleKeyDown = (event: React.KeyboardEvent) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClose();
		}
	};

	return (
		<>
			<div
				style={backdropStyle}
				onClick={onClose}
				onKeyDown={handleKeyDown}
				role="button"
				tabIndex={0}
				aria-label={__('Exit component editing mode', 'elementor')}
			/>
			<CornerOverlays rect={rect} borderRadius={borderRadius} />
		</>
	);
}

function CornerOverlays({ rect, borderRadius }: { rect: DOMRect; borderRadius: BorderRadii }) {
	const baseStyle: CSSProperties = {
		position: 'fixed',
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		zIndex: 999,
		pointerEvents: 'none',
	};

	const corners = [
		{
			key: 'top-left',
			style: {
				top: rect.top,
				left: rect.left,
				width: borderRadius.topLeft.rx,
				height: borderRadius.topLeft.ry,
				clipPath: `path('M 0 ${borderRadius.topLeft.ry} L 0 0 L ${borderRadius.topLeft.rx} 0 A ${borderRadius.topLeft.rx} ${borderRadius.topLeft.ry} 0 0 0 0 ${borderRadius.topLeft.ry} Z')`,
			},
		},
		{
			key: 'top-right',
			style: {
				top: rect.top,
				left: rect.right - borderRadius.topRight.rx,
				width: borderRadius.topRight.rx,
				height: borderRadius.topRight.ry,
				clipPath: `path('M 0 0 L ${borderRadius.topRight.rx} 0 L ${borderRadius.topRight.rx} ${borderRadius.topRight.ry} A ${borderRadius.topRight.rx} ${borderRadius.topRight.ry} 0 0 0 0 0 Z')`,
			},
		},
		{
			key: 'bottom-right',
			style: {
				top: rect.bottom - borderRadius.bottomRight.ry,
				left: rect.right - borderRadius.bottomRight.rx,
				width: borderRadius.bottomRight.rx,
				height: borderRadius.bottomRight.ry,
				clipPath: `path('M ${borderRadius.bottomRight.rx} 0 L ${borderRadius.bottomRight.rx} ${borderRadius.bottomRight.ry} L 0 ${borderRadius.bottomRight.ry} A ${borderRadius.bottomRight.rx} ${borderRadius.bottomRight.ry} 0 0 0 ${borderRadius.bottomRight.rx} 0 Z')`,
			},
		},
		{
			key: 'bottom-left',
			style: {
				top: rect.bottom - borderRadius.bottomLeft.ry,
				left: rect.left,
				width: borderRadius.bottomLeft.rx,
				height: borderRadius.bottomLeft.ry,
				clipPath: `path('M 0 0 A ${borderRadius.bottomLeft.rx} ${borderRadius.bottomLeft.ry} 0 0 0 ${borderRadius.bottomLeft.rx} ${borderRadius.bottomLeft.ry} L 0 ${borderRadius.bottomLeft.ry} L 0 0 Z')`,
			},
		},
	];

	return (
		<>
			{corners.map(({ key, style }) => (
				<div key={key} style={{ ...baseStyle, ...style }} />
			))}
		</>
	);
}

function getRectangularCutoutPath(rect: DOMRect, viewport: Window): string {
	const { innerWidth: vw, innerHeight: vh } = viewport;
	const { x, y, width, height } = rect;

	const path = `path(evenodd, 'M 0 0 L ${vw} 0 L ${vw} ${vh} L 0 ${vh} Z M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z')`;
	return path;
}

/**
 * when switching to another document id, we get a document handler when hovering
 * this functionality originates in Pro, and is intended for editing templates, e.g. header/footer
 * in components we don't want that, so the easy way out is to prevent it of being displayed via a CSS rule
 */
function BlockEditPage() {
	const blockV3DocumentHandlesStyles = `
	.elementor-editor-active {
		& .elementor-section-wrap.ui-sortable {
			display: contents;
		}

		& *[data-editable-elementor-document]:not(.elementor-edit-mode):hover {
			& .elementor-document-handle:not(.elementor-document-save-back-handle) {
				display: none;

				&::before,
				& .elementor-document-handle__inner {
					display: none;
				}
			}
		}
	}
	`;

	return <style data-e-style-id="e-block-v3-document-handles-styles">{blockV3DocumentHandlesStyles}</style>;
}
