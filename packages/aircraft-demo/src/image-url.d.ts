interface ImportMeta {
  readonly url: string;
}

declare class URL {
  constructor(url: string, base?: string);
  readonly href: string;
}
