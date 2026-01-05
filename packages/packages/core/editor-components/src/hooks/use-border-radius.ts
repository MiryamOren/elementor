import { useEffect, useRef, useState } from 'react';

type EllipticalRadius = {
    rx: number;
    ry: number;
};

export type BorderRadius = {
    topLeft: EllipticalRadius;
    topRight: EllipticalRadius;
    bottomRight: EllipticalRadius;
    bottomLeft: EllipticalRadius;
};

const DEFAULT_BORDER_RADIUS: BorderRadius = {
    topLeft: { rx: 0, ry: 0 },
    topRight: { rx: 0, ry: 0 },
    bottomRight: { rx: 0, ry: 0 },
    bottomLeft: { rx: 0, ry: 0 },
};

function parseRadiusValue(value: string, referenceSize: number): number {
    if (value.endsWith('%')) {
        const percentage = parseFloat(value) || 0;
        return (percentage / 100) * referenceSize;
    }
    return parseFloat(value) || 0;
}

function parseBorderRadius(value: string, width: number, height: number): EllipticalRadius {
    const parts = value.split(' ');
    const rxValue = parts[0] ?? '0';
    const ryValue = parts[1] ?? rxValue;

    return {
        rx: parseRadiusValue(rxValue, width),
        ry: parseRadiusValue(ryValue, height),
    };
}

function applyCornerOverlapScaling(radii: BorderRadius, width: number, height: number): BorderRadius {
    const { topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl } = radii;

    const scalingFactors = [
        (tl.rx + tr.rx) > 0 ? width / (tl.rx + tr.rx) : Infinity,
        (tr.ry + br.ry) > 0 ? height / (tr.ry + br.ry) : Infinity,
        (br.rx + bl.rx) > 0 ? width / (br.rx + bl.rx) : Infinity,
        (bl.ry + tl.ry) > 0 ? height / (bl.ry + tl.ry) : Infinity,
    ];

    const minFactor = Math.min(...scalingFactors);

    if (minFactor >= 1) {
        return radii;
    }

    return {
        topLeft: { rx: tl.rx * minFactor, ry: tl.ry * minFactor },
        topRight: { rx: tr.rx * minFactor, ry: tr.ry * minFactor },
        bottomRight: { rx: br.rx * minFactor, ry: br.ry * minFactor },
        bottomLeft: { rx: bl.rx * minFactor, ry: bl.ry * minFactor },
    };
}

function getBorderRadii(element: HTMLElement | null): BorderRadius {
    // return DEFAULT_BORDER_RADIUS
    if (!element) {
        return DEFAULT_BORDER_RADIUS;
    }

    const style = getComputedStyle(element);
    const width = parseFloat(style.width);
    const height = parseFloat(style.height);

    const rawRadii: BorderRadius = {
        topLeft: parseBorderRadius(style.borderTopLeftRadius, width, height),
        topRight: parseBorderRadius(style.borderTopRightRadius, width, height),
        bottomRight: parseBorderRadius(style.borderBottomRightRadius, width, height),
        bottomLeft: parseBorderRadius(style.borderBottomLeftRadius, width, height),
    };

    return applyCornerOverlapScaling(rawRadii, width, height);

   
}

function areBorderRadiiEqual(a: BorderRadius, b: BorderRadius): boolean {
    return (
        a.topLeft.rx === b.topLeft.rx &&
        a.topLeft.ry === b.topLeft.ry &&
        a.topRight.rx === b.topRight.rx &&
        a.topRight.ry === b.topRight.ry &&
        a.bottomRight.rx === b.bottomRight.rx &&
        a.bottomRight.ry === b.bottomRight.ry &&
        a.bottomLeft.rx === b.bottomLeft.rx &&
        a.bottomLeft.ry === b.bottomLeft.ry
    );
}

export function useBorderRadius(element: HTMLElement | null): BorderRadius {
    const [borderRadius, setBorderRadius] = useState<BorderRadius>(() => getBorderRadii(element));
    const lastValueRef = useRef<BorderRadius>(borderRadius);

    useEffect(() => {
        if (!element) {
            setBorderRadius(DEFAULT_BORDER_RADIUS);
            lastValueRef.current = DEFAULT_BORDER_RADIUS;
            return;
        }

        let animationFrameId: number;

        const checkForChanges = () => {
            const currentValue = getBorderRadii(element);

            if (!areBorderRadiiEqual(currentValue, lastValueRef.current)) {
                console.log('border radius changed', currentValue);
                lastValueRef.current = currentValue;
                setBorderRadius(currentValue);
            }

            animationFrameId = requestAnimationFrame(checkForChanges);
        };

        checkForChanges();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [element]);

    return borderRadius;
}

