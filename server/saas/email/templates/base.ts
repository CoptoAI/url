export interface BaseLayoutOptions {
  title: string
  preheader?: string
  contentHtml: string
}

export function renderBaseEmailLayout(options: BaseLayoutOptions): string {
  const preheaderText = options.preheader ? options.preheader : ''

  return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(options.title)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .content { padding: 24px 20px !important; }
    }
    @media (prefers-color-scheme: dark) {
      body { background-color: #09090b !important; color: #f4f4f5 !important; }
      .container { background-color: #18181b !important; border-color: #27272a !important; }
      .text-primary { color: #fafafa !important; }
      .text-muted { color: #a1a1aa !important; }
      .footer-text { color: #71717a !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 40px 0; background-color: #f4f4f5;">
  <!-- Preheader text -->
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeHtml(preheaderText)}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 0 16px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px;" class="container">
          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding: 24px 0 16px 0;">
              <span style="font-size: 24px; font-weight: 700; letter-spacing: -0.025em; color: #09090b; display: inline-flex; align-items: center;" class="text-primary">
                Shaf
              </span>
            </td>
          </tr>
          <!-- Body Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; box-shadow: 0 1px 3px rgba(0,0,0,0.05); padding: 36px 32px;" class="container content">
              ${options.contentHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 0; font-size: 12px; line-height: 18px; color: #71717a;" class="footer-text">
              <p style="margin: 0 0 8px 0;">
                Sent securely by <strong>Shaf</strong> · Modern URL Management & Analytics
              </p>
              <p style="margin: 0;">
                If you did not request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
