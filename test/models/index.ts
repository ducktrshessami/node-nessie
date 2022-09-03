import { Model, Nessie, OnDeleteBehavior } from "../../";
import ExampleModel from "./ExampleModel";
import ChildModel from "./ChildModel";

export default function initModels(nessie: Nessie): [typeof Model, typeof Model] {
    const Child = ChildModel(nessie);
    const Example = ExampleModel(nessie);
    Example.hasMany(Child);
    Child.belongsTo(Example, { onDelete: OnDeleteBehavior.CASCADE });
    return [Example, Child];
}
