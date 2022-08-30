import { BindParameters, createPool, initOracleClient, Pool } from "oracledb"
import Model from "./Model";

export default class Nessie {
    private static initialized = false;

    private _pool: Pool | null;
    readonly models: any;

    get pool() {
        return this._pool;
    }

    constructor(protected configuration: any) {
        this._pool = null;
        this.models = {};
        if (!Nessie.initialized) {
            initOracleClient(configuration);
            Nessie.initialized = true;
        }
    }

    addModels(...newModels: Array<typeof Model>) {
        newModels.forEach(model => this.models[model.name] = model);
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

    async execute(sql: string, bindParams: BindParameters = [], commit = false) {
        const connection = await this.connect();
        if (this.configuration.verbose) {
            console.info(`Executing: ${sql}`);
        }
        const result = await connection.execute(sql, bindParams);
        if (commit) {
            await connection.commit();
        }
        await connection.close();
        return result;
    }

    async executeMany(sql: string, bindParams: Array<BindParameters>, commit = false) {
        const connection = await this.connect();
        if (this.configuration.verbose) {
            console.info(`Executing Many: ${sql}`);
        }
        const result = await connection.executeMany(sql, bindParams);
        if (commit) {
            await connection.commit();
        }
        await connection.close();
        return result;
    }

    async sync(force = false) {
        for (const model in this.models) {
            await this.models[model].sync(force);
        }
    }

    async close(drainTime?: number) {
        await (isNaN(drainTime!) ? this._pool?.close() : this._pool?.close(drainTime));
        this._pool = null;
    }
}
