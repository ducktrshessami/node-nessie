import { DataTypes, Model, Nessie } from "../../";

export default function ChildModel(nessie: Nessie) {
    class Child extends Model { }
    Child.init({
        id: {
            type: DataTypes.NUMBER,
            primaryKey: true
        }
    }, {
        nessie,
        tableName: "NessieExampleChildTable"
    });
    return Child;
}
