function handlePrintPDF() {
    setShowExportMenu(false)
    const namaBulan = BULAN_OPTIONS.find((b) => b.value === Number(bulan))?.label || ''

    const rowsUtamaHtml = rekapData
      .map(
        (r, i) => `
        <tr>
          <td>${i + 1}</td>
          <td style="text-align: left;">${r.nama_kelas}</td>
          <td>${r.awal_l}</td>
          <td>${r.awal_p}</td>
          <td style="font-weight: bold;">${r.awal_total}</td>
          <td>${r.masuk_l}</td>
          <td>${r.masuk_p}</td>
          <td>${r.keluar_l}</td>
          <td>${r.keluar_p}</td>
          <td>${r.akhir_l}</td>
          <td>${r.akhir_p}</td>
          <td style="font-weight: bold;">${r.akhir_total}</td>
        </tr>`
      )
      .join('')

    const rowsUsiaHtml = rekapUsia
      .map(
        (u) => `
        <tr>
          <td style="text-align: left;">${u.label}</td>
          <td>${u.l}</td>
          <td>${u.p}</td>
          <td style="font-weight: bold;">${u.total}</td>
        </tr>`
      )
      .join('')

    const rowsAgamaHtml = rekapAgama
      .map(
        (a) => `
        <tr>
          <td style="text-align: left;">${a.agama}</td>
          <td>${a.l}</td>
          <td>${a.p}</td>
          <td style="font-weight: bold;">${a.total}</td>
        </tr>`
      )
      .join('')

    const totalUsiaL = rekapUsia.reduce((a, b) => a + b.l, 0)
    const totalUsiaP = rekapUsia.reduce((a, b) => a + b.p, 0)
    const totalUsiaJml = rekapUsia.reduce((a, b) => a + b.total, 0)

    const totalAgamaL = rekapAgama.reduce((a, b) => a + b.l, 0)
    const totalAgamaP = rekapAgama.reduce((a, b) => a + b.p, 0)
    const totalAgamaJml = rekapAgama.reduce((a, b) => a + b.total, 0)

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Laporan Keadaan Murid - ${namaBulan} ${tahun}</title>
        <style>
          @page { 
            size: A4 landscape; 
            margin: 10mm; 
          }
          * {
            box-sizing: border-box;
          }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 11px; 
            color: #111; 
            margin: 0; 
            padding: 0; 
          }
          
          .page {
            page-break-after: always;
            width: 100%;
          }
          .page:last-child {
            page-break-after: auto;
          }

          h2 { text-align: center; margin: 0 0 2px 0; font-size: 16px; text-transform: uppercase; }
          .subtitle { text-align: center; margin: 0 0 14px 0; font-size: 11px; color: #444; }
          
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 6px; 
            font-size: 11px;
            table-layout: fixed;
          }
          th, td { 
            border: 1px solid #333; 
            padding: 5px 4px; 
            text-align: center; 
            word-wrap: break-word;
          }
          th { background-color: #f2f2f2; font-weight: bold; }
          .section-title { font-weight: bold; margin-bottom: 6px; font-size: 12px; }
          tfoot tr td { font-weight: bold; background-color: #f9f9f9; }

          .grid-3 {
            display: flex;
            gap: 15px;
            align-items: flex-start;
            width: 100%;
          }
          .grid-3 > div {
            flex: 1;
          }
        </style>
      </head>
      <body>
        <!-- HALAMAN 1: REKAPITULASI PER KELAS (LANDSCAPE FIT) -->
        <div class="page">
          <h2>LAPORAN KEADAAN MURID</h2>
          <div class="subtitle">Periode: ${namaBulan} ${tahun}</div>
          <div class="section-title">1. Rekapitulasi Keadaan Murid Per Kelas</div>
          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 35px;">No</th>
                <th rowspan="2" style="text-align: left; width: 140px;">Kelas</th>
                <th colspan="3">Awal Bulan</th>
                <th colspan="2">Masuk</th>
                <th colspan="2">Keluar</th>
                <th colspan="3">Akhir Bulan</th>
              </tr>
              <tr>
                <th>L</th><th>P</th><th>Jml</th>
                <th>L</th><th>P</th>
                <th>L</th><th>P</th>
                <th>L</th><th>P</th><th>Jml</th>
              </tr>
            </thead>
            <tbody>
              ${rowsUtamaHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2">JUMLAH TOTAL</td>
                <td>${totalSummary.awal_l}</td>
                <td>${totalSummary.awal_p}</td>
                <td>${totalSummary.awal_total}</td>
                <td>${totalSummary.masuk_l}</td>
                <td>${totalSummary.masuk_p}</td>
                <td>${totalSummary.keluar_l}</td>
                <td>${totalSummary.keluar_p}</td>
                <td>${totalSummary.akhir_l}</td>
                <td>${totalSummary.akhir_p}</td>
                <td>${totalSummary.akhir_total}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- HALAMAN 2: RINCIAN USIA, AGAMA, DAN KEWARGANEGARAAN -->
        <div class="page">
          <h2>LAPORAN KEADAAN MURID</h2>
          <div class="subtitle">Periode: ${namaBulan} ${tahun}</div>
          <div class="grid-3">
            <div>
              <div class="section-title">2. Menurut Usia</div>
              <table>
                <thead>
                  <tr>
                    <th style="text-align: left;">Usia</th>
                    <th>L</th>
                    <th>P</th>
                    <th>Jml</th>
                  </tr>
                </thead>
                <tbody>${rowsUsiaHtml}</tbody>
                <tfoot>
                  <tr>
                    <td style="text-align: left;">Total</td>
                    <td>${totalUsiaL}</td>
                    <td>${totalUsiaP}</td>
                    <td>${totalUsiaJml}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <div class="section-title">3. Menurut Agama</div>
              <table>
                <thead>
                  <tr>
                    <th style="text-align: left;">Agama</th>
                    <th>L</th>
                    <th>P</th>
                    <th>Jml</th>
                  </tr>
                </thead>
                <tbody>${rowsAgamaHtml}</tbody>
                <tfoot>
                  <tr>
                    <td style="text-align: left;">Total</td>
                    <td>${totalAgamaL}</td>
                    <td>${totalAgamaP}</td>
                    <td>${totalAgamaJml}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div>
              <div class="section-title">4. Kewarganegaraan</div>
              <table>
                <thead>
                  <tr>
                    <th style="text-align: left;">Status</th>
                    <th>L</th>
                    <th>P</th>
                    <th>Jml</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="text-align: left;">WNI</td>
                    <td>${rekapKewarganegaraan.wniL}</td>
                    <td>${rekapKewarganegaraan.wniP}</td>
                    <td style="font-weight: bold;">${rekapKewarganegaraan.wniL + rekapKewarganegaraan.wniP}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left;">WNA</td>
                    <td>${rekapKewarganegaraan.wnaL}</td>
                    <td>${rekapKewarganegaraan.wnaP}</td>
                    <td style="font-weight: bold;">${rekapKewarganegaraan.wnaL + rekapKewarganegaraan.wnaP}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td style="text-align: left;">Total</td>
                    <td>${rekapKewarganegaraan.wniL + rekapKewarganegaraan.wnaL}</td>
                    <td>${rekapKewarganegaraan.wniP + rekapKewarganegaraan.wnaP}</td>
                    <td>${rekapKewarganegaraan.wniL + rekapKewarganegaraan.wniP + rekapKewarganegaraan.wnaL + rekapKewarganegaraan.wnaP}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
    }
  }
