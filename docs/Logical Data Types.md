# CrossModel Logical Data Types

This document defines the logical data types available in CrossModel for modeling entity attributes. Logical data types are technology-independent and describe **what data an attribute holds**, not how it is stored. Each logical type maps to appropriate physical types when targeting a specific database platform.

## Design Principles

- **Functional naming**: Type names describe the content, not the storage mechanism. "Text" means textual data, not "variable-length multibyte character string."
- **Properties over types**: Variations like unicode, fixed-length, or timezone are expressed as properties on a type, not as separate types. This keeps the type list small and meaningful.
- **Logical independence**: The same logical model can be mapped to any supported database. Property values guide the mapper to choose the best physical type.
- **Domain types are separate**: Business-level types like Money, Currency, Duration, Email, or PhoneNumber are handled by a separate domain system built on top of these base types.

## Supported Platforms

Physical type mappings are provided for ten platforms in the following order:

| Platform | Engine | Notes |
|----------|--------|-------|
| **Snowflake** | Cloud-native SQL | All text UTF-8; all integers NUMBER(38,0) internally |
| **Databricks** | Spark / Delta Lake | No TIME type; VARCHAR/CHAR are metadata constraints on STRING |
| **Fabric** | Synapse SQL (Data Warehouse) | UTF-8 only; no TINYINT, DATETIMEOFFSET, or spatial column types |
| **SQL Server** | Microsoft SQL Server | Full type system with NVARCHAR, DATETIMEOFFSET, spatial types |
| **Oracle** | Oracle Database | NUMBER for all numerics; DATE includes time; no native TIME |
| **PostgreSQL** | PostgreSQL (+ PostGIS) | Native UUID, INTERVAL, BOOLEAN; always UTF-8 |
| **MySQL** | MySQL / MariaDB | UNSIGNED variants; no native BOOLEAN; no timezone-aware types |
| **MongoDB** | Document database (BSON) | 5 BSON types for numerics; `date` is always UTC datetime; native GeoJSON |
| **Python** | Python 3 standard library | `int` is arbitrary precision; `float` is always 64-bit; `datetime` module for temporal |
| **Java** | Java SE (java.time, java.math) | Primitives for small types; `BigDecimal`/`BigInteger` for precision; `java.time` for temporal |

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
| 10 | [Guid](#10-guid) | Identity | Universally unique identifier |
| 11 | [Geometry](#11-geometry) | Spatial | Planar/Cartesian spatial data |
| 12 | [Geography](#12-geography) | Spatial | Geodetic/spherical spatial data |

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

Types with no configurable properties: **Boolean**, **Date**, **Guid**, **Geometry**, **Geography**.

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

| Properties | Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-----------|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| _(default)_ | VARCHAR | STRING | VARCHAR(MAX) | NVARCHAR(MAX) | CLOB | TEXT | LONGTEXT | string | str | String |
| length: _n_ | VARCHAR(_n_) | STRING | VARCHAR(_n_) | NVARCHAR(_n_) | NVARCHAR2(_n_) | VARCHAR(_n_) | VARCHAR(_n_) | string | str | String |
| length: _n_, fixedLength | VARCHAR(_n_) | STRING | CHAR(_n_) | NCHAR(_n_) | NCHAR(_n_) | CHAR(_n_) | CHAR(_n_) | string | str | String |
| length: _n_, !unicode | VARCHAR(_n_) | STRING | VARCHAR(_n_) | VARCHAR(_n_) | VARCHAR2(_n_) | VARCHAR(_n_) | VARCHAR(_n_) | string | str | String |
| length: _n_, fixedLength, !unicode | VARCHAR(_n_) | STRING | CHAR(_n_) | CHAR(_n_) | CHAR(_n_) | CHAR(_n_) | CHAR(_n_) | string | str | String |
| !unicode | VARCHAR | STRING | VARCHAR(MAX) | VARCHAR(MAX) | CLOB | TEXT | LONGTEXT | string | str | String |

> **Platform notes:**
>
> - **Snowflake** stores all text as UTF-8 natively. VARCHAR is used for all text regardless of `unicode` or `fixedLength` properties — CHAR exists as an alias but does not pad.
> - **Databricks** uses STRING for all text. VARCHAR(_n_) and CHAR(_n_) exist as metadata constraints on STRING but are not distinct physical types.
> - **Fabric** uses UTF-8 collation for all text; NVARCHAR/NCHAR are not supported. VARCHAR(MAX) is limited to 16 MB per cell.
> - **PostgreSQL** stores all text as UTF-8 natively, so the `unicode` property does not affect the physical type.
> - **Oracle** recommends AL32UTF8 encoding for all new databases, making the NVARCHAR2 vs VARCHAR2 distinction primarily relevant for legacy systems.
> - **MongoDB** stores all strings as UTF-8. Length, fixedLength, and unicode properties have no effect on the BSON type — enforce via application validation or JSON Schema.
> - **Python** `str` is always Unicode (UTF-8 internally in CPython). Length and encoding constraints are enforced at the application level.
> - **Java** `String` is always Unicode (UTF-16 internally). Length and encoding constraints are enforced at the application level.

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

| Properties | Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-----------|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| _(default)_ | BINARY | BINARY | VARBINARY(MAX) | VARBINARY(MAX) | BLOB | BYTEA | LONGBLOB | binData | bytes | byte[] |
| length: _n_ | BINARY(_n_) | BINARY | VARBINARY(_n_) | VARBINARY(_n_) | RAW(_n_) | BYTEA | VARBINARY(_n_) | binData | bytes | byte[] |
| length: _n_, fixedLength | BINARY(_n_) | BINARY | VARBINARY(_n_) | BINARY(_n_) | RAW(_n_) | BYTEA | BINARY(_n_) | binData | bytes | byte[] |

> **Platform notes:**
>
> - **Snowflake** BINARY and VARBINARY are synonymous — there is no fixed-length distinction and no padding.
> - **Databricks** uses BINARY for all binary data without length constraints.
> - **Fabric** does not support fixed-length BINARY; use VARBINARY. VARBINARY(MAX) is limited to 16 MB per cell.
> - **PostgreSQL** uses BYTEA for all binary data regardless of length or fixed-length settings.
> - **Oracle** RAW supports up to 2000 bytes; larger values automatically map to BLOB.
> - **MongoDB** `binData` (BSON binary) stores raw bytes with a subtype byte. Length constraints are enforced via JSON Schema validation.
> - **Python** `bytes` is immutable; use `bytearray` if mutability is needed. Length is enforced at the application level.
> - **Java** `byte[]` is the standard representation. Length is enforced at the application level.

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

| Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| BOOLEAN | BOOLEAN | BIT | BIT | NUMBER(1) | BOOLEAN | TINYINT(1) | bool | bool | boolean |

> **Platform notes:**
>
> - **Snowflake** and **PostgreSQL** have native BOOLEAN with ternary logic (TRUE, FALSE, NULL).
> - **MySQL** does not have a native BOOLEAN type; TINYINT(1) is the conventional representation.
> - **Oracle** uses NUMBER(1) with a CHECK constraint for 0/1.
> - **Fabric** and **SQL Server** use BIT.
> - **MongoDB** has a native `bool` BSON type.
> - **Java** uses the primitive `boolean` (or boxed `Boolean` for nullable).

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
| Status flag (0-255) | `statusCode` | Integer | minValue: 0, maxValue: 255 |
| Order quantity | `quantity` | Integer | minValue: 0, maxValue: 999999 |
| Generic foreign key | `customerId` | Integer | _(none — defaults to standard int)_ |
| Large counter | `eventSequence` | Integer | minValue: 0, maxValue: 9223372036854775807 |
| Temperature (negative) | `tempCelsius` | Integer | minValue: -100, maxValue: 100 |

#### Physical Type Mapping

When no properties are set, the mapper defaults to a standard signed 32-bit integer.

The mapper selects the physical type based on the range defined by `minValue` and `maxValue`:

| Range | Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-------|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| 0 to 255 | NUMBER(3) | TINYINT | SMALLINT | TINYINT | NUMBER(3) | SMALLINT | TINYINT UNSIGNED | int | int | short |
| -128 to 127 | NUMBER(3) | TINYINT | SMALLINT | TINYINT | NUMBER(3) | SMALLINT | TINYINT | int | int | byte |
| -32768 to 32767 | NUMBER(5) | SMALLINT | SMALLINT | SMALLINT | NUMBER(5) | SMALLINT | SMALLINT | int | int | short |
| 0 to 65535 | NUMBER(5) | INT | INT | INT | NUMBER(5) | INTEGER | SMALLINT UNSIGNED | int | int | int |
| -2^31 to 2^31-1 _(default)_ | NUMBER(10) | INT | INT | INT | NUMBER(10) | INTEGER | INT | int | int | int |
| 0 to 2^32-1 | NUMBER(10) | BIGINT | BIGINT | BIGINT | NUMBER(10) | BIGINT | INT UNSIGNED | long | int | long |
| -2^63 to 2^63-1 | NUMBER(19) | BIGINT | BIGINT | BIGINT | NUMBER(19) | BIGINT | BIGINT | long | int | long |
| 0 to 2^64-1 | NUMBER(20) | DECIMAL(20) | NUMERIC(20) | NUMERIC(20) | NUMBER(20) | NUMERIC(20) | BIGINT UNSIGNED | decimal | int | BigInteger |

> **Platform notes:**
>
> - **Snowflake** stores all integers as NUMBER(38,0) internally — the precision shown here is a logical hint; storage is optimized automatically based on actual values.
> - **Databricks** has TINYINT (-128 to 127), SMALLINT, INT, BIGINT — all signed only, no unsigned variants.
> - **Fabric** does not support TINYINT; the smallest integer type is SMALLINT.
> - **SQL Server** TINYINT is unsigned (0-255) by definition.
> - **PostgreSQL** does not support unsigned integers; the mapper selects the next larger signed type.
> - **Oracle** uses NUMBER(_p_) for all integer types.
> - **MySQL** supports UNSIGNED variants for more efficient storage when `minValue` >= 0.
> - **MongoDB** `int` is 32-bit signed, `long` is 64-bit signed. For ranges exceeding 64-bit signed, use `decimal` (Decimal128).
> - **Python** `int` has arbitrary precision — no subtypes needed regardless of range.
> - **Java** uses the smallest primitive that fits: `byte` (8-bit signed), `short` (16-bit signed), `int` (32-bit signed), `long` (64-bit signed), or `BigInteger` for arbitrary precision. Use boxed types (`Byte`, `Short`, `Integer`, `Long`) for nullable.

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

| Properties | Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-----------|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| precision: _p_, scale: _s_ | NUMBER(_p_,_s_) | DECIMAL(_p_,_s_) | DECIMAL(_p_,_s_) | DECIMAL(_p_,_s_) | NUMBER(_p_,_s_) | NUMERIC(_p_,_s_) | DECIMAL(_p_,_s_) | decimal | Decimal | BigDecimal |
| _(default)_ | NUMBER(38,0) | DECIMAL(10,0) | DECIMAL(18,0) | DECIMAL(18,2) | NUMBER | NUMERIC | DECIMAL(10,0) | decimal | Decimal | BigDecimal |

> **Platform notes:**
>
> - All platforms support up to 38 digits of precision.
> - **Snowflake** uses NUMBER for both integer and decimal types; storage is optimized automatically.
> - **PostgreSQL** NUMERIC without parameters allows arbitrary precision.
> - **Oracle** NUMBER without parameters is also arbitrary precision.
> - Default precision and scale when omitted are database-specific — specify both for portable models.
> - **MongoDB** `decimal` (Decimal128) provides 34 significant digits of precision, matching IEEE 754-2008.
> - **Python** `decimal.Decimal` supports arbitrary precision with configurable context.
> - **Java** `BigDecimal` supports arbitrary precision. Precision and scale are set via the constructor or `setScale()` method.

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

| Properties | Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-----------|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| _(default)_ or precision > 7 | FLOAT | DOUBLE | FLOAT | FLOAT(53) | BINARY_DOUBLE | DOUBLE PRECISION | DOUBLE | double | float | double |
| precision <= 7 | FLOAT | FLOAT | REAL | REAL | BINARY_FLOAT | REAL | FLOAT | double | float | float |

> **Platform notes:**
>
> - **Snowflake** FLOAT is always 64-bit double precision — FLOAT, DOUBLE, and REAL are all synonymous. The precision property has no effect on the physical type.
> - **Databricks** has distinct FLOAT (32-bit single precision) and DOUBLE (64-bit double precision) types.
> - **SQL Server** FLOAT(_n_) parameter is in bits (1-53), not decimal digits. The mapper converts: <= 7 decimal digits = 24 bits (REAL), > 7 decimal digits = 53 bits.
> - **Oracle** BINARY_FLOAT/BINARY_DOUBLE are the IEEE 754 types; the legacy FLOAT type is an alias for NUMBER.
> - **MongoDB** `double` is always 64-bit IEEE 754. There is no single-precision BSON type.
> - **Python** `float` is always 64-bit double precision (IEEE 754). There is no single-precision variant.
> - **Java** has distinct `float` (32-bit) and `double` (64-bit) primitives. Use boxed `Float`/`Double` for nullable.

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

| Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| DATE | DATE | DATE | DATE | DATE | DATE | DATE | date | datetime.date | LocalDate |

> **Platform notes:**
>
> - **Oracle** DATE actually includes a time component (to the second). When mapping a logical Date to Oracle, the mapper should use DATE with a convention that the time portion is midnight (00:00:00).
> - **MongoDB** `date` is always a UTC datetime with millisecond precision. For date-only semantics, store with time set to midnight UTC (00:00:00.000Z).
> - **Java** `java.time.LocalDate` represents a date without time or timezone.

---

### 8. Time

A time of day consisting of hours, minutes, and seconds, optionally with fractional seconds and timezone information.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| scale | number | _(omit)_ | Number of fractional second digits (0-9). |
| timezone | boolean | false | When true, the value includes a timezone offset. |

#### Modeling Examples

| Use Case | Attribute | Type | Properties |
|----------|-----------|------|------------|
| Store opening time | `opensAt` | Time | _(none)_ |
| Precise lap time | `lapTime` | Time | scale: 3 |
| Flight departure | `departureTime` | Time | timezone: true |
| High-precision event | `triggerTime` | Time | scale: 6, timezone: true |

#### Physical Type Mapping

| Properties | Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-----------|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| _(default)_ | TIME | STRING | TIME | TIME | INTERVAL DAY TO SECOND | TIME | TIME | string | datetime.time | LocalTime |
| scale: _s_ | TIME(_s_) | STRING | TIME(_s_) | TIME(_s_) | INTERVAL DAY(0) TO SECOND(_s_) | TIME(_s_) | TIME(_s_) | string | datetime.time | LocalTime |
| timezone | TIME | STRING | TIME | DATETIMEOFFSET | TIMESTAMP WITH TIME ZONE | TIME WITH TIME ZONE | TIME | string | datetime.time | OffsetTime |
| scale: _s_, timezone | TIME(_s_) | STRING | TIME(_s_) | DATETIMEOFFSET(_s_) | TIMESTAMP(_s_) WITH TIME ZONE | TIME(_s_) WITH TIME ZONE | TIME(_s_) | string | datetime.time | OffsetTime |

> **Platform notes:**
>
> - **Databricks** does not have a TIME type. Time values must be stored as STRING (e.g., "14:30:00") and parsed at query time.
> - **Snowflake** has a native TIME type but does not support timezone-aware time.
> - **Fabric** supports TIME with up to 6 fractional second digits, but no timezone-aware variant.
> - **SQL Server** does not have a TIME WITH TIME ZONE type; DATETIMEOFFSET (which includes the date) is the closest equivalent.
> - **Oracle** does not have a dedicated TIME type; INTERVAL DAY TO SECOND or TIMESTAMP is used.
> - **MySQL** does not support timezone-aware time types natively.
> - **MongoDB** has no native time type. Store as a string in ISO 8601 format (e.g., "14:30:00+02:00").
> - **Python** `datetime.time` supports optional `tzinfo` for timezone-aware values. Fractional seconds are supported to microsecond precision.
> - **Java** `java.time.LocalTime` for timezone-naive, `java.time.OffsetTime` for timezone-aware. Fractional seconds are supported to nanosecond precision.

---

### 9. DateTime

A combined date and time value, optionally with fractional seconds and timezone information. This is the most commonly used temporal type for recording when events occur.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| scale | number | _(omit)_ | Number of fractional second digits (0-9). |
| timezone | boolean | false | When true, the value includes a timezone offset. |

#### Modeling Examples

| Use Case | Attribute | Type | Properties |
|----------|-----------|------|------------|
| Record creation | `createdAt` | DateTime | timezone: true |
| Appointment | `appointmentDate` | DateTime | _(none)_ |
| Audit timestamp | `modifiedAt` | DateTime | scale: 6, timezone: true |
| Scheduled event | `scheduledFor` | DateTime | scale: 3 |

#### Physical Type Mapping

| Properties | Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-----------|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| _(default)_ | TIMESTAMP_NTZ | TIMESTAMP_NTZ | DATETIME2 | DATETIME2 | TIMESTAMP | TIMESTAMP | DATETIME | date | datetime.datetime | LocalDateTime |
| scale: _s_ | TIMESTAMP_NTZ(_s_) | TIMESTAMP_NTZ | DATETIME2(_s_) | DATETIME2(_s_) | TIMESTAMP(_s_) | TIMESTAMP(_s_) | DATETIME(_s_) | date | datetime.datetime | LocalDateTime |
| timezone | TIMESTAMP_TZ | TIMESTAMP | DATETIME2 | DATETIMEOFFSET | TIMESTAMP WITH TIME ZONE | TIMESTAMPTZ | DATETIME | date | datetime.datetime | OffsetDateTime |
| scale: _s_, timezone | TIMESTAMP_TZ(_s_) | TIMESTAMP | DATETIME2(_s_) | DATETIMEOFFSET(_s_) | TIMESTAMP(_s_) WITH TIME ZONE | TIMESTAMPTZ(_s_) | DATETIME(_s_) | date | datetime.datetime | OffsetDateTime |

> **Platform notes:**
>
> - **Snowflake** offers three timestamp variants: TIMESTAMP_NTZ (no timezone, wallclock time), TIMESTAMP_LTZ (session timezone, stores UTC), and TIMESTAMP_TZ (stores UTC with offset). TIMESTAMP_NTZ is the default; TIMESTAMP_TZ preserves the offset at write time but does not store the timezone name.
> - **Databricks** TIMESTAMP is timezone-aware (normalizes to UTC, converts using session timezone). TIMESTAMP_NTZ has no timezone handling. Neither accepts a fractional seconds parameter — precision is always microsecond (6 digits).
> - **Fabric** uses DATETIME2 for all datetime values with a maximum of 6 fractional second digits. DATETIMEOFFSET is not supported for column storage; timezone-aware data requires a separate timezone column with the AT TIME ZONE function.
> - **MySQL** does not have a timezone-aware datetime type. It stores values in UTC and converts based on the session timezone, but does not preserve the original offset.
> - **PostgreSQL** TIMESTAMPTZ internally stores UTC and converts on retrieval.
> - **SQL Server** DATETIMEOFFSET preserves the original offset.
> - **Oracle** TIMESTAMP WITH TIME ZONE preserves the timezone region or offset.
> - **MongoDB** `date` stores all values as UTC milliseconds since epoch. There is no timezone-naive variant — all dates are inherently UTC. Fractional second precision is limited to milliseconds (3 digits).
> - **Python** `datetime.datetime` supports optional `tzinfo` for timezone-aware values. Use `datetime.timezone.utc` or `zoneinfo.ZoneInfo` for timezone handling.
> - **Java** `java.time.LocalDateTime` for timezone-naive, `java.time.OffsetDateTime` for offset-aware. Use `java.time.ZonedDateTime` if full timezone rules (DST) are needed.

---

### 10. Guid

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

| Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL | MySQL | MongoDB | Python | Java |
|-----------|------------|--------|------------|--------|------------|-------|---------|--------|------|
| UUID | STRING | UNIQUEIDENTIFIER | UNIQUEIDENTIFIER | RAW(16) | UUID | CHAR(36) | binData _(UUID)_ | uuid.UUID | UUID |

> **Platform notes:**
>
> - **Snowflake** has a native UUID type storing 128-bit values in 8-4-4-4-12 hexadecimal format. UUID_STRING() generates new values.
> - **Databricks** has no native UUID type; values are stored as STRING. The uuid() function generates new values.
> - **Fabric** supports UNIQUEIDENTIFIER but with limitations — it cannot be read on the SQL analytics endpoint and is stored as binary in Parquet.
> - **PostgreSQL** has a native UUID type.
> - **Oracle** uses RAW(16) for the binary representation.
> - **MySQL** stores UUIDs as CHAR(36) string representation or BINARY(16) for compact storage.
> - **MongoDB** stores UUIDs as `binData` with subtype 4 (UUID). The `UUID()` constructor generates new values.
> - **Python** `uuid.UUID` from the standard library. Generate with `uuid.uuid4()`.
> - **Java** `java.util.UUID`. Generate with `UUID.randomUUID()`.

---

### 11. Geometry

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

| Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL + PostGIS | MySQL | MongoDB | Python | Java |
|-----------|------------|--------|------------|--------|---------------------|-------|---------|--------|------|
| GEOMETRY | GEOMETRY | VARBINARY _(WKB)_ | geometry | SDO_GEOMETRY | geometry | GEOMETRY | object _(GeoJSON)_ | str _(WKT)_ | Geometry _(JTS)_ |

> **Platform notes:**
>
> - **Databricks** supports native GEOMETRY from runtime 17.1+ with WKT, WKB, and GeoJSON formats.
> - **Fabric** Data Warehouse does not support spatial column types. Store as VARBINARY with Well-Known Binary (WKB) encoding and cast to geometry at query time using spatial functions.
> - **PostgreSQL** requires the PostGIS extension.
> - **Oracle** uses SDO_GEOMETRY for both planar and geodetic data, differentiated by SRID.
> - **Snowflake** supports GEOMETRY with WKT, WKB, EWKT, EWKB, and GeoJSON formats; coordinates are limited to 2D.
> - Specific subtypes (POINT, LINESTRING, POLYGON, etc.) can be constrained at the physical level.
> - **MongoDB** stores spatial data as GeoJSON objects (`{ type: "Point", coordinates: [x, y] }`). Create a `2d` index for planar geometry queries.
> - **Python** has no built-in spatial type. Use `str` with WKT representation, or the Shapely library (`shapely.Geometry`) for spatial operations.
> - **Java** has no built-in spatial type. Use JTS Topology Suite (`org.locationtech.jts.geom.Geometry`) for spatial operations.

---

### 12. Geography

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

| Snowflake | Databricks | Fabric | SQL Server | Oracle | PostgreSQL + PostGIS | MySQL | MongoDB | Python | Java |
|-----------|------------|--------|------------|--------|---------------------|-------|---------|--------|------|
| GEOGRAPHY | GEOGRAPHY | VARBINARY _(WKB)_ | geography | SDO_GEOMETRY _(SRID 4326)_ | geography | GEOMETRY _(SRID 4326)_ | object _(GeoJSON)_ | str _(WKT)_ | Geometry _(JTS)_ |

> **Platform notes:**
>
> - **Databricks** supports native GEOGRAPHY from runtime 17.1+ with geodetic coordinate semantics.
> - **Fabric** Data Warehouse does not support spatial column types. Store as VARBINARY with Well-Known Binary (WKB) encoding and cast to geography at query time.
> - **Snowflake** GEOGRAPHY uses WGS 84 (SRID 4326) and returns distances in meters.
> - **MySQL** does not have a dedicated geography type; spatial functions determine whether calculations use planar or spherical math based on the SRID.
> - **Oracle** uses SDO_GEOMETRY with SRID 4326 for geodetic data.
> - **PostgreSQL** and **SQL Server** have dedicated geography types that enforce spherical calculations.
> - **MongoDB** stores geography as GeoJSON objects with `2dsphere` index for spherical queries. Coordinates use [longitude, latitude] order per the GeoJSON specification.
> - **Python** and **Java** use the same types as Geometry — the distinction between planar and geodetic is determined by the SRID/CRS, not the type.

---

## Appendix A: Complete Physical Type Mapping Reference

### Snowflake

| Logical Type | Properties | Physical Type |
|-------------|------------|---------------|
| Text | | VARCHAR |
| Text | length: _n_ | VARCHAR(_n_) |
| Text | length: _n_, fixedLength | VARCHAR(_n_) |
| Text | length: _n_, !unicode | VARCHAR(_n_) |
| Binary | | BINARY |
| Binary | length: _n_ | BINARY(_n_) |
| Binary | length: _n_, fixedLength | BINARY(_n_) |
| Boolean | | BOOLEAN |
| Integer | | NUMBER(10) |
| Integer | 0 to 255 | NUMBER(3) |
| Integer | -32768 to 32767 | NUMBER(5) |
| Integer | -2^31 to 2^31-1 | NUMBER(10) |
| Integer | larger ranges | NUMBER(19) |
| Decimal | precision: _p_, scale: _s_ | NUMBER(_p_,_s_) |
| Float | | FLOAT |
| Float | precision <= 7 | FLOAT |
| Date | | DATE |
| Time | | TIME |
| Time | scale: _s_ | TIME(_s_) |
| DateTime | | TIMESTAMP_NTZ |
| DateTime | scale: _s_ | TIMESTAMP_NTZ(_s_) |
| DateTime | timezone | TIMESTAMP_TZ |
| DateTime | scale: _s_, timezone | TIMESTAMP_TZ(_s_) |
| Guid | | UUID |
| Geometry | | GEOMETRY |
| Geography | | GEOGRAPHY |

> Snowflake stores all text as UTF-8; VARCHAR is used for all string types regardless of `unicode` or `fixedLength` properties. All integers are internally NUMBER(38,0). FLOAT is always 64-bit double precision. Snowflake has no timezone-aware TIME type.

### Databricks

| Logical Type | Properties | Physical Type |
|-------------|------------|---------------|
| Text | | STRING |
| Text | length: _n_ | STRING |
| Text | length: _n_, fixedLength | STRING |
| Text | length: _n_, !unicode | STRING |
| Binary | | BINARY |
| Binary | length: _n_ | BINARY |
| Binary | length: _n_, fixedLength | BINARY |
| Boolean | | BOOLEAN |
| Integer | | INT |
| Integer | -128 to 127 | TINYINT |
| Integer | -32768 to 32767 | SMALLINT |
| Integer | -2^31 to 2^31-1 | INT |
| Integer | -2^63 to 2^63-1 | BIGINT |
| Integer | 0 to 2^64-1 | DECIMAL(20) |
| Decimal | precision: _p_, scale: _s_ | DECIMAL(_p_,_s_) |
| Float | | DOUBLE |
| Float | precision <= 7 | FLOAT |
| Date | | DATE |
| Time | | STRING |
| Time | scale: _s_ | STRING |
| Time | timezone | STRING |
| DateTime | | TIMESTAMP_NTZ |
| DateTime | timezone | TIMESTAMP |
| Guid | | STRING |
| Geometry | | GEOMETRY |
| Geography | | GEOGRAPHY |

> Databricks uses STRING for all text — VARCHAR/CHAR exist as metadata constraints only. There is no TIME type; use STRING. TIMESTAMP normalizes to UTC (timezone-aware); TIMESTAMP_NTZ is wallclock time. Neither accepts a fractional seconds parameter. All integer types are signed only. GEOMETRY/GEOGRAPHY require Databricks Runtime 17.1+.

### Fabric

| Logical Type | Properties | Physical Type |
|-------------|------------|---------------|
| Text | | VARCHAR(MAX) |
| Text | length: _n_ | VARCHAR(_n_) |
| Text | length: _n_, fixedLength | CHAR(_n_) |
| Text | length: _n_, !unicode | VARCHAR(_n_) |
| Text | length: _n_, fixedLength, !unicode | CHAR(_n_) |
| Binary | | VARBINARY(MAX) |
| Binary | length: _n_ | VARBINARY(_n_) |
| Binary | length: _n_, fixedLength | VARBINARY(_n_) |
| Boolean | | BIT |
| Integer | | INT |
| Integer | 0 to 255 | SMALLINT |
| Integer | -32768 to 32767 | SMALLINT |
| Integer | -2^31 to 2^31-1 | INT |
| Integer | -2^63 to 2^63-1 | BIGINT |
| Integer | 0 to 2^64-1 | NUMERIC(20) |
| Decimal | precision: _p_, scale: _s_ | DECIMAL(_p_,_s_) |
| Float | | FLOAT |
| Float | precision <= 7 | REAL |
| Date | | DATE |
| Time | | TIME |
| Time | scale: _s_ | TIME(_s_) |
| DateTime | | DATETIME2 |
| DateTime | scale: _s_ | DATETIME2(_s_) |
| DateTime | timezone | DATETIME2 |
| DateTime | scale: _s_, timezone | DATETIME2(_s_) |
| Guid | | UNIQUEIDENTIFIER |
| Geometry | | VARBINARY _(WKB)_ |
| Geography | | VARBINARY _(WKB)_ |

> Fabric uses UTF-8 collation for all text; NVARCHAR/NCHAR are not supported. TINYINT is not supported (use SMALLINT). DATETIMEOFFSET is not supported for column storage — timezone-aware DateTime maps to DATETIME2 (timezone information is lost; use a separate timezone column). TIME and DATETIME2 support up to 6 fractional second digits. Spatial types cannot be stored as columns — use VARBINARY with WKB encoding. VARCHAR(MAX) and VARBINARY(MAX) are limited to 16 MB per cell.

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
| Guid | | UNIQUEIDENTIFIER |
| Geometry | | geometry |
| Geography | | geography |

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
| Guid | | RAW(16) |
| Geometry | | SDO_GEOMETRY |
| Geography | | SDO_GEOMETRY |

> Oracle does not have native TIME or BOOLEAN types. Oracle's DATE includes a time component; for date-only semantics, a convention of midnight time is used. RAW supports up to 2000 bytes; larger binary data maps to BLOB. Oracle's NVARCHAR2 supports up to 4000 bytes (2000 characters in AL16UTF16).

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
| Guid | | UUID |
| Geometry | | geometry |
| Geography | | geography |

> PostgreSQL uses UTF-8 natively; the `unicode` property has no effect on type selection. BYTEA is used for all binary data regardless of length/fixedLength properties. PostGIS extension is required for geometry/geography types.

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
| Guid | | CHAR(36) |
| Geometry | | GEOMETRY |
| Geography | | GEOMETRY |

> MySQL does not support timezone-aware temporal types. For unicode, MySQL defaults to utf8mb4 charset in modern versions; the `unicode` flag controls the column character set when non-default encoding is needed. MySQL is the only platform with UNSIGNED integer variants.

### MongoDB

| Logical Type | Properties | Physical Type (BSON) |
|-------------|------------|----------------------|
| Text | | string |
| Binary | | binData |
| Boolean | | bool |
| Integer | | int |
| Integer | -128 to 127 | int |
| Integer | -32768 to 32767 | int |
| Integer | -2^31 to 2^31-1 | int |
| Integer | -2^63 to 2^63-1 | long |
| Integer | 0 to 2^64-1 | decimal |
| Decimal | precision: _p_, scale: _s_ | decimal |
| Float | | double |
| Date | | date |
| Time | | string |
| Time | timezone | string |
| DateTime | | date |
| DateTime | timezone | date |
| Guid | | binData _(UUID)_ |
| Geometry | | object _(GeoJSON)_ |
| Geography | | object _(GeoJSON)_ |

> MongoDB has 5 numeric BSON types: `int` (32-bit), `long` (64-bit), `double` (64-bit IEEE 754), `decimal` (Decimal128), and `bool`. All strings are UTF-8. There is no native TIME type — store as ISO 8601 string. The `date` type is always UTC milliseconds since epoch — there is no timezone-naive variant. Spatial data uses GeoJSON embedded documents with `2d` (planar) or `2dsphere` (geodetic) indexes. Length, precision, scale, fixedLength, and unicode constraints are enforced via JSON Schema validation, not the BSON type system.

### Python

| Logical Type | Properties | Physical Type |
|-------------|------------|---------------|
| Text | | str |
| Binary | | bytes |
| Boolean | | bool |
| Integer | | int |
| Decimal | precision: _p_, scale: _s_ | Decimal |
| Float | | float |
| Date | | datetime.date |
| Time | | datetime.time |
| Time | timezone | datetime.time _(with tzinfo)_ |
| DateTime | | datetime.datetime |
| DateTime | timezone | datetime.datetime _(with tzinfo)_ |
| Guid | | uuid.UUID |
| Geometry | | str _(WKT)_ |
| Geography | | str _(WKT)_ |

> Python's `int` has arbitrary precision — no subtypes are needed regardless of the integer range. `float` is always 64-bit double precision (IEEE 754). Use `decimal.Decimal` for exact arithmetic. The `datetime` module provides `date`, `time`, and `datetime` classes; timezone-aware variants use the `tzinfo` parameter with `datetime.timezone` or `zoneinfo.ZoneInfo`. Python has no built-in spatial types — use WKT strings or the Shapely library for spatial operations. All properties (length, precision, scale, fixedLength, unicode) are enforced at the application level, not by the type system.

### Java

| Logical Type | Properties | Physical Type |
|-------------|------------|---------------|
| Text | | String |
| Binary | | byte[] |
| Boolean | | boolean |
| Integer | -128 to 127 | byte |
| Integer | 0 to 255 | short |
| Integer | -32768 to 32767 | short |
| Integer | | int |
| Integer | -2^31 to 2^31-1 | int |
| Integer | 0 to 2^32-1 | long |
| Integer | -2^63 to 2^63-1 | long |
| Integer | 0 to 2^64-1 | BigInteger |
| Decimal | precision: _p_, scale: _s_ | BigDecimal |
| Float | | double |
| Float | precision <= 7 | float |
| Date | | LocalDate |
| Time | | LocalTime |
| Time | timezone | OffsetTime |
| DateTime | | LocalDateTime |
| DateTime | timezone | OffsetDateTime |
| Guid | | UUID |
| Geometry | | Geometry _(JTS)_ |
| Geography | | Geometry _(JTS)_ |

> Java maps integers to the smallest fitting primitive: `byte` (-128..127), `short` (-32768..32767), `int` (-2^31..2^31-1), `long` (-2^63..2^63-1), or `java.math.BigInteger` for arbitrary precision. Use boxed types (`Byte`, `Short`, `Integer`, `Long`) for nullable values. `java.math.BigDecimal` provides arbitrary-precision exact decimals. The `java.time` package (JSR-310) provides `LocalDate`, `LocalTime`, `LocalDateTime` for timezone-naive and `OffsetTime`, `OffsetDateTime` for timezone-aware types. Use `ZonedDateTime` when full timezone rules (DST transitions) are needed. Java has no built-in spatial types — use JTS Topology Suite (`org.locationtech.jts.geom.Geometry`). For unsigned ranges (e.g., 0..255), Java uses the next larger signed type since it has no unsigned primitives.

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
| Guid | Guid | Unchanged. |
| Binary | Binary | New property: `fixedLength`. |
| Location | Geometry | Renamed. For planar/Cartesian spatial data. |
| _(new)_ | Geography | New type for geodetic spatial data. Split from Location. |
