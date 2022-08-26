import { config } from "dotenv";
import assert from "assert";
import { Model, Nessie } from "../";
import { DataTypes } from "../lib/utils/DataTypes";

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

    it("can sync all initialized models", async function () {
        class Foo extends Model {
            ;
        }

        this.timeout(5000);
        Foo.init(db, {
            bar: {
                type: DataTypes.STRING,
                primaryKey: true
            }
        });
        await db.sync(true);
        return db.execute(`SELECT * FROM "${Foo.tableName}"`);
    });
});
