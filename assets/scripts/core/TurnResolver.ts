import { Board } from './Board';
import { BoosterInventory } from './BoosterInventory';
import { BoosterRules, BoosterTargeting, BoosterType } from './BoosterRules';
import { Cell, ICell } from './Cell';
import { IBoosterConfig, IGameConfig } from './Config';
import { EffectFactory } from './effects/BoardEffect';
import { MovesCounter } from './MovesCounter';
import { ScoreCalculator } from './ScoreCalculator';
import { ScoreCounter } from './ScoreCounter';
import { SuperTileSpawner } from './SuperTileSpawner';
import { IBlastStep, IDropTilesStep, IRefillStep, IShuffleStep, ISwapStep, ITurnStep } from './TurnResult';
import { TurnStepType } from './TurnStepType';

interface IChainResult {
    Ordered: ICell[];
    Chain: ICell[];
}

interface IMatchResult {
    Cells: ICell[];
    LargestSize: number;
    LargestCells: ICell[];
}

export interface ITurnOutcome {
    Steps: ITurnStep[];
    Accepted: boolean;
}

export interface IBlastOptions {
    groupSize: number;
    perTile: number;
    spawnCell: ICell;
}

export class TurnResolver {
    private _spawner: SuperTileSpawner;

    constructor(
        private _board: Board,
        private _config: IGameConfig,
        private _rules: BoosterRules,
        private _score: ScoreCounter,
        private _moves: MovesCounter,
        private _boosters: BoosterInventory,
        private _resolveTurnEnd: (steps: ITurnStep[]) => void,
        private _evaluateEnd: () => void
    ) {
        this._spawner = new SuperTileSpawner(this._board, this._rules);
    }

    public Click(row: number, col: number): ITurnOutcome {
        const tile = this._board.GetTile(row, col);
        if (!tile) {
            return this.rejected();
        }

        const center = Cell.Create(row, col);
        let primary: ICell[] = [];
        let groupSize = 0;
        let perTile = this._config.score.perTile;

        if (tile.IsSuper) {
            const effect = this._rules.GetSuperEffect(tile.Type);
            if (!effect) {
                return this.rejected();
            }
            primary = this.collectCells(effect.shape, effect.radius, center);
            perTile = effect.scorePerTile;
        } else {
            primary = this._board.FindGroup(row, col);
            if (primary.length < this.minGroupSize) {
                return this.rejected();
            }
            groupSize = primary.length;
        }

        const steps: ITurnStep[] = [];
        this.applyBlast(steps, primary, { groupSize: groupSize, perTile: perTile, spawnCell: center });
        this._moves.Spend();
        this.dropTilesAndRefill(steps);
        this._resolveTurnEnd(steps);
        return this.accepted(steps);
    }

    public UseBooster(type: BoosterType, cells: ICell[]): ITurnOutcome {
        const booster = this._rules.GetBooster(type);
        if (!booster || !cells || cells.length === 0) {
            return this.rejected();
        }
        if (!this._boosters.CanSpend(type)) {
            return this.rejected();
        }
        if (booster.targeting === BoosterTargeting.Pair) {
            return this.usePairBooster(booster, cells);
        }
        return this.useCellBooster(booster, cells);
    }

    public TryShuffle(steps: ITurnStep[]): boolean {
        return this.shuffleUntilGroup(steps);
    }

    /** Гарантировать доступный ход на старте матча (без шагов для вида). */
    public EnsureGroup(): void {
        if (this._board.HasAvailableMove(this.minGroupSize)) {
            return;
        }
        this.shuffleUntilGroup();
    }

    private get minGroupSize(): number {
        return this._config.board.minGroupSize;
    }

    private usePairBooster(booster: IBoosterConfig, cells: ICell[]): ITurnOutcome {
        if (cells.length < 2) {
            return this.rejected();
        }
        const first = cells[0];
        const second = cells[1];
        if (Cell.Same(first, second)) {
            return this.rejected();
        }
        const firstTile = this._board.GetTile(first.Row, first.Col);
        const secondTile = this._board.GetTile(second.Row, second.Col);
        if (!firstTile || !secondTile) {
            return this.rejected();
        }
        if (!this._boosters.TrySpend(booster.type)) {
            return this.rejected();
        }

        this._board.Swap(first, second);
        const steps: ITurnStep[] = [{
            Type: TurnStepType.Swap,
            First: first,
            Second: second
        } as ISwapStep];
        if (booster.usesMove) {
            this._moves.Spend();
        }

        const matched = this.collectSwapGroups(first, second);
        if (matched.LargestSize >= this.minGroupSize) {
            const spawnCell = this._spawner.ResolveSpawnCell(matched.LargestCells, second);
            this.applyBlast(steps, matched.Cells, {
                groupSize: matched.LargestSize,
                perTile: this._config.score.perTile,
                spawnCell: spawnCell
            });
            this.dropTilesAndRefill(steps);
            this._resolveTurnEnd(steps);
            return this.accepted(steps);
        }
        this._evaluateEnd();
        return this.accepted(steps);
    }

    private useCellBooster(booster: IBoosterConfig, cells: ICell[]): ITurnOutcome {
        const center = cells[0];
        if (!this._board.GetTile(center.Row, center.Col)) {
            return this.rejected();
        }
        const effect = booster.effect;
        if (!effect) {
            return this.rejected();
        }
        if (!this._boosters.TrySpend(booster.type)) {
            return this.rejected();
        }

        const primary = this.collectCells(effect.shape, effect.radius, center);
        const steps: ITurnStep[] = [];
        this.applyBlast(steps, primary, { groupSize: 0, perTile: effect.scorePerTile, spawnCell: center });
        if (booster.usesMove) {
            this._moves.Spend();
        }
        this.dropTilesAndRefill(steps);
        this._resolveTurnEnd(steps);
        return this.accepted(steps);
    }

    private applyBlast(steps: ITurnStep[], primary: ICell[], options: IBlastOptions): IBlastStep {
        const chain = this.resolveChain(primary);
        const spawnType = this._spawner.PickType(options.groupSize);
        const points = ScoreCalculator.Calculate(this._config.score, {
            removed: chain.Ordered.length,
            groupSize: options.groupSize,
            hasSuperSpawn: spawnType !== null,
            perTile: options.perTile
        });
        this.removeCells(chain.Ordered);
        const spawned = this._spawner.Spawn(options.spawnCell.Row, options.spawnCell.Col, spawnType);
        this._score.Add(points);
        const step: IBlastStep = {
            Type: TurnStepType.Blast,
            Primary: primary,
            Chain: chain.Chain,
            Points: points,
            Spawned: spawned
        };
        steps.push(step);
        return step;
    }

    private collectSwapGroups(first: ICell, second: ICell): IMatchResult {
        const visited = new Set<number>();
        const cells: ICell[] = [];
        let largestSize = 0;
        let largestCells: ICell[] = [];
        [first, second].forEach((cell) => {
            const group = this._board.FindGroup(cell.Row, cell.Col);
            if (group.length < this.minGroupSize) {
                return;
            }
            if (group.length > largestSize) {
                largestSize = group.length;
                largestCells = group;
            }
            group.forEach((matched) => {
                const key = Cell.Key(matched.Row, matched.Col, this._board.Columns);
                if (visited.has(key)) {
                    return;
                }
                visited.add(key);
                cells.push(matched);
            });
        });
        return { Cells: cells, LargestSize: largestSize, LargestCells: largestCells };
    }

    private removeCells(cells: ICell[]): void {
        cells.forEach((cell) => this._board.SetTile(cell.Row, cell.Col, null));
    }

    private collectCells(shape: string, radius: number, center: ICell): ICell[] {
        const effectCells = EffectFactory.Create(shape).GetCells(this._board, center, radius);
        const visited = new Set<number>();
        const result: ICell[] = [];
        effectCells.forEach((cell) => {
            const key = Cell.Key(cell.Row, cell.Col, this._board.Columns);
            if (visited.has(key) || !this._board.GetTile(cell.Row, cell.Col)) {
                return;
            }
            visited.add(key);
            result.push(cell);
        });
        const centerKey = Cell.Key(center.Row, center.Col, this._board.Columns);
        if (!visited.has(centerKey) && this._board.GetTile(center.Row, center.Col)) {
            result.push(center);
        }
        return result;
    }

    private resolveChain(seeds: ICell[]): IChainResult {
        const ordered: ICell[] = [];
        const visited = new Set<number>();
        const fromEffect = new Set<number>();
        const seedKeys = new Set<number>();
        const keyOf = (cell: ICell): number => Cell.Key(cell.Row, cell.Col, this._board.Columns);
        seeds.forEach((cell) => seedKeys.add(keyOf(cell)));

        const queue = seeds.slice();
        let head = 0;
        while (head < queue.length) {
            const cell = queue[head++];
            const key = keyOf(cell);
            if (visited.has(key)) {
                continue;
            }
            const tile = this._board.GetTile(cell.Row, cell.Col);
            if (!tile) {
                continue;
            }
            visited.add(key);
            ordered.push(cell);
            if (!tile.IsSuper) {
                continue;
            }
            const effect = this._rules.GetSuperEffect(tile.Type);
            if (!effect) {
                continue;
            }
            EffectFactory.Create(effect.shape).GetCells(this._board, cell, effect.radius).forEach((target) => {
                const targetKey = keyOf(target);
                if (visited.has(targetKey)) {
                    return;
                }
                fromEffect.add(targetKey);
                queue.push(target);
            });
        }

        const chain = ordered.filter((cell) => {
            const key = keyOf(cell);
            return fromEffect.has(key) && !seedKeys.has(key);
        });
        return { Ordered: ordered, Chain: chain };
    }

    private dropTilesAndRefill(steps: ITurnStep[]): void {
        steps.push({
            Type: TurnStepType.DropTiles,
            Moves: this._board.DropTiles()
        } as IDropTilesStep);
        steps.push({
            Type: TurnStepType.Refill,
            Spawns: this._board.Refill()
        } as IRefillStep);
    }

    private shuffleUntilGroup(steps?: ITurnStep[]): boolean {
        for (let attempt = 0; attempt < this._config.shuffle.maxAttempts; attempt++) {
            this._board.Shuffle();
            if (this._board.HasAvailableMove(this.minGroupSize)) {
                if (steps) {
                    steps.push({
                        Type: TurnStepType.Shuffle,
                        Placements: this._board.GetPlacements()
                    } as IShuffleStep);
                }
                return true;
            }
        }
        return false;
    }

    private accepted(steps: ITurnStep[]): ITurnOutcome {
        return { Steps: steps, Accepted: true };
    }

    private rejected(): ITurnOutcome {
        return { Steps: [], Accepted: false };
    }
}
