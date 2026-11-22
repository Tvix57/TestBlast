import { Board } from '../core/Board';
import { ICell } from '../core/Cell';
import { IAnimationConfig } from '../core/Config';
import { ITurnStep } from '../core/TurnStepType';

export interface IBoardView {
    Init(board: Board, animation: IAnimationConfig): void;
    SetClickHandler(handler: (cell: ICell) => void): void;
    Build(): Promise<void>;
    PlaySteps(steps: ITurnStep[]): Promise<void>;
    PlayInvalid(cell: ICell): Promise<void>;
    Lock(): void;
    Unlock(): void;
}
