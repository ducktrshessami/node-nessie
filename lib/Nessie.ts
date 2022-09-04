import {
    BindParameters,
    createPool,
    initOracleClient,
    Pool
} from "oracledb"
import Model from "./Model";
import {
    DefineModelOptions,
    ExecuteManyOptions,
    ExecuteOneOptions,
    InitializedModels,
    ModelAttributes,
    NessieConfiguration
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
            await connection.close();
            return result;
        }
        catch (err) {
            await connection.close();
            throw err;
        }
    }

    async executeMany(sql: string, options: ExecuteManyOptions) {
        const connection = options.connection ?? await this.connect();
        try {
            if (this.configuration.verbose) {
                console.info(`Executing Many: ${sql}`);
            }
            const result = await connection.executeMany(sql, options.bindParams);
            if (options.commit) {
                await connection.commit();
            }
            await connection.close();
            return result;
        }
        catch (err) {
            await connection.close();
            throw err;
        }
    }

    async drop() {
        for (const model of Object.values(this.models)) {
            await model.drop(true);
        }
    }

    async sync(force = false) {
        const sortedModels = Object
            .values(this.models)
            .sort((a, b) => a.parentTableCount - b.parentTableCount);
        for (const model of sortedModels) {
            await model.sync(force);
        }
    }

    async close(drainTime?: number) {
        await (isNaN(drainTime!) ? this._pool?.close() : this._pool?.close(drainTime));
        this._pool = null;
    }
}
