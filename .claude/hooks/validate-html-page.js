#!/usr/bin/env node
'use strict';

// PreToolUse hook for Write. When the agent creates an .html page, it must pass
// the page data as JSON in tool_input.content of the shape:
//   { "title": "...", "rows": [ { "#", "Блог", "Краткое описание", "Инструменты", "Скриншоты" }, ... ] }
// This hook validates that body and, on success, rewrites tool_input.content into
// a rendered HTML table (and sets <title>) via hookSpecificOutput.updatedInput.
// Missing field / empty value -> exit 2 with a reason (blocks the Write).
// Non-.html writes and unparseable hook input pass through untouched (exit 0).

const REQUIRED_FIELDS = ['#', 'Блог', 'Краткое описание', 'Инструменты', 'Скриншоты'];

function fail(reason) {
  process.stderr.write(reason + '\n');
  process.exit(2);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let raw = '';
process.stdin.on('data', (chunk) => (raw += chunk));
process.stdin.on('end', () => {
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    // Not our hook input — never block unrelated tool calls.
    process.exit(0);
  }

  if (payload.tool_name !== 'Write') process.exit(0);
  const input = payload.tool_input || {};
  const filePath = String(input.file_path || '');
  if (!filePath.toLowerCase().endsWith('.html')) process.exit(0); // not an HTML page

  let data;
  try {
    data = JSON.parse(input.content);
  } catch (e) {
    fail(
      'HTML page body must be valid JSON of the shape { "title": "...", "rows": [ { "#", "Блог", "Краткое описание", "Инструменты", "Скриншоты" } ] }. JSON parse failed: ' +
        e.message
    );
  }

  const title = data.title;
  if (typeof title !== 'string' || title.trim() === '') {
    fail('Missing required field: "title" (must be a non-empty string).');
  }

  const rows = data.rows;
  if (!Array.isArray(rows) || rows.length === 0) {
    fail('Missing required field: "rows" (must be a non-empty array of records).');
  }

  rows.forEach((row, i) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      fail(`Row ${i + 1} is not an object.`);
    }
    REQUIRED_FIELDS.forEach((field) => {
      const v = row[field];
      if (v === undefined || v === null || String(v).trim() === '') {
        fail(`Row ${i + 1} is missing required field "${field}" or its value is empty.`);
      }
    });
  });

  const headerCells = REQUIRED_FIELDS.map((f) => `<th>${escapeHtml(f)}</th>`).join('');
  const bodyRows = rows
    .map(
      (row) =>
        '      <tr>' +
        REQUIRED_FIELDS.map((f) => `<td>${escapeHtml(row[f])}</td>`).join('') +
        '</tr>'
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <table border="1" cellpadding="6" cellspacing="0">
    <thead>
      <tr>${headerCells}</tr>
    </thead>
    <tbody>
${bodyRows}
    </tbody>
  </table>
</body>
</html>
`;

  const out = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      updatedInput: Object.assign({}, input, { content: html }),
    },
  };
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
});
