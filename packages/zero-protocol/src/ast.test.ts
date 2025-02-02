import {expect, test} from 'vitest';
import {h64} from '../../shared/src/hash.ts';
import type {AST} from './ast.ts';
import {astSchema, normalizeAST} from './ast.ts';
import {PROTOCOL_VERSION} from './protocol-version.ts';

test('fields are placed into correct positions', () => {
  function normalizeAndStringify(ast: AST) {
    return JSON.stringify(normalizeAST(ast));
  }

  expect(
    normalizeAndStringify({
      alias: 'alias',
      table: 'table',
    }),
  ).toEqual(
    normalizeAndStringify({
      table: 'table',
      alias: 'alias',
    }),
  );

  expect(
    normalizeAndStringify({
      schema: 'schema',
      alias: 'alias',
      limit: 10,
      orderBy: [],
      related: [],
      where: undefined,
      table: 'table',
    }),
  ).toEqual(
    normalizeAndStringify({
      related: [],
      schema: 'schema',
      limit: 10,
      table: 'table',
      orderBy: [],
      where: undefined,
      alias: 'alias',
    }),
  );
});

test('conditions are sorted', () => {
  let ast: AST = {
    table: 'table',
    where: {
      type: 'and',
      conditions: [
        {
          type: 'simple',
          left: {type: 'column', name: 'b'},
          op: '=',
          right: {type: 'literal', value: 'value'},
        },
        {
          type: 'simple',
          left: {type: 'column', name: 'a'},
          op: '=',
          right: {type: 'literal', value: 'value'},
        },
      ],
    },
  };

  expect(normalizeAST(ast).where).toEqual({
    type: 'and',
    conditions: [
      {
        type: 'simple',
        left: {type: 'column', name: 'a'},
        op: '=',
        right: {type: 'literal', value: 'value'},
      },
      {
        type: 'simple',
        left: {type: 'column', name: 'b'},
        op: '=',
        right: {type: 'literal', value: 'value'},
      },
    ],
  });

  ast = {
    table: 'table',
    where: {
      type: 'and',
      conditions: [
        {
          type: 'simple',
          left: {type: 'column', name: 'a'},
          op: '=',
          right: {type: 'literal', value: 'y'},
        },
        {
          type: 'simple',
          left: {type: 'column', name: 'a'},
          op: '=',
          right: {type: 'literal', value: 'x'},
        },
      ],
    },
  };

  expect(normalizeAST(ast).where).toEqual({
    type: 'and',
    conditions: [
      {
        type: 'simple',
        left: {type: 'column', name: 'a'},
        op: '=',
        right: {type: 'literal', value: 'x'},
      },
      {
        type: 'simple',
        left: {type: 'column', name: 'a'},
        op: '=',
        right: {type: 'literal', value: 'y'},
      },
    ],
  });

  ast = {
    table: 'table',
    where: {
      type: 'and',
      conditions: [
        {
          type: 'simple',
          left: {type: 'column', name: 'a'},
          op: '<',
          right: {type: 'literal', value: 'x'},
        },
        {
          type: 'simple',
          left: {type: 'column', name: 'a'},
          op: '>',
          right: {type: 'literal', value: 'y'},
        },
      ],
    },
  };

  expect(normalizeAST(ast).where).toEqual({
    type: 'and',
    conditions: [
      {
        type: 'simple',
        left: {type: 'column', name: 'a'},
        op: '<',
        right: {type: 'literal', value: 'x'},
      },
      {
        type: 'simple',
        left: {type: 'column', name: 'a'},
        op: '>',
        right: {type: 'literal', value: 'y'},
      },
    ],
  });
});

test('related subqueries are sorted', () => {
  const ast: AST = {
    table: 'table',
    related: [
      {
        correlation: {parentField: ['a'], childField: ['a']},
        system: 'client',
        subquery: {
          table: 'table',
          alias: 'alias2',
        },
      },
      {
        correlation: {parentField: ['a'], childField: ['a']},
        system: 'client',
        subquery: {
          table: 'table',
          alias: 'alias1',
        },
      },
    ],
  };

  expect(normalizeAST(ast).related).toMatchInlineSnapshot(`
    [
      {
        "correlation": {
          "childField": [
            "a",
          ],
          "parentField": [
            "a",
          ],
        },
        "hidden": undefined,
        "subquery": {
          "alias": "alias1",
          "limit": undefined,
          "orderBy": undefined,
          "related": undefined,
          "schema": undefined,
          "start": undefined,
          "table": "table",
          "where": undefined,
        },
        "system": "client",
      },
      {
        "correlation": {
          "childField": [
            "a",
          ],
          "parentField": [
            "a",
          ],
        },
        "hidden": undefined,
        "subquery": {
          "alias": "alias2",
          "limit": undefined,
          "orderBy": undefined,
          "related": undefined,
          "schema": undefined,
          "start": undefined,
          "table": "table",
          "where": undefined,
        },
        "system": "client",
      },
    ]
  `);
});

test('renaming', () => {
  const ast: AST = {
    table: 'issue',
    where: {
      type: 'and',
      conditions: [
        {
          type: 'simple',
          left: {type: 'column', name: 'id'},
          op: '=',
          right: {type: 'literal', value: 'value'},
        },
        {
          type: 'simple',
          left: {type: 'column', name: 'ownerId'},
          op: '=',
          right: {type: 'literal', value: 'value'},
        },
        {
          type: 'correlatedSubquery',
          related: {
            correlation: {parentField: ['commentId'], childField: ['id']},
            system: 'client',
            subquery: {
              table: 'comment',
              alias: 'alias2',
            },
          },
          op: 'EXISTS',
        },
      ],
    },
    related: [
      {
        correlation: {parentField: ['commentId'], childField: ['id']},
        system: 'client',
        subquery: {
          table: 'comment',
          alias: 'alias2',
        },
      },
      {
        correlation: {parentField: ['ownerId'], childField: ['id']},
        system: 'client',
        subquery: {
          table: 'user',
          alias: 'alias1',
        },
      },
    ],
    start: {row: {id: '123'}, exclusive: true},
    orderBy: [
      ['modified', 'desc'],
      ['id', 'asc'],
    ],
  };

  const tableName = (table: string) => `${table}s`;
  const columnName = (table: string, column: string) => {
    if (column === 'id') {
      return `${table}_id`;
    }
    if (table === 'issue') {
      switch (column) {
        case 'ownerId':
          return 'owner_id';
        case 'commentId':
          return 'comment_id';
      }
    }
    return column;
  };
  const normalized = normalizeAST(ast, tableName, columnName);

  const json = JSON.stringify(normalized);
  expect(json).toMatch(/"issues"/);
  expect(json).toMatch(/"comments"/);
  expect(json).toMatch(/"users"/);
  expect(json).toMatch(/"issue_id"/);
  expect(json).toMatch(/"comment_id"/);
  expect(json).toMatch(/"user_id"/);
  expect(json).toMatch(/"owner_id"/);
  expect(json).not.toMatch(/"issue"/);
  expect(json).not.toMatch(/"comment"/);
  expect(json).not.toMatch(/"user"/);
  expect(json).not.toMatch(/"id"/);
  expect(json).not.toMatch(/"ownerId"/);
  expect(json).not.toMatch(/"commentId"/);

  expect(normalized).toMatchInlineSnapshot(`
    {
      "alias": undefined,
      "limit": undefined,
      "orderBy": [
        [
          "modified",
          "desc",
        ],
        [
          "issue_id",
          "asc",
        ],
      ],
      "related": [
        {
          "correlation": {
            "childField": [
              "user_id",
            ],
            "parentField": [
              "owner_id",
            ],
          },
          "hidden": undefined,
          "subquery": {
            "alias": "alias1",
            "limit": undefined,
            "orderBy": undefined,
            "related": undefined,
            "schema": undefined,
            "start": undefined,
            "table": "users",
            "where": undefined,
          },
          "system": "client",
        },
        {
          "correlation": {
            "childField": [
              "comment_id",
            ],
            "parentField": [
              "comment_id",
            ],
          },
          "hidden": undefined,
          "subquery": {
            "alias": "alias2",
            "limit": undefined,
            "orderBy": undefined,
            "related": undefined,
            "schema": undefined,
            "start": undefined,
            "table": "comments",
            "where": undefined,
          },
          "system": "client",
        },
      ],
      "schema": undefined,
      "start": {
        "exclusive": true,
        "row": {
          "issue_id": "123",
        },
      },
      "table": "issues",
      "where": {
        "conditions": [
          {
            "left": {
              "name": "issue_id",
              "type": "column",
            },
            "op": "=",
            "right": {
              "type": "literal",
              "value": "value",
            },
            "type": "simple",
          },
          {
            "left": {
              "name": "owner_id",
              "type": "column",
            },
            "op": "=",
            "right": {
              "type": "literal",
              "value": "value",
            },
            "type": "simple",
          },
          {
            "op": "EXISTS",
            "related": {
              "correlation": {
                "childField": [
                  "comment_id",
                ],
                "parentField": [
                  "comment_id",
                ],
              },
              "subquery": {
                "alias": "alias2",
                "limit": undefined,
                "orderBy": undefined,
                "related": undefined,
                "schema": undefined,
                "start": undefined,
                "table": "comments",
                "where": undefined,
              },
              "system": "client",
            },
            "type": "correlatedSubquery",
          },
        ],
        "type": "and",
      },
    }
  `);
});

test('protocol version', () => {
  const schemaJSON = JSON.stringify(astSchema);
  const hash = h64(schemaJSON).toString(36);

  // If this test fails because the AST schema has changed such that
  // old code will not understand the new schema, bump the
  // PROTOCOL_VERSION and update the expected values.
  expect(hash).toEqual('2zzy9s2lcdcms');
  expect(PROTOCOL_VERSION).toEqual(4);
});
