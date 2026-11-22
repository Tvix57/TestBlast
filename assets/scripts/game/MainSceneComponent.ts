import { BoardView } from './BoardView';
import { MainSceneController } from './controllers/MainSceneController';
import { HudView } from './views/HudView';

const { ccclass, property } = cc._decorator;

@ccclass
export class MainSceneComponent extends cc.Component {
    @property({ type: BoardView, visible: true })
    public boardView!: BoardView;

    @property({ type: HudView, visible: true })
    public hudView!: HudView;

    private _sceneController: MainSceneController = null;

    protected onLoad(): void {
        this._sceneController = MainSceneController.Create(this.boardView, this.hudView, {
            Schedule: (callback: () => void, intervalSeconds: number) => this.schedule(callback, intervalSeconds),
            Unschedule: (callback: () => void) => this.unschedule(callback)
        });
        this._sceneController.Start();
    }

    protected onEnable(): void {
        if (this._sceneController) {
            this._sceneController.ResumeTimer();
        }
    }

    protected onDisable(): void {
        if (this._sceneController) {
            this._sceneController.SuspendTimer();
        }
    }

    protected onDestroy(): void {
        if (this._sceneController) {
            this._sceneController.Dispose();
            this._sceneController = null;
        }
    }

    public LoadField(fieldVariant: number): void {
        if (this._sceneController) {
            this._sceneController.LoadField(fieldVariant);
        }
    }
}
