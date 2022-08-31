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
