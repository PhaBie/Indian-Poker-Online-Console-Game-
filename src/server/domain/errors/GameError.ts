export class GameError extends Error {
    public code: string;

    constructor(message: string, code: string = "GAME_ERROR") {
        super(message);
        this.name = "GameError";
        this.code = code;
    }
}

export class RoomNotFoundError extends GameError {
    constructor(roomId: string) {
        super(`Room with ID ${roomId} not found`, "ROOM_NOT_FOUND");
    }
}

export class InvalidActionError extends GameError {
    constructor(action: string) {
        super(`Action ${action} is invalid in current state`, "INVALID_ACTION");
    }
}

export class InsufficientChipsError extends GameError {
    constructor(playerName: string) {
        super(`Player ${playerName} has insufficient chips`, "INSUFFICIENT_CHIPS");
    }
}
