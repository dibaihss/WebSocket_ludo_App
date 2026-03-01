import { ItemDefinition } from '@azure/cosmos';

export type Emit = (message: string) => void;

export interface CreateProductInput {
    category: string;
    name: string;
    quantity: number;
    price: number;
    clearance: boolean;
}

export interface SessionMsg {
    sender?: string;
    username?: string;
    name?: string;
    content?: string;
    type?: string;
    [key: string]: unknown;
}

export interface UserStatusMessage {
    userId?: string;
    username?: string;
    status?: string;
    [key: string]: unknown;
}

export interface Product extends ItemDefinition {
    category: string;
    name: string;
    quantity: number;
    price: number;
    clearance: boolean;
}
