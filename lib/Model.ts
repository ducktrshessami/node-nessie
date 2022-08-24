import Nessie from "./Nessie";
import pluralize from "pluralize";
import assert from "node:assert";
import { ModelInitError } from "./errors/ModelError";

export default abstract class Model {
    private static _nessie?: Nessie;
    private static _attributes: any = null;

    static get tableName() {
        return pluralize(this.name);
    }

    private static get primaryKeys() {
        if (this._attributes) {
            return Object
                .keys(this._attributes)
                .filter(key => this._attributes[key].primaryKey);
        }
        return [];
    }

    constructor() {
        ;
    }

    static init(nessie: Nessie, attributes: object) {
        this._nessie = nessie;
        this._attributes = attributes;
        this._nessie.addModels(this);
    }

    static initCheck() {
        assert(this._nessie && this._attributes, new ModelInitError(`Model not initialized: ${this.name}`));
        assert(this._nessie instanceof Nessie, new ModelInitError(`Invalid Nessie instance on model ${this.name}`));
        assert(this._attributes, new ModelInitError(`Invalid attributes on model ${this.name}`));
        return true;
    }

    private static buildTableSql(attributesData: any) {
        const data = Object
            .keys(attributesData)
            .map(key => buildColumnSql(key, attributesData[key]));
        const pkData = this.primaryKeys
            .map(pk => `"${pk}"`)
            .join(", ");
        if (pkData) {
            data.push(`PRIMARY KEY (${pkData})`);
        }
        return data.join(", ");
    }

    static async sync(force = false) {
        if (this.initCheck()) {
            if (force) {
                await this._nessie!.execute(`BEGIN\nEXECUTE IMMEDIATE 'DROP TABLE "${this.tableName}"';\nEXCEPTION WHEN OTHERS THEN IF sqlcode <> -942 THEN raise; END IF;\nEND;`);
            }
            const columnSql = this.buildTableSql(this._attributes);
            return this._nessie!.execute(`CREATE TABLE "${this.tableName}" (${columnSql})`);
        }
    }
}

function buildColumnSql(key: string, attributeData: any): string {

}
