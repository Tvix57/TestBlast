import { Root } from '../assets/scripts/game/Root';
import {
    createDialogManager, createSceneManager, loadBoosterConfig, loadFieldConfig, loadFieldConfigs, loadGameConfig
} from './helpers';

describe('Root: точка инициализации приложения', () => {
    beforeEach(() => {
        (Root as any)._instance = null;
    });

    it('до Initialize контекст и менеджеры недоступны', () => {
        const root = Root.Instance;

        expect(root).toBe(Root.Instance);
        expect(root.IsReady).toBe(false);
        expect(root.Context).toBeNull();
        expect(root.ResolveDialogManager()).toBeNull();
        expect(root.ResolveSceneManager()).toBeNull();
    });

    it('Initialize сохраняет менеджеры и создаёт контекст с первым матчем', () => {
        const config = loadGameConfig();
        const dialogs = createDialogManager();
        const scenes = createSceneManager();

        Root.Instance.Initialize(config, loadBoosterConfig(), loadFieldConfigs(), dialogs, scenes);

        expect(Root.Instance.IsReady).toBe(true);
        expect(Root.Instance.ResolveDialogManager()).toBe(dialogs);
        expect(Root.Instance.ResolveSceneManager()).toBe(scenes);
        expect(Root.Instance.Context.FieldCount).toBe(loadFieldConfigs().length);
        expect(Root.Instance.Context.Session.Level).toBe(1);
        expect(Root.Instance.Context.Session.FieldVariant).toBe(0);
        expect(Root.Instance.Context.Session.Config.match.targetScore).toBe(config.match.targetScore);
    });

    it('Initialize передаёт в контекст готовую раскладку поля', () => {
        const field = loadFieldConfig();
        field.custom = true;
        field.rows = 2;
        field.columns = 2;
        field.board = [[0, 1], [1, 0]];

        Root.Instance.Initialize(loadGameConfig(), loadBoosterConfig(), [field], createDialogManager(), createSceneManager());

        const board = Root.Instance.Context.Session.Config.board;
        expect(board.rows).toBe(2);
        expect(board.columns).toBe(2);
        expect(board.cells).toEqual([[0, 1], [1, 0]]);
    });

    it('битый game-config не оставляет Root в готовом состоянии', () => {
        const config = loadGameConfig();
        delete (config as any).match;
        const dialogs = createDialogManager();
        const scenes = createSceneManager();

        expect(() => Root.Instance.Initialize(config, loadBoosterConfig(), loadFieldConfigs(), dialogs, scenes))
            .toThrow(/match/);

        expect(Root.Instance.IsReady).toBe(false);
        expect(Root.Instance.ResolveDialogManager()).toBeNull();
        expect(Root.Instance.ResolveSceneManager()).toBeNull();
    });

    it('битый конфиг поля отбраковывается до создания контекста', () => {
        const field = loadFieldConfig();
        field.rows = 1;
        const dialogs = createDialogManager();
        const scenes = createSceneManager();

        expect(() => Root.Instance.Initialize(loadGameConfig(), loadBoosterConfig(), [field], dialogs, scenes))
            .toThrow(/field config\[0\]: rows/);

        expect(Root.Instance.IsReady).toBe(false);
    });

    it('повторная Initialize заменяет контекст и менеджеры', () => {
        const firstDialogs = createDialogManager();
        const firstScenes = createSceneManager();
        Root.Instance.Initialize(loadGameConfig(), loadBoosterConfig(), loadFieldConfigs(), firstDialogs, firstScenes);

        const secondDialogs = createDialogManager();
        const secondScenes = createSceneManager();
        Root.Instance.Initialize(loadGameConfig(), loadBoosterConfig(), loadFieldConfigs(), secondDialogs, secondScenes);

        expect(Root.Instance.ResolveDialogManager()).toBe(secondDialogs);
        expect(Root.Instance.ResolveSceneManager()).toBe(secondScenes);
        expect(Root.Instance.Context.Session.Level).toBe(1);
    });
});
