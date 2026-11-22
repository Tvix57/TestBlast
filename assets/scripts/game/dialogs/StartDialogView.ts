import { DialogView } from './DialogView';

const { ccclass, property } = cc._decorator;

@ccclass
export class StartDialogView extends DialogView {
    @property(cc.Label)
    public titleLabel: cc.Label = null;

    @property(cc.Label)
    public rulesLabel: cc.Label = null;

    @property(cc.Label)
    public playLabel: cc.Label = null;

    @property(cc.Button)
    public playButton: cc.Button = null;

    protected onLoad(): void {
        super.onLoad();
        if (this.playButton) {
            this.playButton.node.on('click', this.onPlayClick, this);
        }
    }

    protected onDestroy(): void {
        if (this.playButton && this.playButton.node) {
            this.playButton.node.off('click', this.onPlayClick, this);
        }
        super.onDestroy();
    }

    public SetTexts(title: string, rules: string, buttonTitle: string): void {
        if (this.titleLabel) {
            this.titleLabel.string = title;
        }
        if (this.rulesLabel) {
            this.rulesLabel.string = rules;
        }
        if (this.playLabel) {
            this.playLabel.string = buttonTitle;
        }
    }

    private onPlayClick(): void {
        this.confirm();
    }
}
