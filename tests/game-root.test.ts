import { Root } from '../assets/scripts/game/Root';
import { createDialogManager, createSceneManager, loadBoosterConfig, loadGameConfig } from './helpers';

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

        Root.Instance.Initialize(config, loadBoosterConfig(), dialogs, scenes);

        expect(Root.Instance.IsReady).toBe(true);
        expect(Root.Instance.ResolveDialogManager()).toBe(dialogs);
        expect(Root.Instance.ResolveSceneManager()).toBe(scenes);
        expect(Root.Instance.Context.Session.Level).toBe(1);
        expect(Root.Instance.Context.Session.FieldVariant).toBe(0);
        expect(Root.Instance.Context.Session.Config.match.targetScore).toBe(config.match.targetScore);
    });

    it('битый game-config не оставляет Root в готовом состоянии', () => {
        const config = loadGameConfig();
        delete (config as any).match;
        const dialogs = createDialogManager();
        const scenes = createSceneManager();

        expect(() => Root.Instance.Initialize(config, loadBoosterConfig(), dialogs, scenes)).toThrow(/match/);

        expect(Root.Instance.IsReady).toBe(false);
        expect(Root.Instance.ResolveDialogManager()).toBeNull();
        expect(Root.Instance.ResolveSceneManager()).toBeNull();
    });

    it('повторная Initialize заменяет контекст и менеджеры', () => {
        const firstDialogs = createDialogManager();
        const firstScenes = createSceneManager();
        Root.Instance.Initialize(loadGameConfig(), loadBoosterConfig(), firstDialogs, firstScenes);

        const secondDialogs = createDialogManager();
        const secondScenes = createSceneManager();
        Root.Instance.Initialize(loadGameConfig(), loadBoosterConfig(), secondDialogs, secondScenes);

        expect(Root.Instance.ResolveDialogManager()).toBe(secondDialogs);
        expect(Root.Instance.ResolveSceneManager()).toBe(secondScenes);
        expect(Root.Instance.Context.Session.Level).toBe(1);
    });
});
