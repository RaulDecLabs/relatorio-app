import { createFileRoute } from '@tanstack/react-router'

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(s => s.replace(/^"|"$/g, '').trim());
}

export const Route = createFileRoute('/api/public/sheets-audit')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const reportId = url.searchParams.get('report_id');
        const startDateStr = url.searchParams.get('startDate');
        const endDateStr = url.searchParams.get('endDate');

        if (!reportId || !startDateStr || !endDateStr) {
          return Response.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');

        // Fetch sheet config
        const { data: sheetsConfig, error: sheetsError } = await supabaseAdmin
          .from('reports_sheets_config')
          .select('*')
          .eq('report_id', reportId)
          .maybeSingle();

        if (sheetsError || !sheetsConfig) {
          return Response.json({ 
            ok: false, 
            error: sheetsError ? sheetsError.message : 'No sheet configured for this client' 
          });
        }

        const sheetsUrl = sheetsConfig.google_sheets_url;
        const matches = sheetsUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!matches) {
          return Response.json({ ok: false, error: 'Invalid Google Sheets URL format' });
        }
        const spreadsheetId = matches[1];

        // Fetch CSV from Google Sheets
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
        try {
          const res = await fetch(csvUrl);
          if (!res.ok) {
            return Response.json({ 
              ok: false, 
              error: 'Failed to fetch spreadsheet. Make sure it is shared as "Anyone with the link can view".' 
            });
          }

          const csvText = await res.text();
          const rows = csvText.split('\n').filter(r => r.trim().length > 0);

          if (rows.length === 0) {
            return Response.json({ ok: true, count: 0, rows: [] });
          }

          // Parse headers
          const headers = parseCSVLine(rows[0]).map(h => h.toLowerCase().trim());
          let dateColIndex = -1;
          const dateKeywords = ['data', 'date', 'timestamp', 'criado', 'cadastro', 'dia', 'time', 'created'];
          for (const kw of dateKeywords) {
            dateColIndex = headers.findIndex(h => h.includes(kw));
            if (dateColIndex !== -1) break;
          }

          if (dateColIndex === -1) {
            return Response.json({ 
              ok: false, 
              error: 'Could not find a date/timestamp column in the spreadsheet. Please name one of your headers "Data", "Date", or "Timestamp".' 
            });
          }

          const startDate = new Date(startDateStr + 'T00:00:00');
          const endDate = new Date(endDateStr + 'T23:59:59');

          let matchCount = 0;
          const matchedRows: any[] = [];

          // Process rows (skip header)
          for (let i = 1; i < rows.length; i++) {
            const cells = parseCSVLine(rows[i]);
            if (cells.length <= dateColIndex) continue;

            const dateVal = cells[dateColIndex];
            if (!dateVal) continue;

            // Try to parse date
            let parsedDate: Date | null = null;
            
            // Matches DD/MM/YYYY format
            const dmyMatch = dateVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            // Matches YYYY-MM-DD format
            const ymdMatch = dateVal.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);

            if (dmyMatch) {
              const day = parseInt(dmyMatch[1], 10);
              const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
              const year = parseInt(dmyMatch[3], 10);
              const timePart = dateVal.split(' ')[1];
              if (timePart) {
                const parts = timePart.split(':');
                const hh = parseInt(parts[0], 10) || 0;
                const mm = parseInt(parts[1], 10) || 0;
                const ss = parseInt(parts[2], 10) || 0;
                parsedDate = new Date(year, month, day, hh, mm, ss);
              } else {
                parsedDate = new Date(year, month, day);
              }
            } else if (ymdMatch) {
              const year = parseInt(ymdMatch[1], 10);
              const month = parseInt(ymdMatch[2], 10) - 1; // 0-indexed
              const day = parseInt(ymdMatch[3], 10);
              const timePart = dateVal.split(' ')[1];
              if (timePart) {
                const parts = timePart.split(':');
                const hh = parseInt(parts[0], 10) || 0;
                const mm = parseInt(parts[1], 10) || 0;
                const ss = parseInt(parts[2], 10) || 0;
                parsedDate = new Date(year, month, day, hh, mm, ss);
              } else {
                parsedDate = new Date(year, month, day);
              }
            } else {
              // Fallback to JS Date parser
              parsedDate = new Date(dateVal);
            }

            if (!parsedDate || isNaN(parsedDate.getTime())) {
              continue;
            }

            if (parsedDate >= startDate && parsedDate <= endDate) {
              matchCount++;
              
              const rowData: Record<string, string> = {};
              headers.forEach((h, idx) => {
                if (cells[idx]) {
                  rowData[h] = cells[idx];
                }
              });
              matchedRows.push(rowData);
            }
          }

          return Response.json({
            ok: true,
            count: matchCount,
            total_rows_scanned: rows.length - 1,
            date_column_detected: parseCSVLine(rows[0])[dateColIndex],
            sample_rows: matchedRows.reverse().slice(0, 10)
          });

        } catch (fetchErr: any) {
          return Response.json({ ok: false, error: fetchErr.message });
        }
      }
    }
  }
});
