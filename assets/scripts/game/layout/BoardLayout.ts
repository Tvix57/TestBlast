export interface IBoardMetrics {
    cellSize: number;
    step: number;
    boardWidth: number;
    boardHeight: number;
}

export interface IBoardZoneSize {
    width: number;
    height: number;
}

export interface IBoardLayoutOptions {
    gapRatio: number;
    paddingRatio: number;
    innerPaddingRatio: number;
    frameBorderRatio: number;
    hasFrame: boolean;
    hasInner: boolean;
}

export interface IBoardPosition {
    x: number;
    y: number;
}

/**
 * Чистая математика раскладки поля: без `cc`, поэтому проверяется Jest.
 * BoardView только применяет метрики к узлам и переводит позиции в `cc.Vec3`.
 */
export class BoardLayout {
    public static Metrics(rows: number, columns: number, zone: IBoardZoneSize, options: IBoardLayoutOptions): IBoardMetrics {
        const safeRows = Math.max(1, Math.floor(rows));
        const safeColumns = Math.max(1, Math.floor(columns));
        const gap = BoardLayout.SafeRatio(options.gapRatio);
        const padding = Math.min(0.5, BoardLayout.SafeRatio(options.paddingRatio));
        const decor = options.hasFrame || options.hasInner
            ? (BoardLayout.SafeRatio(options.innerPaddingRatio)
                + (options.hasFrame ? BoardLayout.SafeRatio(options.frameBorderRatio) : 0)) * 2
            : 0;

        const widthUnits = safeColumns + (safeColumns - 1) * gap;
        const heightUnits = safeRows + (safeRows - 1) * gap;
        const usable = 1 - padding * 2;
        const zoneWidth = BoardLayout.SafeRatio(zone ? zone.width : 0) * usable;
        const zoneHeight = BoardLayout.SafeRatio(zone ? zone.height : 0) * usable;
        const cellSize = Math.max(0, Math.min(
            zoneWidth / (widthUnits + decor),
            zoneHeight / (heightUnits + decor)
        ));

        return {
            cellSize: cellSize,
            step: cellSize * (1 + gap),
            boardWidth: cellSize * widthUnits,
            boardHeight: cellSize * heightUnits
        };
    }

    public static Fit(rows: number, columns: number, zone: IBoardZoneSize, gapRatio: number): IBoardMetrics {
        return BoardLayout.Metrics(rows, columns, zone, {
            gapRatio: gapRatio,
            paddingRatio: 0,
            innerPaddingRatio: 0,
            frameBorderRatio: 0,
            hasFrame: false,
            hasInner: false
        });
    }

    public static Position(rows: number, columns: number, step: number, row: number, col: number): IBoardPosition {
        const safeRows = Math.max(1, Math.floor(rows));
        const safeColumns = Math.max(1, Math.floor(columns));
        return {
            x: (col - (safeColumns - 1) / 2) * step,
            y: ((safeRows - 1) / 2 - row) * step
        };
    }

    private static SafeRatio(value: number): number {
        return typeof value === 'number' && isFinite(value) && value > 0 ? value : 0;
    }
}
