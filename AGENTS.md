# Working on kashe

## Finding your way in the code

Ask before you grep: `yarn variance ask uses --name <name>` lists who imports a
name, `ask symbol --name <name>` prints what it is and where it is declared, and
`ask search --query <words>` finds a name by what it does. The
`variance-authority` skill has the rest.

## Testing an edit

`yarn jest` records which test ran which code. After an edit, run only the tests
that reached it:

```bash
VARIANCE_AUTHORITY_SINCE= yarn jest --passWithNoTests
```

Read `selected N of M` on stderr before the next edit. Without
`--passWithNoTests`, a selection of none exits 1.
