import { BindParameters, Connection, getConnection, initOracleClient } from "oracledb"
import Model from "./Model";

export default class Nessie {
    private _connection: Connection | null;
    readonly models: any;

    get connection() {
        return this._connection;
    }

    constructor(protected configuration: object) {
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

    async execute(sql: string, params: BindParameters) {
        await this.connect();
        return this._connection!.execute(sql, params);
    }
}
