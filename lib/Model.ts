import Nessie from "./Nessie";
import pluralize from "pluralize";
import assert from "node:assert";
import { ModelInitError, ModelSyncError } from "./errors/ModelError";
import { DataTypes, OnDeleteBehavior, Pseudocolumns } from "./utils/Constants";
import { BindParameters, Metadata, Result } from "oracledb";
import {
    AssociationOptions,
    AttributeData,
    FindAllModelOptions,
    FindOneModelOptions,
    FindOrCreateModelOptions,
    FormattedModelAssociations,
    FormattedModelAttributes,
    ModelAttributes,
    ModelBulkCreateOptions,
    ModelCreateOptions,
    ModelInitOptions,
    ModelQueryAttributeData,
    ModelQueryWhereOptions
} from "./utils/typedefs";

export default class Model {
    private static _nessie?: Nessie;
    private static _tableName: string | null;
    private static _attributes: FormattedModelAttributes | null = null;
    private static _associations: FormattedModelAssociations | null = null;

    private _destroyed: boolean;
    dataValues: ModelQueryAttributeData;

    static get tableName() {
        return this._tableName ?? pluralize(upperCaseName(this.name));
    }

    static get primaryKeys() {
        if (this._attributes) {
            return Object
                .keys(this._attributes)
                .filter(key => this._attributes![key].primaryKey);
        }
        return [];
    }

    static get foreignKeys() {
        if (this._associations) {
            return Object
                .values(this._associations)
                .filter(association => association.source)
                .map(association => association.foreignKey);
        }
        return [];
    }

    static get parentTableCount() {
        if (this._associations) {
            const parents = Object
                .values(this._associations)
                .filter(assocation => assocation.source);
            return parents.length;
        }
        return 0;
    }

    get model() {
        return this.constructor as typeof Model;
    }

    get destroyed() {
        return this._destroyed;
    }

    get rowId(): string {
        return this.dataValues.ROWID;
    }

    constructor(metaData: Array<Metadata<any>>, row: Array<any>) {
        this._destroyed = false;
        this.dataValues = {};
        metaData.forEach((attributeMeta, i) => this.dataValues[attributeMeta.name] = row[i]);
    }

    static init(attributes: ModelAttributes, options: ModelInitOptions) {
        this._nessie = options.nessie;
        this._tableName = options.tableName ?? null;
        this._attributes = {};
        this._associations = {};
        Object
            .keys(attributes)
            .sort()
            .forEach(key => this._attributes![key] = (typeof attributes[key] === "object" ? attributes[key] : { type: attributes[key] }) as AttributeData);
        this._nessie!.addModels(this);
    }

    private static initCheck() {
        assert(this._nessie && this._attributes && this._associations, new ModelInitError(`Model not initialized: ${this.name}`));
        assert(this._nessie instanceof Nessie, new ModelInitError(`Invalid Nessie instance on model ${this.name}`));
    }

    private static parseForeignKey(source: typeof Model) {
        source.initCheck();
        const sourceKey = source.primaryKeys[0] ?? "ROWID";
        return {
            foreignKey: `${upperCaseName(source.name)}${upperCaseName(sourceKey)}`,
            sourceKey
        };
    }

    static hasMany(other: typeof Model, options: AssociationOptions = {}) {
        this.initCheck();
        const association: any = (options.foreignKey && options.sourceKey) ? options : this.parseForeignKey(this);
        association.onDelete = options.onDelete ?? OnDeleteBehavior.SET_NULL;
        association.type = this._attributes![association.sourceKey].type;
        association.source = false;
        this._associations![other.tableName] = association;
    }

    static belongsTo(other: typeof Model, options: AssociationOptions = {}) {
        this.initCheck();
        const association: any = (options.foreignKey && options.sourceKey) ? options : this.parseForeignKey(other);
        association.onDelete = options.onDelete ?? OnDeleteBehavior.SET_NULL;
        association.type = other._attributes![association.sourceKey].type;
        association.source = true;
        this._associations![other.tableName] = association;
    }

    private static buildColumnSql(key: string, attributeData: AttributeData) {
        assert(
            Object
                .values(DataTypes)
                .includes(attributeData.type),
            new ModelSyncError(`Invalid attribute type on model ${this.name}`)
        );
        const sql = [`"${key}"`, attributeData.type];
        if (attributeData.defaultValue) {
            sql.push(`DEFAULT ${formatValue(attributeData.defaultValue)}`);
        }
        if (attributeData.allowNull !== undefined && !attributeData.allowNull) {
            sql.push("NOT NULL");
        }
        return sql.join(" ");
    }

    private static buildAssociationSql() {
        return Object
            .keys(this._associations!)
            .filter(association => this._associations![association].source)
            .map(otherTableName => `"${this._associations![otherTableName].foreignKey}" ${this._associations![otherTableName].type} REFERENCES "${otherTableName}" ("${this._associations![otherTableName].sourceKey}") ON DELETE ${this._associations![otherTableName].onDelete}`);
    }

    private static buildTableSql(attributesData: FormattedModelAttributes) {
        const sql = Object
            .keys(attributesData)
            .map(key => this.buildColumnSql(key, attributesData[key]));
        const associationSql = this.buildAssociationSql();
        if (associationSql.length) {
            sql.push(...associationSql);
        }
        const pkData = this.primaryKeys
            .map(pk => `"${pk}"`)
            .join(", ");
        if (pkData) {
            sql.push(`PRIMARY KEY (${pkData})`);
        }
        return sql.join(", ");
    }

    static async drop(cascade = false) {
        this.initCheck();
        const cascadeSql = cascade ? " CASCADE CONSTRAINTS" : "";
        await this._nessie!.execute(`BEGIN EXECUTE IMMEDIATE 'DROP TABLE "${this.tableName}"${cascadeSql}'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -942 THEN raise; END IF; END;`);
    }

    static async sync(force = false) {
        this.initCheck();
        if (force) {
            await this.drop(true);
        }
        const columnSql = this.buildTableSql(this._attributes!);
        await this._nessie!.execute(`BEGIN EXECUTE IMMEDIATE 'CREATE TABLE "${this.tableName}" (${columnSql})'; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -955 THEN raise; END IF; END;`);
    }

    private static formatAttributeKeys(attributes: ModelQueryAttributeData) {
        return Object
            .keys(attributes)
            .sort()
            .reduce((formatted: any, key) => {
                if (key in this._attributes! || key in Pseudocolumns || this.foreignKeys.includes(key)) {
                    formatted[key] = attributes[key];
                }
                return formatted;
            }, {});
    }

    private static parseValueSql(values: ModelQueryAttributeData): [string, string, BindParameters] {
        const attributes = this.formatAttributeKeys(values);
        const attributeKeys = Object.keys(attributes);
        const attributeSql = attributeKeys
            .map(attribute => `"${attribute}"`)
            .join(", ");
        const bindParamSql = attributeKeys
            .map((_, i) => `:${i + 1}`)
            .join(", ");
        const bindParams = Object.values(attributes);
        return [attributeSql, bindParamSql, bindParams];
    }

    static async create(values: ModelQueryAttributeData, options: ModelCreateOptions = {}) {
        this.initCheck();
        const [attributeSql, valuesSql, bindParams] = this.parseValueSql(values);
        const { lastRowid } = await this._nessie!.execute(`INSERT INTO "${this.tableName}" (${attributeSql}) VALUES (${valuesSql})`, bindParams, true);
        if (options.select ?? true) {
            return this.findByRowId(lastRowid!);
        }
    }

    private static buildBulkQuery(values: Array<ModelQueryAttributeData>, ignoreDuplicates: boolean = false): [string, Array<BindParameters>] {
        const structure = values.reduce((struct: any, value) => {
            const formatted = this.formatAttributeKeys(value);
            Object
                .keys(formatted)
                .forEach(attribute => struct[attribute] = null);
            return struct;
        }, {});
        const structureAttributeList = Object.keys(structure);
        const structureAttributes = structureAttributeList
            .map(attribute => `"${attribute}"`)
            .join(", ");
        const bindParamSql = structureAttributeList
            .map((_, i) => `:${i + 1}`)
            .join(", ");
        const bindParamList = values.map(value => structureAttributeList.map(attribute => value[attribute] ?? null));
        const insertSql = `INSERT INTO "${this.tableName}" (${structureAttributes}) VALUES (${bindParamSql})`;
        const sql = ignoreDuplicates ? `BEGIN ${insertSql}; EXCEPTION WHEN OTHERS THEN IF sqlcode <> -1 THEN raise; END IF; END;` : insertSql;
        return [sql, bindParamList];
    }

    static async bulkCreate(values: Array<ModelQueryAttributeData>, options: ModelBulkCreateOptions = {}) {
        this.initCheck();
        const [sql, bindParams] = this.buildBulkQuery(values, options.ignoreDuplicates);
        const { rowsAffected } = await this._nessie!.executeMany(sql, bindParams, true);
        return rowsAffected ?? 0;
    }

    private static parseSelectAttributeSql(attributes: Array<string> = Object.keys(this._attributes!)) {
        return attributes
            .reduce((data: Array<string>, attribute) => {
                if (attribute in this._attributes! || attribute in Pseudocolumns || this.foreignKeys.includes(attribute)) {
                    const sql = `"${this.tableName}"."${attribute}"`;
                    data.push(sql);
                }
                return data;
            }, [`"${this.tableName}"."ROWID"`])
            .join(", ");
    }

    private static parseEql(values: ModelQueryAttributeData, bindParams: Array<any> = []): [string, Array<any>] {
        const attributes = this.formatAttributeKeys(values);
        const setSql = Object
            .keys(attributes)
            .map((attribute, i) => `"${this.tableName}"."${attribute}" = :${i + bindParams.length + 1}`)
            .join(", ");
        bindParams.push(...Object.values(attributes));
        return [setSql, bindParams];
    }

    static async findAll(options: FindAllModelOptions = {}) {
        this.initCheck();
        const bindParams: Array<any> = [];
        const attributeSql = this.parseSelectAttributeSql(options.attributes);
        let sqlData = [`SELECT ${attributeSql} FROM "${this.tableName}"`];
        if (options.where) {
            const [where] = this.parseEql(options.where, bindParams);
            if (where) {
                sqlData.push(`WHERE ${where}`);
            }
        }
        if (typeof options.limit === "number") {
            sqlData.push(`FETCH NEXT ${Math.floor(options.limit)} ROWS ONLY`);
        }
        const results: Result<any> = await this._nessie!.execute(sqlData.join(" "), bindParams);
        return results.rows!.map(row => new this(results.metaData!, row));
    }

    static async findOne(options: FindOneModelOptions = {}) {
        const [first] = await this.findAll({
            ...options,
            limit: 1
        });
        return first ?? null;
    }

    static async findByRowId(rowId: string) {
        return this.findOne({
            where: { ROWID: rowId }
        });
    }

    static async findOrCreate(options: FindOrCreateModelOptions): Promise<[Model, boolean]> {
        let created = false;
        let model = await this.findOne(options);
        if (!model) {
            const createOptions = {
                ...options.where,
                ...options.defaults
            };
            try {
                model = (await this.create(createOptions))!;
                created = true;
            }
            catch (error: any) {
                if (error.errorNum === 1) {
                    const pks = this.primaryKeys;
                    const findPkOptions = Object
                        .keys(createOptions)
                        .reduce((pkWhere: any, attribute) => {
                            if (pks.includes(attribute)) {
                                pkWhere[attribute] = createOptions[attribute];
                            }
                            return pkWhere;
                        }, {});
                    model = await this.findOne({ where: findPkOptions });
                }
                else {
                    throw error;
                }
            }
        }
        return [model, created];
    }

    static async update(values: ModelQueryAttributeData, options: ModelQueryWhereOptions) {
        this.initCheck();
        const [valuesSql, bindParams] = this.parseEql(values);
        const [where] = this.parseEql(options.where, bindParams);
        const { rowsAffected } = await this._nessie!.execute(`UPDATE "${this.tableName}" SET ${valuesSql} WHERE ${where}`, bindParams, true);
        return rowsAffected ?? 0;
    }

    private async patch() {
        const { dataValues } = await this.model.findByRowId(this.rowId);
        this.dataValues = dataValues;
    }

    async update(values: ModelQueryAttributeData) {
        await this.model.update(values, {
            where: { ROWID: this.rowId }
        });
        await this.patch();
        return this;
    }

    static async destroy(options: ModelQueryWhereOptions) {
        this.initCheck();
        const [where, bindParams] = this.parseEql(options.where);
        const { rowsAffected } = await this._nessie!.execute(`DELETE FROM "${this.tableName}" WHERE ${where}`, bindParams, true);
        return rowsAffected ?? 0;
    }

    async destroy() {
        if (!this._destroyed) {
            await this.model.destroy({
                where: { ROWID: this.rowId }
            });
            this._destroyed = true;
        }
    }
}

function upperCaseName(name: string) {
    return name[0].toUpperCase() + name.slice(1);
}

function formatValue(value: any): string {
    switch (typeof value) {
        case "string": return `''${value.replace("'", "'''")}''`;
        default: return value.toString();
    }
}
