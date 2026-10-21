async function exportarExcel(stats, filters, areas) {
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
  const wb = XLSX.utils.book_new();

  const now = new Date();
  const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][now.getMonth()];
  const periodoLabel = filters.from || filters.to
    ? `${filters.from || '—'} al ${filters.to || '—'}`
    : `${mesNombre} ${now.getFullYear()}`;

  // ── HOJA 1: PORTADA / RESUMEN INSTITUCIONAL ──────────────────────────────
  const portadaRows = [
    [''],
    ['C.I.C. DE COLONIA WANDA'],
    ['Provincia de Misiones'],
    ['CP. 3376  —  Tel./Fax: 3757-470-507'],
    ['cicwanda@gmail.com'],
    [''],
    ['INFORME MENSUAL DE PERSONAS ATENDIDAS'],
    [`Período: ${periodoLabel}`],
    [`Generado el: ${now.toLocaleDateString('es-AR', { day:'2-digit', month:'long', year:'numeric' })}`],
    [''],
    ['─────────────────────────────────────────'],
    [''],
    ['RESUMEN GENERAL'],
    [''],
    ['Indicador', 'Cantidad'],
    ['Personas asistidas', stats.kpis.persons],
    ['Casos / Atenciones registradas', stats.kpis.cases],
    ['Prestaciones otorgadas', stats.kpis.prestations],
    ['Familiares registrados', stats.kpis.family],
    ['Audiencias realizadas', stats.kpis.audiencias],
    [''],
    ['─────────────────────────────────────────'],
    [''],
    ['* Documento generado automáticamente por el Sistema de Ficha Social'],
    ['* Municipalidad de Colonia Wanda — Misiones'],
  ];
  const wsPortada = XLSX.utils.aoa_to_sheet(portadaRows);
  wsPortada['!cols'] = [{ wch: 45 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsPortada, 'Portada');

  // ── HOJA 2: DETALLE POR ÁREA ─────────────────────────────────────────────
  const areaDetalleRows = [
    ['INFORME POR ÁREA — ' + periodoLabel],
    [''],
    ['Área', 'Casos / Atenciones', 'Prestaciones Otorgadas', '% del Total'],
  ];
  const totalCasos = stats.byAreaFull?.reduce((s, r) => s + r.casos, 0) || 0;
  const totalPrest = stats.byAreaFull?.reduce((s, r) => s + r.prestaciones, 0) || 0;

  (stats.byAreaFull || stats.byArea.map(a => ({ name: a.name, casos: a.value, prestaciones: 0 }))).forEach(r => {
    const pct = totalCasos > 0 ? ((r.casos / totalCasos) * 100).toFixed(1) + '%' : '0%';
    areaDetalleRows.push([r.name, r.casos, r.prestaciones ?? 0, pct]);
  });

  areaDetalleRows.push(['']);
  areaDetalleRows.push(['TOTAL GENERAL', totalCasos, totalPrest, '100%']);

  const wsArea = XLSX.utils.aoa_to_sheet(areaDetalleRows);
  wsArea['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 25 }, { wch: 15 }];
  wsArea['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
  XLSX.utils.book_append_sheet(wb, wsArea, 'Detalle por Área');

  // ── HOJA 3: PRESTACIONES POR TIPO ────────────────────────────────────────
  const prestRows = [
    ['PRESTACIONES OTORGADAS — ' + periodoLabel],
    [''],
    ['Tipo de Prestación', 'Cantidad', '% del Total'],
  ];
  const totalPrestTipo = stats.topPrestations.reduce((s, p) => s + p.value, 0);
  stats.topPrestations.forEach(p => {
    const pct = totalPrestTipo > 0 ? ((p.value / totalPrestTipo) * 100).toFixed(1) + '%' : '0%';
    prestRows.push([p.name, p.value, pct]);
  });
  prestRows.push(['']);
  prestRows.push(['TOTAL', totalPrestTipo, '100%']);

  const wsPrest = XLSX.utils.aoa_to_sheet(prestRows);
  wsPrest['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }];
  wsPrest['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
  XLSX.utils.book_append_sheet(wb, wsPrest, 'Prestaciones');

  // ── HOJA 4: EVOLUCIÓN MENSUAL ────────────────────────────────────────────
  const mesRows = [
    ['EVOLUCIÓN MENSUAL DE ATENCIONES — ' + now.getFullYear()],
    [''],
    ['Mes', 'Cantidad de Casos'],
    ...stats.byMonth.map(m => [m.name, m.value]),
    [''],
    ['Total', stats.byMonth.reduce((s, m) => s + m.value, 0)],
  ];
  const wsMes = XLSX.utils.aoa_to_sheet(mesRows);
  wsMes['!cols'] = [{ wch: 20 }, { wch: 20 }];
  wsMes['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, wsMes, 'Evolución Mensual');

  // ── HOJA 5: LISTADO DE ATENCIONES (MEJORADO) ─────────────────────────────
  const casosRows = [
    ['LISTADO DE ATENCIONES — ' + periodoLabel],
    [''],
    ['N°', 'Fecha', 'Apellido y Nombre', 'DNI', 'Domicilio', 'Área', 'Motivo', 'Solución', 'Prestaciones Entregadas'],
    ...stats.recentCases.map((c, i) => [
      i + 1,
      new Date(c.created_at).toLocaleDateString('es-AR'),
      c.apellido_nombre || '—',
      c.dni || '—',
      c.domicilio || '—',
      c.area_name || '—',
      c.motivo || '—',
      c.solucion || '—',
      c.prestacionesEntregadas || '—',
    ]),
  ];
  const wsCasos = XLSX.utils.aoa_to_sheet(casosRows);
  wsCasos['!cols'] = [
    { wch: 5 },   // N°
    { wch: 12 },  // Fecha
    { wch: 30 },  // Nombre
    { wch: 12 },  // DNI
    { wch: 35 },  // Domicilio
    { wch: 20 },  // Área
    { wch: 35 },  // Motivo
    { wch: 35 },  // Solución
    { wch: 50 },  // Prestaciones
  ];
  wsCasos['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
  XLSX.utils.book_append_sheet(wb, wsCasos, 'Listado de Atenciones');

  const fechaFile = now.toISOString().split('T')[0];
  XLSX.writeFile(wb, `Informe_CIC_Wanda_${fechaFile}.xlsx`);
}