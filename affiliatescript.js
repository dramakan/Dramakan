document.addEventListener("DOMContentLoaded", function() {
    const fileInput = document.getElementById('affiliateScreenshot');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const form = document.getElementById('affiliateForm');
    const statusDiv = document.getElementById('affiliateStatus');
    const submitBtn = document.getElementById('affiliateSubmitBtn');

    // Display selected file name
    fileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            fileNameDisplay.textContent = this.files[0].name;
            fileNameDisplay.style.color = '#fff';
        } else {
            fileNameDisplay.textContent = "Click to upload screenshot";
            fileNameDisplay.style.color = 'var(--text-muted-color)';
        }
    });

    // Handle Form Submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get values
        const name = document.getElementById('affiliateName').value;
        const link = document.getElementById('affiliateLink').value;
        const payment = document.getElementById('affiliatePayment').value;
        const file = fileInput.files[0];

        // Telegram Bot Credentials
        const BOT_TOKEN = "8473278366:AAFgUjLJGAjRoh4Ig1DCat0qCs2D7yZHcbA";
        const CHAT_ID = "5780542178";

        // Formulate Caption Message
        const captionText = `💰 *New Affiliate Claim*\n\n` +
                            `👤 *Handle:* ${name}\n` +
                            `🔗 *Video Link:* ${link}\n` +
                            `💳 *Payment Info:* ${payment}`;

        // Prepare FormData (Required for sending files)
        const formData = new FormData();
        formData.append("chat_id", CHAT_ID);
        formData.append("photo", file); // Attach the image file
        formData.append("caption", captionText);
        formData.append("parse_mode", "Markdown");

        // UI Loading State
        submitBtn.innerText = "Uploading & Sending...";
        submitBtn.disabled = true;

        try {
            // Using sendPhoto endpoint instead of sendMessage
            const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                statusDiv.style.display = "block";
                statusDiv.style.backgroundColor = "rgba(76, 175, 80, 0.1)";
                statusDiv.style.color = "#4CAF50";
                statusDiv.style.border = "1px solid #4CAF50";
                statusDiv.innerText = "Proof submitted successfully! We will review it shortly.";
                form.reset();
                fileNameDisplay.textContent = "Click to upload screenshot";
            } else {
                throw new Error("Failed to send");
            }
        } catch (error) {
            statusDiv.style.display = "block";
            statusDiv.style.backgroundColor = "rgba(255, 77, 77, 0.1)";
            statusDiv.style.color = "#ff4d4d";
            statusDiv.style.border = "1px solid #ff4d4d";
            statusDiv.innerText = "Error submitting proof. Please try again or contact support.";
            console.error(error);
        } finally {
            // Reset Button
            submitBtn.innerText = "Send Claim Request";
            submitBtn.disabled = false;
        }
    });
});