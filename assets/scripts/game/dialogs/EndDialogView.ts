import { GameResult } from '../../core/GameResult';
import { DialogView } from './DialogView';

const { ccclass, property } = cc._decorator;

export interface IEndDialogData {
    Result: GameResult;
    Score: number;
    Target: number;
    MovesLeft: number;
    MovesLimit: number;
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
        if (this.restartButton) {
            this.restartButton.node.on('click', this.onRestartClick, this);
        }
    }

    protected onDestroy(): void {
        if (this.restartButton && this.restartButton.node) {
            this.restartButton.node.off('click', this.onRestartClick, this);
        }
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
            this.detailLabel.string = data.MovesLimit > 0
                ? 'Осталось ходов: ' + data.MovesLeft
                : 'Ходы не ограничены';
        }
        if (this.restartLabel) {
            this.restartLabel.string = 'ЗАНОВО';
        }
    }

    private onRestartClick(): void {
        this.confirm();
    }
}
