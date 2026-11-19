export interface IDialogView {
    Show(): void;
    Hide(onHidden?: () => void): void;
}

export enum DialogType {
    StartDialog = 0,
    EndDialog = 1
}

export interface IDialogOptions {
    OnOpen?: (dialogType: DialogType) => void;
    OnClose?: (dialogType: DialogType) => void;
    PauseGame?: boolean;
    CloseOnBackground?: boolean;
    Configure?: (view: IDialogView) => void;
}

export interface IDialogManager {
    OpenDialog(dialogType: DialogType, options?: IDialogOptions): boolean;
    CloseTopDialog(): boolean;
    CloseAllDialogs(): void;
    SetPauseHandler(handler: (paused: boolean) => void): void;
}
