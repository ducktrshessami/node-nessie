import Nessie from "./Nessie";
import pluralize from "pluralize";
import assert from "node:assert";
import { ModelInitError, ModelSyncError } from "./errors/ModelError";
import { DataTypes } from "./utils/DataTypes";

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

    private static initCheck() {
        assert(this._nessie && this._attributes, new ModelInitError(`Model not initialized: ${this.name}`));
        assert(this._nessie instanceof Nessie, new ModelInitError(`Invalid Nessie instance on model ${this.name}`));
        return true;
    }

    private static buildColumnSql(key: string, attributeData: any, binds: Array<any>) {
        assert(
            Object
                .values(DataTypes)
                .includes(attributeData.type),
            new ModelSyncError(`Invalid attribute type on model ${this.name}`)
        );
        return Object
            .keys(attributeData)
            .reduce((data: Array<string>, property) => {
                switch (property) {
                    case "allowNull":
                        if (!attributeData.allowNull) {
                            data.push("NOT NULL");
                        }
                        break;
                    case "defaultValue":
                        binds.push(attributeData[property]);
                        data.push(`DEFAULT :${binds.length}`);
                        break;
                }
                return data;
            }, [key, attributeData.type])
            .join(" ");
    }

    private static buildTableSql(attributesData: any): [string, Array<any>] {
        const binds: Array<any> = [];
        const sql = Object
            .keys(attributesData)
            .map(key => this.buildColumnSql(key, attributesData[key], binds));
        const pkData = this.primaryKeys
            .map(pk => `"${pk}"`)
            .join(", ");
        if (pkData) {
            sql.push(`PRIMARY KEY (${pkData})`);
        }
        return [sql.join(", "), binds];
    }

    static async sync(force = false) {
        if (this.initCheck()) {
            if (force) {
                await this._nessie!.execute(`BEGIN\nEXECUTE IMMEDIATE 'DROP TABLE "${this.tableName}"';\nEXCEPTION WHEN OTHERS THEN IF sqlcode <> -942 THEN raise; END IF;\nEND;`);
            }
            const [columnSql, binds] = this.buildTableSql(this._attributes);
            return this._nessie!.execute(`CREATE TABLE "${this.tableName}" (${columnSql})`, binds);
        }
    }
}
