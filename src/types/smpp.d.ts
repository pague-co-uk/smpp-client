declare module "smpp" {
  export interface PDU {
    command_status: number;
    sequence_number: number;

    message_id?: string;

    source_addr?: string;
    destination_addr?: string;

    receipted_message_id?: string;

    [key: string]: unknown;
  }

  export interface SubmitSmOptions {
    service_type?: string;

    source_addr_ton?: number;
    source_addr_npi?: number;
    source_addr?: string;

    dest_addr_ton?: number;
    dest_addr_npi?: number;
    destination_addr?: string;

    esm_class?: number;
    protocol_id?: number;
    priority_flag?: number;

    schedule_delivery_time?: string;
    validity_period?: string;

    registered_delivery?: number;
    replace_if_present_flag?: number;

    data_coding?: number;
    sm_default_msg_id?: number;

    short_message?: string | Buffer;
  }

  export interface BindTransceiverOptions {
    system_id: string;
    password: string;
    system_type?: string;
    interface_version?: number;
    addr_ton?: number;
    addr_npi?: number;
    address_range?: string;
  }

  export interface Session {
    on(
      event: "connect",
      listener: () => void,
    ): this;

    on(
      event: "close",
      listener: () => void,
    ): this;

    on(
      event: "error",
      listener: (error: Error) => void,
    ): this;

    on(
      event: "timeout",
      listener: () => void,
    ): this;

    on(
      event: "deliver_sm",
      listener: (pdu: PDU) => void,
    ): this;

    on(
      event: "enquire_link",
      listener: (pdu: PDU) => void,
    ): this;

    on(
      event: "enquire_link_resp",
      listener: (pdu: PDU) => void,
    ): this;

    once(
      event: "connect",
      listener: () => void,
    ): this;

    once(
      event: "close",
      listener: () => void,
    ): this;

    once(
      event: "error",
      listener: (error: Error) => void,
    ): this;

    removeListener(
      event: string,
      listener: (...args: never[]) => void,
    ): this;

    bind_transceiver(
      options: BindTransceiverOptions,
      callback: (pdu: PDU) => void,
    ): void;

    submit_sm(
      options: SubmitSmOptions,
      callback: (pdu: PDU) => void,
    ): void;

    unbind(
      callback: (pdu: PDU) => void,
    ): void;

    close(): void;
  }

  export interface ConnectOptions {
    host: string;
    port: number;

    connectTimeout?: number;
    enquire_link?: number;

    debug?: boolean;
  }

  export function connect(
    options: ConnectOptions,
  ): Session;
}