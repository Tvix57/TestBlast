import { DialogType, IDialogOptions, IDialogView } from './IDialogManager';

const { ccclass, property } = cc._decorator;

/** База диалога: затемнение, панель, закрытие по фону и подтверждение. */
@ccclass
export class DialogView extends cc.Component implements IDialogView {
    @property({ type: cc.Node, visible: true })
    public mask!: cc.Node;

    @property({ type: cc.Node, visible: true })
    public panel!: cc.Node;

    @property({ type: cc.Float, visible: true })
    public maskOpacity: number = 190;

    private _type: DialogType = DialogType.StartDialog;
    private _options: IDialogOptions = {};
    private _onConfirm: () => void = null;
    private _onCloseRequest: ((onClosed?: () => void) => void) | null = null;
    private _handled: boolean = false;
    private _closing: boolean = false;
    private _closeOnBackground: boolean = false;
    private _confirmButton: cc.Button | null = null;

    protected onLoad(): void {
        if (this.mask) {
            this.mask.on(cc.Node.EventType.TOUCH_END, this.onMaskClick, this);
        }
    }

    protected onDestroy(): void {
        if (this.mask && this.mask.isValid) {
            this.mask.off(cc.Node.EventType.TOUCH_END, this.onMaskClick, this);
        }
        this.UnbindConfirmButton();
    }

    protected BindConfirmButton(button: cc.Button | null): void {
        this.UnbindConfirmButton();
        if (!button || !button.node) {
            return;
        }
        this._confirmButton = button;
        button.node.on('click', this.onConfirmClick, this);
    }

    protected UnbindConfirmButton(): void {
        const button = this._confirmButton;
        this._confirmButton = null;
        if (button && button.node && button.node.isValid) {
            button.node.off('click', this.onConfirmClick, this);
        }
    }

    protected onConfirmClick(): void {
        this.confirm();
    }

    public get Type(): DialogType {
        return this._type;
    }

    public get Options(): IDialogOptions {
        return this._options;
    }

    public SetOpenInfo(type: DialogType, options: IDialogOptions): void {
        this._type = type;
        this._options = { ...options };
        this._handled = false;
        this._closing = false;
        this.SetCloseOnBackground(options.CloseOnBackground === true);
    }

    public SetOnConfirm(callback: () => void): void {
        this._onConfirm = callback;
    }

    public SetOnCloseRequest(callback: (onClosed?: () => void) => void): void {
        this._onCloseRequest = callback;
    }

    public SetCloseOnBackground(enabled: boolean): void {
        this._closeOnBackground = enabled;
    }

    public MarkClosing(): boolean {
        if (this._closing) {
            return false;
        }
        this._closing = true;
        return true;
    }

    public Show(): void {
        this._handled = false;
        this.node.active = true;
        if (this.mask) {
            this.mask.opacity = 0;
            cc.tween(this.mask).to(0.18, { opacity: this.maskOpacity }).start();
        }
        if (this.panel) {
            this.panel.scale = 0.85;
            this.panel.opacity = 0;
            cc.tween(this.panel)
                .to(0.22, { scale: 1, opacity: 255 }, { easing: 'backOut' })
                .start();
        }
    }

    public Hide(onHidden?: () => void): void {
        if (!this.node.active) {
            if (onHidden) {
                onHidden();
            }
            return;
        }
        if (this.panel) {
            cc.tween(this.panel)
                .to(0.12, { scale: 0.9, opacity: 0 }, { easing: 'quadIn' })
                .call(() => {
                    this.node.active = false;
                    if (onHidden) {
                        onHidden();
                    }
                })
                .start();
            return;
        }
        this.node.active = false;
        if (onHidden) {
            onHidden();
        }
    }

    public Close(onClosed?: () => void): void {
        if (this._onCloseRequest) {
            this._onCloseRequest(onClosed);
            return;
        }
        this.Hide(onClosed);
    }

    public StopAnimations(): void {
        cc.Tween.stopAllByTarget(this.node);
        if (this.mask) {
            cc.Tween.stopAllByTarget(this.mask);
        }
        if (this.panel) {
            cc.Tween.stopAllByTarget(this.panel);
        }
    }

    protected confirm(): void {
        if (this._handled) {
            return;
        }
        this._handled = true;
        const callback = this._onConfirm;
        this.Close(() => {
            if (callback) {
                callback();
            }
        });
    }

    private onMaskClick(event: cc.Event.EventTouch): void {
        if (!this._closeOnBackground) {
            return;
        }

        const target = event.target as cc.Node | null;
        if (this.panel && target && (target === this.panel || target.isChildOf(this.panel))) {
            return;
        }
        this.Close();
    }
}
