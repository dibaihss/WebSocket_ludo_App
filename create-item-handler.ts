import { Server, Socket } from 'socket.io';

import { DataClient } from './cosmos';
import { CreateProductInput } from './types';

export function registerCreateItemHandler(socket: Socket, io: Server): void {
    socket.on('create_item', async (payload: CreateProductInput) => {
        try {
            const createdItem = await new DataClient().createProduct(payload, (message: string) => {
                console.log(message);
                io.emit('new_message', message);
            });

            io.emit('new_message', `Created item:\t${JSON.stringify(createdItem)}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const message = `Error:\t${errorMessage}`;
            console.error(error);
            io.emit('new_message', message);
        }
    });
}
