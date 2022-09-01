import { DataTypes, Model, Nessie } from "../";

export default function ExampleModel(nessie: Nessie) {
    class Example extends Model { }
    Example.init({
        id: {
            type: DataTypes.NUMBER,
            primaryKey: true,
            allowNull: false
        },
        foo: DataTypes.STRING,
        bar: {
            type: DataTypes.STRING,
            defaultValue: "foobar"
        }
    }, { nessie });
    return Example;
}
