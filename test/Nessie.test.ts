import { config } from "dotenv";
import assert from "assert";
import { Model, Nessie } from "../";
import ExampleModel from "./ExampleModel";

describe("Nessie", function () {
    let db: Nessie;
    let Example: typeof Model;

    before(function () {
        config();
        db = new Nessie({
            libDir: process.env.DB_LIBDIR,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionString: process.env.DB_CONNECTSTRING
        });
        Example = ExampleModel(db);
    });

    it("connects given proper configuration", async function () {
        await db.connect();
        assert(db.connection);
    });

    it("can sync all initialized models", async function () {
        this.timeout(5000);
        await db.sync(true);
        return db.execute(`SELECT * FROM "${Example.tableName}"`);
    });
});
