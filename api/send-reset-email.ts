// Import necessary libraries
import { sendEmail } from 'email-service';

// Define environment variables
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;

// Custom branded email template for RICH系統
const emailTemplate = `<!DOCTYPE html>
<html lang="zh">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>重設密碼</title>
    <style>
        body { font-family: Arial, sans-serif; background-color: #f7f7f7; padding: 20px; }
        .container { background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1); }
        h1 { color: #333; }
        .footer { margin-top: 20px; font-size: 0.9em; color: #777; }
    </style>
</head>
<body>
<div class="container">
    <h1>重設您的密碼</h1>
    <p>請點擊以下鏈接以重設您的密碼：</p>
    <a href="{{resetLink}}">重設密碼</a>
    <p>如有任何問題，請聯絡我們的客服。</p>
    <p>安全提示：<br />定期更改密碼並保持其唯一性。</p>
</div>
<div class="footer">
    <p>謝謝，<br />RICH系統團隊</p>
</div>
</body>
</html>`;

// Function to send reset email
export const sendPasswordResetEmail = (userEmail, resetLink) => {
    const emailContent = emailTemplate.replace('{{resetLink}}', resetLink);

    sendEmail({
        to: userEmail,
        from: RESEND_FROM_EMAIL,
        subject: '重設您的密碼',
        html: emailContent
    });
};

// Export function for other modules
export default sendPasswordResetEmail;