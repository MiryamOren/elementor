import * as React from 'react';
import { type CSSProperties, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { __ } from '@wordpress/i18n';

import { type BorderRadius, useBorderRadius } from '../../hooks/use-border-radius';
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

function Backdrop({ canvas, element, onClose, borderRadius }: { canvas: HTMLDocument; element: HTMLElement; onClose: () => void; borderRadius: BorderRadius }) {
	const rect = useElementRect(element);
	const viewport = canvas.defaultView as Window;
	const backdropRef = useRef<HTMLDivElement>(null);
	const clickBlockerRef = useRef<HTMLDivElement>(null);

	const updatePositions = useCallback(() => {
		const currentRect = element.getBoundingClientRect();

		if (backdropRef.current && viewport) {
			backdropRef.current.style.clipPath = getRoundedCutoutPath(currentRect, viewport, borderRadius);
		}

		if (clickBlockerRef.current) {
			clickBlockerRef.current.style.transform = `translate(${currentRect.left}px, ${currentRect.top}px)`;
		}
	}, [element, viewport, borderRadius]);

	useEffect(() => {
		const win = element.ownerDocument?.defaultView;
		if (!win) return;

		win.addEventListener('scroll', updatePositions, { passive: true });
		return () => win.removeEventListener('scroll', updatePositions);
	}, [element, updatePositions]);

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
		clipPath: getRoundedCutoutPath(rect, viewport, borderRadius),
		willChange: 'clip-path',
	};

	const clickBlockerStyle: CSSProperties = {
		position: 'fixed',
		top: 0,
		left: 0,
		width: rect.width,
		height: rect.height,
		transform: `translate(${rect.left}px, ${rect.top}px)`,
		zIndex: 1000,
		pointerEvents: 'none',
		cursor: 'default',
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
				ref={backdropRef}
				style={backdropStyle}
				onClick={onClose}
				onKeyDown={handleKeyDown}
				role="button"
				tabIndex={0}
				aria-label={__('Exit component editing mode', 'elementor')}
			/>
			<div ref={clickBlockerRef} style={clickBlockerStyle} />
		</>
	);
}

function getRoundedCutoutPath(rect: DOMRect, viewport: Window, borderRadius: BorderRadius): string {
	const { innerWidth: vw, innerHeight: vh } = viewport;
	const { x, y, width, height } = rect;
	const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = borderRadius;

	const path = `path(evenodd, 'M 0 0 
		L ${vw} 0
		L ${vw} ${vh}
		L 0 ${vh}
		Z
		M ${x + tl.rx} ${y}
		L ${x + width - tr.rx} ${y}
		A ${tr.rx} ${tr.ry} 0 0 1 ${x + width} ${y + tr.ry}
		L ${x + width} ${y + height - br.ry}
		A ${br.rx} ${br.ry} 0 0 1 ${x + width - br.rx} ${y + height}
		L ${x + bl.rx} ${y + height}
		A ${bl.rx} ${bl.ry} 0 0 1 ${x} ${y + height - bl.ry}
		L ${x} ${y + tl.ry}
		A ${tl.rx} ${tl.ry} 0 0 1 ${x + tl.rx} ${y}
		Z
	')`;

	return path.replace(/\s{2,}/g, ' ');
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
