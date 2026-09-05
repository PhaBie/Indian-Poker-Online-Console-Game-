import type { ClientEvent } from '../../shared/types';

export class Validator {
    public validateClientEvent(_event: unknown): ClientEvent | null {
        // รอคนเลือก
        return null;
    }

    public sanitizeInput(_input: string): string {
        // รอคนเลือก
        return "";
    }
}
