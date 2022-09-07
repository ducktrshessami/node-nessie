import {
    BindParameters,
    Connection,
    createPool,
    initOracleClient,
    Pool
} from "oracledb"
import Model from "./Model";
import {
    ConnectionOptions,
    DefineModelOptions,
    ExecuteManyOptions,
    ExecuteOneOptions,
    InitializedModels,
    ModelAttributes,
    NessieConfiguration,
    SyncOptions
} from "./utils/typedefs";

export default class Nessie {
    private static initialized = false;

    private _pool: Pool | null;
    readonly models: InitializedModels;

    get pool() {
        return this._pool;
    }

    constructor(protected configuration: NessieConfiguration) {
        this._pool = null;
        this.models = {};
        if (this.configuration.libDir && !Nessie.initialized) {
            initOracleClient(configuration);
            Nessie.initialized = true;
        }
    }

    addModels(...newModels: Array<typeof Model>) {
        newModels.forEach(model => this.models[model.name] = model);
    }

    define(name: string, attributes: ModelAttributes, options: DefineModelOptions) {
        const NewModel: typeof Model = Object.defineProperty(class extends Model { }, "name", { value: name });
        NewModel.init(attributes, {
            ...options,
            nessie: this
        });
        return NewModel;
    }

    async initPool() {
        if (this._pool === null) {
            this._pool = await createPool(this.configuration);
            return true;
        }
        return false;
    }

    async connect() {
        await this.initPool();
        return this._pool!.getConnection();
    }

    async execute(sql: string, options: ExecuteOneOptions = {}) {
        const connection = options.connection ?? await this.connect();
        try {
            if (this.configuration.verbose) {
                console.info(`Executing: ${sql}`);
            }
            const result = await connection.execute(sql, options.bindParams ?? []);
            if (options.commit) {
                await connection.commit();
            }
            await cleanupConnection(connection, options.connection);
            return result;
        }
        catch (err) {
            await cleanupConnection(connection, options.connection);
            throw err;
        }
    }

    async executeMany(sql: string, options: ExecuteManyOptions) {
        const connection = options.connection ?? await this.connect();
        try {
            if (this.configuration.verbose) {
                console.info(`Executing Many (${options.binds.length}): ${sql}`);
            }
            const result = await connection.executeMany(sql, options.binds, { bindDefs: options.bindDefs });
            if (options.commit) {
                await connection.commit();
            }
            await cleanupConnection(connection, options.connection);
            return result;
        }
        catch (err) {
            await cleanupConnection(connection, options.connection);
            throw err;
        }
    }

    async drop(options: ConnectionOptions = {}) {
        const connection = options.connection ?? await this.connect();
        for (const model of Object.values(this.models)) {
            await model.drop({
                connection,
                cascade: true
            });
        }
        await cleanupConnection(connection, options.connection);
    }

    async sync(options: SyncOptions = {}) {
        const connection = options.connection ?? await this.connect();
        const sortedModels = Object
            .values(this.models)
            .sort((a, b) => a.parentTableCount - b.parentTableCount);
        for (const model of sortedModels) {
            await model.sync({
                connection,
                force: options.force
            });
        }
        await cleanupConnection(connection, options.connection);
    }

    async close(drainTime?: number) {
        await (isNaN(drainTime!) ? this._pool?.close() : this._pool?.close(drainTime));
        this._pool = null;
    }
}

async function cleanupConnection(connection: Connection, connectionOption?: Connection) {
    if (!connectionOption) {
        await connection.close();
    }
}
