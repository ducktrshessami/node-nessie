import { BindParameters, Connection, getConnection } from "oracledb"

export default class Nessie {
    connection: Connection | null;

    constructor(private configuration: object) {
        this.connection = null;
    }

    private async ready() {
        this.connection ??= await getConnection(this.configuration);
    }

    async execute(sql: string, params: BindParameters) {
        await this.ready();
        return this.connection!.execute(sql, params);
    }
}
