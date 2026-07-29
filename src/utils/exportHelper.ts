import { InventoryInsightsResponse } from "../types";

export interface ExportOptions {
  format: "excel" | "csv";
  includeSummary: boolean;
  includeProducts: boolean;
  includeTrends: boolean;
  includeAbc: boolean;
  includeStockHealth: boolean;
  includeMovement: boolean;
}

const escapeXml = (str: string | number | boolean | null | undefined): string => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

const escapeCsv = (val: string | number | boolean | null | undefined): string => {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function generateExportData(data: InventoryInsightsResponse, options: ExportOptions) {
  const dateStr = new Date().toISOString().split("T")[0];
  const filename = `Inventory_Insights_Report_${dateStr}.${options.format === "excel" ? "xls" : "csv"}`;

  if (options.format === "excel") {
    const xmlContent = generateExcelXmlContent(data, options);
    const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel;charset=utf-8" });
    triggerDownload(blob, filename);
  } else {
    const csvContent = generateCsvContent(data, options);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, filename);
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function generateCsvContent(data: InventoryInsightsResponse, options: ExportOptions): string {
  const lines: string[] = [];
  const now = new Date().toLocaleString();

  lines.push("===============================================================================");
  lines.push(`INVENTORY INSIGHTS & PERFORMANCE EXECUTIVE REPORT`);
  lines.push(`Generated On: ${now}`);
  lines.push("===============================================================================");
  lines.push("");

  // Section 1: Executive Summary
  if (options.includeSummary && data.executiveSummary) {
    const es = data.executiveSummary;
    lines.push("--- EXECUTIVE KPI SUMMARY ---");
    lines.push(`Metric,Value,Period Change %,Comparison Window`);
    lines.push(`Total SKUs / Products,${es.totalProducts?.value || 0},${es.totalProducts?.changePct || 0}%,${escapeCsv((es.totalProducts as any)?.periodLabel || 'vs prior period')}`);
    lines.push(`Total Inventory Asset Value ($),${es.totalInventoryValue?.value || 0},${es.totalInventoryValue?.changePct || 0}%,${escapeCsv((es.totalInventoryValue as any)?.periodLabel || 'vs prior period')}`);
    lines.push(`Total Period Revenue ($),${es.revenue?.value || 0},${es.revenue?.changePct || 0}%,${escapeCsv((es.revenue as any)?.periodLabel || 'vs prior period')}`);
    lines.push(`Gross Profit ($),${es.grossProfit?.value || 0},${es.grossProfit?.changePct || 0}%,${escapeCsv((es.grossProfit as any)?.periodLabel || 'vs prior period')}`);
    lines.push(`Annualized Turnover Rate,${es.inventoryTurnoverRate?.value || 0},${es.inventoryTurnoverRate?.changePct || 0}%,${escapeCsv((es.inventoryTurnoverRate as any)?.periodLabel || 'vs prior period')}`);
    lines.push("");
  }

  // Section 2: Detailed Product Performance
  if (options.includeProducts && data.productPerformance) {
    lines.push("--- PRODUCT PERFORMANCE TABLE ---");
    const prodHeaders = [
      "Product ID",
      "Name",
      "SKU",
      "Category",
      "Brand",
      "Supplier",
      "Warehouse",
      "Branch",
      "Current Stock",
      "Units Sold",
      "Revenue ($)",
      "COGS ($)",
      "Gross Profit ($)",
      "Margin (%)",
      "Daily Velocity (units/day)",
      "Days Cover Remaining",
      "Days Since Last Sale",
      "Health Status"
    ];
    lines.push(prodHeaders.join(","));

    data.productPerformance.forEach((p) => {
      const stockCoverDays = p.avgDailySales > 0 ? (p.currentStock / p.avgDailySales).toFixed(1) : "999+";
      const row = [
        p.id,
        escapeCsv(p.name),
        escapeCsv(p.sku),
        escapeCsv(p.category),
        escapeCsv(p.brand),
        escapeCsv(p.supplierName),
        escapeCsv(p.warehouse),
        escapeCsv(p.branch),
        p.currentStock,
        p.unitsSold,
        p.revenue,
        p.cogs,
        p.grossProfit,
        p.profitMargin,
        p.avgDailySales,
        stockCoverDays,
        p.daysSinceLastSale,
        p.healthStatus
      ];
      lines.push(row.join(","));
    });
    lines.push("");
  }

  // Section 3: Historical Trends
  if (options.includeTrends && data.salesTrend) {
    lines.push("--- HISTORICAL REVENUE & INVENTORY TRENDS ---");
    lines.push("Period Label,Date,Revenue ($),Cost ($),Gross Profit ($),Sales Volume (Units),Inventory Value ($)");
    data.salesTrend.forEach((t) => {
      lines.push([
        escapeCsv(t.label),
        escapeCsv(t.date),
        t.revenue,
        t.cost,
        t.revenue - t.cost,
        t.salesVolume,
        t.inventoryValue
      ].join(","));
    });
    lines.push("");
  }

  // Section 4: ABC Analysis
  if (options.includeAbc && data.analytics?.abcAnalysis) {
    const abc = data.analytics.abcAnalysis;
    lines.push("--- ABC INVENTORY CLASSIFICATION ---");
    lines.push("Category Class,Product Count,Revenue ($),Revenue Share (%),Inventory Asset Value ($)");
    lines.push(`Category A (Top 80% Rev),${abc.categoryA.count},${abc.categoryA.revenue},${abc.categoryA.revenuePct}%,${abc.categoryA.inventoryValue}`);
    lines.push(`Category B (Next 15% Rev),${abc.categoryB.count},${abc.categoryB.revenue},${abc.categoryB.revenuePct}%,${abc.categoryB.inventoryValue}`);
    lines.push(`Category C (Tail 5% Rev),${abc.categoryC.count},${abc.categoryC.revenue},${abc.categoryC.revenuePct}%,${abc.categoryC.inventoryValue}`);
    lines.push("");
  }

  // Section 5: Stock Health Breakdown
  if (options.includeStockHealth && data.stockHealth) {
    const sh = data.stockHealth;
    lines.push("--- STOCK HEALTH BREAKDOWN ---");
    lines.push("Health Status,SKU Count,Inventory Value ($),Percentage Share (%)");
    sh.healthBreakdown?.forEach((item) => {
      lines.push(`${escapeCsv(item.status)},${item.count},${item.inventoryValue},${item.percentage}%`);
    });
    lines.push("");
  }

  // Section 6: Fast / Slow / Dead Stock
  if (options.includeMovement && data.fastSlowMoving) {
    const fs = data.fastSlowMoving;
    lines.push(`--- MOVEMENT CLASSIFICATION (Dead Stock Threshold: ${fs.deadStockThresholdDays} Days) ---`);
    lines.push("Movement Status,Product ID,Name,SKU,Category,Current Stock,Days Since Last Sale,Revenue / Cost ($)");
    
    fs.fastMoving.forEach((p) => {
      lines.push(`Fast Moving,${p.id},${escapeCsv(p.name)},${escapeCsv(p.sku)},${escapeCsv(p.category)},${p.currentStock},${p.daysSinceLastSale},${p.revenue}`);
    });
    fs.slowMoving.forEach((p) => {
      lines.push(`Slow Moving,${p.id},${escapeCsv(p.name)},${escapeCsv(p.sku)},${escapeCsv(p.category)},${p.currentStock},${p.daysSinceLastSale},${p.revenue}`);
    });
    fs.deadStock.forEach((p) => {
      lines.push(`Dead Stock,${p.id},${escapeCsv(p.name)},${escapeCsv(p.sku)},${escapeCsv(p.category)},${p.currentStock},${p.daysSinceLastSale},${p.costPrice * p.currentStock}`);
    });
  }

  return lines.join("\n");
}

function generateExcelXmlContent(data: InventoryInsightsResponse, options: ExportOptions): string {
  const xmlSheets: string[] = [];

  // Sheet 1: Executive KPI Summary
  if (options.includeSummary && data.executiveSummary) {
    const es = data.executiveSummary;
    xmlSheets.push(`
    <Worksheet ss:Name="Executive Summary">
      <Table>
        <Column ss:Width="180"/>
        <Column ss:Width="120"/>
        <Column ss:Width="120"/>
        <Column ss:Width="160"/>
        <Row ss:StyleID="HeaderRow">
          <Cell><Data ss:Type="String">KPI Metric</Data></Cell>
          <Cell><Data ss:Type="String">Value</Data></Cell>
          <Cell><Data ss:Type="String">Period Change</Data></Cell>
          <Cell><Data ss:Type="String">Comparison Window</Data></Cell>
        </Row>
        <Row><Cell><Data ss:Type="String">Total Products / SKUs</Data></Cell><Cell><Data ss:Type="Number">${es.totalProducts?.value || 0}</Data></Cell><Cell><Data ss:Type="String">${es.totalProducts?.changePct || 0}%</Data></Cell><Cell><Data ss:Type="String">${escapeXml((es.totalProducts as any)?.periodLabel || 'vs prior period')}</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Total Inventory Asset Value ($)</Data></Cell><Cell><Data ss:Type="Number">${es.totalInventoryValue?.value || 0}</Data></Cell><Cell><Data ss:Type="String">${es.totalInventoryValue?.changePct || 0}%</Data></Cell><Cell><Data ss:Type="String">${escapeXml((es.totalInventoryValue as any)?.periodLabel || 'vs prior period')}</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Total Revenue ($)</Data></Cell><Cell><Data ss:Type="Number">${es.revenue?.value || 0}</Data></Cell><Cell><Data ss:Type="String">${es.revenue?.changePct || 0}%</Data></Cell><Cell><Data ss:Type="String">${escapeXml((es.revenue as any)?.periodLabel || 'vs prior period')}</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Gross Profit ($)</Data></Cell><Cell><Data ss:Type="Number">${es.grossProfit?.value || 0}</Data></Cell><Cell><Data ss:Type="String">${es.grossProfit?.changePct || 0}%</Data></Cell><Cell><Data ss:Type="String">${escapeXml((es.grossProfit as any)?.periodLabel || 'vs prior period')}</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Annualized Turnover Rate</Data></Cell><Cell><Data ss:Type="Number">${es.inventoryTurnoverRate?.value || 0}</Data></Cell><Cell><Data ss:Type="String">${es.inventoryTurnoverRate?.changePct || 0}%</Data></Cell><Cell><Data ss:Type="String">${escapeXml((es.inventoryTurnoverRate as any)?.periodLabel || 'vs prior period')}</Data></Cell></Row>
      </Table>
    </Worksheet>`);
  }

  // Sheet 2: Product Performance
  if (options.includeProducts && data.productPerformance) {
    const rowsXml = data.productPerformance.map((p) => {
      const stockCoverDays = p.avgDailySales > 0 ? (p.currentStock / p.avgDailySales).toFixed(1) : "999+";
      return `
        <Row>
          <Cell><Data ss:Type="String">${escapeXml(p.id)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(p.name)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(p.sku)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(p.category)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(p.brand)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(p.supplierName)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(p.warehouse)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(p.branch)}</Data></Cell>
          <Cell><Data ss:Type="Number">${p.currentStock}</Data></Cell>
          <Cell><Data ss:Type="Number">${p.unitsSold}</Data></Cell>
          <Cell><Data ss:Type="Number">${p.revenue}</Data></Cell>
          <Cell><Data ss:Type="Number">${p.cogs}</Data></Cell>
          <Cell><Data ss:Type="Number">${p.grossProfit}</Data></Cell>
          <Cell><Data ss:Type="Number">${p.profitMargin}</Data></Cell>
          <Cell><Data ss:Type="Number">${p.avgDailySales}</Data></Cell>
          <Cell><Data ss:Type="String">${stockCoverDays}</Data></Cell>
          <Cell><Data ss:Type="Number">${p.daysSinceLastSale}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(p.healthStatus)}</Data></Cell>
        </Row>`;
    }).join("");

    xmlSheets.push(`
    <Worksheet ss:Name="Product Performance">
      <Table>
        <Column ss:Width="100"/>
        <Column ss:Width="200"/>
        <Column ss:Width="100"/>
        <Column ss:Width="120"/>
        <Column ss:Width="100"/>
        <Column ss:Width="140"/>
        <Column ss:Width="120"/>
        <Column ss:Width="120"/>
        <Column ss:Width="90"/>
        <Column ss:Width="90"/>
        <Column ss:Width="100"/>
        <Column ss:Width="100"/>
        <Column ss:Width="100"/>
        <Column ss:Width="80"/>
        <Column ss:Width="100"/>
        <Column ss:Width="110"/>
        <Column ss:Width="110"/>
        <Column ss:Width="100"/>
        <Row ss:StyleID="HeaderRow">
          <Cell><Data ss:Type="String">Product ID</Data></Cell>
          <Cell><Data ss:Type="String">Product Name</Data></Cell>
          <Cell><Data ss:Type="String">SKU</Data></Cell>
          <Cell><Data ss:Type="String">Category</Data></Cell>
          <Cell><Data ss:Type="String">Brand</Data></Cell>
          <Cell><Data ss:Type="String">Supplier</Data></Cell>
          <Cell><Data ss:Type="String">Warehouse</Data></Cell>
          <Cell><Data ss:Type="String">Branch</Data></Cell>
          <Cell><Data ss:Type="String">Current Stock</Data></Cell>
          <Cell><Data ss:Type="String">Units Sold</Data></Cell>
          <Cell><Data ss:Type="String">Revenue ($)</Data></Cell>
          <Cell><Data ss:Type="String">COGS ($)</Data></Cell>
          <Cell><Data ss:Type="String">Gross Profit ($)</Data></Cell>
          <Cell><Data ss:Type="String">Margin (%)</Data></Cell>
          <Cell><Data ss:Type="String">Velocity (u/d)</Data></Cell>
          <Cell><Data ss:Type="String">Cover (Days)</Data></Cell>
          <Cell><Data ss:Type="String">Days Since Sale</Data></Cell>
          <Cell><Data ss:Type="String">Health Status</Data></Cell>
        </Row>
        ${rowsXml}
      </Table>
    </Worksheet>`);
  }

  // Sheet 3: Sales Trends
  if (options.includeTrends && data.salesTrend) {
    const trendRows = data.salesTrend.map((t) => `
        <Row>
          <Cell><Data ss:Type="String">${escapeXml(t.label)}</Data></Cell>
          <Cell><Data ss:Type="String">${escapeXml(t.date)}</Data></Cell>
          <Cell><Data ss:Type="Number">${t.revenue}</Data></Cell>
          <Cell><Data ss:Type="Number">${t.cost}</Data></Cell>
          <Cell><Data ss:Type="Number">${t.revenue - t.cost}</Data></Cell>
          <Cell><Data ss:Type="Number">${t.salesVolume}</Data></Cell>
          <Cell><Data ss:Type="Number">${t.inventoryValue}</Data></Cell>
        </Row>`).join("");

    xmlSheets.push(`
    <Worksheet ss:Name="Historical Trends">
      <Table>
        <Column ss:Width="100"/>
        <Column ss:Width="110"/>
        <Column ss:Width="110"/>
        <Column ss:Width="110"/>
        <Column ss:Width="110"/>
        <Column ss:Width="110"/>
        <Column ss:Width="130"/>
        <Row ss:StyleID="HeaderRow">
          <Cell><Data ss:Type="String">Period Label</Data></Cell>
          <Cell><Data ss:Type="String">Date Marker</Data></Cell>
          <Cell><Data ss:Type="String">Revenue ($)</Data></Cell>
          <Cell><Data ss:Type="String">Cost ($)</Data></Cell>
          <Cell><Data ss:Type="String">Gross Profit ($)</Data></Cell>
          <Cell><Data ss:Type="String">Sales Volume (Units)</Data></Cell>
          <Cell><Data ss:Type="String">Inventory Value ($)</Data></Cell>
        </Row>
        ${trendRows}
      </Table>
    </Worksheet>`);
  }

  // Sheet 4: ABC Analysis & Stock Health
  if ((options.includeAbc && data.analytics?.abcAnalysis) || (options.includeStockHealth && data.stockHealth)) {
    let abcRows = "";
    if (options.includeAbc && data.analytics?.abcAnalysis) {
      const abc = data.analytics.abcAnalysis;
      abcRows = `
        <Row><Cell><Data ss:Type="String">Category A (Top 80% Rev)</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryA.count}</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryA.revenue}</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryA.revenuePct}</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryA.inventoryValue}</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Category B (Next 15% Rev)</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryB.count}</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryB.revenue}</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryB.revenuePct}</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryB.inventoryValue}</Data></Cell></Row>
        <Row><Cell><Data ss:Type="String">Category C (Tail 5% Rev)</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryC.count}</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryC.revenue}</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryC.revenuePct}</Data></Cell><Cell><Data ss:Type="Number">${abc.categoryC.inventoryValue}</Data></Cell></Row>
      `;
    }

    xmlSheets.push(`
    <Worksheet ss:Name="ABC & Analytics">
      <Table>
        <Column ss:Width="180"/>
        <Column ss:Width="100"/>
        <Column ss:Width="120"/>
        <Column ss:Width="120"/>
        <Column ss:Width="140"/>
        <Row ss:StyleID="HeaderRow">
          <Cell><Data ss:Type="String">ABC Class</Data></Cell>
          <Cell><Data ss:Type="String">Product Count</Data></Cell>
          <Cell><Data ss:Type="String">Revenue ($)</Data></Cell>
          <Cell><Data ss:Type="String">Revenue Share (%)</Data></Cell>
          <Cell><Data ss:Type="String">Inventory Value ($)</Data></Cell>
        </Row>
        ${abcRows}
      </Table>
    </Worksheet>`);
  }

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="HeaderRow">
   <Font ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 ${xmlSheets.join("")}
</Workbook>`;
}
