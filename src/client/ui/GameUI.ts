import type { ClientEvent, ServerEvent } from '../../shared/types';

export class GameUI {
    public render(_gameState: Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload']): string {
        // รอคนเลือก
        return "";
    }

    public handleInput(_input: string): ClientEvent | null {
        // รอคนเลือก
        return null;
    }
}
