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
        this.BindConfirmButton(this.playButton);
    }

    protected onDestroy(): void {
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
}
