import { GameSession } from '../../core/GameSession';
import { HudController } from '../controllers/HudController';
import { IHudView } from '../IHudView';

const { ccclass, property } = cc._decorator;

@ccclass
export class HudView extends cc.Component implements IHudView {
    @property(cc.Label)
    public scoreLabel: cc.Label | null = null;

    @property(cc.Label)
    public movesLabel: cc.Label | null = null;

    @property(cc.Label)
    public timeLabel: cc.Label | null = null;

    @property(cc.Node)
    public movesNode: cc.Node | null = null;

    @property(cc.Node)
    public timerRoot: cc.Node | null = null;

    private _controller: HudController = null;
    private _target: number = 0;
    private _score: number = 0;
    private _lastTime: string = '';

    public Bind(session: GameSession): void {
        this.dispose();
        this._controller = new HudController(this, session);
    }

    public SetTarget(target: number): void {
        this._target = target;
        this.refreshScore();
    }

    public SetScore(score: number): void {
        this._score = score;
        this.refreshScore();
    }

    public SetMoves(left: number, limit: number): void {
        const enabled = limit > 0;
        if (this.movesNode) {
            this.movesNode.active = enabled;
        }
        if (enabled && this.movesLabel) {
            this.movesLabel.string = String(left);
        }
    }

    public SetTime(remainingSeconds: number, limitSeconds: number): void {
        const enabled = limitSeconds > 0;
        if (this.timerRoot) {
            this.timerRoot.active = enabled;
        }
        if (!enabled || !this.timeLabel) {
            return;
        }
        const total = Math.max(0, Math.ceil(remainingSeconds));
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        const text = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        if (text !== this._lastTime) {
            this._lastTime = text;
            this.timeLabel.string = text;
        }
    }

    protected onDestroy(): void {
        this.dispose();
    }

    private refreshScore(): void {
        if (this.scoreLabel) {
            this.scoreLabel.string = this._score + ' / ' + this._target;
        }
    }

    private dispose(): void {
        if (this._controller) {
            this._controller.Dispose();
            this._controller = null;
        }
    }
}
