import { BindParameters, Connection, getConnection, initOracleClient } from "oracledb"

export default class Nessie {
    private _connection: Connection | null;

    get connection() {
        return this._connection;
    }

    constructor(protected configuration: object) {
        this._connection = null;
        initOracleClient(configuration);
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
