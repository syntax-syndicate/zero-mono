import type {Optional} from 'utility-types';
import type {ReadonlyJSONValue} from '../../../shared/src/json.ts';
import type {PrimaryKey} from '../../../zero-protocol/src/primary-key.ts';
import type {SchemaValue, TableSchema} from '../table-schema.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function table<TName extends string>(name: TName) {
  return new TableBuilder({
    name,
    serverName: name,
    columns: {},
    primaryKey: [] as any as PrimaryKey,
  });
}

export function string<T extends string = string>() {
  return new ColumnBuilder({
    type: 'string',
    optional: false,
    customType: null as unknown as T,
  });
}

export function number<T extends number = number>() {
  return new ColumnBuilder({
    type: 'number',
    optional: false,
    customType: null as unknown as T,
  });
}

export function boolean<T extends boolean = boolean>() {
  return new ColumnBuilder({
    type: 'boolean',
    optional: false,
    customType: null as unknown as T,
  });
}

export function json<T extends ReadonlyJSONValue = ReadonlyJSONValue>() {
  return new ColumnBuilder({
    type: 'json',
    optional: false,
    customType: null as unknown as T,
  });
}

export function enumeration<T extends string>() {
  return new ColumnBuilder({
    type: 'string',
    optional: false,
    customType: null as unknown as T,
  });
}

export const column = {
  string,
  number,
  boolean,
  json,
};

export class TableBuilder<TShape extends TableSchema> {
  readonly #schema: TShape;
  constructor(schema: TShape) {
    this.#schema = schema;
  }

  from<ServerName extends string>(serverName: ServerName) {
    return new TableBuilder<TShape>({
      ...this.#schema,
      serverName,
    });
  }

  columns<
    const TColumns extends Record<
      string,
      ColumnBuilder<Optional<SchemaValue, 'name' | 'serverName'>>
    >,
  >(
    columns: TColumns,
  ): TableBuilderWithColumns<{
    name: TShape['name'];
    columns: {
      [K in keyof TColumns]: TColumns[K]['schema'] & {
        name: string;
        serverName: string;
      };
    };
    primaryKey: TShape['primaryKey'];
    serverName: TShape['serverName'];
  }> {
    const columnSchemas = Object.fromEntries(
      Object.entries(columns).map(([name, v]) => [
        name,
        {
          ...v.schema,
          name,
          serverName: v.schema.serverName ?? name,
        },
      ]),
    ) as {[K in keyof TColumns]: TColumns[K]['schema']};
    return new TableBuilderWithColumns({
      ...this.#schema,
      columns: columnSchemas,
    }) as any;
  }
}

export class TableBuilderWithColumns<TShape extends TableSchema> {
  readonly #schema: TShape;

  constructor(schema: TShape) {
    this.#schema = schema;
  }

  primaryKey<TPKColNames extends (keyof TShape['columns'])[]>(
    ...pkColumnNames: TPKColNames
  ) {
    return new TableBuilderWithColumns({
      ...this.#schema,
      primaryKey: pkColumnNames,
    });
  }

  get schema() {
    return this.#schema;
  }

  build() {
    // We can probably get the type system to throw an error if primaryKey is not called
    // before passing the schema to createSchema
    // Till then --
    if (this.#schema.primaryKey.length === 0) {
      throw new Error(`Table "${this.#schema.name}" is missing a primary key`);
    }
    const serverNames = new Set<string>();
    for (const {serverName} of Object.values(this.#schema.columns)) {
      if (serverNames.has(serverName)) {
        throw new Error(
          `Table "${
            this.#schema.name
          }" has multiple columns referencing "${serverName}"`,
        );
      }
      serverNames.add(serverName);
    }
    return this.#schema;
  }
}

class ColumnBuilder<
  TShape extends Omit<SchemaValue<any>, 'name' | 'serverName'>,
> {
  readonly #schema: TShape;
  constructor(schema: TShape) {
    this.#schema = schema;
  }

  from<ServerName extends string>(serverName: ServerName) {
    return new ColumnBuilder<TShape & {serverName: string}>({
      ...this.#schema,
      serverName,
    });
  }

  optional(): ColumnBuilder<Omit<TShape, 'optional'> & {optional: true}> {
    return new ColumnBuilder({
      ...this.#schema,
      optional: true,
    });
  }

  get schema() {
    return this.#schema;
  }
}

export type {ColumnBuilder};
