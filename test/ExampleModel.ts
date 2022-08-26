import Nessie from "../lib/Nessie";
import Model from "../lib/Model";
import { DataTypes } from "../lib/utils/DataTypes";

export default function ExampleModel(nessie: Nessie) {
    class Example extends Model { }
    Example.init(nessie, {
        id: {
            type: DataTypes.NUMBER,
            primaryKey: true
        },
        foo: {
            type: DataTypes.STRING,
            allowNull: false
        }
    });
    return Example;
}
