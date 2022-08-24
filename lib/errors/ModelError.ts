export class ModelInitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ModelInitError";
    }
}
