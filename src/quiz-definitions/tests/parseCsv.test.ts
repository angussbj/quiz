import { parseCsv } from '../parseCsv';

describe('parseCsv', () => {
  it('parses simple CSV with headers', () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const result = parseCsv(csv);
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(parseCsv('')).toEqual([]);
  });

  it('returns empty array for header-only CSV', () => {
    expect(parseCsv('name,age\n')).toEqual([]);
  });

  it('handles quoted fields', () => {
    const csv = 'name,bio\nAlice,"Likes cats, dogs"\nBob,"Quiet"';
    const result = parseCsv(csv);
    expect(result).toEqual([
      { name: 'Alice', bio: 'Likes cats, dogs' },
      { name: 'Bob', bio: 'Quiet' },
    ]);
  });

  it('handles escaped quotes (doubled double-quotes)', () => {
    const csv = 'name,quote\nAlice,"She said ""hello"""\nBob,"A ""test"""';
    const result = parseCsv(csv);
    expect(result).toEqual([
      { name: 'Alice', quote: 'She said "hello"' },
      { name: 'Bob', quote: 'A "test"' },
    ]);
  });

  it('handles newlines within quoted fields', () => {
    const csv = 'name,address\nAlice,"123 Main St\nApt 4"\nBob,"456 Oak Ave"';
    const result = parseCsv(csv);
    expect(result).toEqual([
      { name: 'Alice', address: '123 Main St\nApt 4' },
      { name: 'Bob', address: '456 Oak Ave' },
    ]);
  });

  it('handles CRLF line endings', () => {
    const csv = 'name,age\r\nAlice,30\r\nBob,25';
    const result = parseCsv(csv);
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('handles empty fields', () => {
    const csv = 'a,b,c\n1,,3\n,,';
    const result = parseCsv(csv);
    expect(result).toEqual([
      { a: '1', b: '', c: '3' },
      { a: '', b: '', c: '' },
    ]);
  });

  it('handles rows with fewer fields than headers', () => {
    const csv = 'a,b,c\n1';
    const result = parseCsv(csv);
    expect(result).toEqual([{ a: '1', b: '', c: '' }]);
  });

  it('handles trailing newline', () => {
    const csv = 'name\nAlice\n';
    const result = parseCsv(csv);
    expect(result).toEqual([{ name: 'Alice' }]);
  });

  it('handles CRLF within quoted fields', () => {
    const csv = 'name,text\nAlice,"line1\r\nline2"';
    const result = parseCsv(csv);
    expect(result).toEqual([
      { name: 'Alice', text: 'line1\r\nline2' },
    ]);
  });

  it('handles single-column CSV', () => {
    const csv = 'name\nAlice\nBob';
    const result = parseCsv(csv);
    expect(result).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
  });

  it('handles commas within quoted fields alongside unquoted fields', () => {
    const csv = 'id,name,notes\n1,Alice,"A, B, C"\n2,Bob,simple';
    const result = parseCsv(csv);
    expect(result).toEqual([
      { id: '1', name: 'Alice', notes: 'A, B, C' },
      { id: '2', name: 'Bob', notes: 'simple' },
    ]);
  });
});
