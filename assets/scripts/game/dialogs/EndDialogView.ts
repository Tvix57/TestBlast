import { GameResult } from '../../core/GameResult';
import { DialogView } from './DialogView';

const { ccclass, property } = cc._decorator;

export interface IEndDialogData {
    Result: GameResult;
    Score: number;
    Target: number;
    MovesLeft: number;
    MovesLimit: number;
    TimeLeft?: number;
    TimeLimit?: number;
}

@ccclass
export class EndDialogView extends DialogView {
    @property(cc.Label)
    public titleLabel: cc.Label = null;

    @property(cc.Label)
    public scoreLabel: cc.Label = null;

    @property(cc.Label)
    public detailLabel: cc.Label = null;

    @property(cc.Label)
    public restartLabel: cc.Label = null;

    @property(cc.Button)
    public restartButton: cc.Button = null;

    protected onLoad(): void {
        super.onLoad();
        this.BindConfirmButton(this.restartButton);
    }

    protected onDestroy(): void {
        super.onDestroy();
    }

    public SetResult(data: IEndDialogData): void {
        if (this.titleLabel) {
            this.titleLabel.string = data.Result === GameResult.Win ? 'ПОБЕДА!' : 'ПОРАЖЕНИЕ';
        }
        if (this.scoreLabel) {
            this.scoreLabel.string = 'Очки: ' + data.Score + ' / ' + data.Target;
        }
        if (this.detailLabel) {
            this.detailLabel.string = this.buildDetail(data);
        }
        if (this.restartLabel) {
            this.restartLabel.string = 'ЗАНОВО';
        }
    }

    private buildDetail(data: IEndDialogData): string {
        const parts: string[] = [];
        parts.push(data.MovesLimit > 0
            ? 'Осталось ходов: ' + data.MovesLeft
            : 'Ходы не ограничены');
        if ((data.TimeLimit || 0) > 0 && data.TimeLeft !== undefined) {
            parts.push('Время: ' + this.formatTime(data.TimeLeft));
        }
        return parts.join(' · ');
    }

    private formatTime(remainingSeconds: number): string {
        const total = Math.max(0, Math.ceil(remainingSeconds));
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }
}
