import Nessie from "./Nessie";
import pluralize from "pluralize";
import assert from "node:assert";
import { ModelInitError, ModelSyncError } from "./errors/ModelError";
import { DataTypes } from "./utils/DataTypes";
import { BindParameters, Metadata, Result } from "oracledb";

export default class Model {
    private static _nessie?: Nessie;
    private static _attributes: any = null;

    dataValues: any;

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

    get rowId(): string {
        return this.dataValues.ROWID;
    }

    constructor(metaData: Array<Metadata<any>>, row: Array<any>) {
        this.dataValues = {};
        metaData.forEach((attributeMeta, i) => this.dataValues[attributeMeta.name] = row[i]);
    }

    static init(nessie: Nessie, attributes: any) {
        this._nessie = nessie;
        this._attributes = {};
        Object
            .keys(attributes)
            .forEach(key => this._attributes[key.toUpperCase()] = attributes[key]);
        this._nessie.addModels(this);
    }

    private static initCheck() {
        assert(this._nessie && this._attributes, new ModelInitError(`Model not initialized: ${this.name}`));
        assert(this._nessie instanceof Nessie, new ModelInitError(`Invalid Nessie instance on model ${this.name}`));
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
            sql.push(`DEFAULT ${formatValue(attributeData.defaultValue)}`);
        }
        if (attributeData.allowNull !== undefined && !attributeData.allowNull) {
            sql.push("NOT NULL");
        }
        return sql.join(" ");
    }

    private static buildTableSql(attributesData: any) {
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
        this.initCheck();
        if (force) {
            await this._nessie!.execute(`BEGIN EXECUTE IMMEDIATE 'DROP TABLE "${this.tableName}"'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -942 THEN raise; END IF; END;`);
        }
        const columnSql = this.buildTableSql(this._attributes);
        return this._nessie!.execute(`BEGIN EXECUTE IMMEDIATE 'CREATE TABLE "${this.tableName}" (${columnSql})'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -955 THEN raise; END IF; END;`);
    }

    private static formatAttributeKeys(attributes: any) {
        return Object
            .keys(attributes)
            .reduce((formatted: any, key) => {
                const upper = key.toUpperCase();
                if (upper in this._attributes) {
                    formatted[upper] = attributes[key];
                }
                return formatted;
            }, {});
    }

    private static parseValueSql(values: any): [string, string, BindParameters] {
        const attributes = this.formatAttributeKeys(values);
        const attributeKeys = Object.keys(attributes);
        const attributeSql = attributeKeys.join(", ");
        const bindParamSql = attributeKeys
            .map((_, i) => `:${i + 1}`)
            .join(", ");
        const bindParams = Object.values(attributes);
        return [attributeSql, bindParamSql, bindParams];
    }

    static async create(values: any, options: any = {}) {
        this.initCheck();
        const [attributeSql, valuesSql, bindParams] = this.parseValueSql(values);
        const { lastRowid } = await this._nessie!.execute(`INSERT INTO "${this.tableName}" (${attributeSql}) VALUES (${valuesSql})`, bindParams);
        await this._nessie!.commit();
        if (options.select ?? true) {
            return this.findByRowId(lastRowid!);
        }
    }

    private static parseSelectAttributeSql(attributes: Array<string> = Object.keys(this._attributes)) {
        return attributes
            .reduce((data: Array<string>, attribute) => {
                const upper = attribute.toUpperCase();
                const sql = `"${this.tableName}".${upper}`;
                if (upper in this._attributes && !data.includes(sql)) {
                    data.push(sql);
                }
                return data;
            }, [`"${this.tableName}".ROWID`])
            .join(", ");
    }

    static async findByRowId(rowId: string, options: any = {}) {
        this.initCheck();
        const attributeSql = this.parseSelectAttributeSql(options.attributes);
        const result: Result<any> = await this._nessie!.execute(`SELECT ${attributeSql} FROM "${this.tableName}" WHERE ROWID = :1`, [rowId]);
        if (result.rows?.length) {
            return new this(result.metaData!, result.rows![0]);
        }
    }

    private static parseEql(values: any, bindParams: Array<any> = []): [string, Array<any>] {
        const attributes = this.formatAttributeKeys(values);
        const setSql = Object
            .keys(attributes)
            .map((attribute, i) => `"${this.tableName}".${attribute} = :${i + bindParams.length + 1}`)
            .join(", ");
        bindParams.push(...Object.values(attributes));
        return [setSql, bindParams];
    }

    static async update(values: any, options: any) {
        this.initCheck();
        const [valuesSql, bindParams] = this.parseEql(values);
        const [where] = this.parseEql(options.where, bindParams);
        const { rowsAffected } = await this._nessie!.execute(`UPDATE "${this.tableName}" SET ${valuesSql} WHERE ${where}`, bindParams);
        await this._nessie!.commit();
        return rowsAffected;
    }

    static async destroy(options: any) {
        this.initCheck();
        const [where, bindParams] = this.parseEql(options.where);
        const { rowsAffected } = await this._nessie!.execute(`DELETE FROM "${this.tableName}" WHERE ${where}`, bindParams);
        return rowsAffected;
    }
}

function formatValue(value: any): string {
    switch (typeof value) {
        case "string": return `''${value}''`;
        default: return value.toString();
    }
}
