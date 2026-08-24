export class SmppSubmissionError extends Error {
    kind;
    errorCode;
    constructor(message, kind, errorCode) {
        super(message);
        this.kind = kind;
        this.errorCode = errorCode;
        this.name =
            "SmppSubmissionError";
    }
}
//# sourceMappingURL=smpp-submission-error.js.map