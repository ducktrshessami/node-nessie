import assert from "assert";
import { config } from "dotenv";
import { Model, Nessie } from "../";
import ExampleModel from "./ExampleModel";

describe("Model", function () {
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

    describe("static members", function () {
        it("pluralizes class name for table name", function () {
            assert.strictEqual(db.models.Example.tableName, "Examples");
        });

        it("is accessible from Nessie instance after init", function () {
            assert.strictEqual(db.models.Example, Example);
        });

        it("syncs with db properly", async function () {
            this.timeout(5000);
            await Example.sync(true);
            await Example.sync();
            return db.execute(`SELECT * FROM "${Example.tableName}"`);
        });
    });

    describe("instance members", function () {

    });
});
