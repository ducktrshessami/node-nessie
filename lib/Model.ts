import Nessie from "./Nessie";
import pluralize from "pluralize";

export default abstract class Model {
    private static _attributes: object;

    static get tableName() {
        return pluralize(this.name);
    }

    constructor(public nessie: Nessie) {
        ;
    }

    static init(attributes: object) {
        this._attributes = attributes;
    };
}
