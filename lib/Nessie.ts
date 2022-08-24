import { BindParameters, Connection, getConnection, initOracleClient } from "oracledb"
import Model from "./Model";

export default class Nessie {
    private _connection: Connection | null;
    readonly models: any;

    get connection() {
        return this._connection;
    }

    constructor(protected configuration: any) {
        this._connection = null;
        this.models = {};
        initOracleClient(configuration);
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

    async execute(sql: string, binds?: any) {
        await this.connect();
        if (this.configuration.verbose) {
            console.info(`Executing: ${sql}`);
        }
        return this._connection!.execute(sql, binds);
    }

    async sync(force = false) {
        for (const model in this.models) {
            await this.models[model].sync(force);
        }
    }
}
