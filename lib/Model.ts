import Nessie from "./Nessie";
import pluralize from "pluralize";
import assert from "node:assert";
import ModelInitError from "./errors/ModelInitError";

export default abstract class Model {
    private static _nessie?: Nessie;
    private static _attributes: object | null = null;

    static get tableName() {
        return pluralize(this.name);
    }

    constructor() {
        ;
    }

    static init(nessie: Nessie, attributes: object) {
        this._nessie = nessie;
        this._attributes = attributes;
    }

    static initCheck() {
        assert(this._nessie && this._attributes, new ModelInitError(`Model not initialized: ${this.name}`));
        assert(this._nessie instanceof Nessie, new ModelInitError(`Invalid Nessie instance on model ${this.name}`));
        assert(this._attributes, new ModelInitError(`Invalid attributes on model ${this.name}`));
        return true;
    }
}
