import { Server, Socket } from 'socket.io';

interface ClientMessagePayload {
    message: string;
}

interface ServerMessagePayload {
    message: string;
    receivedAt: string;
    socketId: string;
}

export function registerMessageHandler(socket: Socket, io: Server): void {
    socket.on('client_message', (payload: ClientMessagePayload) => {
        const rawMessage = typeof payload?.message === 'string' ? payload.message : '';
        const message = rawMessage.trim();

        console.log(`Received message from socket ${socket.id}: ${message}`);
        if (!message) {
            socket.emit('server_message', {
                message: 'Validation failed: message is required',
                receivedAt: new Date().toISOString(),
                socketId: socket.id
            } as ServerMessagePayload);
            return;
        }

        const response: ServerMessagePayload = {
            message: `Server received: ${message}`,
            receivedAt: new Date().toISOString(),
            socketId: socket.id
        };

        socket.emit('server_message', response);
        io.emit('new_message', `Socket message:\t${response.message}`);
    });
}
