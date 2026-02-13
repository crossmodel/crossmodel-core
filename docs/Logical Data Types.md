# CrossModel Logical Data Types

This document defines the logical data types available in CrossModel for modeling entity attributes. Logical data types are technology-independent and describe **what data an attribute holds**, not how it is stored. Each logical type maps to appropriate physical types when targeting a specific database platform.

## Design Principles

- **Functional naming**: Type names describe the content, not the storage mechanism. "Text" means textual data, not "variable-length multibyte character string."
- **Properties over types**: Variations like unicode, fixed-length, or timezone are expressed as properties on a type, not as separate types. This keeps the type list small and meaningful.
- **Logical independence**: The same logical model can be mapped to any supported database. Property values guide the mapper to choose the best physical type.
- **Domain types are separate**: Business-level types like Money, Currency, Email, or PhoneNumber are handled by a separate domain system built on top of these base types.

## Overview

| # | Type | Category | Description |
|---|------|----------|-------------|
| 1 | [Text](#1-text) | String | Character/string data |
| 2 | [Binary](#2-binary) | String | Raw byte data |
| 3 | [Boolean](#3-boolean) | Numeric | True/false values |
| 4 | [Integer](#4-integer) | Numeric | Whole numbers |
| 5 | [Decimal](#5-decimal) | Numeric | Exact fixed-point numbers |
| 6 | [Float](#6-float) | Numeric | Approximate floating-point numbers |
| 7 | [Date](#7-date) | Temporal | Calendar date |
| 8 | [Time](#8-time) | Temporal | Time of day |
| 9 | [DateTime](#9-datetime) | Temporal | Combined date and time |
| 10 | [Duration](#10-duration) | Temporal | Time interval or period |
| 11 | [Guid](#11-guid) | Identity | Universally unique identifier |
| 12 | [Geometry](#12-geometry) | Spatial | Planar/Cartesian spatial data |
| 13 | [Geography](#13-geography) | Spatial | Geodetic/spherical spatial data |

## Property Applicability

Not all properties apply to all types. The following table shows which properties can be set on which types.

| Property | Text | Binary | Integer | Decimal | Float | Time | DateTime |
|----------|:----:|:------:|:-------:|:-------:|:-----:|:----:|:--------:|
| length | x | x | | | | | |
| fixedLength | x | x | | | | | |
| unicode | x | | | | | | |
| minValue | | | x | | | | |
| maxValue | | | x | | | | |
| precision | | | | x | x | | |
| scale | | | | x | | x | x |
| timezone | | | | | | x | x |

Types with no configurable properties: **Boolean**, **Date**, **Duration**, **Guid**, **Geometry**, **Geography**.

---

## Type Definitions

### 1. Text

Character/string data of any length and encoding.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| length | number | _(omit)_ | Maximum number of characters. Omit for unbounded text. |
| fixedLength | boolean | false | When true, values are padded to exactly `length` characters. |
| unicode | boolean | true | When true, supports the full Unicode character set. |

#### Modeling Examples

| Use Case | Attribute | Type | Properties |
|----------|-----------|------|------------|
| Person's name | `customerName` | Text | length: 100 |
| ISO country code | `countryCode` | Text | length: 3, fixedLength: true |
| Legacy system code | `legacyCode` | Text | length: 50, unicode: false |
| Free-form notes | `description` | Text | _(none)_ |
| Fixed-width file field | `recordType` | Text | length: 2, fixedLength: true, unicode: false |

#### Physical Type Mapping

| Properties | SQL Server | PostgreSQL | MySQL | Oracle |
|-----------|------------|------------|-------|--------|
| _(default)_ | NVARCHAR(MAX) | TEXT | LONGTEXT | CLOB |
| length: _n_ | NVARCHAR(_n_) | VARCHAR(_n_) | VARCHAR(_n_) | NVARCHAR2(_n_) |
| length: _n_, fixedLength: true | NCHAR(_n_) | CHAR(_n_) | CHAR(_n_) | NCHAR(_n_) |
| length: _n_, unicode: false | VARCHAR(_n_) | VARCHAR(_n_) | VARCHAR(_n_) | VARCHAR2(_n_) |
| length: _n_, fixedLength: true, unicode: false | CHAR(_n_) | CHAR(_n_) | CHAR(_n_) | CHAR(_n_) |
| unicode: false | VARCHAR(MAX) | TEXT | LONGTEXT | CLOB |

> **Note:** PostgreSQL stores all text as UTF-8 natively, so the `unicode` property does not affect the physical type. The mapper uses VARCHAR/CHAR regardless. Oracle recommends AL32UTF8 encoding for all new databases, making the NVARCHAR2 vs VARCHAR2 distinction primarily relevant for legacy systems.

---

### 2. Binary

Raw byte data for storing files, hashes, encrypted values, or any non-textual content.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| length | number | _(omit)_ | Maximum number of bytes. Omit for unbounded binary data. |
| fixedLength | boolean | false | When true, values are padded to exactly `length` bytes. |

#### Modeling Examples

| Use Case | Attribute | Type | Properties |
|----------|-----------|------|------------|
| SHA-256 hash | `passwordHash` | Binary | length: 32, fixedLength: true |
| Thumbnail image | `thumbnail` | Binary | length: 65536 |
| Document attachment | `content` | Binary | _(none)_ |
| Encryption IV | `initVector` | Binary | length: 16, fixedLength: true |

#### Physical Type Mapping

| Properties | SQL Server | PostgreSQL | MySQL | Oracle |
|-----------|------------|------------|-------|--------|
| _(default)_ | VARBINARY(MAX) | BYTEA | LONGBLOB | BLOB |
| length: _n_ | VARBINARY(_n_) | BYTEA | VARBINARY(_n_) | RAW(_n_) |
| length: _n_, fixedLength: true | BINARY(_n_) | BYTEA | BINARY(_n_) | RAW(_n_) |

> **Note:** PostgreSQL uses BYTEA for all binary data regardless of length or fixed-length settings. Oracle's RAW type supports up to 2000 bytes; larger values automatically map to BLOB.

---

### 3. Boolean

True/false values.

#### Properties

None.

#### Modeling Examples

| Use Case | Attribute | Type |
|----------|-----------|------|
| Active flag | `isActive` | Boolean |
| Opt-in consent | `marketingConsent` | Boolean |
| Soft delete | `isDeleted` | Boolean |

#### Physical Type Mapping

| SQL Server | PostgreSQL | MySQL | Oracle |
|------------|------------|-------|--------|
| BIT | BOOLEAN | TINYINT(1) | NUMBER(1) |

> **Note:** MySQL does not have a native BOOLEAN type; TINYINT(1) is the conventional representation. Oracle uses NUMBER(1) with a CHECK constraint for 0/1.

---

### 4. Integer

Whole numbers without a fractional component. The optional `minValue` and `maxValue` properties express the logical range of allowed values, and the physical mapper selects the smallest physical type that accommodates the range.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| minValue | number | _(omit)_ | Minimum allowed value (inclusive). |
| maxValue | number | _(omit)_ | Maximum allowed value (inclusive). |

#### Modeling Examples

| Use Case | Attribute | Type | Properties |
|----------|-----------|------|------------|
| Person's age | `age` | Integer | minValue: 0, maxValue: 150 |
| Status flag (0–255) | `statusCode` | Integer | minValue: 0, maxValue: 255 |
| Order quantity | `quantity` | Integer | minValue: 0, maxValue: 999999 |
| Generic foreign key | `customerId` | Integer | _(none — defaults to standard int)_ |
| Large counter | `eventSequence` | Integer | minValue: 0, maxValue: 9223372036854775807 |
| Temperature (negative) | `tempCelsius` | Integer | minValue: -100, maxValue: 100 |

#### Physical Type Mapping

When no properties are set, the mapper defaults to a standard signed 32-bit integer.

The mapper selects the physical type based on the range defined by `minValue` and `maxValue`:

| Range | SQL Server | PostgreSQL | MySQL | Oracle |
|-------|------------|------------|-------|--------|
| 0 to 255 | TINYINT | SMALLINT | TINYINT UNSIGNED | NUMBER(3) |
| -128 to 127 | TINYINT | SMALLINT | TINYINT | NUMBER(3) |
| -32768 to 32767 | SMALLINT | SMALLINT | SMALLINT | NUMBER(5) |
| 0 to 65535 | INT | INTEGER | SMALLINT UNSIGNED | NUMBER(5) |
| -2^31 to 2^31-1 _(default)_ | INT | INTEGER | INT | NUMBER(10) |
| 0 to 2^32-1 | BIGINT | BIGINT | INT UNSIGNED | NUMBER(10) |
| -2^63 to 2^63-1 | BIGINT | BIGINT | BIGINT | NUMBER(19) |
| 0 to 2^64-1 | NUMERIC(20) | NUMERIC(20) | BIGINT UNSIGNED | NUMBER(20) |

> **Note:** SQL Server's TINYINT is unsigned (0–255) by definition. PostgreSQL does not support unsigned integers; the mapper selects the next larger signed type. Oracle uses NUMBER(_p_) for all integer types. When `minValue` >= 0, MySQL can use UNSIGNED variants for more efficient storage.

---

### 5. Decimal

Exact fixed-point numbers for values where precision matters, such as financial calculations, measurements, or percentages.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| precision | number | _(omit)_ | Total number of significant digits (both sides of the decimal point). |
| scale | number | _(omit)_ | Number of digits to the right of the decimal point. |

**Validation rules:**
- `scale` cannot exceed `precision`.
- Both properties are optional but typically specified together.

#### Modeling Examples

| Use Case | Attribute | Type | Properties |
|----------|-----------|------|------------|
| Unit price | `unitPrice` | Decimal | precision: 10, scale: 2 |
| Tax rate | `taxRate` | Decimal | precision: 5, scale: 4 |
| Percentage | `completionPct` | Decimal | precision: 5, scale: 2 |
| Scientific measurement | `concentration` | Decimal | precision: 15, scale: 8 |
| Generic decimal | `value` | Decimal | _(none)_ |

#### Physical Type Mapping

| Properties | SQL Server | PostgreSQL | MySQL | Oracle |
|-----------|------------|------------|-------|--------|
| precision: _p_, scale: _s_ | DECIMAL(_p_,_s_) | NUMERIC(_p_,_s_) | DECIMAL(_p_,_s_) | NUMBER(_p_,_s_) |
| _(default)_ | DECIMAL(18,2) | NUMERIC | DECIMAL(10,0) | NUMBER |

> **Note:** The default precision and scale when omitted are database-specific. PostgreSQL's NUMERIC without parameters allows arbitrary precision. Oracle's NUMBER without parameters is also arbitrary precision.

---

### 6. Float

Approximate floating-point numbers following IEEE 754 representation. Use this for scientific data, sensor readings, or calculations where exact decimal representation is not required. For financial or precision-critical data, use [Decimal](#5-decimal) instead.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| precision | number | _(omit)_ | Approximate number of significant decimal digits. |

#### Modeling Examples

| Use Case | Attribute | Type | Properties |
|----------|-----------|------|------------|
| Sensor reading | `temperature` | Float | _(none)_ |
| Low-precision ratio | `compressionRatio` | Float | precision: 7 |
| High-precision scientific | `wavelength` | Float | precision: 15 |

#### Physical Type Mapping

| Properties | SQL Server | PostgreSQL | MySQL | Oracle |
|-----------|------------|------------|-------|--------|
| _(default)_ or precision > 7 | FLOAT(53) | DOUBLE PRECISION | DOUBLE | BINARY_DOUBLE |
| precision <= 7 | REAL | REAL | FLOAT | BINARY_FLOAT |

> **Note:** SQL Server's FLOAT(_n_) parameter is in bits (1–53), not decimal digits. The mapper converts: <= 7 decimal digits ≈ 24 bits (REAL), > 7 decimal digits ≈ 53 bits (DOUBLE PRECISION). Oracle's BINARY_FLOAT/BINARY_DOUBLE are the IEEE 754 types; the legacy FLOAT type is actually an alias for NUMBER.

---

### 7. Date

A calendar date consisting of year, month, and day, without any time component.

#### Properties

None.

#### Modeling Examples

| Use Case | Attribute | Type |
|----------|-----------|------|
| Date of birth | `birthDate` | Date |
| Invoice date | `invoiceDate` | Date |
| Contract start | `startDate` | Date |

#### Physical Type Mapping

| SQL Server | PostgreSQL | MySQL | Oracle |
|------------|------------|-------|--------|
| DATE | DATE | DATE | DATE |

> **Note:** Oracle's DATE type actually includes a time component (to the second). When mapping a logical Date to Oracle, the mapper should use DATE with a convention that the time portion is midnight (00:00:00), or consider using a CHECK constraint to enforce date-only semantics.

---

### 8. Time

A time of day consisting of hours, minutes, and seconds, optionally with fractional seconds and timezone information.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| scale | number | _(omit)_ | Number of fractional second digits (0–9). |
| timezone | boolean | false | When true, the value includes a timezone offset. |

#### Modeling Examples

| Use Case | Attribute | Type | Properties |
|----------|-----------|------|------------|
| Store opening time | `opensAt` | Time | _(none)_ |
| Precise lap time | `lapTime` | Time | scale: 3 |
| Flight departure | `departureTime` | Time | timezone: true |
| High-precision event | `triggerTime` | Time | scale: 6, timezone: true |

#### Physical Type Mapping

| Properties | SQL Server | PostgreSQL | MySQL | Oracle |
|-----------|------------|------------|-------|--------|
| _(default)_ | TIME | TIME | TIME | INTERVAL DAY TO SECOND |
| scale: _s_ | TIME(_s_) | TIME(_s_) | TIME(_s_) | INTERVAL DAY(0) TO SECOND(_s_) |
| timezone: true | DATETIMEOFFSET | TIME WITH TIME ZONE | TIME | TIMESTAMP WITH TIME ZONE |
| scale: _s_, timezone: true | DATETIMEOFFSET(_s_) | TIME(_s_) WITH TIME ZONE | TIME(_s_) | TIMESTAMP(_s_) WITH TIME ZONE |

> **Note:** SQL Server does not have a TIME WITH TIME ZONE type; DATETIMEOFFSET (which includes the date) is the closest equivalent. MySQL does not support timezone-aware time types natively. Oracle does not have a dedicated TIME type; INTERVAL DAY TO SECOND or TIMESTAMP is used depending on context.

---

### 9. DateTime

A combined date and time value, optionally with fractional seconds and timezone information. This is the most commonly used temporal type for recording when events occur.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| scale | number | _(omit)_ | Number of fractional second digits (0–9). |
| timezone | boolean | false | When true, the value includes a timezone offset. |

#### Modeling Examples

| Use Case | Attribute | Type | Properties |
|----------|-----------|------|------------|
| Record creation | `createdAt` | DateTime | timezone: true |
| Appointment | `appointmentDate` | DateTime | _(none)_ |
| Audit timestamp | `modifiedAt` | DateTime | scale: 6, timezone: true |
| Scheduled event | `scheduledFor` | DateTime | scale: 3 |

#### Physical Type Mapping

| Properties | SQL Server | PostgreSQL | MySQL | Oracle |
|-----------|------------|------------|-------|--------|
| _(default)_ | DATETIME2 | TIMESTAMP | DATETIME | TIMESTAMP |
| scale: _s_ | DATETIME2(_s_) | TIMESTAMP(_s_) | DATETIME(_s_) | TIMESTAMP(_s_) |
| timezone: true | DATETIMEOFFSET | TIMESTAMPTZ | DATETIME | TIMESTAMP WITH TIME ZONE |
| scale: _s_, timezone: true | DATETIMEOFFSET(_s_) | TIMESTAMPTZ(_s_) | DATETIME(_s_) | TIMESTAMP(_s_) WITH TIME ZONE |

> **Note:** MySQL does not have a timezone-aware datetime type. It stores values in UTC and converts based on the session timezone, but does not preserve the original offset. PostgreSQL's TIMESTAMPTZ internally stores UTC and converts on retrieval. SQL Server's DATETIMEOFFSET preserves the original offset. Oracle's TIMESTAMP WITH TIME ZONE preserves the timezone region or offset.

---

### 10. Duration

A time interval representing a span of time, such as "3 months", "14 days", or "2 hours 30 minutes". Used for expressing differences between points in time, validity periods, or elapsed time.

#### Properties

None.

#### Modeling Examples

| Use Case | Attribute | Type |
|----------|-----------|------|
| Contract length | `contractPeriod` | Duration |
| Elapsed processing time | `processingTime` | Duration |
| Warranty period | `warrantyPeriod` | Duration |
| Maximum session length | `sessionTimeout` | Duration |

#### Physical Type Mapping

| SQL Server | PostgreSQL | MySQL | Oracle |
|------------|------------|-------|--------|
| INT _(seconds)_ | INTERVAL | INT _(seconds)_ | INTERVAL DAY TO SECOND |

> **Note:** Only PostgreSQL has a fully flexible INTERVAL type that can represent months, days, hours, minutes, and seconds in a single value. Oracle splits intervals into INTERVAL YEAR TO MONTH and INTERVAL DAY TO SECOND (because months have variable lengths). SQL Server and MySQL have no native interval type; the mapper stores the value as an integer number of seconds or uses application-level representation. Consider modeling very different kinds of durations (calendar periods vs. elapsed time) as separate attributes.

---

### 11. Guid

A universally unique identifier (UUID/GUID), a 128-bit value used for globally unique identification of records across systems without coordination.

#### Properties

None.

#### Modeling Examples

| Use Case | Attribute | Type |
|----------|-----------|------|
| Correlation ID | `correlationId` | Guid |
| External reference | `externalRef` | Guid |
| API key | `apiKeyId` | Guid |

#### Physical Type Mapping

| SQL Server | PostgreSQL | MySQL | Oracle |
|------------|------------|-------|--------|
| UNIQUEIDENTIFIER | UUID | CHAR(36) | RAW(16) |

> **Note:** Only SQL Server and PostgreSQL have native UUID types. MySQL stores UUIDs as CHAR(36) string representation or BINARY(16) for compact storage. Oracle uses RAW(16) for the binary representation.

---

### 12. Geometry

Spatial data in a planar (Cartesian) coordinate system. Use Geometry for projected coordinate systems, building floor plans, engineering drawings, or any spatial data that uses flat-earth mathematics. Distances and areas are calculated using Euclidean geometry.

#### Properties

None at the logical level. The coordinate reference system (SRID) and specific geometry subtype (Point, Line, Polygon) are physical-level concerns configured during mapping.

#### Modeling Examples

| Use Case | Attribute | Type |
|----------|-----------|------|
| Building footprint | `buildingOutline` | Geometry |
| Floor plan element | `roomShape` | Geometry |
| CAD drawing element | `componentBounds` | Geometry |
| Parcel boundary | `parcelBoundary` | Geometry |

#### Physical Type Mapping

| SQL Server | PostgreSQL + PostGIS | MySQL | Oracle |
|------------|---------------------|-------|--------|
| geometry | geometry | GEOMETRY | SDO_GEOMETRY |

> **Note:** Requires PostGIS extension on PostgreSQL. Oracle uses SDO_GEOMETRY for both planar and geodetic data, differentiated by SRID. Specific subtypes (POINT, LINESTRING, POLYGON, etc.) can be constrained at the physical level.

---

### 13. Geography

Spatial data in a geodetic (spherical) coordinate system using latitude and longitude on the Earth's surface. Use Geography for GPS coordinates, store locations, delivery routes, or any data that requires accurate distance calculations over the Earth's curved surface. Distances are calculated using great-circle mathematics and returned in meters.

#### Properties

None at the logical level. The coordinate reference system (typically WGS 84 / SRID 4326) is configured during physical mapping.

#### Modeling Examples

| Use Case | Attribute | Type |
|----------|-----------|------|
| Store location | `storeLocation` | Geography |
| Delivery route | `deliveryPath` | Geography |
| Service coverage area | `coverageArea` | Geography |
| Point of interest | `poiPosition` | Geography |

#### Physical Type Mapping

| SQL Server | PostgreSQL + PostGIS | MySQL | Oracle |
|------------|---------------------|-------|--------|
| geography | geography | GEOMETRY _(SRID 4326)_ | SDO_GEOMETRY _(SRID 4326)_ |

> **Note:** MySQL does not have a dedicated geography type; spatial functions determine whether calculations use planar or spherical math based on the SRID. Oracle uses SDO_GEOMETRY with SRID 4326 for geodetic data. PostGIS and SQL Server have dedicated geography types that enforce spherical calculations.

---

## Appendix A: Complete Physical Type Mapping Reference

### SQL Server

| Logical Type | Properties | Physical Type |
|-------------|------------|---------------|
| Text | | NVARCHAR(MAX) |
| Text | length: _n_ | NVARCHAR(_n_) |
| Text | length: _n_, fixedLength | NCHAR(_n_) |
| Text | length: _n_, !unicode | VARCHAR(_n_) |
| Text | length: _n_, fixedLength, !unicode | CHAR(_n_) |
| Text | !unicode | VARCHAR(MAX) |
| Binary | | VARBINARY(MAX) |
| Binary | length: _n_ | VARBINARY(_n_) |
| Binary | length: _n_, fixedLength | BINARY(_n_) |
| Boolean | | BIT |
| Integer | | INT |
| Integer | 0 to 255 | TINYINT |
| Integer | -32768 to 32767 | SMALLINT |
| Integer | -2^31 to 2^31-1 | INT |
| Integer | larger ranges | BIGINT |
| Decimal | precision: _p_, scale: _s_ | DECIMAL(_p_,_s_) |
| Float | | FLOAT(53) |
| Float | precision <= 7 | REAL |
| Date | | DATE |
| Time | | TIME |
| Time | scale: _s_ | TIME(_s_) |
| Time | timezone | DATETIMEOFFSET |
| DateTime | | DATETIME2 |
| DateTime | scale: _s_ | DATETIME2(_s_) |
| DateTime | timezone | DATETIMEOFFSET |
| DateTime | scale: _s_, timezone | DATETIMEOFFSET(_s_) |
| Duration | | INT |
| Guid | | UNIQUEIDENTIFIER |
| Geometry | | geometry |
| Geography | | geography |

### PostgreSQL

| Logical Type | Properties | Physical Type |
|-------------|------------|---------------|
| Text | | TEXT |
| Text | length: _n_ | VARCHAR(_n_) |
| Text | length: _n_, fixedLength | CHAR(_n_) |
| Binary | | BYTEA |
| Binary | length: _n_ | BYTEA |
| Binary | length: _n_, fixedLength | BYTEA |
| Boolean | | BOOLEAN |
| Integer | | INTEGER |
| Integer | -32768 to 32767 | SMALLINT |
| Integer | -2^31 to 2^31-1 | INTEGER |
| Integer | larger ranges | BIGINT |
| Decimal | precision: _p_, scale: _s_ | NUMERIC(_p_,_s_) |
| Float | | DOUBLE PRECISION |
| Float | precision <= 7 | REAL |
| Date | | DATE |
| Time | | TIME |
| Time | scale: _s_ | TIME(_s_) |
| Time | timezone | TIME WITH TIME ZONE |
| DateTime | | TIMESTAMP |
| DateTime | scale: _s_ | TIMESTAMP(_s_) |
| DateTime | timezone | TIMESTAMPTZ |
| DateTime | scale: _s_, timezone | TIMESTAMPTZ(_s_) |
| Duration | | INTERVAL |
| Guid | | UUID |
| Geometry | | geometry |
| Geography | | geography |

> PostgreSQL uses UTF-8 natively; the `unicode` property has no effect on type selection. BYTEA is used for all binary data regardless of length/fixedLength properties.

### MySQL

| Logical Type | Properties | Physical Type |
|-------------|------------|---------------|
| Text | | LONGTEXT |
| Text | length: _n_ | VARCHAR(_n_) |
| Text | length: _n_, fixedLength | CHAR(_n_) |
| Binary | | LONGBLOB |
| Binary | length: _n_ | VARBINARY(_n_) |
| Binary | length: _n_, fixedLength | BINARY(_n_) |
| Boolean | | TINYINT(1) |
| Integer | | INT |
| Integer | 0 to 255 | TINYINT UNSIGNED |
| Integer | -128 to 127 | TINYINT |
| Integer | -32768 to 32767 | SMALLINT |
| Integer | 0 to 65535 | SMALLINT UNSIGNED |
| Integer | -2^31 to 2^31-1 | INT |
| Integer | 0 to 2^32-1 | INT UNSIGNED |
| Integer | -2^63 to 2^63-1 | BIGINT |
| Integer | 0 to 2^64-1 | BIGINT UNSIGNED |
| Decimal | precision: _p_, scale: _s_ | DECIMAL(_p_,_s_) |
| Float | | DOUBLE |
| Float | precision <= 7 | FLOAT |
| Date | | DATE |
| Time | | TIME |
| Time | scale: _s_ | TIME(_s_) |
| DateTime | | DATETIME |
| DateTime | scale: _s_ | DATETIME(_s_) |
| Duration | | INT |
| Guid | | CHAR(36) |
| Geometry | | GEOMETRY |
| Geography | | GEOMETRY |

> MySQL does not support timezone-aware temporal types or unsigned PostgreSQL-style integers. For unicode, MySQL defaults to utf8mb4 charset in modern versions; the `unicode` flag controls the column character set when non-default encoding is needed.

### Oracle

| Logical Type | Properties | Physical Type |
|-------------|------------|---------------|
| Text | | CLOB |
| Text | length: _n_ | NVARCHAR2(_n_) |
| Text | length: _n_, fixedLength | NCHAR(_n_) |
| Text | length: _n_, !unicode | VARCHAR2(_n_) |
| Text | length: _n_, fixedLength, !unicode | CHAR(_n_) |
| Binary | | BLOB |
| Binary | length: _n_ | RAW(_n_) |
| Binary | length: _n_, fixedLength | RAW(_n_) |
| Boolean | | NUMBER(1) |
| Integer | | NUMBER(10) |
| Integer | 0 to 255 | NUMBER(3) |
| Integer | -32768 to 32767 | NUMBER(5) |
| Integer | -2^31 to 2^31-1 | NUMBER(10) |
| Integer | larger ranges | NUMBER(19) |
| Decimal | precision: _p_, scale: _s_ | NUMBER(_p_,_s_) |
| Float | | BINARY_DOUBLE |
| Float | precision <= 7 | BINARY_FLOAT |
| Date | | DATE |
| Time | | INTERVAL DAY(0) TO SECOND |
| Time | scale: _s_ | INTERVAL DAY(0) TO SECOND(_s_) |
| Time | timezone | TIMESTAMP WITH TIME ZONE |
| DateTime | | TIMESTAMP |
| DateTime | scale: _s_ | TIMESTAMP(_s_) |
| DateTime | timezone | TIMESTAMP WITH TIME ZONE |
| DateTime | scale: _s_, timezone | TIMESTAMP(_s_) WITH TIME ZONE |
| Duration | | INTERVAL DAY TO SECOND |
| Guid | | RAW(16) |
| Geometry | | SDO_GEOMETRY |
| Geography | | SDO_GEOMETRY |

> Oracle does not have native TIME or BOOLEAN types. Oracle's DATE includes a time component; for date-only semantics, a convention of midnight time is used. RAW supports up to 2000 bytes; larger binary data maps to BLOB. Oracle's NVARCHAR2 supports up to 4000 bytes (2000 characters in AL16UTF16).

---

## Appendix B: Validation Rules

The following validation rules are enforced when properties are set on logical types:

1. **length** can only be set on Text or Binary.
2. **fixedLength** can only be set on Text or Binary, and requires `length` to also be set.
3. **unicode** can only be set on Text.
4. **minValue** and **maxValue** can only be set on Integer.
5. **maxValue** must be greater than or equal to **minValue** when both are set.
6. **precision** can only be set on Decimal or Float.
7. **scale** can only be set on Decimal, Time, or DateTime.
8. **scale** cannot exceed **precision** on Decimal.
9. **timezone** can only be set on Time or DateTime.

---

## Appendix C: Migration from Previous Type System

The following table shows how the previous logical types and properties map to the new system:

| Previous | New | Notes |
|----------|-----|-------|
| Text | Text | Unchanged. New properties: `fixedLength`, `unicode`. |
| Boolean | Boolean | Unchanged. |
| Integer | Integer | `precision` replaced by `minValue` / `maxValue`. |
| Decimal | Decimal | Unchanged. |
| _(new)_ | Float | New type for approximate numerics. |
| Date | Date | Unchanged. |
| Time | Time | New properties: `timezone`. `scale` replaces previous `precision` usage on Time. |
| DateTime | DateTime | New properties: `timezone`. `scale` replaces previous `precision` usage on DateTime. |
| _(new)_ | Duration | New type for time intervals. |
| Guid | Guid | Unchanged. |
| Binary | Binary | New property: `fixedLength`. |
| Location | Geometry | Renamed. For planar/Cartesian spatial data. |
| _(new)_ | Geography | New type for geodetic spatial data. Split from Location. |
