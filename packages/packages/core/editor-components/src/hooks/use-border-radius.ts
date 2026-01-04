import { useEffect, useRef, useState } from 'react';

type EllipticalRadius = {
    rx: number;
    ry: number;
};

export type BorderRadii = {
    topLeft: EllipticalRadius;
    topRight: EllipticalRadius;
    bottomRight: EllipticalRadius;
    bottomLeft: EllipticalRadius;
};

const DEFAULT_BORDER_RADII: BorderRadii = {
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

function getBorderRadii(element: HTMLElement | null): BorderRadii {
    if (!element) {
        return DEFAULT_BORDER_RADII;
    }

    const style = getComputedStyle(element);
    const { width, height } = element.getBoundingClientRect();

    return {
        topLeft: parseBorderRadius(style.borderTopLeftRadius, width, height),
        topRight: parseBorderRadius(style.borderTopRightRadius, width, height),
        bottomRight: parseBorderRadius(style.borderBottomRightRadius, width, height),
        bottomLeft: parseBorderRadius(style.borderBottomLeftRadius, width, height),
    };
}

function areBorderRadiiEqual(a: BorderRadii, b: BorderRadii): boolean {
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

export function useBorderRadius(element: HTMLElement | null): BorderRadii {
    const [borderRadii, setBorderRadii] = useState<BorderRadii>(() => getBorderRadii(element));
    const lastValueRef = useRef<BorderRadii>(borderRadii);

    useEffect(() => {
        if (!element) {
            setBorderRadii(DEFAULT_BORDER_RADII);
            lastValueRef.current = DEFAULT_BORDER_RADII;
            return;
        }

        let animationFrameId: number;

        const checkForChanges = () => {
            const currentValue = getBorderRadii(element);

            if (!areBorderRadiiEqual(currentValue, lastValueRef.current)) {
                lastValueRef.current = currentValue;
                setBorderRadii(currentValue);
            }

            animationFrameId = requestAnimationFrame(checkForChanges);
        };

        checkForChanges();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [element]);

    return borderRadii;
}

