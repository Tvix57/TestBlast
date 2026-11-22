import { BoosterInventory, IBoosterHandler } from '../assets/scripts/core/BoosterInventory';
import { loadBoosterConfig } from './helpers';

describe('BoosterInventory: заряды бустеров', () => {
    it('заряды берутся из конфига, отрицательные обрезаются нулём', () => {
        const inventory = new BoosterInventory();
        const config = loadBoosterConfig();
        config.boosters[0].charges = -2;

        inventory.Configure(config.boosters);

        expect(inventory.GetCount(config.boosters[0].type)).toBe(0);
        expect(inventory.GetCount(config.boosters[1].type)).toBe(config.boosters[1].charges);
    });

    it('TrySpend тратит заряд и уведомляет подписчика', () => {
        const inventory = new BoosterInventory();
        const handler: IBoosterHandler = { OnBoosterCountChanged: jest.fn() };
        const bomb = loadBoosterConfig().boosters[1];
        inventory.Configure([bomb]);
        inventory.AddHandler(handler);

        expect(inventory.TrySpend(bomb.type)).toBe(true);
        expect(inventory.GetCount(bomb.type)).toBe(bomb.charges - 1);
        expect(handler.OnBoosterCountChanged).toHaveBeenLastCalledWith(bomb.type, bomb.charges - 1);
    });

    it('без зарядов TrySpend возвращает false и не уходит в минус', () => {
        const inventory = new BoosterInventory();
        const bomb = loadBoosterConfig().boosters[1];
        inventory.Configure([{ ...bomb, charges: 1 }]);

        expect(inventory.TrySpend(bomb.type)).toBe(true);
        expect(inventory.TrySpend(bomb.type)).toBe(false);
        expect(inventory.CanSpend(bomb.type)).toBe(false);
        expect(inventory.GetCount(bomb.type)).toBe(0);
    });

    it('Configure заново выдаёт заряды и рассылает новые значения', () => {
        const inventory = new BoosterInventory();
        const bomb = loadBoosterConfig().boosters[1];
        const handler: IBoosterHandler = { OnBoosterCountChanged: jest.fn() };
        inventory.AddHandler(handler);
        inventory.Configure([bomb]);
        inventory.TrySpend(bomb.type);
        handler.OnBoosterCountChanged = jest.fn();

        inventory.Configure([bomb]);

        expect(inventory.GetCount(bomb.type)).toBe(bomb.charges);
        expect(handler.OnBoosterCountChanged).toHaveBeenCalledWith(bomb.type, bomb.charges);
    });
});
