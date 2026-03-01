import { Server, Socket } from 'socket.io';

import { SessionMsg, UserStatusMessage } from './types';

function getPayload(args: unknown[]): unknown {
    return args.length > 0 ? args[0] : undefined;
}

function getUsername(message: SessionMsg): string | undefined {
    const candidates = [message.sender, message.username, message.name]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

    return candidates.length > 0 ? candidates[0] : undefined;
}

function emitPublic(io: Server, payload: unknown): void {
    io.emit('/topic/public', payload);
}

function emitTopic(io: Server, topic: string, payload: unknown): void {
    io.emit(topic, payload);
}

export function registerSessionWebSocketHandler(socket: Socket, io: Server): void {
    const handleChatSendMessage = (rawPayload: unknown): void => {
        const payload: SessionMsg = typeof rawPayload === 'object' && rawPayload !== null
            ? rawPayload as SessionMsg
            : { content: String(rawPayload ?? '') };

        emitPublic(io, payload);
    };

    const handleChatAddUser = (rawPayload: unknown): void => {
        const payload: SessionMsg = typeof rawPayload === 'object' && rawPayload !== null
            ? rawPayload as SessionMsg
            : { content: String(rawPayload ?? '') };

        const username = getUsername(payload);
        if (username) {
            socket.data.username = username;
        }

        emitPublic(io, payload);
    };

    const handleBoardGetPos = (rawPayload: unknown): void => {
        emitTopic(io, '/topic/board', rawPayload);
    };

    socket.on('/app/chat.sendMessage', handleChatSendMessage);
    socket.on('chat.sendMessage', handleChatSendMessage);

    socket.on('/app/chat.addUser', handleChatAddUser);
    socket.on('chat.addUser', handleChatAddUser);

    socket.on('/app/board.getPos', handleBoardGetPos);
    socket.on('board.getPos', handleBoardGetPos);

    socket.onAny((event: string, ...args: unknown[]) => {
        const payload = getPayload(args);

        let match = event.match(/^\/?app\/chat\.getCard\/([^/]+)$/);
        if (match) {
            const cardId = match[1];
            emitTopic(io, `/topic/card/${cardId}`, payload);
            return;
        }

        match = event.match(/^\/?app\/waitingRoom\.gameStarted\/([^/]+)$/);
        if (match) {
            const sessionId = match[1];
            emitTopic(io, `/topic/gameStarted/${sessionId}`, payload);
            return;
        }

        match = event.match(/^\/?app\/player\.getPlayer\/([^/]+)$/);
        if (match) {
            const sessionId = match[1];
            emitTopic(io, `/topic/currentPlayer/${sessionId}`, payload);
            return;
        }

        match = event.match(/^\/?app\/player\.Move\/([^/]+)$/);
        if (match) {
            const sessionId = match[1];
            emitTopic(io, `/topic/playerMove/${sessionId}`, payload);
            return;
        }

        match = event.match(/^\/?app\/waitingRoom\.notifications\/([^/]+)$/);
        if (match) {
            const matchId = match[1];
            const statusPayload: UserStatusMessage = typeof payload === 'object' && payload !== null
                ? payload as UserStatusMessage
                : { status: String(payload ?? '') };
            emitTopic(io, `/topic/gameStarted/${matchId}`, statusPayload);
        }
    });

    socket.on('disconnect', () => {
        const username = typeof socket.data.username === 'string'
            ? socket.data.username
            : undefined;

        if (!username) {
            return;
        }

        emitPublic(io, {
            sender: username,
            type: 'LEAVE',
            content: `${username} disconnected`
        } satisfies SessionMsg);
    });
}
