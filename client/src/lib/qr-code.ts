import { apiRequest } from "./queryClient";

/**
 * Get the application URL for QR code generation
 */
export async function getQRCodeUrl(): Promise<string> {
  try {
    const response = await apiRequest("GET", "/api/qr-code-url", undefined);
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error("Error fetching QR code URL:", error);
    // Fallback to current host with register path
    const host = window.location.origin;
    return `${host}/register?source=qrcode`;
  }
}

/**
 * Generate a QR code data URL for the application registration
 * @returns Base64 encoded SVG
 */
export async function generateQRCodeSVG(): Promise<string> {
  try {
    // Get the application URL
    const appUrl = await getQRCodeUrl();
    
    // Use the QRCode.js library available via CDN
    // This will be loaded in the HTML template
    if (typeof window !== "undefined" && (window as any).QRCode) {
      const qrcode = new (window as any).QRCode({
        content: appUrl,
        width: 256,
        height: 256,
        color: "#1e40af",
        background: "#ffffff",
        ecl: "M",
      });
      
      return qrcode.svg();
    }
    
    throw new Error("QRCode library not available");
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

/**
 * Print the QR code for physical distribution
 */
export async function printQRCode(): Promise<void> {
  try {
    const qrCodeSvg = await generateQRCodeSVG();
    
    // Create a temporary iframe to print from
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("Could not access iframe document");
    
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ShiftPro Application QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              font-family: 'Inter', sans-serif;
            }
            .qr-container {
              text-align: center;
              padding: 20px;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              background: white;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
              color: #1e40af;
            }
            p {
              font-size: 16px;
              color: #4b5563;
              margin-bottom: 20px;
            }
            .qr-code {
              width: 256px;
              height: 256px;
              margin: 0 auto;
            }
            .company-info {
              margin-top: 20px;
              font-size: 14px;
              color: #6b7280;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>ShiftPro Application</h1>
            <p>Scan this QR code to apply for a position</p>
            <div class="qr-code">
              ${qrCodeSvg}
            </div>
            <div class="company-info">
              <p>Thank you for your interest in joining our team!</p>
            </div>
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();
    
    // Print after a short delay to ensure content is loaded
    setTimeout(() => {
      iframe.contentWindow?.print();
      
      // Remove the iframe after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 500);
  } catch (error) {
    console.error("Error printing QR code:", error);
    throw error;
  }
}
