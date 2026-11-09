/* Worker para generación de reportes PDF y Excel en segundo plano */
self.onmessage = function(e) {
  const { action, spec, logoData, church, place, phrase, timeZone, author, today } = e.data;
  
  if (action === 'exportXLS') {
    try {
      const x = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const money = n => 'S/ ' + (+n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const fmtDate = d => d ? d.split('-').reverse().join('/') : '';
      
      const n = spec.cols.length, span = Math.max(n - 1, 1);
      const cell = (v, st, num) => `<Cell ss:StyleID="${st}"><Data ss:Type="${num ? 'Number' : 'String'}">${num ? (+v || 0) : x(v)}</Data></Cell>`;
      const merged = (v, st, h) => `<Row${h ? ` ss:Height="${h}"` : ''}><Cell ss:StyleID="${st}" ss:MergeAcross="${span}"><Data ss:Type="String">${x(v)}</Data></Cell></Row>`;
      
      let rows = merged(church, 'church', 24) + merged(place, 'sub') + merged(spec.title, 'title', 22) + merged(spec.subtitle || '', 'sub') + '<Row/>';
      rows += '<Row>' + spec.cols.map(c => cell(c.h, 'head')).join('') + '</Row>';
      
      spec.rows.forEach(r => {
        rows += '<Row>' + spec.cols.map(c => c.num ? cell(r[c.k], 'money', true) : c.int ? cell(r[c.k], 'int', true) : cell(c.date ? fmtDate(r[c.k]) : r[c.k], 'cell')).join('') + '</Row>';
      });
      
      if (spec.total) {
        const col = Math.max(spec.total.col, 0);
        rows += '<Row>' + spec.cols.map((c, i) => i === col ? cell(spec.total.value, 'totmoney', true) : i === col - 1 ? cell(spec.total.label, 'tot') : cell('', 'tot')).join('') + '</Row>';
      }
      
      if (spec.summary && spec.summary.length) {
        rows += '<Row/>' + spec.summary.map(([l, v, int]) => `<Row>${cell(l, 'cell')}${cell(v, int ? 'int' : 'money', true)}</Row>`).join('');
      }
      
      rows += '<Row/>' + merged(phrase, 'phrase', 24) + merged('Generado: ' + new Date().toLocaleString('es-PE', { timeZone }) + ' · Por: ' + author, 'sub');
      const cols = spec.cols.map(() => '<Column ss:Width="105"/>').join('');
      
      const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="11"/></Style>
<Style ss:ID="church"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="14" ss:Color="#0F4C81"/></Style>
<Style ss:ID="title"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Size="13"/></Style>
<Style ss:ID="sub"><Alignment ss:Horizontal="Center"/><Font ss:Size="10" ss:Color="#666666"/></Style>
<Style ss:ID="head"><Alignment ss:Horizontal="Center"/><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F4C81" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous"/></Borders></Style>
<Style ss:ID="cell"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Color="#CCCCCC"/></Borders></Style>
<Style ss:ID="int"><Alignment ss:Horizontal="Right"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Color="#CCCCCC"/></Borders></Style>
<Style ss:ID="money"><NumberFormat ss:Format="&quot;S/ &quot;#,##0.00"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Color="#CCCCCC"/></Borders></Style>
<Style ss:ID="tot"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#E8833A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Right"/></Style>
<Style ss:ID="totmoney"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#E8833A" ss:Pattern="Solid"/><NumberFormat ss:Format="&quot;S/ &quot;#,##0.00"/></Style>
<Style ss:ID="phrase"><Alignment ss:Horizontal="Center"/><Font ss:FontName="Times New Roman" ss:Bold="1" ss:Italic="1" ss:Size="14" ss:Color="#E8833A"/></Style>
</Styles>
<Worksheet ss:Name="${x(spec.name).slice(0, 30)}"><Table>${cols}${rows}</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><PageSetup><Layout x:Orientation="Landscape" xmlns:x="urn:schemas-microsoft-com:office:excel"/></PageSetup></WorksheetOptions></Worksheet></Workbook>`;
      
      const blob = new Blob(['\ufeff' + xml], { type: 'application/vnd.ms-excel' });
      self.postMessage({ success: true, action: 'exportXLS', blob, filename: `${spec.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${today}.xls` });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  }
};
