export class GameError extends Error {
  public code: string;

  constructor(message: string, code: string = 'GAME_ERROR') {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

export class RoomNotFoundError extends GameError {
  constructor(roomId: string) {
    super(`Room with ID ${roomId} not found`, 'ROOM_NOT_FOUND');
  }
}

export class InvalidActionError extends GameError {
  constructor(action: string) {
    super(`Action ${action} is invalid in current state`, 'INVALID_ACTION');
  }
}

export class InsufficientChipsError extends GameError {
  constructor(playerName: string) {
    super(`Player ${playerName} has insufficient chips`, 'INSUFFICIENT_CHIPS');
  }
}

export class RoomFullError extends GameError {
  constructor(roomId: string) {
    super(`Room ${roomId} is already full`, 'ROOM_FULL');
  }
}

export class WrongTurnError extends GameError {
  constructor(playerId: string) {
    super(`It is not player ${playerId}'s turn`, 'WRONG_TURN');
  }
}

export class NotHostError extends GameError {
  constructor(playerId: string) {
    super(`Player ${playerId} is not the host`, 'NOT_HOST');
  }
}

export class InvalidTokenError extends GameError {
  constructor() {
    super(`Invalid or missing reconnect token`, 'INVALID_TOKEN');
  }
}

export class PlayerStateError extends GameError {
  constructor(playerId: string, state: string) {
    super(
      `Player ${playerId} cannot perform this action in state: ${state}`,
      'INVALID_PLAYER_STATE',
    );
  }
}
