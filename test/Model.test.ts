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
        Foo.init(db, {
            foobar: {
                type: DataTypes.NUMBER,
                primaryKey: true
            },
            bar: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: "bar"
            }
        });
    });

    describe("static members", function () {
        it("pluralizes class name for table name", function () {
            assert.strictEqual(Foo.tableName, "Foos");
        });

        it("is accessible from Nessie instance after init", function () {
            assert.strictEqual(db.models.Foo, Foo);
        });

        it("syncs with db properly", async function () {
            this.timeout(5000);
            await Foo.sync(true);
            await Foo.sync();
            return db.execute(`SELECT * FROM "${Foo.tableName}"`);
        });
    });

    describe("instance members", function () {

    });
});
