import { GameSession } from '../core/GameSession';

export interface IHudView {
    Bind(session: GameSession): void;
    SetTarget(target: number): void;
    SetScore(score: number): void;
    SetMoves(left: number, limit: number): void;
    SetTime(remainingSeconds: number, limitSeconds: number): void;
}
