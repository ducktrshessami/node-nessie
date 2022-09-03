import { BindParameters, Connection, InitialiseOptions, Pool, PoolAttributes, Result, Results } from "oracledb";

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

export enum Operators {
    lt = "<",
    gt = ">"
}

type NessieInitOptions = {
    verbose?: boolean
};

type NessieConfiguration = NessieInitOptions & PoolAttributes & InitialiseOptions;

interface InitializedModels {
    [key: string]: typeof Model;
}

type AttributeData = {
    type: DataTypes,
    primaryKey?: boolean,
    allowNull?: boolean,
    defaultValue?: any
};

interface ModelAttributes {
    [attribute: string]: AttributeData | DataTypes;
}

type DefineModelOptions = {
    tableName?: string;
};

type ModelInitOptions = DefineModelOptions & { nessie: Nessie };

export class Nessie {
    protected configuration: NessieConfiguration;
    readonly models: InitializedModels;
    readonly pool: Pool | null;

    constructor(configuration: NessieConfiguration);

    addModels(...newModels: Array<typeof Model>): void;
    define(name: string, attributes: ModelAttributes, options: DefineModelOptions): typeof Model;
    initPool(): Promise<boolean>;
    connect(): Promise<Connection>;
    execute(sql: string, bindParams?: BindParameters, commit?: boolean): Promise<Result<any>>;
    executeMany(sql: string, bindParams: Array<BindParameters>, commit?: boolean): Promise<Results<any>>;
    sync(force?: boolean): Promise<void>;
    close(drainTime?: number): Promise<void>;
}

type AssociationOptions = {
    foreignKey?: string,
    sourceKey?: string,
    onDelete?: OnDeleteBehavior
};

type ModelCreateOptions = {
    select?: boolean
};

type ModelBulkCreateOptions = {
    ignoreDuplicates?: boolean
};

interface ModelQueryAttributeData {
    [key: string]: any;
}

type FindOneModelOptions = {
    where: ModelQueryAttributeData,
    attributes?: Array<string>
};

type FindAllModelOptions = FindOneModelOptions & { limit?: number };

type FindOrCreateModelOptions = FindOneModelOptions & {
    defaults?: ModelQueryAttributeData
};

export class Model {
    static readonly tableName: string;
    static readonly primaryKeys: Array<string>;
    static readonly foreignKeys: Array<string>;
    static readonly parentTableCount: number;

    readonly model: typeof Model;
    readonly destroyed: boolean;
    readonly rowId: string;
    dataValues: ModelQueryAttributeData;

    static init(attributes: ModelAttributes, options: ModelInitOptions): void;
    static hasMany(other: typeof Model, options?: AssociationOptions): void;
    static belongsTo(other: typeof Model, options?: AssociationOptions): void;
    static sync(force?: boolean): Promise<void>;
    static create(values: ModelQueryAttributeData, options: { select: false }): Promise<void>;
    static create(values: ModelQueryAttributeData, options?: ModelCreateOptions): Promise<Model>;
    static bulkCreate(values: Array<ModelQueryAttributeData>, options?: ModelBulkCreateOptions): Promise<number>;
    static findAll(options?: FindAllModelOptions): Promise<Array<Model>>;
    static findOne(options?: FindOneModelOptions): Promise<Model | null>;
    static findByRowId(rowId: string): Promise<Model | null>;
    static findOrCreate(options: FindOrCreateModelOptions): Promise<[Model, boolean]>;
    static update(values: ModelQueryAttributeData, options: any): Promise<number>;
    static destroy(options: any): Promise<number>;

    update(values: ModelQueryAttributeData, options?: any): Promise<this>;
    destroy(options?: any): Promise<void>;
}
