import assert from "assert";
import { config } from "dotenv";
import { Model, Nessie } from "../";
import initModels from "./models";

describe("Model", function () {
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

    describe("static members", function () {
        it("capitalizes and pluralizes class name for table name", function () {
            assert.strictEqual(db.models.Example.tableName, "Examples");
        });

        it("is accessible from Nessie instance after init", function () {
            assert.strictEqual(db.models.Example, Example);
        });

        it("properly generates foreignKeys if not specified", function () {
            assert.strictEqual(Child.foreignKeys[0], "ExampleId");
        });

        it("syncs with db properly", async function () {
            this.timeout(5000);
            await db.models.Example.sync(true);
            await db.models.Example.sync();
            return db.execute(`SELECT "${db.models.Example.tableName}"."ROWID" FROM "${db.models.Example.tableName}" FETCH NEXT 0 ROWS ONLY`);
        });

        it("can drop a synced table", async function () {
            this.timeout(5000);
            await Example.drop(true);
            try {
                await db.execute(`SELECT "${Example.tableName}"."ROWID" FROM "${Example.tableName}" FETCH NEXT 0 ROWS ONLY`);
            }
            catch (error: any) {
                assert.strictEqual(error.errorNum, 942);
                return;
            }
            throw new Error("SELECT dropped table did not error");
        });

        describe("sync between tests", function () {
            beforeEach(async function () {
                return db.models.Example.sync(true);
            });

            it("create returns a model instance by default", async function () {
                this.timeout(5000);
                const instance = await db.models.Example.create({
                    id: 1,
                    foo: "bar"
                });
                assert.strictEqual(instance!.constructor, db.models.Example);
            });

            it("bulkCreate functions as intended", async function () {
                this.timeout(5000);
                const values = [
                    {
                        id: 1,
                        foo: "foo"
                    },
                    {
                        id: 2,
                        foo: "bar"
                    }
                ];
                const initial = await db.models.Example.bulkCreate(values);
                const ignored = await db.models.Example.bulkCreate(values, { ignoreDuplicates: true });
                assert.strictEqual(initial, values.length);
                assert.strictEqual(ignored, 0);
            });

            it("findByRowId functions as intended", async function () {
                this.timeout(5000);
                const id = 1;
                const foo = "foobar";
                const created = await db.models.Example.create({ id, foo });
                const read = await db.models.Example.findByRowId(created!.rowId);
                assert.strictEqual(read!.dataValues.id, id);
                assert.strictEqual(read!.dataValues.foo, foo);
            });

            it("findOrCreate functions as intended", async function () {
                this.timeout(5000);
                const id = 1;
                const foo = "foo";
                const [initial, initialCreated] = await db.models.Example.findOrCreate({
                    where: { id },
                    defaults: { foo }
                });
                assert.strictEqual(initialCreated, true);
                const [found, foundCreated] = await db.models.Example.findOrCreate({
                    where: { id },
                    defaults: { foo: "bar" }
                });
                assert.strictEqual(foundCreated, false);
                assert.strictEqual(found.rowId, initial.rowId);
                assert.strictEqual(found.dataValues.foo, foo);
            });

            it("update functions as intended", async function () {
                this.timeout(5000);
                const id = 1;
                await db.models.Example.create({
                    id,
                    foo: "foo"
                }, { select: false });
                const updated = await db.models.Example.update({ foo: "bar" }, {
                    where: { id }
                });
                assert.strictEqual(updated, 1);
            });

            it("destroy functions as intended", async function () {
                this.timeout(5000);
                const id = 1;
                await db.models.Example.create({
                    id,
                    foo: "foo"
                }, { select: false });
                const destroyed = await db.models.Example.destroy({
                    where: { id }
                });
                assert.strictEqual(destroyed, 1);
            });
        });
    });

    describe("instance members", function () {
        let instance: Model;

        before(async function () {
            await db.models.Example.sync(true);
            instance = (await db.models.Example.create({
                id: 1,
                foo: "foobar"
            }))!;
        });

        it("rowId is present", function () {
            assert.strictEqual(typeof instance.rowId, "string");
        });

        it("update patches instance's dataValues", async function () {
            this.timeout(5000);
            const foo = "foo";
            await instance.update({ foo });
            assert.strictEqual(instance.dataValues.foo, foo);
        });

        it("destroy marks instance as destroyed", async function () {
            this.timeout(5000);
            assert.strictEqual(instance.destroyed, false);
            await instance.destroy();
            assert.strictEqual(instance.destroyed, true);
        });
    });

    after(async function () {
        await db.drop();
        return db.close();
    });
});
