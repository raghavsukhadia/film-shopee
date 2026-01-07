/**
 * Professional Excel Export Utility
 * Provides reusable functions for exporting data to Excel format with proper formatting
 */

import * as XLSX from 'xlsx'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
  format?: (value: any, entry?: any) => string | number
}

export interface ExcelExportOptions {
  filename: string
  sheetName?: string
  title?: string
  subtitle?: string
  columns: ExcelColumn[]
  data: any[]
  includeDate?: boolean
}

/**
 * Format currency values
 */
export const formatCurrency = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '₹0.00'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '₹0.00'
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format date values
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  })
}

/**
 * Format datetime values
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Export data to Excel with professional formatting
 */
export function exportToExcel(options: ExcelExportOptions): void {
  const {
    filename,
    sheetName = 'Sheet1',
    title,
    subtitle,
    columns,
    data,
    includeDate = true
  } = options

  // Create a new workbook
  const workbook = XLSX.utils.book_new()

  // Prepare data rows
  const rows: any[][] = []

  // Add title row if provided
  if (title) {
    rows.push([title])
    rows.push([]) // Empty row for spacing
  }

  // Add subtitle row if provided
  if (subtitle) {
    rows.push([subtitle])
    rows.push([]) // Empty row for spacing
  }

  // Add export date if requested
  if (includeDate) {
    rows.push([`Exported on: ${new Date().toLocaleString('en-IN')}`])
    rows.push([]) // Empty row for spacing
  }

  // Add header row
  const headers = columns.map(col => col.header)
  rows.push(headers)

  // Add data rows
  data.forEach(item => {
    const row = columns.map(col => {
      const value = item[col.key]
      if (col.format) {
        return col.format(value, item)
      }
      return value ?? ''
    })
    rows.push(row)
  })

  // Create worksheet from array
  const worksheet = XLSX.utils.aoa_to_sheet(rows)

  // Set column widths
  const colWidths = columns.map(col => ({
    wch: col.width || Math.max(col.header.length, 15)
  }))
  worksheet['!cols'] = colWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Generate Excel file and download
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

/**
 * Export multiple sheets to Excel
 */
export function exportToExcelMultiSheet(
  filename: string,
  sheets: Array<{
    name: string
    title?: string
    subtitle?: string
    columns: ExcelColumn[]
    data: any[]
  }>
): void {
  const workbook = XLSX.utils.book_new()

  sheets.forEach((sheet, index) => {
    const rows: any[][] = []

    // Add title
    if (sheet.title) {
      rows.push([sheet.title])
      rows.push([])
    }

    // Add subtitle
    if (sheet.subtitle) {
      rows.push([sheet.subtitle])
      rows.push([])
    }

    // Add export date for first sheet only
    if (index === 0) {
      rows.push([`Exported on: ${new Date().toLocaleString('en-IN')}`])
      rows.push([])
    }

    // Add headers
    const headers = sheet.columns.map(col => col.header)
    rows.push(headers)

    // Add data
    sheet.data.forEach(item => {
      const row = sheet.columns.map(col => {
        const value = item[col.key]
        if (col.format) {
          return col.format(value, item)
        }
        return value ?? ''
      })
      rows.push(row)
    })

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(rows)

    // Set column widths
    const colWidths = sheet.columns.map(col => ({
      wch: col.width || Math.max(col.header.length, 15)
    }))
    worksheet['!cols'] = colWidths

    // Add to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
  })

  // Download
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

