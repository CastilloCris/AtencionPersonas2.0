import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { formatFecha } from '../../lib/fechas';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MESES_FULL   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmtNum(n) {
  return (n ?? 0).toLocaleString('es-AR');
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon, color = 'indigo' }) {
  const colors = {
    indigo: 'bg-accent2/12 border-accent/20 text-accent',
    teal:   'bg-teal-500/12 border-teal-500/20 text-teal-400',
    amber:  'bg-amber-500/12 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/12 border-purple-500/20 text-purple-400',
  };
  return (
    <div className="card py-5 px-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${colors[color]}`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{fmtNum(value)}</p>
        <p className="text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────

function BarChart({ data, color = '#818cf8' }) {
  if (!data?.length) return <p className="text-muted text-xs text-center py-8">Sin datos para el período</p>;
  const max = Math.max(...data.map(d => d.value), 1);

  return (
    <div className="space-y-2.5">
      {data.map((item, i) => (
        <div key={i} className="grid items-center gap-3" style={{ gridTemplateColumns: '140px 1fr 40px' }}>
          <p className="text-xs text-white/70 truncate text-right pr-2" title={item.name}>{item.name}</p>
          <div className="h-2 rounded-full bg-white/6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(item.value / max) * 100}%`, background: color }}
            />
          </div>
          <p className="text-xs font-mono text-white/50 text-right">{fmtNum(item.value)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Spark Line (evolución mensual) ─────────────────────────────────────────

function SparkArea({ data }) {
  if (!data?.length) return <p className="text-muted text-xs text-center py-8">Sin datos</p>;
  const max    = Math.max(...data.map(d => d.value), 1);
  const W = 500, H = 100, PAD = 10;
  const pts = data.map((d, i) => {
    const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
    const y = H - PAD - (d.value / max) * (H - PAD * 2);
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area     = `${PAD},${H - PAD} ${polyline} ${W - PAD},${H - PAD}`;

  return (
    <div className="space-y-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#sparkGrad)" />
        <polyline points={polyline} fill="none" stroke="#818cf8" strokeWidth="2" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = PAD + (i / Math.max(data.length - 1, 1)) * (W - PAD * 2);
          const y = H - PAD - (d.value / max) * (H - PAD * 2);
          return <circle key={i} cx={x} cy={y} r="3" fill="#818cf8" />;
        })}
      </svg>
      <div className="flex justify-between">
        {data.map((d, i) => (
          <div key={i} className="text-center">
            <p className="text-[9px] text-muted">{d.name}</p>
            <p className="text-[10px] text-white/60 font-mono">{d.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Area Compare Table ──────────────────────────────────────────────────────

function AreaCompareTable({ data }) {
  if (!data?.length) return (
    <p className="text-muted text-xs text-center py-8">Sin datos para el período</p>
  );

  const maxCasos = Math.max(...data.map(d => d.casos), 1);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-3 px-1"
           style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(2.75rem,80px) minmax(2.75rem,80px) minmax(3.5rem,120px)' }}>
        <p className="text-[9px] uppercase font-black text-muted tracking-widest">Área</p>
        <p className="text-[9px] uppercase font-black text-muted tracking-widest text-right">Casos</p>
        <p className="text-[9px] uppercase font-black text-muted tracking-widest text-right">Prestac.</p>
        <p className="text-[9px] uppercase font-black text-muted tracking-widest">Proporción</p>
      </div>

      {data.map((row, i) => (
        <div key={i}
             className="grid gap-3 items-center px-3 py-2.5 rounded-xl bg-white/2 border border-white/5 hover:bg-white/4 transition-colors"
             style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(2.75rem,80px) minmax(2.75rem,80px) minmax(3.5rem,120px)' }}>

          {/* Nombre área */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-2 h-2 rounded-full shrink-0"
                 style={{
                   background: `hsl(${(i * 47) % 360}, 65%, 60%)`,
                   opacity: 0.8
                 }} />
            <p className="text-xs text-white font-semibold truncate">{row.name}</p>
          </div>

          {/* Casos */}
          <p className="text-xs font-mono text-accent text-right font-bold">
            {(row.casos).toLocaleString('es-AR')}
          </p>

          {/* Prestaciones */}
          <p className="text-xs font-mono text-teal-400 text-right">
            {(row.prestaciones).toLocaleString('es-AR')}
          </p>

          {/* Barra de proporción */}
          <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(row.casos / maxCasos) * 100}%`,
                background: `hsl(${(i * 47) % 360}, 65%, 60%)`
              }}
            />
          </div>
        </div>
      ))}

      {/* Totales */}
      <div className="grid gap-3 items-center px-3 py-2 mt-1 border-t border-white/10"
           style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(2.75rem,80px) minmax(2.75rem,80px) minmax(3.5rem,120px)' }}>
        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Total</p>
        <p className="text-xs font-mono text-accent/70 text-right font-bold">
          {data.reduce((s, r) => s + r.casos, 0).toLocaleString('es-AR')}
        </p>
        <p className="text-xs font-mono text-teal-400/70 text-right">
          {data.reduce((s, r) => s + r.prestaciones, 0).toLocaleString('es-AR')}
        </p>
        <div />
      </div>
    </div>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────

async function imgToBase64(url) {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

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
  // Ancho de columnas
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

  // Merge título
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

  // ── HOJA: DETALLE DE PRESTACIONES ──────────────────────────────────────
  if (stats.topPrestations?.length) {
    const detPrestRows = [
      ['DETALLE DE PRESTACIONES OTORGADAS — ' + periodoLabel],
      [''],
      ['Tipo de Prestación', 'Cantidad', '% del Total'],
      ...stats.topPrestations.map(p => {
        const total = stats.topPrestations.reduce((s, x) => s + x.value, 0);
        const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) + '%' : '0%';
        return [p.name, p.value, pct];
      }),
      [''],
      ['TOTAL', stats.topPrestations.reduce((s, p) => s + p.value, 0), '100%'],
    ];
    const wsDetPrest = XLSX.utils.aoa_to_sheet(detPrestRows);
    wsDetPrest['!cols'] = [{ wch: 35 }, { wch: 15 }, { wch: 15 }];
    wsDetPrest['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSX.utils.book_append_sheet(wb, wsDetPrest, 'Detalle Prestaciones');
  }

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

  // ── HOJA 5: LISTADO DE ATENCIONES ────────────────────────────────────────
  const casosRows = [
    ['LISTADO DE ATENCIONES — ' + periodoLabel],
    [''],
    ['N°', 'Fecha', 'Apellido y Nombre', 'DNI', 'Área', 'Motivo / Problemática'],
    ...stats.recentCases.map((c, i) => [
      i + 1,
      new Date(c.created_at).toLocaleDateString('es-AR'),
      c.apellido_nombre || '—',
      c.dni || '—',
      c.area_name || '—',
      c.motivo || '—',
    ]),
  ];
  const wsCasos = XLSX.utils.aoa_to_sheet(casosRows);
  wsCasos['!cols'] = [
    { wch: 5 }, { wch: 12 }, { wch: 30 },
    { wch: 12 }, { wch: 20 }, { wch: 40 }
  ];
  wsCasos['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  XLSX.utils.book_append_sheet(wb, wsCasos, 'Listado de Atenciones');

  const fechaFile = now.toISOString().split('T')[0];
  XLSX.writeFile(wb, `Informe_CIC_Wanda_${fechaFile}.xlsx`);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function exportarPDF(stats, filtroTexto, filters) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = 210; // ancho A4
  const now = new Date();
  const mesNombre = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][now.getMonth()];
  const periodoLabel = filtroTexto || `${mesNombre} ${now.getFullYear()}`;
  const fechaLarga = now.toLocaleDateString('es-AR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });

  // ── Cargar imágenes ──────────────────────────────────────────────────────
  let escudoB64 = null;
  let cicLogoB64 = null;
  try { escudoB64 = await imgToBase64('/escudo.png'); } catch(_) {}
  try { cicLogoB64 = await imgToBase64('/cic_logo.png'); } catch(_) {}

  // ── Helper: dibujar encabezado institucional en página actual ────────────
  const drawHeader = () => {
    // Franja superior azul oscuro
    doc.setFillColor(22, 36, 71);
    doc.rect(0, 0, PW, 32, 'F');

    // Logo izquierdo (escudo municipal)
    if (escudoB64) {
      try { doc.addImage(escudoB64, 'PNG', 8, 3, 24, 26); } catch(_) {}
    }

    // Logo derecho (CIC Wanda)
    if (cicLogoB64) {
      try { doc.addImage(cicLogoB64, 'PNG', PW - 34, 3, 26, 26); } catch(_) {}
    }

    // Texto central del encabezado
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('C.I.C. DE COLONIA WANDA', PW / 2, 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Provincia de Misiones', PW / 2, 16, { align: 'center' });
    doc.text('CP. 3376  —  Tel./Fax: 3757-470-507  —  cicwanda@gmail.com', PW / 2, 20, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 210, 255);
    doc.text(`Wanda, Misiones, ${fechaLarga}`, PW / 2, 26, { align: 'center' });

    // Línea separadora dorada
    doc.setDrawColor(200, 160, 40);
    doc.setLineWidth(0.6);
    doc.line(0, 32, PW, 32);

    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
  };

  // ── Helper: pie de página ────────────────────────────────────────────────
  const drawFooter = (pageNum, totalPages) => {
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 285, PW, 12, 'F');
    doc.setDrawColor(200, 160, 40);
    doc.setLineWidth(0.4);
    doc.line(0, 285, PW, 285);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(
      'Documento generado automáticamente por el Sistema de Ficha Social — Municipalidad de Colonia Wanda',
      PW / 2, 290, { align: 'center' }
    );
    doc.text(`Página ${pageNum} de ${totalPages}`, PW - 14, 290, { align: 'right' });
    doc.setTextColor(0);
    doc.setDrawColor(0);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA 1: PORTADA + RESUMEN GENERAL
  // ══════════════════════════════════════════════════════════════════════════
  drawHeader();

  // Título del informe
  doc.setFillColor(235, 240, 255);
  doc.rect(14, 37, PW - 28, 22, 'F');
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.4);
  doc.rect(14, 37, PW - 28, 22, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(40, 40, 120);
  doc.text('INFORME MENSUAL DE PERSONAS ATENDIDAS', PW / 2, 46, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Período: ${periodoLabel}`, PW / 2, 53, { align: 'center' });

  doc.setTextColor(0);

  // KPIs en cards (2 filas x 3 col simuladas con autoTable)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 120);
  doc.text('RESUMEN GENERAL', 14, 70);
  doc.setTextColor(0);

  const totalCasos = stats.byAreaFull?.reduce((s, r) => s + r.casos, 0) || stats.kpis.cases;
  const totalPrest = stats.byAreaFull?.reduce((s, r) => s + r.prestaciones, 0) || stats.kpis.prestations;

  doc.autoTable({
    startY: 73,
    head: [['Indicador', 'Cantidad']],
    body: [
      ['Personas asistidas', fmtNum(stats.kpis.persons)],
      ['Casos / Atenciones registradas', fmtNum(stats.kpis.cases)],
      ['Prestaciones otorgadas', fmtNum(totalPrest)],
      ['Familiares registrados', fmtNum(stats.kpis.family)],
      ['Audiencias realizadas', fmtNum(stats.kpis.audiencias)],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120 },
      1: { halign: 'center', fontStyle: 'bold', textColor: [40, 40, 120] },
    },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA 2: DETALLE POR ÁREA
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 120);
  doc.text('ATENCIONES DISCRIMINADAS POR ÁREA', 14, 42);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Período: ${periodoLabel}`, 14, 48);
  doc.setTextColor(0);

  const areaData = stats.byAreaFull || stats.byArea.map(a => ({
    name: a.name, casos: a.value, prestaciones: 0
  }));

  doc.autoTable({
    startY: 52,
    head: [['N°', 'Área', 'Casos / Atenciones', 'Prestaciones', '% del Total']],
    body: [
      ...areaData.map((r, i) => {
        const pct = totalCasos > 0 ? ((r.casos / totalCasos) * 100).toFixed(1) + '%' : '0%';
        return [i + 1, r.name, r.casos, r.prestaciones ?? 0, pct];
      }),
    ],
    foot: [['', 'TOTAL GENERAL', totalCasos, totalPrest, '100%']],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center', textColor: [40, 40, 120], fontStyle: 'bold' },
      3: { halign: 'center', textColor: [20, 120, 80] },
      4: { halign: 'center' },
    },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PÁGINA 3: PRESTACIONES + EVOLUCIÓN MENSUAL
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 120);
  const tituloPrest = filters?.prestacion
    ? `PRESTACIONES: ${filters.prestacion.toUpperCase()}`
    : 'PRESTACIONES OTORGADAS POR TIPO';
  doc.text(tituloPrest, 14, 42);
  doc.setTextColor(0);

  const totalPrestTipo = stats.topPrestations.reduce((s, p) => s + p.value, 0);

  doc.autoTable({
    startY: 46,
    head: [['N°', 'Tipo de Prestación', 'Cantidad', '% del Total']],
    body: stats.topPrestations.map((p, i) => {
      const pct = totalPrestTipo > 0 ? ((p.value / totalPrestTipo) * 100).toFixed(1) + '%' : '0%';
      return [i + 1, p.name, p.value, pct];
    }),
    foot: [['', 'TOTAL', totalPrestTipo, '100%']],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { fontStyle: 'bold' },
      2: { halign: 'center', textColor: [40, 40, 120], fontStyle: 'bold' },
      3: { halign: 'center' },
    },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  // Evolución mensual
  let y2 = doc.lastAutoTable.finalY + 12;
  if (y2 > 200) { doc.addPage(); drawHeader(); y2 = 42; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 120);
  doc.text(`EVOLUCIÓN MENSUAL — ${now.getFullYear()}`, 14, y2);
  doc.setTextColor(0);

  doc.autoTable({
    startY: y2 + 4,
    head: [['Mes', 'Cantidad de Casos']],
    body: [
      ...stats.byMonth.map(m => [m.name, m.value]),
    ],
    foot: [['Total', stats.byMonth.reduce((s, m) => s + m.value, 0)]],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', textColor: [40, 40, 120], fontStyle: 'bold' },
    },
    theme: 'grid',
    margin: { left: 14, right: 14 },
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ÚLTIMA PÁGINA: LISTADO DE ATENCIONES
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  drawHeader();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 120);
  doc.text('LISTADO DE ATENCIONES', 14, 42);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Período: ${periodoLabel}`, 14, 48);
  doc.setTextColor(0);

  doc.autoTable({
    startY: 52,
    head: [['N°', 'Fecha', 'Apellido y Nombre', 'DNI', 'Área']],
    body: stats.recentCases.map((c, i) => [
      i + 1,
      new Date(c.created_at).toLocaleDateString('es-AR'),
      c.apellido_nombre || '—',
      c.dni || '—',
      c.area_name || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 24 },
      2: { fontStyle: 'bold' },
      3: { cellWidth: 24, halign: 'center' },
      4: { cellWidth: 35 },
    },
    theme: 'grid',
    margin: { left: 14, right: 14 },
    didDrawPage: () => { drawHeader(); },
  });

  // ── Agregar pie a todas las páginas ──────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  const fechaFile = now.toISOString().split('T')[0];
  doc.save(`Informe_CIC_Wanda_${fechaFile}.pdf`);
}

async function exportarExcelDetalle(detalle, filters) {
  if (!detalle?.length) return;
  const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
  const wb = XLSX.utils.book_new();
  const now = new Date();
  const prestNombre = filters.prestacion || 'Prestaciones';
  const periodoLabel = filters.from || filters.to
    ? `${filters.from || '—'} al ${filters.to || '—'}`
    : now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const tipoViajeLbl = { ida_vuelta: 'Ida y Vuelta', solo_ida: 'Solo Ida', solo_vuelta: 'Solo Vuelta' };

  // Cabecera común
  const headers = ['N°', 'Apellido y Nombre', 'DNI', 'Área', 'Fecha Registro'];
  const extraHeaders = {
    'Pasajes de Ómnibus':   ['Destino', 'Fecha Turno', 'Tipo Viaje', 'Acompañantes', 'Motivo del Viaje'],
    'Carga de Combustible': ['Litros', 'Tipo Combustible', 'Patente', 'Destino', 'Motivo'],
    'Ayuda Medicamentos':   ['Medicamento / Tratamiento', 'Monto ($)'],
    'Módulos Alimenticios': ['Cantidad de Módulos', 'Fecha de Entrega'],
    'Viaje Móvil Social':   ['Destino', 'Fecha', 'Salida Wanda', 'Llegada Destino', 'Salida Destino', 'Llegada Wanda'],
    'Servicio Fúnebre':     ['Nombre Fallecido', 'Apellido Fallecido', 'Fecha Fallecimiento', 'Recibió Módulo'],
    'Construyendo Techo':   ['Materiales', 'Fecha Entrega'],
  };

  const extraRow = (r) => {
    if (filters.prestacion === 'Pasajes de Ómnibus')
      return [r.destino || '—', r.fecha_turno || '—', tipoViajeLbl[r.tipo_viaje] || r.tipo_viaje || '—', r.cantidad_acompanantes ?? 0, r.motivo_viaje || '—'];
    if (filters.prestacion === 'Carga de Combustible')
      return [r.cantidad_litros, r.tipo_combustible || '—', r.patente_movil || '—', r.destino || '—', r.motivo_viaje || '—'];
    if (filters.prestacion === 'Ayuda Medicamentos')
      return [r.nombre_medicamento || '—', r.monto_medicamento || 0];
    if (filters.prestacion === 'Módulos Alimenticios')
      return [r.cantidad || 0, r.fecha_entrega || '—'];
    if (filters.prestacion === 'Viaje Móvil Social')
      return [r.destino || '—', r.fecha || '—', r.hora_salida_wanda || '—', r.hora_llegada_destino || '—', r.hora_salida_destino || '—', r.hora_llegada_wanda || '—'];
    if (filters.prestacion === 'Servicio Fúnebre')
      return [r.nombre_fallecido || '—', r.apellido_fallecido || '—', r.fecha_fallecimiento || '—', r.recibio_modulo ? 'Sí' : 'No'];
    if (filters.prestacion === 'Construyendo Techo')
      return [r.items || r.resumen || '—', r.fecha_entrega || '—'];
    return [];
  };

  const allHeaders = [...headers, ...(extraHeaders[filters.prestacion] || [])];
  const rows = [
    [`C.I.C. DE COLONIA WANDA — ${prestNombre.toUpperCase()}`],
    [`Período: ${periodoLabel}`],
    [`Generado: ${now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`],
    [''],
    allHeaders,
    ...detalle.map((r, i) => [
      i + 1,
      r.caso?.apellido_nombre || '—',
      r.caso?.dni || '—',
      r.caso?.areas?.name || '—',
      new Date(r.created_at).toLocaleDateString('es-AR'),
      ...extraRow(r),
    ]),
    [''],
    [`Total de registros: ${detalle.length}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = allHeaders.map(() => ({ wch: 22 }));
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: allHeaders.length - 1 } }];
  XLSX.utils.book_append_sheet(wb, ws, prestNombre.slice(0, 30));

  const fechaFile = now.toISOString().split('T')[0];
  XLSX.writeFile(wb, `${prestNombre.replace(/ /g, '_')}_${fechaFile}.xlsx`);
}

async function exportarPDFDetalle(detalle, filters, filtroTexto) {
  if (!detalle?.length) return;
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW = 297;
  const now = new Date();
  const prestNombre = filters.prestacion || 'Prestaciones';
  const periodoLabel = filtroTexto || now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const fechaLarga = now.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });

  let escudoB64 = null;
  let cicLogoB64 = null;
  try { escudoB64 = await imgToBase64('/escudo.png'); } catch(_) {}
  try { cicLogoB64 = await imgToBase64('/cic_logo.png'); } catch(_) {}

  const drawHeader = () => {
    doc.setFillColor(22, 36, 71);
    doc.rect(0, 0, PW, 28, 'F');
    if (escudoB64) { try { doc.addImage(escudoB64, 'PNG', 6, 2, 22, 24); } catch(_) {} }
    if (cicLogoB64) { try { doc.addImage(cicLogoB64, 'PNG', PW - 30, 2, 24, 24); } catch(_) {} }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('C.I.C. DE COLONIA WANDA', PW / 2, 10, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(`${prestNombre.toUpperCase()} — ${periodoLabel}`, PW / 2, 16, { align: 'center' });
    doc.setTextColor(180, 210, 255);
    doc.setFontSize(7);
    doc.text(`Wanda, Misiones, ${fechaLarga}`, PW / 2, 22, { align: 'center' });
    doc.setDrawColor(200, 160, 40);
    doc.setLineWidth(0.5);
    doc.line(0, 28, PW, 28);
    doc.setTextColor(0); doc.setDrawColor(0); doc.setLineWidth(0.2);
  };

  const tipoViajeLbl = { ida_vuelta: 'Ida y Vuelta', solo_ida: 'Solo Ida', solo_vuelta: 'Solo Vuelta' };

  const colConfig = {
    'Pasajes de Ómnibus': {
      head: ['N°', 'Apellido y Nombre', 'DNI', 'Destino', 'Fecha Turno', 'Tipo Viaje', 'Acomp.', 'Motivo'],
      row: (r, i) => [i+1, r.caso?.apellido_nombre||'—', r.caso?.dni||'—', r.destino||'—', r.fecha_turno ? formatFecha(r.fecha_turno) : '—', tipoViajeLbl[r.tipo_viaje]||r.tipo_viaje||'—', r.cantidad_acompanantes??0, r.motivo_viaje||'—'],
    },
    'Carga de Combustible': {
      head: ['N°', 'Apellido y Nombre', 'DNI', 'Litros', 'Tipo', 'Patente', 'Destino', 'Motivo'],
      row: (r, i) => [i+1, r.caso?.apellido_nombre||'—', r.caso?.dni||'—', r.cantidad_litros, r.tipo_combustible||'—', r.patente_movil||'—', r.destino||'—', r.motivo_viaje||'—'],
    },
    'Ayuda Medicamentos': {
      head: ['N°', 'Apellido y Nombre', 'DNI', 'Área', 'Medicamento / Tratamiento', 'Monto ($)'],
      row: (r, i) => [i+1, r.caso?.apellido_nombre||'—', r.caso?.dni||'—', r.caso?.areas?.name||'—', r.nombre_medicamento||'—', r.monto_medicamento||0],
    },
    'Módulos Alimenticios': {
      head: ['N°', 'Apellido y Nombre', 'DNI', 'Área', 'Cantidad', 'Fecha Entrega'],
      row: (r, i) => [i+1, r.caso?.apellido_nombre||'—', r.caso?.dni||'—', r.caso?.areas?.name||'—', r.cantidad||0, r.fecha_entrega ? formatFecha(r.fecha_entrega) : '—'],
    },
    'Viaje Móvil Social': {
      head: ['N°', 'Apellido y Nombre', 'DNI', 'Destino', 'Fecha', 'Salida Wanda', 'Llegada Dest.', 'Salida Dest.', 'Llegada Wanda'],
      row: (r, i) => [i+1, r.caso?.apellido_nombre||'—', r.caso?.dni||'—', r.destino||'—', r.fecha ? formatFecha(r.fecha) : '—', r.hora_salida_wanda||'—', r.hora_llegada_destino||'—', r.hora_salida_destino||'—', r.hora_llegada_wanda||'—'],
    },
    'Servicio Fúnebre': {
      head: ['N°', 'Apellido y Nombre', 'DNI', 'Fallecido', 'Fecha Fallec.', 'Recibió Módulo'],
      row: (r, i) => [i+1, r.caso?.apellido_nombre||'—', r.caso?.dni||'—', `${r.nombre_fallecido||''} ${r.apellido_fallecido||''}`.trim()||'—', r.fecha_fallecimiento ? formatFecha(r.fecha_fallecimiento) : '—', r.recibio_modulo ? 'Sí' : 'No'],
    },
    'Construyendo Techo': {
      head: ['N°', 'Apellido y Nombre', 'DNI', 'Área', 'Materiales', 'Fecha'],
      row: (r, i) => [i+1, r.caso?.apellido_nombre||'—', r.caso?.dni||'—', r.caso?.areas?.name||'—', r.items || r.resumen || '—', r.fecha_entrega ? formatFecha(r.fecha_entrega) : '—'],
    },
  };

  const cfg = colConfig[filters.prestacion] || {
    head: ['N°', 'Apellido y Nombre', 'DNI', 'Área', 'Fecha'],
    row: (r, i) => [i+1, r.caso?.apellido_nombre||'—', r.caso?.dni||'—', r.caso?.areas?.name||'—', new Date(r.created_at).toLocaleDateString('es-AR')],
  };

  drawHeader();

  doc.autoTable({
    startY: 33,
    head: [cfg.head],
    body: detalle.map((r, i) => cfg.row(r, i)),
    foot: [[`Total: ${detalle.length} registros`, ...Array(cfg.head.length - 1).fill('')]],
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: [22, 36, 71], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    theme: 'grid',
    margin: { left: 10, right: 10 },
    didDrawPage: () => { drawHeader(); },
  });

  // Pie de páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 200, PW, 10, 'F');
    doc.setDrawColor(200, 160, 40);
    doc.line(0, 200, PW, 200);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100);
    doc.text('Documento generado automáticamente — Sistema de Ficha Social — Municipalidad de Colonia Wanda', PW / 2, 205, { align: 'center' });
    doc.text(`Página ${i} de ${totalPages}`, PW - 10, 205, { align: 'right' });
    doc.setTextColor(0); doc.setDrawColor(0);
  }

  const fechaFile = now.toISOString().split('T')[0];
  doc.save(`${prestNombre.replace(/ /g, '_')}_${fechaFile}.pdf`);
}

// Mapear resumen a las columnas específicas en base al texto generado por las vistas
function parseResumen(nombre, resumen, caso, created_at) {
  const parts = resumen ? resumen.split(' | ') : [];
  
  if (nombre === 'Pasajes de Ómnibus') {
    const destino = parts[0] ? parts[0].replace('Destino: ', '').trim() : '—';
    const tipo_viaje = parts[1] ? parts[1].trim() : '—';
    const cantidad_acompanantes = parts[2] ? parseInt(parts[2].replace('Acomp: ', '').trim(), 10) : 0;
    
    return {
      destino,
      fecha_turno: created_at,
      tipo_viaje,
      cantidad_acompanantes,
      motivo_viaje: caso?.motivo || '—'
    };
  }
  
  if (nombre === 'Carga de Combustible') {
    const litrosPart = parts.find(p => p.toLowerCase().includes('litros'));
    const cantidad_litros = litrosPart ? parseFloat(litrosPart.replace(/[^\d.]/g, '')) : 0;
    
    const tipo = parts.find(p => p.toLowerCase() === 'nafta' || p.toLowerCase() === 'gasoil' || p.toLowerCase() === 'gnc') || '—';
    
    const patentePart = parts.find(p => p.toLowerCase().includes('patente'));
    const patente_movil = patentePart ? patentePart.replace(/patente:/i, '').trim() : '—';
    
    const destPart = parts.find(p => p.toLowerCase().includes('destino'));
    const destino = destPart ? destPart.replace(/destino:/i, '').trim() : '—';
    
    return {
      cantidad_litros,
      tipo_combustible: tipo,
      patente_movil,
      destino,
      motivo_viaje: caso?.motivo || '—'
    };
  }
  
  if (nombre === 'Ayuda Medicamentos') {
    const medPart = parts.find(p => p.toLowerCase().includes('medicamento'));
    const nombre_medicamento = medPart ? medPart.replace(/medicamento:/i, '').trim() : (resumen || '—');
    
    const costoPart = parts.find(p => p.toLowerCase().includes('costo') || p.toLowerCase().includes('monto'));
    const monto_medicamento = costoPart ? parseFloat(costoPart.replace(/[^\d.]/g, '')) : 0;
    
    return {
      nombre_medicamento,
      monto_medicamento
    };
  }
  
  if (nombre === 'Módulos Alimenticios') {
    const mParts = resumen ? resumen.split(' — ') : [];
    const cantPart = mParts.find(p => p.toLowerCase().includes('cantidad'));
    const cantidad = cantPart ? parseInt(cantPart.replace(/[^\d]/g, ''), 10) : 0;
    
    const entPart = mParts.find(p => p.toLowerCase().includes('entrega'));
    const fecha_entrega = entPart ? entPart.replace(/entrega:/i, '').trim() : '—';
    
    return {
      cantidad,
      fecha_entrega
    };
  }
  
  if (nombre === 'Viaje Móvil Social') {
    const destPart = parts.find(p => p.toLowerCase().includes('destino'));
    const destino = destPart ? destPart.replace(/destino:/i, '').trim() : '—';
    
    const fechaPart = parts.find(p => p.toLowerCase().includes('fecha'));
    const fecha = fechaPart ? fechaPart.replace(/fecha:/i, '').trim() : '—';
    
    return {
      destino,
      fecha: fecha || created_at,
      hora_salida_wanda: '—',
      hora_llegada_wanda: '—'
    };
  }
  
  if (nombre === 'Servicio Fúnebre') {
    const fallPart = parts.find(p => p.toLowerCase().includes('fallecido'));
    const nombre_fallecido = fallPart ? fallPart.replace(/fallecido:/i, '').trim() : '—';
    
    const fechaPart = parts.find(p => p.toLowerCase().includes('fecha'));
    const fecha_fallecimiento = fechaPart ? fechaPart.replace(/fecha:/i, '').trim() : '—';
    
    return {
      nombre_fallecido,
      apellido_fallecido: '',
      fecha_fallecimiento,
      recibio_modulo: resumen && resumen.toLowerCase().includes('modulo')
    };
  }
  
  if (nombre === 'Construyendo Techo') {
    const chapaPart = parts.find(p => p.toLowerCase().includes('chapa') || p.toLowerCase().includes('zinc'));
    const chapa_zinc = chapaPart ? parseInt(chapaPart.replace(/[^\d]/g, ''), 10) : 0;
    
    const tirPart = parts.find(p => p.toLowerCase().includes('tirantes'));
    const tirantes = tirPart ? parseInt(tirPart.replace(/[^\d]/g, ''), 10) : 0;
    
    return {
      chapa_zinc,
      tirantes,
      fecha_entrega: created_at
    };
  }
  
  return {};
}

// ─── Componente principal ────────────────────────────────────────────────────

const StatsDashboard = ({ areas }) => {
  const [filters, setFilters] = useState({ from: '', to: '', areaId: '', prestacion: '' });
  const [prestacionDetalle, setPrestacionDetalle] = useState([]);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [prestacionesList, setPrestacionesList] = useState([]);
  const [stats, setStats]     = useState({
    kpis: { persons: 0, cases: 0, prestations: 0, family: 0, audiencias: 0 },
    byArea: [], byMonth: [], topPrestations: [], recentCases: [], recentPrestations: [],
    byAreaFull: []
  });
  const [loading, setLoading]       = useState(false);
  const [exporting, setExporting]   = useState('');
  const [loaded, setLoaded]         = useState(false);

  // Cargar prestaciones disponibles al montar
  useEffect(() => {
    const loadPrestaciones = async () => {
      try {
        const { data } = await supabase
          .from('todas_las_prestaciones')
          .select('nombre_prestacion')
          .order('nombre_prestacion');
        if (data) {
          const unique = [...new Set(data.map(p => p.nombre_prestacion).filter(Boolean))];
          setPrestacionesList(unique);
        }
      } catch (err) {
        console.error('Error cargando prestaciones para filtro:', err);
      }
    };
    loadPrestaciones();
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      // ── Queries base ──────────────────────────────────────────────────────

      let casesQ = supabase.from('cases').select('*', { count: 'exact', head: true });
      let prestQ = supabase.from('todas_las_prestaciones').select('*', { count: 'exact', head: true });
      if (filters.from)   { casesQ = casesQ.gte('created_at', filters.from); prestQ = prestQ.gte('created_at', filters.from); }
      if (filters.to)     { casesQ = casesQ.lte('created_at', filters.to + 'T23:59:59'); prestQ = prestQ.lte('created_at', filters.to + 'T23:59:59'); }
      if (filters.areaId) { casesQ = casesQ.eq('area_id', filters.areaId); }
      if (filters.prestacion) { prestQ = prestQ.eq('nombre_prestacion', filters.prestacion); }

      const [persons, cases, prestations, family, audiencias] = await Promise.all([
        supabase.from('persons').select('*', { count: 'exact', head: true }),
        casesQ,
        prestQ,
        supabase.from('family_members').select('*', { count: 'exact', head: true }),
        supabase.from('audiencias').select('*', { count: 'exact', head: true }),
      ]);

      // ── Obtener casos filtrados ───────────────────────────────────────────
      // BUG FIX 1: cuando hay filtro de prestación, obtener los case_ids primero
      // y si no hay resultados retornar vacío (sin usar .eq('id','null') inválido)
      let casosFull = [];

      if (filters.prestacion) {
        let prestCasesQ = supabase
          .from('todas_las_prestaciones')
          .select('case_id')
          .eq('nombre_prestacion', filters.prestacion);
        if (filters.from) prestCasesQ = prestCasesQ.gte('created_at', filters.from);
        if (filters.to)   prestCasesQ = prestCasesQ.lte('created_at', filters.to + 'T23:59:59');
        const { data: prestCasesData } = await prestCasesQ;
        const caseIds = [...new Set((prestCasesData || []).map(p => p.case_id).filter(Boolean))];

        if (caseIds.length > 0) {
          let q = supabase.from('cases').select('id, area_id, areas!area_id(name)').in('id', caseIds);
          if (filters.areaId) q = q.eq('area_id', filters.areaId);
          const { data } = await q;
          casosFull = data || [];
        }
        // Si caseIds.length === 0: casosFull queda [] sin hacer query inválida
      } else {
        let q = supabase.from('cases').select('id, area_id, areas!area_id(name)');
        if (filters.from)   q = q.gte('created_at', filters.from);
        if (filters.to)     q = q.lte('created_at', filters.to + 'T23:59:59');
        if (filters.areaId) q = q.eq('area_id', filters.areaId);
        const { data } = await q;
        casosFull = data || [];
      }

      const byAreaMap = {};
      casosFull.forEach(c => {
        const name = c.areas?.name || 'Sin área';
        byAreaMap[name] = (byAreaMap[name] || 0) + 1;
      });
      const byArea = Object.entries(byAreaMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // ── Evolución mensual ─────────────────────────────────────────────────

      const anioActual = new Date().getFullYear();
      let casosAnioQ = supabase.from('cases').select('created_at').gte('created_at', `${anioActual}-01-01`);
      if (filters.areaId) casosAnioQ = casosAnioQ.eq('area_id', filters.areaId);
      const { data: casosAnio } = await casosAnioQ;

      const byMonthMap = {};
      (casosAnio || []).forEach(c => {
        const mes = new Date(c.created_at).getMonth();
        byMonthMap[mes] = (byMonthMap[mes] || 0) + 1;
      });
      const mesActual = new Date().getMonth();
      const byMonth = Array.from({ length: mesActual + 1 }, (_, i) => ({
        name: MESES_CORTOS[i],
        value: byMonthMap[i] || 0,
      }));

      // ── Top prestaciones ──────────────────────────────────────────────────

      let prestFullQ = supabase.from('todas_las_prestaciones').select('nombre_prestacion');
      if (filters.from) prestFullQ = prestFullQ.gte('created_at', filters.from);
      if (filters.to)   prestFullQ = prestFullQ.lte('created_at', filters.to + 'T23:59:59');
      const { data: prestFull } = await prestFullQ;

      const prestMap = {};
      (prestFull || []).forEach(p => {
        const name = p.nombre_prestacion || 'Sin nombre';
        prestMap[name] = (prestMap[name] || 0) + 1;
      });
      const topPrestations = Object.entries(prestMap)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      // ── Detalle completo por área ─────────────────────────────────────────
      // Construir mapa case_id → areaName desde los casos ya cargados
      const caseAreaMap = {};
      casosFull.forEach(c => { caseAreaMap[c.id] = c.areas?.name || 'Sin área'; });

      let prestAreaQ = supabase
        .from('todas_las_prestaciones')
        .select('case_id, nombre_prestacion');
      if (filters.from) prestAreaQ = prestAreaQ.gte('created_at', filters.from);
      if (filters.to)   prestAreaQ = prestAreaQ.lte('created_at', filters.to + 'T23:59:59');
      if (filters.prestacion) prestAreaQ = prestAreaQ.eq('nombre_prestacion', filters.prestacion);
      const { data: prestArea } = await prestAreaQ;

      // Mapa: areaName -> { casos, prestaciones }
      const areaDetailMap = {};

      casosFull.forEach(c => {
        const name = c.areas?.name || 'Sin área';
        if (!areaDetailMap[name]) areaDetailMap[name] = { name, casos: 0, prestaciones: 0 };
        areaDetailMap[name].casos += 1;
      });

      (prestArea || []).forEach(p => {
        const name = caseAreaMap[p.case_id] || null;
        if (!name) return; // ignorar prestaciones fuera del filtro de área/prestación
        if (!areaDetailMap[name]) areaDetailMap[name] = { name, casos: 0, prestaciones: 0 };
        areaDetailMap[name].prestaciones += 1;
      });

      const byAreaFull = Object.values(areaDetailMap).sort((a, b) => b.casos - a.casos);

      // ── Actividad reciente ────────────────────────────────────────────────

      let recentCasesQ = supabase.from('cases').select('id, person_id, created_at, area_id, motivo, solucion, domicilio, areas!area_id(name), persons!person_id(dni, apellido_nombre)');
      if (filters.from)   recentCasesQ = recentCasesQ.gte('created_at', filters.from);
      if (filters.to)     recentCasesQ = recentCasesQ.lte('created_at', filters.to + 'T23:59:59');
      if (filters.areaId) recentCasesQ = recentCasesQ.eq('area_id', filters.areaId);

      let recentPrestQ = supabase.from('todas_las_prestaciones').select('*');
      if (filters.from)      recentPrestQ = recentPrestQ.gte('created_at', filters.from);
      if (filters.to)        recentPrestQ = recentPrestQ.lte('created_at', filters.to + 'T23:59:59');
      if (filters.prestacion) recentPrestQ = recentPrestQ.eq('nombre_prestacion', filters.prestacion);

      const [recentCases, recentPrestations] = await Promise.all([
        recentCasesQ.order('created_at', { ascending: false }).limit(8),
        recentPrestQ.order('created_at', { ascending: false }).limit(8),
      ]);

      // DEBUG TEMPORAL — ver qué devuelve Supabase
      console.log('[DEBUG recentCases] raw:', recentCases.data?.[0]);
      console.log('[DEBUG recentCases] error:', recentCases.error);

      // Mapear campos desde los joins a areas y persons
      const recentCasesData = recentCases.data?.map(c => ({
        ...c,
        area_name:       c.areas?.name,
        dni:             c.persons?.dni,
        apellido_nombre: c.persons?.apellido_nombre,
        // domicilio ya viene directamente de cases
      })) || [];

      console.log('[DEBUG recentCasesData] primer registro:', recentCasesData[0]);

      setStats({
        kpis: {
          persons:     persons.count     || 0,
          cases:       cases.count       || 0,
          prestations: prestations.count || 0,
          family:      family.count      || 0,
          audiencias:  audiencias.count  || 0,
        },
        byArea,
        byMonth,
        topPrestations,
        recentCases:       recentCasesData || [],
        recentPrestations: recentPrestations.data || [],
        byAreaFull,
      });

      // ── Detalle específico cuando hay filtro de prestación ────────────────
      let detalleData = [];
      if (filters.prestacion) {
        const tablaMap = {
          'Pasajes de Ómnibus':   { tabla: 'cic_pasajes',             fk: 'ficha_id' },
          'Carga de Combustible': { tabla: 'cic_combustible',         fk: 'case_id'  },
          'Ayuda Medicamentos':   { tabla: 'cic_medicamentos',        fk: 'case_id'  },
          'Módulos Alimenticios': { tabla: 'as_modulos_alimenticios', fk: 'case_id'  },
          'Viaje Móvil Social':   { tabla: 'as_viajes_movil',         fk: 'case_id'  },
          'Servicio Fúnebre':     { tabla: 'as_funebre',              fk: 'case_id'  },
          'Construyendo Techo':   { tabla: 'as_construyendo_techo',   fk: 'case_id'  },
        };

        const config = tablaMap[filters.prestacion];
        if (config) {
          let detalleRaw = [];
          
          // 1) Intentar consultar directamente la tabla específica
          let detalleQ = supabase.from(config.tabla).select('*');
          if (filters.from) detalleQ = detalleQ.gte('created_at', filters.from);
          if (filters.to)   detalleQ = detalleQ.lte('created_at', filters.to + 'T23:59:59');
          const { data: rawDirect, error: errDirect } = await detalleQ;

          if (!errDirect && rawDirect?.length) {
            detalleRaw = rawDirect;
          } else {
            // 2) Fallback: Si la tabla específica está bloqueada por RLS o vacía,
            // consultamos la vista 'todas_las_prestaciones' que sí tiene permisos.
            let fallbackQ = supabase
              .from('todas_las_prestaciones')
              .select('*')
              .eq('nombre_prestacion', filters.prestacion);
            
            if (filters.from) fallbackQ = fallbackQ.gte('created_at', filters.from);
            if (filters.to)   fallbackQ = fallbackQ.lte('created_at', filters.to + 'T23:59:59');
            const { data: rawFallback, error: errFallback } = await fallbackQ;

            if (errFallback) {
              console.error('Error fallback todas_las_prestaciones:', errFallback);
            } else if (rawFallback?.length) {
              detalleRaw = rawFallback.map(r => ({
                ...r,
                [config.fk]: r.case_id,
              }));
            }
          }

          if (detalleRaw?.length) {
            const caseIds = [...new Set(detalleRaw.map(r => r[config.fk]).filter(Boolean))];

            // Joinear persons para obtener apellido_nombre y dni
            const { data: casosConPersona, error: casosErr } = await supabase
              .from('cases')
              .select('id, motivo, area_id, areas!area_id(name), persona:persons!person_id(apellido_nombre, dni)')
              .in('id', caseIds);

            if (casosErr) console.error('Error casos detalle:', casosErr);

            const caseMap = {};
            (casosConPersona || []).forEach(c => {
              caseMap[c.id] = {
                ...c,
                apellido_nombre: c.persona?.apellido_nombre || '—',
                dni:             c.persona?.dni             || '—',
              };
            });

            detalleData = detalleRaw.map(r => {
              const casoObj = caseMap[r[config.fk]] || {};
              
              // Si el registro proviene del fallback (tiene resumen y no campos individuales),
              // parseamos el resumen para rellenar los campos individuales requeridos por el modal
              let parsedFields = {};
              if (r.resumen && !r.destino && !r.cantidad_litros && !r.nombre_medicamento && !r.cantidad && !r.nombre_fallecido && !r.chapa_zinc) {
                parsedFields = parseResumen(filters.prestacion, r.resumen, casoObj, r.created_at);
              }

              return {
                ...r,
                ...parsedFields,
                caso: casoObj,
              };
            });
          }
        }
      }
      setPrestacionDetalle(detalleData);

      setLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { loadStats(); }, [filters.prestacion, filters.from, filters.to, filters.areaId]);

  const filtroTexto = [
    filters.from && `Desde ${filters.from}`,
    filters.to   && `Hasta ${filters.to}`,
    filters.areaId && areas.find(a => a.id === filters.areaId)?.name,
    filters.prestacion && `Prestación: ${filters.prestacion}`,
  ].filter(Boolean).join(' · ');

  const handleExportExcel = async () => {
    setExporting('excel');
    try { await exportarExcel(stats, filters, areas); }
    catch (e) { console.error(e); alert('Error al exportar Excel: ' + e.message); }
    finally { setExporting(''); }
  };

  const handleExportPDF = async () => {
    setExporting('pdf');
    try { await exportarPDF(stats, filtroTexto, filters); }
    catch (e) { console.error(e); alert('Error al exportar PDF: ' + e.message); }
    finally { setExporting(''); }
  };

  const renderDetalleModal = () => {
    if (!showDetalleModal) return null;
    
    const esPasajes = filters.prestacion === 'Pasajes de Ómnibus';
    const esCombustible = filters.prestacion === 'Carga de Combustible';
    const esMedicamentos = filters.prestacion === 'Ayuda Medicamentos';
    const esModulos = filters.prestacion === 'Módulos Alimenticios';
    const esViajes = filters.prestacion === 'Viaje Móvil Social';
    const esFunebre = filters.prestacion === 'Servicio Fúnebre';
    const esTecho = filters.prestacion === 'Construyendo Techo';

    const tipoViajeLbl = { ida_vuelta: 'Ida y Vuelta', solo_ida: 'Solo Ida', solo_vuelta: 'Solo Vuelta' };

    return (
      <div className="fixed inset-0 lg:left-72 bg-black/70 backdrop-blur-sm z-1000 flex items-center justify-center p-4"
           onClick={() => setShowDetalleModal(false)}>
        <div className="bg-(--card) border border-(--border) rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl"
             onClick={e => e.stopPropagation()}>
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wide">
                {filters.prestacion}
              </h2>
              <p className="text-[10px] text-muted mt-0.5">
                {prestacionDetalle.length} registro{prestacionDetalle.length !== 1 ? 's' : ''} 
                {filtroTexto ? ` · ${filtroTexto}` : ''}
              </p>
            </div>
            <button onClick={() => setShowDetalleModal(false)}
                    className="secondary py-1.5! px-4! text-xs">
              Cerrar
            </button>
          </div>

          {/* Tabla scrolleable */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {prestacionDetalle.length === 0 ? (
              <p className="text-center py-16 text-muted text-xs italic">Sin registros para este período.</p>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-(--card) border-b border-white/8">
                  <tr>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">N°</th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Apellido y Nombre</th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">DNI</th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Área</th>
                    {esPasajes && <>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Destino</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Fecha Turno</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Tipo Viaje</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Acomp.</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Motivo</th>
                    </>}
                    {esCombustible && <>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Litros</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Tipo</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Destino</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Motivo</th>
                    </>}
                    {esMedicamentos && <>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Medicamento</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Monto</th>
                    </>}
                    {esModulos && <>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Cantidad</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Fecha Entrega</th>
                    </>}
                    {esViajes && <>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Destino</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Fecha</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Salida</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Regreso</th>
                    </>}
                    {esFunebre && <>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Fallecido</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Fecha</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Módulo</th>
                    </>}
                    {esTecho && <>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Materiales</th>
                      <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Fecha</th>
                    </>}
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-muted font-black">Registrado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {prestacionDetalle.map((r, i) => (
                    <tr key={r.id} className="hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3 text-white/30 font-mono">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-white whitespace-nowrap">{r.caso?.apellido_nombre || '—'}</td>
                      <td className="px-4 py-3 font-mono text-muted">{r.caso?.dni || '—'}</td>
                      <td className="px-4 py-3"><span className="pill text-[9px]">{r.caso?.areas?.name || '—'}</span></td>
                      {esPasajes && <>
                        <td className="px-4 py-3 text-white/80">{r.destino || '—'}</td>
                        <td className="px-4 py-3 font-mono text-accent">{r.fecha_turno ? formatFecha(r.fecha_turno) : '—'}</td>
                        <td className="px-4 py-3 text-white/70">{tipoViajeLbl[r.tipo_viaje] || r.tipo_viaje || '—'}</td>
                        <td className="px-4 py-3 text-center text-white/70">{r.cantidad_acompanantes ?? 0}</td>
                        <td className="px-4 py-3 text-white/60 max-w-[200px] truncate" title={r.motivo_viaje}>{r.motivo_viaje || '—'}</td>
                      </>}
                      {esCombustible && <>
                        <td className="px-4 py-3 text-accent font-bold">{r.cantidad_litros} lts</td>
                        <td className="px-4 py-3 text-white/70 capitalize">{r.tipo_combustible || '—'}</td>
                        <td className="px-4 py-3 text-white/80">{r.destino || '—'}</td>
                        <td className="px-4 py-3 text-white/60 max-w-[150px] truncate" title={r.motivo_viaje}>{r.motivo_viaje || '—'}</td>
                      </>}
                      {esMedicamentos && <>
                        <td className="px-4 py-3 text-white/80">{r.nombre_medicamento || '—'}</td>
                        <td className="px-4 py-3 text-accent font-mono">${r.monto_medicamento?.toLocaleString('es-AR') || '0'}</td>
                      </>}
                      {esModulos && <>
                        <td className="px-4 py-3 text-accent font-bold text-center">{r.cantidad}</td>
                        <td className="px-4 py-3 font-mono text-white/70">{r.fecha_entrega ? formatFecha(r.fecha_entrega) : '—'}</td>
                      </>}
                      {esViajes && <>
                        <td className="px-4 py-3 text-white/80">{r.destino || '—'}</td>
                        <td className="px-4 py-3 font-mono text-accent">{r.fecha ? formatFecha(r.fecha) : '—'}</td>
                        <td className="px-4 py-3 font-mono text-white/60">{r.hora_salida_wanda || '—'}</td>
                        <td className="px-4 py-3 font-mono text-white/60">{r.hora_llegada_wanda || '—'}</td>
                      </>}
                      {esFunebre && <>
                        <td className="px-4 py-3 text-white/80">{r.nombre_fallecido} {r.apellido_fallecido}</td>
                        <td className="px-4 py-3 font-mono text-white/70">{r.fecha_fallecimiento ? formatFecha(r.fecha_fallecimiento) : '—'}</td>
                        <td className="px-4 py-3 text-center">{r.recibio_modulo ? '✓' : '—'}</td>
                      </>}
                      {esTecho && <>
                        <td className="px-4 py-3 text-white/80 max-w-[300px]" title={r.items || r.resumen}>{r.items || r.resumen || '—'}</td>
                        <td className="px-4 py-3 font-mono text-white/70">{r.fecha_entrega ? formatFecha(r.fecha_entrega) : '—'}</td>
                      </>}
                      <td className="px-4 py-3 font-mono text-white/30 text-[10px]">{new Date(r.created_at).toLocaleDateString('es-AR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer con totales */}
          <div className="px-6 py-3 border-t border-white/8 flex items-center justify-between">
            <p className="text-[10px] text-muted">
              Total: <span className="text-white font-bold">{prestacionDetalle.length}</span> registros
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { exportarExcelDetalle(prestacionDetalle, filters); }}
                className="secondary py-1.5! px-4! text-xs flex items-center gap-1.5"
              >
                ⬇ Excel
              </button>
              <button
                onClick={() => { exportarPDFDetalle(prestacionDetalle, filters, filtroTexto); }}
                className="secondary py-1.5! px-4! text-xs flex items-center gap-1.5"
              >
                ⬇ PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderDetalleModal()}
      <section className="space-y-6 fade-in">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Estadísticas</h2>
          <p className="text-xs text-muted mt-1">Indicadores clave del sistema municipal</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportExcel}
            disabled={!loaded || !!exporting}
            className="flex items-center gap-2 py-2 px-4 text-sm rounded-xl border border-teal-500/25 bg-teal-500/8 text-teal-400 hover:bg-teal-500/15 transition-all disabled:opacity-40"
          >
            {exporting === 'excel' ? '⏳' : '⬇'} Excel
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!loaded || !!exporting}
            className="flex items-center gap-2 py-2 px-4 text-sm rounded-xl border border-red-500/25 bg-red-500/8 text-red-400 hover:bg-red-500/15 transition-all disabled:opacity-40"
          >
            {exporting === 'pdf' ? '⏳' : '⬇'} PDF
          </button>
          <button onClick={loadStats} disabled={loading} className="primary py-2 px-4 text-sm disabled:opacity-50">
            {loading ? 'Cargando...' : 'Aplicar'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card py-4 px-5">
        <p className="text-[10px] text-muted uppercase tracking-widest mb-3">Filtros</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label>Fecha desde</label>
            <input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label>Fecha hasta</label>
            <input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
          <div>
            <label>Área</label>
            <select value={filters.areaId} onChange={e => setFilters(f => ({ ...f, areaId: e.target.value }))}>
              <option value="">Todas las áreas</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 mt-4">
          <div>
            <label>Prestación</label>
            <select value={filters.prestacion} onChange={e => setFilters(f => ({ ...f, prestacion: e.target.value }))}>
              <option value="">Todas las prestaciones</option>
              {prestacionesList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {filters.prestacion && (
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => setShowDetalleModal(true)}
              disabled={loading}
              className="primary py-2! px-5! text-xs font-black uppercase tracking-widest flex items-center gap-2"
            >
              📋 Ver detalle ({prestacionDetalle.length} registros)
            </button>
          </div>
        )}
        {filtroTexto && (
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[10px] text-accent bg-accent2/10 border border-accent/20 rounded-full px-3 py-1">{filtroTexto}</span>
            <button onClick={() => setFilters({ from: '', to: '', areaId: '', prestacion: '' })} className="text-[10px] text-muted hover:text-white transition-colors">
              × Limpiar
            </button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Personas asistidas"    value={stats.kpis.persons}     icon="👤" color="indigo" />
        <KpiCard label="Casos cargados"        value={stats.kpis.cases}       icon="📋" color="teal"   />
        <KpiCard label="Prestaciones"          value={stats.kpis.prestations} icon="🤝" color="amber"  />
        <KpiCard label="Familiares"            value={stats.kpis.family}      icon="👨‍👩‍👧" color="purple" />
        <KpiCard label="Audiencias"            value={stats.kpis.audiencias}  icon="🗓" color="indigo" />
      </div>

      {/* Gráficos fila 1 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Casos por área</h3>
              <p className="text-[10px] text-muted mt-0.5">Total según filtros aplicados</p>
            </div>
            <span className="pill">{stats.byArea.length} áreas</span>
          </div>
          {loading
            ? <div className="text-center py-8 text-muted text-xs opacity-50">Cargando...</div>
            : <BarChart data={stats.byArea} color="#818cf8" />
          }
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">Prestaciones más frecuentes</h3>
              <p className="text-[10px] text-muted mt-0.5">Según filtros aplicados</p>
            </div>
            <span className="pill">{stats.topPrestations.length} tipos</span>
          </div>
          {loading
            ? <div className="text-center py-8 text-muted text-xs opacity-50">Cargando...</div>
            : <BarChart data={stats.topPrestations} color="#5eead4" />
          }
        </div>
      </div>

      {/* Evolución mensual */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Evolución mensual de casos</h3>
            <p className="text-[10px] text-muted mt-0.5">Año {new Date().getFullYear()}</p>
          </div>
          <span className="pill">
            {stats.byMonth.reduce((s, m) => s + m.value, 0)} casos totales
          </span>
        </div>
        {loading
          ? <div className="text-center py-8 text-muted text-xs opacity-50">Cargando...</div>
          : <SparkArea data={stats.byMonth} />
        }
      </div>

      {/* Comparativa por área */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Actividad por área</h3>
            <p className="text-[10px] text-muted mt-0.5">
              Casos y prestaciones discriminados por área según filtros
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-accent/70" />
              <span className="text-[10px] text-muted">Casos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-400/70" />
              <span className="text-[10px] text-muted">Prestaciones</span>
            </div>
            <span className="pill">{stats.byAreaFull.length} áreas</span>
          </div>
        </div>
        {loading
          ? <div className="text-center py-8 text-muted text-xs opacity-50">Cargando...</div>
          : <AreaCompareTable data={stats.byAreaFull} />
        }
      </div>

      {/* Actividad reciente */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Casos recientes</h3>
          {stats.recentCases.length === 0 ? (
            <p className="text-muted text-xs text-center py-6">Sin casos recientes</p>
          ) : (
            <div className="space-y-2">
              {stats.recentCases.map((c, i) => (
                <div key={c.id || i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-accent2/12 flex items-center justify-center text-accent text-xs font-bold shrink-0">
                    {c.apellido_nombre?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{c.apellido_nombre || '—'}</p>
                    <p className="text-muted text-[10px]">{c.area_name || '—'} · {new Date(c.created_at).toLocaleDateString('es-AR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-white mb-4">Prestaciones recientes</h3>
          {stats.recentPrestations.length === 0 ? (
            <p className="text-muted text-xs text-center py-6">Sin prestaciones recientes</p>
          ) : (
            <div className="space-y-2">
              {stats.recentPrestations.map((p, i) => (
                <div key={p.id || i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/12 flex items-center justify-center text-teal-400 text-xs font-bold shrink-0">
                    🤝
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{p.prestacion_nombre || p.nombre_prestacion || '—'}</p>
                    <p className="text-muted text-[10px]">{p.apellido_nombre || p.person_nombre || '—'} · {new Date(p.created_at).toLocaleDateString('es-AR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      </section>
    </>
  );
};

export default StatsDashboard;