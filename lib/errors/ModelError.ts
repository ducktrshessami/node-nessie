export class ModelInitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ModelInitError";
    }
}

export class ModelSyncError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ModelSyncError";
    }
}
