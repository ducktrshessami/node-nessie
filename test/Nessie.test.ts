import { config } from "dotenv";
import assert from "assert";
import { Nessie } from "../";

describe("Nessie", function () {
    before(function () {
        config();
    });

    it("connects given proper configuration", async function () {
        const client = new Nessie({
            libDir: process.env.DB_LIBDIR,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionString: process.env.DB_CONNECTSTRING
        });
        await client.connect();
        assert(client.connection);
    });
});
