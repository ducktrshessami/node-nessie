import { BindParameters, Connection, Metadata, Result, Results } from "oracledb";

export class Nessie {
    readonly models: any;
    readonly connection: Connection | null;

    constructor(protected configuration: any);

    addModels(...newModels: Array<typeof Model>): void;
    connect(): Promise<void>;
    execute(sql: string, bindParams: BindParameters = []): Promise<Result<any>>;
    executeMany(sql: string, bindParams: Array<BindParameters>): Promise<Results<any>>;
    sync(force: boolean = false): Promise<void>;
    commit(): Promise<void>;
}

export class Model {
    static readonly tableName: string;
    static readonly primaryKeys: Array<string>;

    readonly model: typeof Model;
    readonly destroyed: boolean;
    readonly rowId: string;
    dataValues: any;

    static init(attributes: any, options: any): void;
    static sync(force: boolean = false): Promise<void>;
    static create(values: any, options: { select: false }): Promise<void>;
    static create(values: any, options: any = {}): Promise<Model>;
    static bulkCreate(values: Array<any>, options: any = {}): Promise<number>;
    static findAll(options: any = {}): Promise<Array<Model>>;
    static findOne(options: any = {}): Promise<Model?>;
    static findByRowId(rowId: string): Promise<Model?>;
    static findOrCreate(options: any): Promise<[Model, boolean]>;
    static update(values: any, options: any): Promise<number>;
    static destroy(options: any): Promise<number>;

    update(values: any, options: any = {}): Promise<this>;
    destroy(options: any = {}): Promise<void>;
}

export * from "../lib/utils/Constants";
