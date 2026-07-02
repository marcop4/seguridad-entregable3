import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import signpdf from 'node-signpdf';
import fs from 'fs';
import path from 'path';

import { plainAddPlaceholder } from 'node-signpdf/dist/helpers/index.js';
import forge from 'node-forge';

function generateP12(p12Path: string, password: string) {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
  const attrs = [
    { name: 'commonName', value: 'JANE (JANE Artisans) Dev Cert' },
    { name: 'localityName', value: 'Tarapoto' },
    { name: 'stateOrProvinceName', value: 'San Martín' },
    { name: 'countryName', value: 'PE' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);
  
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, password);
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  fs.writeFileSync(p12Path, Buffer.from(p12Der, 'binary'));
}

export async function generateAndSignReceipt(orderData: any, p12Password = '123456'): Promise<Buffer> {
  // 1. Generate base PDF with pdf-lib
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();

  // Header
  page.drawText('JANE (JANE Artisans)', { x: 50, y: height - 60, size: 24, font: boldFont, color: rgb(0, 0, 0) });
  page.drawText('RUC: 20601234567', { x: 50, y: height - 80, size: 12, font });
  page.drawText('Jirón Ramírez Hurtado 390, Tarapoto, San Martín, Perú', { x: 50, y: height - 95, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText('Teléfono: 966 946 991', { x: 50, y: height - 110, size: 10, font, color: rgb(0.4, 0.4, 0.4) });

  // Receipt details
  page.drawText('BOLETA DE VENTA ELECTRÓNICA', { x: width - 280, y: height - 60, size: 14, font: boldFont });
  const shortId = orderData.id.toString().split('-')[0].toUpperCase();
  page.drawText(`Nro: B001-${shortId}`, { x: width - 280, y: height - 80, size: 12, font });
  page.drawText(`Fecha: ${new Date(orderData.created_at).toLocaleDateString()}`, { x: width - 280, y: height - 100, size: 12, font });

  // Customer Info
  page.drawText(`Vendedor ID: ${orderData.usuario_id}`, { x: 50, y: height - 140, size: 12, font });
  const clienteStr = orderData.cliente_name 
    ? `${orderData.cliente_name} (${orderData.cliente_doc || ''})` 
    : 'Cliente General (Venta Pública)';
  page.drawText(`Cliente / Referencia: ${clienteStr}`, { x: 50, y: height - 155, size: 12, font });

  // Items table header
  const tableY = height - 200;
  page.drawRectangle({ x: 50, y: tableY - 5, width: width - 100, height: 20, color: rgb(0.9, 0.9, 0.9) });
  page.drawText('Cant.', { x: 60, y: tableY, size: 10, font: boldFont });
  page.drawText('Descripción', { x: 100, y: tableY, size: 10, font: boldFont });
  page.drawText('P.Unit', { x: width - 160, y: tableY, size: 10, font: boldFont });
  page.drawText('Total', { x: width - 100, y: tableY, size: 10, font: boldFont });

  let currentY = tableY - 20;

  if (orderData.items && orderData.items.length > 0) {
    orderData.items.forEach((item: any) => {
      const itemTotal = parseFloat(item.unit_price) * parseInt(item.quantity);
      page.drawText(`${item.quantity}`, { x: 60, y: currentY, size: 10, font });
      page.drawText(`${item.product_name}`, { x: 100, y: currentY, size: 10, font });
      page.drawText(`S/ ${parseFloat(item.unit_price).toFixed(2)}`, { x: width - 160, y: currentY, size: 10, font });
      page.drawText(`S/ ${itemTotal.toFixed(2)}`, { x: width - 100, y: currentY, size: 10, font });
      currentY -= 20;
    });
  } else {
    page.drawText(`Orden generada desde POS / E-commerce`, { x: 100, y: currentY, size: 10, font });
    page.drawText(`S/ ${parseFloat(orderData.total).toFixed(2)}`, { x: width - 100, y: currentY, size: 10, font });
    currentY -= 20;
  }

  // Total
  const summaryY = currentY - 30;
  page.drawText('SUBTOTAL:', { x: width - 200, y: summaryY, size: 10, font: boldFont });
  page.drawText(`S/ ${(parseFloat(orderData.total) / 1.18).toFixed(2)}`, { x: width - 100, y: summaryY, size: 10, font });
  
  page.drawText('IGV (18%):', { x: width - 200, y: summaryY - 20, size: 10, font: boldFont });
  page.drawText(`S/ ${(parseFloat(orderData.total) - (parseFloat(orderData.total) / 1.18)).toFixed(2)}`, { x: width - 100, y: summaryY - 20, size: 10, font });

  page.drawText('TOTAL:', { x: width - 200, y: summaryY - 40, size: 12, font: boldFont });
  page.drawText(`S/ ${parseFloat(orderData.total).toFixed(2)}`, { x: width - 100, y: summaryY - 40, size: 12, font: boldFont });

  // Payment Details
  const paymentMethod = orderData.metodo_pago || 'Efectivo';
  page.drawText(`PAGADO VÍA: ${paymentMethod.toUpperCase()}`, { x: width - 200, y: summaryY - 60, size: 10, font: boldFont, color: rgb(0.2, 0.2, 0.6) });
  if (paymentMethod === 'Efectivo' && orderData.vuelto !== undefined) {
    page.drawText(`Vuelto: S/ ${parseFloat(orderData.vuelto || '0').toFixed(2)}`, { x: width - 200, y: summaryY - 75, size: 10, font });
  }

  // Signature Section
  page.drawText('Firma Digital del Emisor:', { x: 50, y: 100, size: 10, font: boldFont, color: rgb(0, 0.5, 0) });
  page.drawText('Esta boleta electrónica es un comprobante de pago válido.', { x: 50, y: 85, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
  
  // Visual Signature Stamp (Mock Appearance)
  const stampX = width - 250;
  const stampY = 50;
  page.drawRectangle({ x: stampX, y: stampY, width: 200, height: 60, borderColor: rgb(0.8, 0, 0), borderWidth: 2, color: rgb(1, 0.95, 0.95) });
  page.drawText('Firmado digitalmente por', { x: stampX + 10, y: stampY + 40, size: 8, font: boldFont, color: rgb(0.8, 0, 0) });
  page.drawText('JANE (JANE Artisans)', { x: stampX + 10, y: stampY + 25, size: 12, font: boldFont, color: rgb(0.8, 0, 0) });
  const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
  page.drawText(`Fecha: ${dateStr}`, { x: stampX + 10, y: stampY + 10, size: 8, font, color: rgb(0.8, 0, 0) });

  // We need to add a signature placeholder for node-signpdf
  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  // Add signature placeholder
  const pdfWithPlaceholder = plainAddPlaceholder({
    pdfBuffer: Buffer.from(pdfBytes),
    reason: 'Firma de Comprobante Electrónico',
    contactInfo: 'jane.artisans@gmail.com', // Updated contact info placeholder
    name: 'JANE (JANE Artisans)',
    location: 'Tarapoto, PE',
  });

  // Load the P12 certificate
  const p12Path = path.join(process.cwd(), 'firma_jane.p12');
  if (!fs.existsSync(p12Path)) {
    generateP12(p12Path, p12Password);
  }
  const p12Buffer = fs.readFileSync(p12Path);

  // Sign the PDF
  const signedPdf = (signpdf as any).default ? (signpdf as any).default.sign(pdfWithPlaceholder, p12Buffer, {
    passphrase: p12Password,
  }) : signpdf.sign(pdfWithPlaceholder, p12Buffer, {
    passphrase: p12Password,
  });

  return signedPdf;
}
