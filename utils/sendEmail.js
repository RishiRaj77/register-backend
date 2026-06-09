const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Using ethereal email for testing if no real SMTP is provided
  // In production, configure this with real SMTP credentials
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_EMAIL || 'ethereal.user@ethereal.email',
      pass: process.env.SMTP_PASSWORD || 'etherealpassword',
    },
  });

  const message = {
    from: `${process.env.FROM_NAME || 'Admin'} <${process.env.FROM_EMAIL || 'noreply@example.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
  console.log('--- EMAIL CONTENT FOR TESTING ---');
  console.log(options.message);
  console.log('---------------------------------');
};

module.exports = sendEmail;
