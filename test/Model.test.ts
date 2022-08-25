import assert from "assert";
import { config } from "dotenv";
import { Model, Nessie } from "../";
import { DataTypes } from "../lib/utils/DataTypes";

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
        assert.strictEqual(Foo.tableName, "foos");
    });

    it("is accessible from Nessie instance after init", function () {
        Foo.init(db, {});
        assert.strictEqual(db.models.Foo, Foo);
    });

    it("syncs with db properly", async function () {
        this.timeout(5000);
        Foo.init(db, {
            bar: {
                type: DataTypes.STRING,
                allowNull: false
            }
        });
        await Foo.sync(true);
        return db.execute(`SELECT * FROM "${Foo.tableName}"`);
    });
});
