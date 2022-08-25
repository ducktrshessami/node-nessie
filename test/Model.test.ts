import assert from "assert";
import { config } from "dotenv";
import { Model, Nessie } from "../";

describe("Model", function () {
    let db: Nessie;

    class Foo extends Model {
        ;
    }

    before(function () {
        config();
        db = new Nessie({
            libDir: process.env.DB_LIBDIR,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectionString: process.env.DB_CONNECTSTRING
        });
    });

    it("pluralizes class name for table name", function () {
        assert.strictEqual(Foo.tableName, "Foos");
    });

    it("is accessible from Nessie instance after init", function () {
        Foo.init(db, {});
        assert.strictEqual(db.models.Foo, Foo);
    });
});
