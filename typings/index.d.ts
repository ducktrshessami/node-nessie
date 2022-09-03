import { BindParameters, Connection, Pool, Result, Results } from "oracledb";

export class Nessie {
    protected configuration: any;
    readonly models: any;
    readonly pool: Pool | null;

    constructor(configuration: any);

    addModels(...newModels: Array<typeof Model>): void;
    define(name: string, attributes: any, options: any): typeof Model;
    initPool(): Promise<boolean>;
    connect(): Promise<Connection>;
    execute(sql: string, bindParams?: BindParameters, commit?: boolean): Promise<Result<any>>;
    executeMany(sql: string, bindParams: Array<BindParameters>, commit?: boolean): Promise<Results<any>>;
    sync(force?: boolean): Promise<void>;
    close(drainTime?: number): Promise<void>;
}

export class Model {
    static readonly tableName: string;
    static readonly primaryKeys: Array<string>;
    static readonly foreignKeys: Array<string>;
    static readonly parentTableCount: number;

    readonly model: typeof Model;
    readonly destroyed: boolean;
    readonly rowId: string;
    dataValues: any;

    static init(attributes: any, options: any): void;
    static hasMany(other: typeof Model, options?: any): void;
    static belongsTo(other: typeof Model, options?: any): void;
    static drop(cascade?: boolean): Promise<void>;
    static sync(force?: boolean): Promise<void>;
    static create(values: any, options: { select: false }): Promise<void>;
    static create(values: any, options?: any): Promise<Model>;
    static bulkCreate(values: Array<any>, options?: any): Promise<number>;
    static findAll(options?: any): Promise<Array<Model>>;
    static findOne(options?: any): Promise<Model | null>;
    static findByRowId(rowId: string): Promise<Model | null>;
    static findOrCreate(options: any): Promise<[Model, boolean]>;
    static update(values: any, options: any): Promise<number>;
    static destroy(options: any): Promise<number>;

    update(values: any, options?: any): Promise<this>;
    destroy(options?: any): Promise<void>;
}

export enum DataTypes {
    STRING = "VARCHAR(255)",
    NUMBER = "NUMBER"
}

export enum Pseudocolumns {
    COLUMN_VALUE = "COLUMN_VALUE",
    OBJECT_ID = "OBJECT_ID",
    OBJECT_VALUE = "OBJECT_VALUE",
    ORA_ROWSCN = "ORA_ROWSCN",
    ROWID = "ROWID",
    ROWNUM = "ROWNUM",
    XMLDATA = "XMLDATA",
}

export enum OnDeleteBehavior {
    CASCADE = "CASCADE",
    SET_NULL = "SET NULL"
}
