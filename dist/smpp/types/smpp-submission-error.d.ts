export type SmppSubmissionErrorKind = "FAILED" | "UNKNOWN";
export declare class SmppSubmissionError extends Error {
    readonly kind: SmppSubmissionErrorKind;
    readonly errorCode?: string | undefined;
    constructor(message: string, kind: SmppSubmissionErrorKind, errorCode?: string | undefined);
}
