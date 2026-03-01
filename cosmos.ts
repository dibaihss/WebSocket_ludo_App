import { Container, CosmosClient, Database, FeedResponse, ItemResponse, SqlQuerySpec } from '@azure/cosmos';
import { randomUUID } from 'node:crypto';

import { CreateProductInput, Emit, Product } from './types'

export class DataClient {

    async start(emit: Emit) {
        const client: CosmosClient = await this.createClient(emit);

        emit('Current Status:\tStarting...');

        const container: Container = await this.createContainer(emit, client);

        await this.createItemVerbose(emit, container);

        await this.createItemConcise(emit, container);

        await this.readItem(emit, container);

        await this.queryItems(emit, container);

        emit('Current Status:\tFinalizing...');
    }

    async createClient(_: Emit): Promise<CosmosClient> {
        const connectionString: string = process.env.CONFIGURATION__AZURECOSMOSDB__CONNECTIONSTRING ?? '';
        if (!connectionString) {
            throw new Error('Missing required env var: CONFIGURATION__AZURECOSMOSDB__CONNECTIONSTRING');
        }

        const client = new CosmosClient(connectionString);

        return client;
    }

    async createContainer(emit: Emit, client: CosmosClient): Promise<Container> {
        const databaseName: string = process.env.CONFIGURATION__AZURECOSMOSDB__DATABASENAME ?? 'cosmicworks';
        const { database }: { database: Database } = await client.databases.createIfNotExists({
            id: databaseName
        });

        emit(`Database ready:\t${database.id}`);

        const containerName: string = process.env.CONFIGURATION__AZURECOSMOSDB__CONTAINERNAME ?? 'products';
        const { container }: { container: Container } = await database.containers.createIfNotExists({
            id: containerName,
            partitionKey: {
                paths: ['/category']
            }
        });

        emit(`Container ready:\t${container.id}`);

        return container;
    }

    async createItemVerbose(emit: Emit, container: Container) {
        var item: Product = {
            'id': 'aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb',
            'category': 'gear-surf-surfboards',
            'name': 'Yamba Surfboard',
            'quantity': 12,
            'price': 850.00,
            'clearance': false
        };

        var response: ItemResponse<Product> = await container.items.upsert<Product>(item);

        if (response.statusCode == 200 || response.statusCode == 201) {
            emit(`Upserted item:\t${JSON.stringify(response.resource)}`);
        }
        emit(`Status code:\t${response.statusCode}`);
        emit(`Request charge:\t${response.requestCharge}`);
    }

    async createItemConcise(emit: Emit, container: Container) {
        var item: Product = {
            'id': 'bbbbbbbb-1111-2222-3333-cccccccccccc',
            'category': 'gear-surf-surfboards',
            'name': 'Kiama Classic Surfboard',
            'quantity': 25,
            'price': 790.00,
            'clearance': true
        };

        var { resource } = await container.items.upsert<Product>(item);
        emit(`Upserted item:\t${JSON.stringify(resource)}`);
    }

    async readItem(emit: Emit, container: Container) {
        var id = 'aaaaaaaa-0000-1111-2222-bbbbbbbbbbbb';
        var partitionKey = 'gear-surf-surfboards';

        var response: ItemResponse<Product> = await container.item(id, partitionKey).read<Product>();
        var read_item: Product = response.resource!;

        emit(`Read item id:\t${read_item?.id}`);
        emit(`Read item:\t${JSON.stringify(read_item)}`);
        emit(`Status code:\t${response.statusCode}`);
        emit(`Request charge:\t${response.requestCharge}`);
    }

    async queryItems(emit: Emit, container: Container) {
        const querySpec: SqlQuerySpec = {
            query: 'SELECT * FROM products p WHERE p.category = @category',
            parameters: [
                {
                    name: '@category',
                    value: 'gear-surf-surfboards'
                }
            ]
        };

        var response: FeedResponse<Product> = await container.items.query<Product>(querySpec).fetchAll();
        for (var item of response.resources) {
            emit(`Found item:\t${item.name}\t${item.id}`);
        }
        emit(`Request charge:\t${response.requestCharge}`);
    }

    async createProduct(input: CreateProductInput, emit: Emit): Promise<Product> {
        const client: CosmosClient = await this.createClient(emit);
        const container: Container = await this.createContainer(emit, client);
        const normalizedInput: CreateProductInput = this.normalizeCreateProductInput(input);

        const item: Product = {
            id: randomUUID(),
            category: normalizedInput.category,
            name: normalizedInput.name,
            quantity: normalizedInput.quantity,
            price: normalizedInput.price,
            clearance: normalizedInput.clearance
        };

        try {
            const { resource }: ItemResponse<Product> = await container.items.create<Product>(item);
            if (!resource) {
                throw new Error('Create failed: missing created resource');
            }

            return resource;
        } catch (error) {
            const maybeError = error as { statusCode?: number; code?: number };
            const statusCode = maybeError?.statusCode ?? maybeError?.code;

            if (statusCode === 409) {
                throw new Error('Create failed: item id conflict');
            }

            if (error instanceof Error && error.message.startsWith('Create failed:')) {
                throw error;
            }

            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Create failed: ${message}`);
        }
    }

    private normalizeCreateProductInput(input: CreateProductInput): CreateProductInput {
        const value = input as Partial<CreateProductInput> | null | undefined;
        const validationErrors: string[] = [];

        if (!value || typeof value !== 'object') {
            throw new Error('Validation failed: payload must be an object');
        }

        const category = typeof value.category === 'string' ? value.category.trim() : '';
        if (!category) {
            validationErrors.push('category must be a non-empty string');
        }

        const name = typeof value.name === 'string' ? value.name.trim() : '';
        if (!name) {
            validationErrors.push('name must be a non-empty string');
        }

        const quantity = Number(value.quantity);
        if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
            validationErrors.push('quantity must be an integer >= 0');
        }

        const price = Number(value.price);
        if (!Number.isFinite(price) || price < 0) {
            validationErrors.push('price must be a number >= 0');
        }

        const clearance = typeof value.clearance === 'boolean' ? value.clearance : false;

        if (validationErrors.length > 0) {
            throw new Error(`Validation failed: ${validationErrors.join('; ')}`);
        }

        return {
            category,
            name,
            quantity,
            price,
            clearance
        };
    }
}
