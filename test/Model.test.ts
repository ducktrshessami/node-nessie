import assert from "assert";
import { Model } from "../";

describe("Model", function () {
    it("pluralizes class name for table name", function () {
        class Foo extends Model {
            attributes() {
                return {};
            }
        }
        assert.strictEqual(Foo.tableName, "Foos");
    });
});
