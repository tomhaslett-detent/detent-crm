import Papa from "papaparse";

const columns = {
  Companies: ["Record ID", "Company name", "Company Domain Name", "Industry", "Website URL", "Company owner"],
  Contacts: ["Record ID", "First Name", "Last Name", "Email", "Phone Number", "Job Title", "Associated Company IDs (Primary)", "Associated Company IDs", "Contact owner"],
};

async function workbook() {
  const { default: ExcelJS } = await import("exceljs/dist/exceljs.min.js");
  return new ExcelJS.Workbook();
}

async function makeWorkbook(sheets, instructions) {
  const book = await workbook();
  const guide = book.addWorksheet("Instructions");
  guide.getColumn(1).width = 105;
  guide.addRows(instructions.map((line) => [line]));
  guide.getRow(1).font = { bold: true };
  for (const [name, headers] of Object.entries(sheets)) {
    const sheet = book.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = headers.map((header) => ({ header, width: Math.max(24, header.length + 3), style: { numFmt: "@" } }));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E1B2A" } };
  }
  return book.xlsx.writeBuffer();
}

async function readWorkbook(file, sheetNames) {
  if (file.size > 15 * 1024 * 1024) throw new Error("Use CSV files for workbooks larger than 15 MB.");
  const book = await workbook();
  await book.xlsx.load(await file.arrayBuffer());
  return sheetNames.map((name) => {
    const sheet = book.getWorksheet(name);
    if (!sheet) throw new Error("The workbook needs a " + name + " tab.");
    const width = sheet.getRow(1).cellCount;
    if (width > 500 || sheet.rowCount > 50001) throw new Error("Use CSV for larger import sheets.");
    const values = [];
    sheet.eachRow((row) => {
      const cells = [];
      for (let col = 1; col <= width; col += 1) {
        const cell = row.getCell(col);
        if (cell.formula) throw new Error("Replace formulas with values on the " + name + " tab.");
        cells.push(cell.text);
      }
      values.push(cells);
    });
    return Papa.unparse(values);
  });
}

export function makeImportWorkbook() {
  return makeWorkbook(columns, [
    "Detent CRM import template",
    "Fill the Companies and Contacts tabs. Use a stable Record ID within each tab.",
    "For contacts, use the company Record ID for the primary company.",
    "Separate additional company Record IDs with semicolons.",
    "Enter original owner labels if staff will assign imported ownership.",
    "Keep Record IDs as text. Reuse the same source name and record IDs when retrying.",
    "Custom columns are retained as source values. Use the standard headers for CRM field mapping.",
    "Use letters, digits, full stops, underscores or hyphens for external IDs.",
  ]);
}


export function readImportWorkbook(file) {
  return readWorkbook(file, Object.keys(columns));
}

export async function readImportTable(file, sheetName) {
  if (!/\.xlsx$/i.test(file.name)) return file.text();
  const [csv] = await readWorkbook(file, [sheetName]);
  return csv;
}

export async function downloadImportTable(sheetName, headers) {
  const buffer = await makeWorkbook({ [sheetName]: headers }, [
    "Detent CRM import template",
    "Fill the " + sheetName + " tab and keep the headers.",
    "Keep record IDs, dates and timestamps as text. Separate multiple linked record IDs with semicolons.",
    "Use the same source name and record IDs across linked files. Validate the file before importing.",
  ]);
  const url = URL.createObjectURL(new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "Detent-CRM-" + sheetName.toLowerCase() + ".xlsx";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
