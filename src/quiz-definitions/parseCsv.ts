/**
 * Parse a CSV string into an array of records.
 * Handles quoted fields, commas within quotes, escaped quotes (""),
 * empty fields, and CRLF/LF line endings.
 *
 * Returns one record per row, keyed by header names.
 */
export function parseCsv(csvText: string): ReadonlyArray<Readonly<Record<string, string>>> {
  const rows = parseRows(csvText);
  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0];
  const records: Array<Readonly<Record<string, string>>> = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const record: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      record[headers[j]] = j < row.length ? row[j] : '';
    }
    records.push(record);
  }

  return records;
}

/**
 * Parse CSV text into a 2D array of strings (rows × fields).
 * Implements RFC 4180 parsing with support for:
 * - Quoted fields (fields wrapped in double quotes)
 * - Escaped quotes (doubled double-quotes inside quoted fields)
 * - Newlines within quoted fields
 * - Both CRLF and LF line endings
 * - Empty fields
 */
function parseRows(csvText: string): ReadonlyArray<ReadonlyArray<string>> {
  const rows: Array<Array<string>> = [];
  let currentRow: Array<string> = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          // Escaped quote
          currentField += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        currentField += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if (char === '\r') {
        // CRLF or lone CR
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        if (i < csvText.length && csvText[i] === '\n') {
          i++;
        }
      } else if (char === '\n') {
        currentRow.push(currentField);
        currentField = '';
        if (currentRow.length > 0) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
      } else {
        currentField += char;
        i++;
      }
    }
  }

  // Handle last field/row (no trailing newline)
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}
