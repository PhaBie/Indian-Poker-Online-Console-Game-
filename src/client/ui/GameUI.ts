import { ClientEvent, ServerEvent } from '../../shared/types';

export class GameUI {
    public render(gameState: Extract<ServerEvent, { type: 'GAME_STATE_UPDATE' }>['payload']): string {
        // รอคนเลือก
        return "";
    }

    public handleInput(input: string): ClientEvent | null {
        // รอคนเลือก
        return null;
    }
}
