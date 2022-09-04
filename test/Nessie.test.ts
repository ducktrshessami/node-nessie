import { config } from "dotenv";
import assert from "assert";
import { Model, Nessie } from "../";
import initModels from "./models";

describe("Nessie", function () {
    let db: Nessie;
    let Example: typeof Model;
    let Child: typeof Model;

    before(function () {
        config();
        db = new Nessie({
            libDir: process.env.DB_LIBDIR,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionString: process.env.DB_CONNECTSTRING
        });
        [Example, Child] = initModels(db);
    });

    it("connects given proper configuration", async function () {
        this.timeout(5000);
        const connection = await db.connect();
        assert(connection);
        await connection.close();
    });

    it("can sync all initialized models", async function () {
        this.timeout(5000);
        await db.sync(true);
        await db.execute(`SELECT "${Example.tableName}"."ROWID" FROM "${Example.tableName}" FETCH NEXT 0 ROWS ONLY`);
        await db.execute(`SELECT "${Child.tableName}"."ROWID" FROM "${Child.tableName}" FETCH NEXT 0 ROWS ONLY`);
    });

    it("can drop all models", async function () {
        this.timeout(5000);
        await db.drop();
        const [exampleResult, childResult] = (await Promise.allSettled([
            db.execute(`SELECT "${Example.tableName}"."ROWID" FROM "${Example.tableName}" FETCH NEXT 0 ROWS ONLY`),
            db.execute(`SELECT "${Child.tableName}"."ROWID" FROM "${Child.tableName}" FETCH NEXT 0 ROWS ONLY`)
        ])) as Array<PromiseRejectedResult>;
        assert.strictEqual(exampleResult.status, "rejected");
        assert.strictEqual(exampleResult.reason.errorNum, 942);
        assert.strictEqual(childResult.status, "rejected");
        assert.strictEqual(childResult.reason.errorNum, 942);
    });

    it("close clears pool", async function () {
        assert.notStrictEqual(db.pool, null);
        await db.close();
        assert.strictEqual(db.pool, null);
    });

    after(async function () {
        return db.close();
    });
});
