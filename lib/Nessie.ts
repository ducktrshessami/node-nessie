import { BindParameters, Connection, getConnection, initOracleClient } from "oracledb"
import Model from "./Model";

export default class Nessie {
    private static initialized = false;

    private _connection: Connection | null;
    readonly models: any;

    get connection() {
        return this._connection;
    }

    constructor(protected configuration: any) {
        this._connection = null;
        this.models = {};
        if (!Nessie.initialized) {
            initOracleClient(configuration);
            Nessie.initialized = true;
        }
    }

    addModels(...newModels: Array<typeof Model>) {
        newModels.forEach(model => this.models[model.name] = model);
    }

    async connect() {
        if (this._connection === null) {
            this._connection = await getConnection(this.configuration);
            return true;
        }
        return false;
    }

    async execute(sql: string, bindParams?: BindParameters) {
        await this.connect();
        if (this.configuration.verbose) {
            console.info(`Executing: ${sql}`);
        }
        return bindParams ? this._connection!.execute(sql, bindParams) : this._connection!.execute(sql);
    }

    async executeMany(sql: string, bindParams: Array<BindParameters>) {
        await this.connect();
        if (this.configuration.verbose) {
            console.info(`Executing Many: ${sql}`);
        }
        return this._connection!.executeMany(sql, bindParams);
    }

    async sync(force = false) {
        for (const model in this.models) {
            await this.models[model].sync(force);
        }
    }

    async commit() {
        await this.connect();
        return this._connection!.commit();
    }
}
