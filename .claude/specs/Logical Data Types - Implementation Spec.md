# Logical Data Types - Implementation Spec

Reference spec for implementing the type system defined in `docs/Logical Data Types.md`. Read that document for the full design including physical type mappings.

## Types

13 logical data types, grouped by category:

| Type | Category | Properties |
|------|----------|------------|
| Text | String | length, fixedLength, unicode |
| Binary | String | length, fixedLength |
| Boolean | Numeric | _(none)_ |
| Integer | Numeric | minValue, maxValue |
| Decimal | Numeric | precision, scale |
| Float | Numeric | precision |
| Date | Temporal | _(none)_ |
| Time | Temporal | scale, timezone |
| DateTime | Temporal | scale, timezone |
| Duration | Temporal | unit |
| UUID | Identity | _(none)_ |
| Geometry | Spatial | _(none)_ |
| Geography | Spatial | _(none)_ |

**New types**: Float, Duration, Geography.
**Renamed**: Guid -> UUID, Location -> Geometry.

## Properties

| Property | Value type | Applicable to | Notes |
|----------|-----------|---------------|-------|
| length | number | Text, Binary | Max characters/bytes. Omit for unbounded. |
| fixedLength | boolean | Text, Binary | Requires `length` to also be set. |
| unicode | boolean | Text | Default true. Full Unicode character set support. |
| minValue | number | Integer | Inclusive minimum. Replaces old `precision` on Integer. |
| maxValue | number | Integer | Inclusive maximum. Must be >= minValue. |
| precision | number | Decimal, Float | Total significant digits (Decimal) or approximate digits (Float). No longer applies to Integer. |
| scale | number | Decimal, Time, DateTime | Digits after decimal point (Decimal) or fractional seconds 0-9 (Time/DateTime). |
| timezone | boolean | Time, DateTime | Include timezone offset in value. |
| unit | string enum | Duration | One of: `milliseconds`, `seconds` (default), `minutes`, `hours`, `days`, `months`, `years`. |

## Validation Rules

1. `length` only on Text or Binary.
2. `fixedLength` only on Text or Binary; requires `length` to be set.
3. `unicode` only on Text.
4. `minValue` and `maxValue` only on Integer.
5. `maxValue` >= `minValue` when both set.
6. `precision` only on Decimal or Float.
7. `scale` only on Decimal, Time, or DateTime.
8. `scale` <= `precision` only enforced on Decimal (not Time/DateTime where scale is fractional seconds).
9. `timezone` only on Time or DateTime.
10. `unit` only on Duration; must be one of the 7 valid values listed above.

Optional: warn (not error) on unrecognized datatype values to help users migrate from old types like Guid or Location.

## What to Change

### Langium Grammar

The `LogicalAttribute` interface and parser rule in `entity.langium` need 6 new properties added: `fixedLength` (boolean), `unicode` (boolean), `minValue` (number), `maxValue` (number), `timezone` (boolean), `unit` (string). Boolean properties follow the same `keyword?='keyword' ':' ('TRUE' | 'true')` pattern as `mandatory`. After grammar changes, regenerate AST with `yarn langium:generate`.

### Protocol Types

The `AbstractLogicalAttribute` interface in `protocol.ts` needs the same 6 new optional properties so the RPC layer can transport them between server and UI.

### Validator

The `checkLogicalAttribute` method in the validator needs to implement all 10 validation rules above. Key changes from the current validator:
- `precision` no longer valid on Integer (now valid on Float instead)
- Scale-precision cross-check only applies to Decimal
- 6 new property checks added

### Serialization

The property order map for `LogicalAttribute` in `serialization-util.ts` needs the 6 new properties inserted in the order they appear in the grammar. The `unit` property should be added to the unquoted properties set (enum-like value, serialized without quotes).

### React UI (Entity Attributes Grid)

1. **Datatype dropdown**: Replace the 10-type list with the 13 new types. Remove Guid and Location; add Float, Duration, UUID, Geometry, Geography.
2. **Applicability functions**: Update `isPrecisionApplicable` to return true for Decimal and Float (not Integer). Add new functions: `isFixedLengthApplicable` (Text, Binary), `isUnicodeApplicable` (Text), `isMinValueApplicable` (Integer), `isMaxValueApplicable` (Integer), `isTimezoneApplicable` (Time, DateTime), `isUnitApplicable` (Duration).
3. **Grid columns**: Add columns for the 6 new properties. Boolean properties (fixedLength, unicode, timezone) use checkbox editors. Numeric properties (minValue, maxValue) use number editors. The `unit` property uses a dropdown with the 7 valid values. All new columns should dim (opacity 0.4) when not applicable and disable editing.
4. **Datatype change handler**: When the user changes the datatype, clear any property values that are no longer applicable for the new type. This logic already exists for length/precision/scale and must be extended to all new properties.

### E2E Test Constants

The `LogicalAttributeDatatype` object in the E2E test page objects needs updated to match the 13 types. References to `Guid` and `Location` in tests must be updated.

### Tests

- Unit tests for applicability functions: update precision tests (Integer->Float), add tests for all new functions.
- Validation tests: add test cases covering all 10 rules, especially the new ones (fixedLength requires length, maxValue >= minValue, unit enum validation).

## Migration from Old Types

| Old | New | Notes |
|-----|-----|-------|
| Guid | UUID | Rename in `.cm` files |
| Location | Geometry or Geography | Decide per-attribute based on usage |
| precision on Integer | minValue/maxValue | Remove precision; optionally convert based on old value |

Since `datatype` is a free-form string, old files will still parse. The optional "unknown datatype" warning helps users discover and fix stale values.
