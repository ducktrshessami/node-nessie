import { Connection } from "oracledb";

export default async function cleanupConnection(connection: Connection, connectionOption?: Connection) {
    if (!connectionOption) {
        await connection.close();
    }
}
