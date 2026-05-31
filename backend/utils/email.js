export const sendEmail = async (toEmail, subject, htmlContent) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;

    if (!apiKey || !senderEmail) {
        console.warn("Email not sent: BREVO_API_KEY or BREVO_SENDER_EMAIL is missing in .env");
        return;
    }

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sender: { name: "DevCollab", email: senderEmail },
                to: [{ email: toEmail }],
                subject: subject,
                htmlContent: htmlContent
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Brevo Error: ${JSON.stringify(errorData)}`);
        }

        console.log(`Email successfully sent to ${toEmail}`);
    } catch (error) {
        console.error("Failed to send email:", error.message);
    }
};
