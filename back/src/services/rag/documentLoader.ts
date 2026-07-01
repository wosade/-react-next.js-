/**
 * 文档解析器 — 把 PDF / Word / TXT 转成纯文本
 */
import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import { AppError } from '../../middleware/errorHandler.js';

export type DocType = 'pdf' | 'docx' | 'txt';

/** 根据文件后缀名推断文档类型 */
export function getDocType(fileName: string): DocType {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
      return 'pdf';
    case 'docx':
    case 'doc':
      return 'docx';
    case 'txt':
    case 'md':
      return 'txt';
    default:
      throw new AppError(400, `不支持的文件格式: .${ext}`);
  }
}

/**
 * 解析文档文件，提取纯文本内容
 * @param filePath 文件绝对路径
 * @param docType 文档类型
 */
export async function loadDocument(
  filePath: string,
  docType: DocType,
): Promise<string> {
  switch (docType) {
    case 'pdf': {
      const buffer = fs.readFileSync(filePath);
      // pdf-parse v4+ 要求 Uint8Array，不能直接传 Buffer
      const pdfDoc = new PDFParse({ data: new Uint8Array(buffer) });
      const result = await pdfDoc.getText();
      return result.text;
    }
    case 'docx': {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case 'txt': {
      return fs.readFileSync(filePath, 'utf-8');
    }
    default:
      throw new AppError(400, `不支持的文件类型: ${docType}`);
  }
}
