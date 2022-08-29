"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pseudocolumns = exports.DataTypes = void 0;
var DataTypes;
(function (DataTypes) {
    DataTypes["STRING"] = "VARCHAR(255)";
    DataTypes["NUMBER"] = "NUMBER";
})(DataTypes = exports.DataTypes || (exports.DataTypes = {}));
var Pseudocolumns;
(function (Pseudocolumns) {
    Pseudocolumns["COLUMN_VALUE"] = "COLUMN_VALUE";
    Pseudocolumns["OBJECT_ID"] = "OBJECT_ID";
    Pseudocolumns["OBJECT_VALUE"] = "OBJECT_VALUE";
    Pseudocolumns["ORA_ROWSCN"] = "ORA_ROWSCN";
    Pseudocolumns["ROWID"] = "ROWID";
    Pseudocolumns["ROWNUM"] = "ROWNUM";
    Pseudocolumns["XMLDATA"] = "XMLDATA";
})(Pseudocolumns = exports.Pseudocolumns || (exports.Pseudocolumns = {}));
