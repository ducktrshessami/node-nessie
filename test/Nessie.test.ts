import { config } from "dotenv";
import assert from "assert";
import { Nessie } from "../";

describe("Nessie", function () {
    let db: Nessie;

    before(function () {
        config();
        db = new Nessie({
            libDir: process.env.DB_LIBDIR,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionString: process.env.DB_CONNECTSTRING
        });
    });

    it("connects given proper configuration", async function () {
        await db.connect();
        assert(db.connection);
    });
});
