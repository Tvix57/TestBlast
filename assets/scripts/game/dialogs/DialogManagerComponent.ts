import { DialogType, IDialogManager, IDialogOptions } from './IDialogManager';
import { DialogView } from './DialogView';

const { ccclass, property } = cc._decorator;

@ccclass
export class DialogManagerComponent extends cc.Component implements IDialogManager {
    @property({ type: [cc.Prefab], visible: true })
    public dialogPrefabs!: cc.Prefab[];

    private _dialogStack: DialogView[] = [];
    private _pauseHandler: (paused: boolean) => void = null;

    protected onDestroy(): void {
        this.CloseAllDialogs();
        this._pauseHandler = null;
    }

    public OpenDialog(dialogType: DialogType, options: IDialogOptions = {}): boolean {
        const prefab = this.dialogPrefabs ? this.dialogPrefabs[dialogType] : null;
        if (!prefab || this.isOpen(dialogType)) {
            return false;
        }

        const node = cc.instantiate(prefab);
        const view = node.getComponent(DialogView);
        if (!view) {
            node.destroy();
            return false;
        }

        view.SetOpenInfo(dialogType, options);
        view.SetOnCloseRequest(() => this.closeDialogView(view));
        try {
            if (options.Configure) {
                options.Configure(view);
            }
        } catch (error) {
            node.destroy();
            throw error;
        }
        this.node.addChild(node);

        const wasPaused = this.isPaused();
        this._dialogStack.push(view);
        view.Show();
        this.syncPause(wasPaused);
        if (options.OnOpen) {
            options.OnOpen(dialogType);
        }
        return true;
    }

    public CloseTopDialog(): boolean {
        return this.closeDialogView(this._dialogStack[this._dialogStack.length - 1]);
    }

    public CloseAllDialogs(): void {
        const views = this._dialogStack.slice();
        if (views.length === 0) {
            return;
        }
        const wasPaused = this.isPaused();
        this._dialogStack.length = 0;
        views.forEach((view) => {
            view.MarkClosing();
            this.destroyView(view);
        });
        this.syncPause(wasPaused);
        views.forEach((view) => this.notifyClose(view));
    }

    public SetPauseHandler(handler: (paused: boolean) => void): void {
        this._pauseHandler = handler;
        if (handler && this.isPaused()) {
            handler(true);
        }
    }

    private closeDialogView(view: DialogView): boolean {
        if (!view || this._dialogStack.indexOf(view) < 0 || !view.MarkClosing()) {
            return false;
        }
        view.Hide(() => this.finishClose(view));
        return true;
    }

    private finishClose(view: DialogView): void {
        const index = this._dialogStack.indexOf(view);
        if (index < 0) {
            return;
        }
        const wasPaused = this.isPaused();
        this._dialogStack.splice(index, 1);
        this.destroyView(view);
        this.syncPause(wasPaused);
        this.notifyClose(view);
    }

    private isOpen(dialogType: DialogType): boolean {
        return this._dialogStack.some((view) => view.Type === dialogType);
    }

    private isPaused(): boolean {
        return this._dialogStack.some((view) => view.Options.PauseGame === true);
    }

    private syncPause(wasPaused: boolean): void {
        const paused = this.isPaused();
        if (paused !== wasPaused && this._pauseHandler) {
            this._pauseHandler(paused);
        }
    }

    private notifyClose(view: DialogView): void {
        if (view.Options.OnClose) {
            view.Options.OnClose(view.Type);
        }
    }

    private destroyView(view: DialogView): void {
        view.StopAnimations();
        const node = view.node;
        if (!node || !node.isValid) {
            return;
        }
        if (node.parent) {
            node.removeFromParent();
        }
        node.destroy();
    }
}
