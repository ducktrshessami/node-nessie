import {
    BindDefinition,
    BindParameters,
    Connection,
    InitialiseOptions,
    Metadata,
    PoolAttributes
} from "oracledb";
import Model from "../Model";
import Nessie from "../Nessie";
import { DataTypes, OnDeleteBehavior } from "./Constants";

type NessieInitOptions = {
    verbose?: boolean
};

type NessieConfiguration = NessieInitOptions & PoolAttributes & InitialiseOptions;

interface InitializedModels {
    [key: string]: typeof Model;
}

type ColumnValue = string | number;

type AttributeData = {
    type: DataTypes,
    primaryKey?: boolean,
    allowNull?: boolean,
    defaultValue?: ColumnValue
};

interface ModelAttributes {
    [attribute: string]: AttributeData | DataTypes;
}

type DefineModelOptions = {
    tableName?: string;
};

type ConnectionOptions = { connection?: Connection };

type ExecuteOptions = ConnectionOptions & { commit?: boolean };

type ExecuteOneOptions = ExecuteOptions & { bindParams?: BindParameters };

type ExecuteManyOptions = ExecuteOptions & {
    binds: Array<BindParameters>,
    bindDefs?: BindDefinition[]
};

type SyncOptions = ConnectionOptions & { force?: boolean };

interface FormattedModelAttributes {
    [attribute: string]: AttributeData;
}

type Association = {
    foreignKey: string,
    sourceKey: string,
    type: DataTypes,
    onDelete: OnDeleteBehavior,
    source: boolean
}

interface FormattedModelAssociations {
    [other: string]: Association;
}

type ModelInitOptions = DefineModelOptions & { nessie: Nessie };

type AssociationOptions = {
    foreignKey?: string,
    sourceKey?: string,
    onDelete?: OnDeleteBehavior
};

type ModelDropOptions = ConnectionOptions & { cascade?: boolean };

type ModelQueryAttributesOptions = { attributes?: Array<string> };

type BuiltModelBulkQuery = {
    metadata: Array<Metadata<any>>;
    sql: string,
    binds: Array<BindParameters>,
    bindDefs: Array<BindDefinition>
};

type ModelBulkCreateOptions = ModelQueryAttributesOptions & { ignoreDuplicates?: boolean };

interface ModelQueryWhereOperatorData {
    [key: Operators]: ColumnValue;
}

interface ModelQueryWhereData {
    [key: string]: ColumnValue | ModelQueryWhereOperatorData;
}

type ModelQueryWhereOptions = { where: ModelQueryWhereData };

type FindOneModelOptions = ModelQueryAttributesOptions & { where?: ModelQueryWhereData };

type FindAllModelOptions = FindOneModelOptions & { limit?: number };

interface ModelQueryAttributeData {
    [key: string]: ColumnValue;
}

type FindOrCreateModelOptions = ModelQueryWhereOptions & ModelQueryAttributesOptions & { defaults?: ModelQueryAttributeData };
