import { describe, it, expect } from 'bun:test';

describe('CreateRoomScreen - Component Module Exports', () => {
  it('should successfully export CreateRoomScreen component', async () => {
    const module = await import('../../../src/client/ui/screens/CreateRoomScreen');
    expect(typeof module.CreateRoomScreen).toBe('function');
  });

  it('should successfully export CreateRoomCard component', async () => {
    const module =
      await import('../../../src/client/ui/screens/createRoom/CreateRoomCard');
    expect(typeof module.CreateRoomCard).toBe('function');
  });

  it('should successfully export useCreateRoomController hook', async () => {
    const module =
      await import('../../../src/client/ui/screens/createRoom/useCreateRoomController');
    expect(typeof module.useCreateRoomController).toBe('function');
  });
});
