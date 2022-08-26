import Nessie from "./Nessie";
import pluralize from "pluralize";
import assert from "node:assert";
import { ModelInitError, ModelSyncError } from "./errors/ModelError";
import { DataTypes } from "./utils/DataTypes";
import { Result } from "oracledb";

export default class Model {
    private static _nessie?: Nessie;
    private static _attributes: any = null;

    public dataValues: any;

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

    constructor(rawResult: Result<any>) {
        this.dataValues = {};
        const row = rawResult.rows![0];
        rawResult.metaData!.forEach((attributeMeta, i) => this.dataValues[attributeMeta.name] = row[i]);
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

    private static buildColumnSql(key: string, attributeData: any) {
        assert(
            Object
                .values(DataTypes)
                .includes(attributeData.type),
            new ModelSyncError(`Invalid attribute type on model ${this.name}`)
        );
        const sql = [key, attributeData.type];
        if (attributeData.defaultValue) {
            sql.push(`DEFAULT ${parseValue(attributeData.defaultValue)}`);
        }
        if (attributeData.allowNull !== undefined && !attributeData.allowNull) {
            sql.push("NOT NULL");
        }
        return sql.join(" ");
    }

    private static buildTableSql(attributesData: any): string {
        const sql = Object
            .keys(attributesData)
            .map(key => this.buildColumnSql(key, attributesData[key]));
        const pkData = this.primaryKeys.join(", ");
        if (pkData) {
            sql.push(`PRIMARY KEY (${pkData})`);
        }
        return sql.join(", ");
    }

    static async sync(force = false) {
        if (this.initCheck()) {
            if (force) {
                await this._nessie!.execute(`BEGIN\nEXECUTE IMMEDIATE 'DROP TABLE "${this.tableName}"';\nEXCEPTION WHEN OTHERS THEN IF sqlcode <> -942 THEN raise; END IF;\nEND;`);
            }
            const columnSql = this.buildTableSql(this._attributes);
            return this._nessie!.execute(`BEGIN\nEXECUTE IMMEDIATE 'CREATE TABLE "${this.tableName}" (${columnSql})';\nEXCEPTION WHEN OTHERS THEN IF sqlcode <> -955 THEN raise; END IF;\nEND;`);
        }
    }

    static async create(values: any, options: any = {}) {
        if (this.initCheck()) {
            const attributes = Object
                .keys(values)
                .filter(key => key in this._attributes);
            const attributeSql = attributes.join(", ");
            const valuesSql = attributes
                .map((_, i) => `:${i + 1}`)
                .join(", ");
            const bindings = attributes.map(attribute => values[attribute]);
            const { lastRowid } = await this._nessie!.execute(`INSERT INTO "${this.tableName}" (${attributeSql}) VALUES (${valuesSql})`, bindings);
            await this._nessie!.commit();
            if (options.select ?? true) {
                const result = await this._nessie!.execute(`SELECT ROWID, "${this.tableName}".* FROM "${this.tableName}" WHERE ROWID = :1`, [lastRowid]);
                return new this(result);
            }
        }
    }
}

function parseValue(value: any): string {
    switch (typeof value) {
        case "string": return `''${value}''`;
        default: return value.toString();
    }
}
