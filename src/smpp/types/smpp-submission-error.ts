export type SmppSubmissionErrorKind =
  | "FAILED"
  | "UNKNOWN";

export class SmppSubmissionError
  extends Error {
  constructor(
    message: string,
    public readonly kind:
      SmppSubmissionErrorKind,
    public readonly errorCode?:
      string,
  ) {
    super(message);

    this.name =
      "SmppSubmissionError";
  }
}